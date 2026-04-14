"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ==========================================================================
   HtmlDetailFrame — 코딩형 제품 상세페이지 렌더러

   detailpage-agent가 생성한 HTML을 iframe srcdoc으로 격리 렌더링.

   핵심 설계:
   - iframe은 position:sticky + height:100svh 로 뷰포트를 항상 가득 채운다
   - 이를 통해 iframe 내부의 window.innerHeight = 실제 뷰포트 높이
   - min-h-screen(100vh), GSAP ScrollTrigger, IntersectionObserver 모두 정상 동작
   - 부모 wrapper div는 iframe 콘텐츠 전체 높이만큼 스크롤 공간을 확보한다
   - 부모 스크롤을 iframe 내부 scrollY에 직접 중계하여 스크롤 애니메이션 활성화

   스크롤 입력 격리:
   - iframe 내부 html에 overflow:hidden → 사용자 직접 스크롤 완전 차단
   - 데스크톱: 휠 이벤트를 parent.scrollBy()로 전달 → relay 경로로 통일
   - 모바일: pointer-events:none 으로 터치를 부모 페이지에 직접 전달 → 네이티브 스크롤
   - 이를 통해 iframe 독립 스크롤 ↔ relay 스크롤 간의 비동기화(점프) 방지

   스크롤 성능 최적화:
   - scroll-behavior:smooth 강제 해제 → instant scrollTo로 1:1 동기화
   - postMessage 대신 직접 contentWindow.scrollTo 호출 (비동기 제거)
   - requestAnimationFrame 배칭으로 매 프레임 1회만 업데이트

   스크롤 안정성:
   - contentHeight를 ref + DOM 직접 조작으로 관리 → 불필요한 re-render 방지
   - srcDoc를 useMemo로 캐싱 → iframe reload 방지
   - wrapperTop을 offsetTop 기반으로 계산 → CSS transform 영향 제거
   - key prop으로 iframe DOM 재생성 방지
   - 부모 페이지의 scroll-behavior:smooth 를 마운트 시 auto로 오버라이드
   - wrapper 높이는 단조 증가만 허용 → ResizeObserver 떨림으로 인한 스크롤 클램핑 방지
   - wrapper 완전 off-screen 시 스크롤 중계 생략
   ========================================================================== */

interface HtmlDetailFrameProps {
  html: string;
}

/**
 * 요소의 페이지 절대 top 위치를 offsetTop 체인으로 계산한다.
 * getBoundingClientRect 와 달리 CSS transform 의 영향을 받지 않는다.
 */
function getAbsoluteOffsetTop(el: HTMLElement): number {
  let top = 0;
  let current: HTMLElement | null = el;
  while (current) {
    top += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }
  return top;
}

/**
 * HTML 문자열에 콘텐츠 높이 전송 스크립트를 주입한다.
 * scroll-behavior:smooth 를 강제로 auto로 오버라이드하여
 * 부모에서 호출하는 scrollTo가 즉시 반영되도록 한다.
 */
function injectScrollScript(html: string): string {
  // 1. scroll-behavior 오버라이드 + overflow:hidden 으로 사용자 직접 스크롤 차단
  //    overflow:hidden 이어도 programmatic scrollTo()는 동작한다 (MDN 스펙)
  // 2. 휠 이벤트를 부모 페이지로 전달하여 relay 경로로 통일
  // 3. 콘텐츠 높이를 부모에 전송
  const injection = `<style>
html{scroll-behavior:auto!important;overflow:hidden!important;background:transparent!important;}
body{margin:0 auto!important;width:max-content;max-width:100%!important;background:transparent!important;}
img{display:block;max-width:100%!important;width:auto!important;height:auto!important;}
picture,video,canvas,svg,table,iframe{max-width:100%!important;}
</style>
<script>
(function() {
  /* ---- 휠 이벤트를 부모 페이지로 전달 ---- */
  document.addEventListener('wheel', function(e) {
    if (e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    var dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 40;
    else if (e.deltaMode === 2) dy *= window.innerHeight;
    try { window.parent.scrollBy(0, dy); } catch(err) {}
  }, { passive: false });

  /* ---- 터치 스크롤도 부모로 전달 ---- */
  var lastTouchY = 0;
  document.addEventListener('touchstart', function(e) {
    lastTouchY = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchmove', function(e) {
    e.preventDefault();
    var dy = lastTouchY - e.touches[0].clientY;
    lastTouchY = e.touches[0].clientY;
    try { window.parent.scrollBy(0, dy); } catch(err) {}
  }, { passive: false });

  /* ---- 콘텐츠 높이 전송 ---- */
  function sendContentHeight() {
    var h = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
    window.parent.postMessage({ type: '__cellromax_content_height__', height: h }, '*');
  }
  window.addEventListener('load', sendContentHeight);
  var ro = new ResizeObserver(sendContentHeight);
  ro.observe(document.body);
})();
</script>`;

  if (html.includes("</body>")) {
    return html.replace("</body>", injection + "</body>");
  }
  return html + injection;
}

