"use client";

import { useEffect, useRef, useState } from "react";

/* ==========================================================================
   HtmlDetailFrame — 코딩형 제품 상세페이지 렌더러

   detailpage-agent가 생성한 HTML을 iframe srcdoc으로 격리 렌더링.

   핵심 설계:
   - iframe은 position:sticky + height:100svh 로 뷰포트를 항상 가득 채운다
   - 이를 통해 iframe 내부의 window.innerHeight = 실제 뷰포트 높이
   - min-h-screen(100vh), GSAP ScrollTrigger, IntersectionObserver 모두 정상 동작
   - 부모 wrapper div는 iframe 콘텐츠 전체 높이만큼 스크롤 공간을 확보한다
   - 부모 스크롤을 iframe 내부 scrollY에 직접 중계하여 스크롤 애니메이션 활성화
   ========================================================================== */

interface HtmlDetailFrameProps {
  html: string;
}

/**
 * HTML 문자열에 콘텐츠 높이 전송 + 스크롤 수신 스크립트를 주입한다.
 */
function injectScrollScript(html: string): string {
  const script = `<script>
(function() {
  // iframe 콘텐츠 전체 높이를 부모에 전달 (wrapper div 크기 결정용)
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

  // 부모 스크롤 위치를 직접 수신하여 iframe 내부 scrollY에 적용
  window.addEventListener('message', function(evt) {
    if (!evt.data || evt.data.type !== '__cellromax_scroll__') return;
    window.scrollTo(0, evt.data.scrollY);
  });
})();
</script>`;

  if (html.includes("</body>")) {
    return html.replace("</body>", script + "</body>");
  }
  return html + script;
}

export function HtmlDetailFrame({ html }: HtmlDetailFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
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

  // 부모 스크롤 → iframe 내부 scrollY 중계
  useEffect(() => {
    function handleScroll() {
      const iframe = iframeRef.current;
      const wrapper = wrapperRef.current;
      if (!iframe?.contentWindow || !wrapper) return;

      const wrapperTop =
        wrapper.getBoundingClientRect().top + window.scrollY;
      const scrolledPastTop = Math.max(0, window.scrollY - wrapperTop);

      iframe.contentWindow.postMessage(
        { type: "__cellromax_scroll__", scrollY: scrolledPastTop },
        "*"
      );
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
          setTimeout(() => setIsLoading(false), 1500);
        }}
      />
    </div>
  );
}
