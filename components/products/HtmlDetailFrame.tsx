"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface HtmlDetailFrameProps {
  html: string;
  detailImages?: string[];
}

function getAbsoluteOffsetTop(element: HTMLElement): number {
  let top = 0;
  let current: HTMLElement | null = element;

  while (current) {
    top += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }

  return top;
}

function isManagedRelativeAssetPath(value: string): boolean {
  const trimmed = value.trim();

  if (!trimmed) return false;
  if (trimmed.startsWith("#")) return false;
  if (trimmed.startsWith("/")) return false;
  if (trimmed.startsWith("//")) return false;
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)) return false;

  return true;
}

function rewriteHtmlAssetPaths(
  html: string,
  detailImages: string[],
  baseHref: string,
): string {
  const parser = new DOMParser();
  const documentFragment = parser.parseFromString(html, "text/html");

  if (!documentFragment.head.querySelector("base")) {
    const base = documentFragment.createElement("base");
    base.setAttribute("href", baseHref);
    documentFragment.head.prepend(base);
  }

  const usableDetailImages = detailImages
    .map((value) => value.trim())
    .filter(Boolean);

  if (usableDetailImages.length === 0) {
    return documentFragment.documentElement.outerHTML;
  }

  const assignedImages = new Map<string, string>();
  let nextDetailImageIndex = 0;

  const resolveDetailImage = (value: string): string => {
    const normalizedValue = value.trim();

    if (!isManagedRelativeAssetPath(normalizedValue)) {
      return value;
    }

    if (!assignedImages.has(normalizedValue)) {
      const nextImage = usableDetailImages[nextDetailImageIndex];

      if (nextImage) {
        assignedImages.set(normalizedValue, nextImage);
        nextDetailImageIndex += 1;
      }
    }

    return assignedImages.get(normalizedValue) ?? value;
  };

  const elements = documentFragment.querySelectorAll<HTMLElement>(
    "[src], [poster], [srcset]",
  );

  elements.forEach((element) => {
    const src = element.getAttribute("src");
    if (src) {
      element.setAttribute("src", resolveDetailImage(src));
    }

    const poster = element.getAttribute("poster");
    if (poster) {
      element.setAttribute("poster", resolveDetailImage(poster));
    }

    const srcSet = element.getAttribute("srcset");
    if (srcSet) {
      const rewrittenSrcSet = srcSet
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => {
          const [url, ...descriptor] = entry.split(/\s+/);
          const nextUrl = resolveDetailImage(url);
          return [nextUrl, ...descriptor].join(" ");
        })
        .join(", ");

      element.setAttribute("srcset", rewrittenSrcSet);
    }
  });

  return documentFragment.documentElement.outerHTML;
}

function injectScrollScript(html: string): string {
  const injection = `<style>
html{scroll-behavior:auto!important;overflow:hidden!important;background:transparent!important;}
body{margin:0 auto!important;width:max-content;max-width:100%!important;background:transparent!important;}
img{display:block;max-width:100%!important;width:auto!important;height:auto!important;}
picture,video,canvas,svg,table,iframe{max-width:100%!important;}
</style>
<script>
(function() {
  document.addEventListener("wheel", function(event) {
    if (event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    var deltaY = event.deltaY;
    if (event.deltaMode === 1) deltaY *= 40;
    else if (event.deltaMode === 2) deltaY *= window.innerHeight;
    try { window.parent.scrollBy(0, deltaY); } catch (error) {}
  }, { passive: false });

  var lastTouchY = 0;
  document.addEventListener("touchstart", function(event) {
    lastTouchY = event.touches[0].clientY;
  }, { passive: true });

  document.addEventListener("touchmove", function(event) {
    event.preventDefault();
    var deltaY = lastTouchY - event.touches[0].clientY;
    lastTouchY = event.touches[0].clientY;
    try { window.parent.scrollBy(0, deltaY); } catch (error) {}
  }, { passive: false });

  function sendContentHeight() {
    var height = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
    window.parent.postMessage({ type: "__cellromax_content_height__", height: height }, "*");
  }

  window.addEventListener("load", sendContentHeight);
  var resizeObserver = new ResizeObserver(sendContentHeight);
  resizeObserver.observe(document.body);
})();
</script>`;

  if (html.includes("</body>")) {
    return html.replace("</body>", `${injection}</body>`);
  }

  return `${html}${injection}`;
}

