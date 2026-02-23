"use client";

import Image from "next/image";
import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";

import { useHeroAnimation } from "@/hooks/useHeroAnimation";

/* ==========================================================================
   HeroSection — 메인 히어로 섹션

   전체화면(100vh) 배경 이미지 위에 그라데이션 오버레이,
   단어별 GSAP 애니메이션이 적용된 헤드라인, 서브헤드라인,
   CTA 버튼 2개, 스크롤 힌트로 구성.

   GSAP 애니메이션은 useHeroAnimation 훅이 담당하며,
   각 요소에 지정된 CSS 클래스 셀렉터(.hero-headline .word 등)를 통해 연결.
   ========================================================================== */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * 번역 텍스트를 줄바꿈(\n)과 단어 단위로 분리하여
 * 각 단어를 GSAP 애니메이션 대상 <span className="word">로 감싼다.
 *
 * 줄바꿈은 <br />로 변환하여 디자인 의도대로 줄을 나눈다.
 * 줄 내 단어 사이에는 공백(&nbsp; 포함 inline-block)을 유지한다.
 */
function splitIntoWords(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];

  lines.forEach((line, lineIndex) => {
    const words = line.split(/\s+/).filter(Boolean);

    words.forEach((word, wordIndex) => {
      // 단어별 GSAP 타겟: .hero-headline .word
      nodes.push(
        <span
          key={`${lineIndex}-${wordIndex}`}
          className="word inline-block"
        >
          {word}
        </span>,
      );

      // 단어 사이 공백 (마지막 단어 뒤에는 불필요)
      if (wordIndex < words.length - 1) {
        nodes.push(
          <span key={`${lineIndex}-space-${wordIndex}`} className="inline-block">
            &nbsp;
          </span>,
        );
      }
    });

    // 줄바꿈 삽입 (마지막 줄 뒤에는 불필요)
    if (lineIndex < lines.length - 1) {
      nodes.push(<br key={`br-${lineIndex}`} />);
    }
  });

  return nodes;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HeroSection() {
  const t = useTranslations("hero");
  const containerRef = useHeroAnimation();

  /** 스크롤 힌트 클릭: 뷰포트 높이만큼 아래로 부드럽게 스크롤 */
  const handleScrollDown = useCallback(() => {
    window.scrollTo({
      top: window.innerHeight,
      behavior: "smooth",
    });
  }, []);

  return (
    <section
      ref={containerRef}
      className="hero"
      aria-label={t("title").replace(/\n/g, " ")}
    >
      {/* ----------------------------------------------------------------
          배경 이미지
          Next.js Image: fill + priority(LCP) + object-cover
          ---------------------------------------------------------------- */}
      <Image
        src="/images/hero/hero-bg.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        quality={85}
        className="object-cover"
        aria-hidden="true"
      />


      {/* ----------------------------------------------------------------
          콘텐츠 영역
          globals.css .hero-content: relative z-2
          ---------------------------------------------------------------- */}
      <div className="hero-content w-full">
        <div className="container-site">
          <div className="flex flex-col items-start max-w-3xl">
            {/* ----------------------------------------------------------
                헤드라인
                .hero-headline: GSAP가 내부 .word 요소를 순차 애니메이션
                .text-display: clamp(2.25rem, 6vw, 4.5rem), weight 800
                ---------------------------------------------------------- */}
            <h1 className="hero-headline text-display text-primary font-display">
              {splitIntoWords(t("title"))}
            </h1>

            {/* ----------------------------------------------------------
                서브헤드라인
                .hero-subheadline: GSAP y:30 -> 0 등장
                .text-lead: clamp(1rem, 1.5vw, 1.25rem)
                ---------------------------------------------------------- */}
            <p className="hero-subheadline text-lead text-primary/70 mt-6 md:mt-8 max-w-xl whitespace-pre-line">
              {t("subtitle")}
            </p>

            {/* ----------------------------------------------------------
                CTA 버튼 그룹
                각 Button에 .hero-cta 클래스 -> GSAP stagger 애니메이션 대상
                ---------------------------------------------------------- */}
            <div className="flex flex-col sm:flex-row gap-4 mt-8 md:mt-10">
              {/* Primary CTA */}
              <Link
                href="/products"
                className="hero-cta inline-flex items-center justify-center px-6 py-3 text-sm font-semibold tracking-wide text-white bg-primary rounded-squircle-md transition-all duration-200 hover:bg-primary-light"
              >
                {t("ctaPrimary")}
              </Link>

            </div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------
          스크롤 힌트
          .hero-scroll-hint: GSAP 페이드인 + 반복 바운스
          하단 중앙에 절대 배치
          ---------------------------------------------------------------- */}
      <button
        type="button"
        onClick={handleScrollDown}
        className="hero-scroll-hint absolute bottom-8 left-1/2 -translate-x-1/2 z-2 flex flex-col items-center gap-2 text-white/70 hover:text-white transition-colors duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-full p-2"
        aria-label={t("scrollHint")}
      >
        {/* Chevron Down SVG 아이콘 */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>

        <span className="text-xs tracking-widest uppercase font-medium">
          {t("scrollHint")}
        </span>
      </button>
    </section>
  );
}

export default HeroSection;
