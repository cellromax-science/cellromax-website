"use client";

import { useEffect, useRef, useState } from "react";

/* ==========================================================================
   HtmlDetailFrame — 코딩형 제품 상세페이지 렌더러

   detailpage-agent가 생성한 HTML을 iframe srcdoc으로 격리 렌더링.
   - JavaScript/GSAP 애니메이션 완전 동작
   - CSS가 사이트 스타일과 충돌 없음 (iframe 격리)
   - postMessage로 iframe 내부 높이 자동 조절
   ========================================================================== */

interface HtmlDetailFrameProps {
  html: string;
}

/**
 * HTML 문자열에 높이 전송 스크립트를 주입한다.
 * </body> 바로 앞에 삽입하고, 없으면 끝에 append.
 */
function injectHeightScript(html: string): string {
  const script = `<script>
(function() {
  function sendHeight() {
    var h = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
    window.parent.postMessage({ type: '__cellromax_resize__', height: h }, '*');
  }
  window.addEventListener('load', sendHeight);
  var ro = new ResizeObserver(sendHeight);
  ro.observe(document.body);
})();
</script>`;

  if (html.includes("</body>")) {
    return html.replace("</body>", script + "</body>");
  }
  return html + script;
}

export function HtmlDetailFrame({ html }: HtmlDetailFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(600);
  const [isLoading, setIsLoading] = useState(true);

  const srcDoc = injectHeightScript(html);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (
        event.data &&
        event.data.type === "__cellromax_resize__" &&
        typeof event.data.height === "number"
      ) {
        setHeight(event.data.height);
        setIsLoading(false);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <div className="relative w-full">
      {/* 로딩 스켈레톤 */}
      {isLoading && (
        <div
          className="absolute inset-0 bg-gray-100 animate-pulse squircle-xl"
          style={{ height: `${height}px` }}
          aria-hidden="true"
        />
      )}
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        sandbox="allow-scripts allow-same-origin"
        className="w-full border-0 block"
        style={{ height: `${height}px` }}
        title="제품 상세페이지"
        onLoad={() => {
          // load 이벤트 후 짧은 딜레이 뒤 로딩 상태 해제 (postMessage 미수신 대비)
          setTimeout(() => setIsLoading(false), 1500);
        }}
      />
    </div>
  );
}
