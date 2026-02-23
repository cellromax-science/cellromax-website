"use client";

import { useRef, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useScrollFadeIn } from "@/hooks/useScrollFadeIn";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";

/* ==========================================================================
   HistorySection -- 연혁 섹션

   구성:
   1. 섹션 헤더 (배지 + 제목 + 골드 디바이더)
   2. 타임라인: 중앙 수직선 + 좌우 교차 아코디언 카드

   레이아웃:
   - 데스크탑(md 이상): 중앙 수직선, 홀수 인덱스=왼쪽 / 짝수 인덱스=오른쪽
   - 모바일(md 미만): 왼쪽 수직선 + 오른쪽 카드 단일 컬럼

   아코디언:
   - 각 카드는 접힌 상태(연도 + "+" 아이콘)로 시작
   - 클릭 시 grid-template-rows 0fr → 1fr 트랜지션으로 확장
   - 한 번에 하나의 카드만 펼침 (다른 카드 클릭 시 이전 카드 닫힘)

   GSAP 애니메이션:
   - 중앙 수직선: ScrollTrigger scrub으로 scaleY 0 -> 1
   - 각 연혁 카드: ScrollTrigger로 opacity 0 -> 1 + translateY 등장
   - 각 도트: ScrollTrigger로 scale 0 -> 1 등장
   - prefersReducedMotion 체크 필수
   ========================================================================== */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HistoryItem {
  /** 연도 */
  year: number;
  /** 번역 키 (history.*) */
  translationKey: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** 연혁 데이터 (2014~2025, 시간 역순: 최신이 위) */
const HISTORY_DATA: HistoryItem[] = [
  { year: 2025, translationKey: "2025" },
  { year: 2024, translationKey: "2024" },
  { year: 2023, translationKey: "2023" },
  { year: 2022, translationKey: "2022" },
  { year: 2021, translationKey: "2021" },
  { year: 2020, translationKey: "2020" },
  { year: 2019, translationKey: "2019" },
  { year: 2018, translationKey: "2018" },
  { year: 2017, translationKey: "2017" },
  { year: 2016, translationKey: "2016" },
  { year: 2015, translationKey: "2015" },
  { year: 2014, translationKey: "2014" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HistorySection() {
  const t = useTranslations("history");

  // ----- 아코디언 상태: 현재 열린 연도 (null이면 모두 접힘) -----
  const [openYear, setOpenYear] = useState<number | null>(null);

  const handleToggle = (year: number) => {
    setOpenYear((prev) => (prev === year ? null : year));
  };

  // ----- useScrollFadeIn refs -----
  const headerRef = useScrollFadeIn({ direction: "up" });

  // ----- GSAP 타임라인 refs -----
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dotRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const container = timelineContainerRef.current;
    const line = lineRef.current;
    if (!container || !line) return;

    // 접근성: 모션 감소 설정 시 즉시 표시
    if (prefersReducedMotion()) {
      gsap.set(line, { scaleY: 1 });
      cardRefs.current.forEach((card) => {
        if (card) gsap.set(card, { opacity: 1, y: 0 });
      });
      dotRefs.current.forEach((dot) => {
        if (dot) gsap.set(dot, { scale: 1, opacity: 1 });
      });
      return;
    }

    const ctx = gsap.context(() => {
      // ------------------------------------------------------------------
      // 중앙 수직선: scaleY 0 -> 1, scrub 애니메이션
      // ------------------------------------------------------------------
      gsap.fromTo(
        line,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: container,
            start: "top 70%",
            end: "bottom 30%",
            scrub: 1,
          },
        }
      );

      // ------------------------------------------------------------------
      // 각 연혁 카드: 순차 등장
      // ------------------------------------------------------------------
      cardRefs.current.forEach((card, index) => {
        if (!card) return;

        // 데스크탑에서 좌우 교차 방향 결정
        // 홀수 인덱스(0, 2, 4...): 왼쪽 -> translateX 보정 불필요 (CSS로 배치)
        // 모바일에서는 항상 아래에서 위로
        gsap.from(card, {
          y: 50,
          opacity: 0,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: {
            trigger: card,
            start: "top 85%",
            once: true,
          },
          delay: index * 0.05, // 미세한 지연으로 자연스러운 순차 효과
        });
      });

      // ------------------------------------------------------------------
      // 도트 애니메이션: 스케일 팝인
      // ------------------------------------------------------------------
      dotRefs.current.forEach((dot, index) => {
        if (!dot) return;

        gsap.from(dot, {
          scale: 0,
          opacity: 0,
          duration: 0.4,
          ease: "back.out(1.7)",
          delay: index * 0.05,
          scrollTrigger: {
            trigger: dot,
            start: "top 85%",
            once: true,
          },
        });
      });
    }, container);

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <section
      id="history"
      className="section bg-surface"
      aria-label={t("title")}
    >
      <div className="container-site">
        {/* ================================================================
            1. 섹션 헤더
            ================================================================ */}
        <div ref={headerRef} className="text-center mb-16 md:mb-20">
          {/* 서브타이틀 배지 */}
          <span className="badge badge-gold mb-4 inline-flex">
            {t("subtitle")}
          </span>

          {/* 섹션 제목 */}
          <h2 className="text-heading text-primary mt-3">
            {t("title")}
          </h2>

          {/* 골드 디바이더 */}
          <div className="divider-gold mx-auto mt-6" />
        </div>

        {/* ================================================================
            2. 타임라인
            ================================================================ */}
        <div
          ref={timelineContainerRef}
          className="relative max-w-5xl mx-auto"
        >
          {/* --------------------------------------------------------------
              중앙/좌측 수직선
              데스크탑: 중앙 (left: 50%)
              모바일: 왼쪽 (left: 1.25rem)
              transform-origin: top으로 scaleY 0->1 애니메이션
              -------------------------------------------------------------- */}
          <div
            ref={lineRef}
            className="absolute top-0 bottom-0 left-5 md:left-1/2 w-[2px] bg-gradient-to-b from-secondary via-secondary/50 to-secondary/20 origin-top md:-translate-x-1/2"
            aria-hidden="true"
          />

          {/* 연혁 카드 목록 */}
          <div className="relative">
            {HISTORY_DATA.map((item, index) => {
              const isLeft = index % 2 === 0; // 짝수 인덱스 = 왼쪽 (데스크탑)

              return (
                <div
                  key={item.year}
                  className={`
                    relative flex items-start
                    mb-8 md:mb-12 last:mb-0
                    ${/* 모바일: 항상 왼쪽 패딩 */""}
                    pl-12 md:pl-0
                    ${/* 데스크탑: 좌우 교차 배치 */""}
                    ${isLeft
                      ? "md:flex-row md:justify-end md:pr-[calc(50%+2rem)] md:pl-0"
                      : "md:flex-row md:justify-start md:pl-[calc(50%+2rem)] md:pr-0"
                    }
                  `}
                >
                  {/* ---- 중앙선 위 원형 도트 ---- */}
                  <div
                    ref={(el) => {
                      dotRefs.current[index] = el;
                    }}
                    className={`
                      absolute top-2
                      ${/* 모바일: 왼쪽 라인 위 */""}
                      left-[calc(1.25rem-5px)]
                      ${/* 데스크탑: 중앙선 위 */""}
                      md:left-1/2 md:-translate-x-1/2
                      w-3 h-3 rounded-full bg-secondary
                      ring-4 ring-surface
                      z-10
                    `}
                    aria-hidden="true"
                  />

                  {/* ---- 연혁 아코디언 카드 ---- */}
                  <div
                    ref={(el) => {
                      cardRefs.current[index] = el;
                    }}
                    className="card relative w-full group overflow-hidden"
                  >
                    {/* 상단 골드 accent bar */}
                    <div
                      className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-gold opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      aria-hidden="true"
                    />

                    {/* 클릭 가능한 헤더 영역 */}
                    <button
                      type="button"
                      onClick={() => handleToggle(item.year)}
                      aria-expanded={openYear === item.year}
                      className="flex items-center justify-between gap-4 w-full p-6 md:p-8 text-left cursor-pointer"
                    >
                      <div className="min-w-0">
                        <span className="text-2xl md:text-3xl font-extrabold text-gradient-gold tabular-nums">
                          {item.year}
                        </span>
                        <p className="mt-2 text-sm md:text-base text-gray-500 truncate">
                          {t(item.translationKey)}
                        </p>
                      </div>

                      {/* +/− 토글 아이콘 */}
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        className="text-secondary shrink-0 transition-transform duration-300"
                        style={{
                          transform: openYear === item.year ? "rotate(45deg)" : "rotate(0deg)",
                        }}
                        aria-hidden="true"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>

                    {/* 확장 가능한 내용 영역 (grid-rows 트랜지션) */}
                    <div
                      className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                      style={{
                        gridTemplateRows: openYear === item.year ? "1fr" : "0fr",
                      }}
                    >
                      <div className="overflow-hidden">
                        <p className="px-6 md:px-8 pb-6 md:pb-8 text-sm md:text-base text-gray-600 leading-relaxed whitespace-pre-line">
                          {t(`detail${item.year}`)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default HistorySection;
