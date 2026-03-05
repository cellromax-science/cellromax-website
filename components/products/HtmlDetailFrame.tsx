"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ==========================================================================
   HtmlDetailFrame — 코딩형 제품 상세페이지 렌더러

   detailpage-agent가 생성한 HTML을 iframe srcdoc으로 격리 렌더링.

   핵심 설계:
   - iframe은 position:sticky + height:100svh 로 뷰포트를 항상 가득 채운다
   - 이를 통해 iframe 내부의 window.innerHeight = 실제 뷰포트 높이
   - min-h-screen(100vh), GSAP ScrollTrigger, IntersectionObserver 모두 정상 동작
   - 부모 wrapper div는 iframe 콘텐츠 전체 높이만큼 스크롤 공간을 확보한다
   - 부모 스크롤을 iframe 내부 scrollY에 직접 중계하여 스크롤 애니메이션 활성화

   스크롤 성능 최적화:
   - scroll-behavior:smooth 강제 해제 → instant scrollTo로 1:1 동기화
   - postMessage 대신 직접 contentWindow.scrollTo 호출 (비동기 제거)
   - requestAnimationFrame 배칭으로 매 프레임 1회만 업데이트
   ========================================================================== */

interface HtmlDetailFrameProps {
  html: string;
}

/**
 * HTML 문자열에 콘텐츠 높이 전송 스크립트를 주입한다.
 * scroll-behavior:smooth 를 강제로 auto로 오버라이드하여
 * 부모에서 호출하는 scrollTo가 즉시 반영되도록 한다.
 */
function injectScrollScript(html: string): string {
  // scroll-behavior 오버라이드 CSS + 높이 전송 스크립트
  const injection = `<style>html{scroll-behavior:auto!important;}</style>
<script>
(function() {
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
  const [contentHeight, setContentHeight] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const srcDoc = injectScrollScript(html);

  // iframe에서 콘텐츠 전체 높이 수신 → wrapper div 높이로 적용
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (
        event.data?.type === "__cellromax_content_height__" &&
        typeof event.data.height === "number" &&
        event.data.height > 0
      ) {
        setContentHeight(event.data.height);
        setIsLoading(false);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // wrapperTop 캐시 (scroll 이벤트마다 getBoundingClientRect 호출 방지)
  const wrapperTopRef = useRef(0);
  const updateWrapperTop = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (wrapper) {
      wrapperTopRef.current =
        wrapper.getBoundingClientRect().top + window.scrollY;
    }
  }, []);

  // contentHeight 변경 시 wrapperTop 재계산
  useEffect(() => {
    updateWrapperTop();
  }, [contentHeight, updateWrapperTop]);

  // 부모 스크롤 → iframe 내부 scrollY 직접 중계 (rAF 배칭)
  useEffect(() => {
    function handleScroll() {
      if (rafRef.current) return; // 이미 예약된 프레임이 있으면 skip
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const iframe = iframeRef.current;
        if (!iframe?.contentWindow) return;

        const scrolledPastTop = Math.max(
          0,
          window.scrollY - wrapperTopRef.current
        );

        // 직접 iframe contentWindow.scrollTo 호출 — postMessage 비동기 지연 제거
        try {
          iframe.contentWindow.scrollTo({
            top: scrolledPastTop,
            behavior: "instant",
          });
        } catch {
          // sandbox 정책 등으로 직접 접근 불가 시 postMessage fallback
          iframe.contentWindow.postMessage(
            { type: "__cellromax_scroll__", scrollY: scrolledPastTop },
            "*"
          );
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
      style={{ height: contentHeight > 0 ? `${contentHeight}px` : "100svh" }}
    >
      {/* 로딩 스켈레톤 */}
      {isLoading && (
        <div
          className="sticky top-0 w-full bg-gray-100 animate-pulse"
          style={{ height: "100svh" }}
          aria-hidden="true"
        />
      )}
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        sandbox="allow-scripts allow-same-origin"
        title="제품 상세페이지"
        className="w-full border-0 block"
        style={{
          position: "sticky",
          top: 0,
          height: "100svh",
          overflow: "hidden",
        }}
        onLoad={() => {
          updateWrapperTop();
          setTimeout(() => setIsLoading(false), 1500);
        }}
      />
    </div>
  );
}