export function HtmlDetailFrame({ html }: HtmlDetailFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const contentHeightRef = useRef(0);
  const [isLoading, setIsLoading] = useState(true);

  // srcDoc를 메모이제이션하여 불필요한 iframe 재로드 방지
  const srcDoc = useMemo(() => injectScrollScript(html), [html]);

  // 부모 페이지의 scroll-behavior:smooth 오버라이드
  // sticky iframe 스크롤 중계와 smooth scroll의 타이밍 간섭을 방지
  useEffect(() => {
    const style = document.createElement("style");
    style.setAttribute("data-htmldetailframe", "");
    // 모바일(터치 디바이스)에서는 iframe에 pointer-events:none 적용
    // → 터치 이벤트가 iframe을 통과하여 부모 페이지의 네이티브 스크롤로 처리
    // → JavaScript 기반 touch 포워딩(scrollBy)의 프레임 드롭/점프 문제 해소
    // 데스크톱(pointer:fine)에서는 적용되지 않아 wheel 포워딩이 정상 동작
    style.textContent =
      "html{scroll-behavior:auto!important;}" +
      "@media(pointer:coarse){[data-detail-iframe]{pointer-events:none!important;}}";
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, []);

  // wrapperTop 캐시 — offsetTop 체인으로 계산 (CSS transform 영향 없음)
  const wrapperTopRef = useRef(0);
  const updateWrapperTop = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (wrapper) {
      wrapperTopRef.current = getAbsoluteOffsetTop(wrapper);
    }
  }, []);

  // iframe에서 콘텐츠 전체 높이 수신 → wrapper div 높이를 DOM 직접 조작으로 적용
  // state 대신 ref + DOM 조작을 사용하여 re-render를 방지하고 iframe reload를 차단
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (
        event.data?.type === "__cellromax_content_height__" &&
        typeof event.data.height === "number" &&
        event.data.height > 0
      ) {
        // 높이는 단조 증가만 허용 — 감소 시 스크롤 위치 클램핑으로 인한 점프 방지
        const newHeight = Math.max(contentHeightRef.current, event.data.height);
        contentHeightRef.current = newHeight;
        // DOM 직접 조작 — React re-render 없이 wrapper 높이 업데이트
        if (wrapperRef.current) {
          wrapperRef.current.style.height = `${newHeight}px`;
        }
        updateWrapperTop();
        setIsLoading(false);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [updateWrapperTop]);

  // 부모 스크롤 → iframe 내부 scrollY 직접 중계 (rAF 배칭)
  useEffect(() => {
    // 매 200 프레임마다 wrapperTop 재계산 (GSAP 애니메이션 등으로 인한 오프셋 변화 보정)
    let frameCount = 0;

    function handleScroll() {
      if (rafRef.current) return; // 이미 예약된 프레임이 있으면 skip
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const iframe = iframeRef.current;
        if (!iframe?.contentWindow) return;

        // 주기적 wrapperTop 재계산
        frameCount++;
        if (frameCount % 200 === 0) updateWrapperTop();

        // contentHeight 미수신 시 스크롤 중계 생략
        if (contentHeightRef.current <= 0) return;

        const scrolledPastTop = Math.max(
          0,
          window.scrollY - wrapperTopRef.current
        );

        // wrapper가 완전히 뷰포트 위로 벗어났으면 중계 생략
        // (iframe unstick 이후 off-screen 상태에서 불필요한 scrollTo 호출 방지)
        const wrapperBottom =
          wrapperTopRef.current + contentHeightRef.current;
        if (window.scrollY > wrapperBottom) return;

        // legacy scrollTo(x, y) — 모든 브라우저에서 즉시 스크롤 (behavior 옵션 호환성 문제 회피)
        try {
          iframe.contentWindow.scrollTo(0, scrolledPastTop);
        } catch {
          // cross-origin 등 접근 불가 시 무시
        }
      });
    }

    // resize 시 wrapperTop 재계산
    function handleResize() {
      updateWrapperTop();
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [updateWrapperTop]);

  return (
    <div
      ref={wrapperRef}
      className="relative w-full"
      style={{ height: "100svh" }}
    >
      {/* iframe을 항상 첫 번째 자식으로 배치하고 key로 DOM 재생성 방지 */}
      <iframe
        key="detail-iframe"
        ref={iframeRef}
        srcDoc={srcDoc}
        sandbox="allow-scripts allow-same-origin"
        title="제품 상세페이지"
        data-detail-iframe=""
        className="w-full border-0 block"
        style={{
          position: "sticky",
          top: 0,
          height: "100svh",
          overflow: "hidden",
        }}
        onLoad={() => {
          updateWrapperTop();
          setTimeout(() => setIsLoading(false), 500);
        }}
      />
      {/* 로딩 스켈레톤 — iframe 위에 오버레이 (iframe 뒤에 배치하여 React 자식 순서 보존) */}
      {isLoading && (
        <div
          key="detail-skeleton"
          className="sticky top-0 w-full bg-gray-100 animate-pulse"
          style={{ height: "100svh", marginTop: "-100svh" }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