export function HtmlDetailFrame({
  html,
  detailImages = [],
}: HtmlDetailFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const contentHeightRef = useRef(0);
  const wrapperTopRef = useRef(0);

  const [isLoading, setIsLoading] = useState(true);
  const [baseHref, setBaseHref] = useState<string | null>(null);

  useEffect(() => {
    setBaseHref(`${window.location.origin}/`);
  }, []);

  useEffect(() => {
    setIsLoading(true);
  }, [baseHref, detailImages, html]);

  const srcDoc = useMemo(() => {
    if (!baseHref) return "";

    const rewrittenHtml = rewriteHtmlAssetPaths(html, detailImages, baseHref);
    return injectScrollScript(rewrittenHtml);
  }, [baseHref, detailImages, html]);

  useEffect(() => {
    const style = document.createElement("style");
    style.setAttribute("data-htmldetailframe", "");
    style.textContent =
      "html{scroll-behavior:auto!important;}" +
      "@media(pointer:coarse){[data-detail-iframe]{pointer-events:none!important;}}";

    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, []);

  const updateWrapperTop = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    wrapperTopRef.current = getAbsoluteOffsetTop(wrapper);
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        event.data?.type !== "__cellromax_content_height__" ||
        typeof event.data.height !== "number" ||
        event.data.height <= 0
      ) {
        return;
      }

      const nextHeight = Math.max(contentHeightRef.current, event.data.height);
      contentHeightRef.current = nextHeight;

      if (wrapperRef.current) {
        wrapperRef.current.style.height = `${nextHeight}px`;
      }

      updateWrapperTop();
      setIsLoading(false);
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [updateWrapperTop]);

  useEffect(() => {
    let frameCount = 0;

    const handleScroll = () => {
      if (rafRef.current) return;

      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = 0;

        const iframeWindow = iframeRef.current?.contentWindow;
        if (!iframeWindow) return;

        frameCount += 1;
        if (frameCount % 200 === 0) {
          updateWrapperTop();
        }

        if (contentHeightRef.current <= 0) return;

        const scrolledPastTop = Math.max(
          0,
          window.scrollY - wrapperTopRef.current,
        );

        const wrapperBottom =
          wrapperTopRef.current + contentHeightRef.current;
        if (window.scrollY > wrapperBottom) return;

        try {
          iframeWindow.scrollTo(0, scrolledPastTop);
        } catch {
          // Ignore cross-origin style failures.
        }
      });
    };

    const handleResize = () => {
      updateWrapperTop();
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);

      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, [updateWrapperTop]);

  return (
    <div
      ref={wrapperRef}
      className="relative w-full"
      style={{ height: "100svh" }}
    >
      {baseHref ? (
        <iframe
          key="detail-iframe"
          ref={iframeRef}
          srcDoc={srcDoc}
          sandbox="allow-scripts allow-same-origin"
          title="제품 상세페이지"
          data-detail-iframe=""
          className="block w-full border-0"
          style={{
            position: "sticky",
            top: 0,
            height: "100svh",
            overflow: "hidden",
          }}
          onLoad={() => {
            updateWrapperTop();
            window.setTimeout(() => setIsLoading(false), 500);
          }}
        />
      ) : null}

      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80">
          <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2 text-sm text-gray-500 shadow-sm">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
            상세페이지를 불러오는 중입니다.
          </div>
        </div>
      ) : null}
    </div>
  );
}
