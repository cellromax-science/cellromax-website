"use client";

import { useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useScrollFadeIn } from "@/hooks/useScrollFadeIn";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";

/* ==========================================================================
   AboutSection -- 회사소개 섹션

   구성:
   1. 섹션 헤더 (제목 + 서브타이틀 + 골드 디바이더)
   2. 미션/비전 2컬럼 카드
   3. 경영철학 3대 가치 카드 (The Best / The Trust / The Pride)
   4. 통계 카운트업 (업력, 제품 수, 파트너사, 수출 국가)

   GSAP 애니메이션:
   - useScrollFadeIn 훅으로 스크롤 기반 순차 등장
   - 통계 숫자는 별도 GSAP 카운트업 애니메이션 (ScrollTrigger)
   ========================================================================== */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StatItem {
  /** 번역 키 (about.stats.*) */
  labelKey: "years" | "products" | "partners";
  /** 카운트업 최종 수치 */
  value: number;
  /** 단위 접미사 */
  suffix: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** 통계 데이터 — 순서: 회원약국수, 제품 수, 업력 */
const STATS: StatItem[] = [
  { labelKey: "partners", value: 8099, suffix: "+" },
  { labelKey: "products", value: 200, suffix: "+" },
  { labelKey: "years", value: 11, suffix: "+" },
];

// ---------------------------------------------------------------------------
// SVG Icons (인라인)
// ---------------------------------------------------------------------------

/** 미션 아이콘 — 과녁/타겟 */
function MissionIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

/** 비전 아이콘 — 로켓/성장 */
function VisionIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}

/** The Best 아이콘 — 왕관/별 */
function BestIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 .448.378l5.897 2.74a.5.5 0 0 1 .27.868l-4.554 3.927a1 1 0 0 0-.317.507l-1.17 6.2a.5.5 0 0 1-.813.353l-4.87-3.523a1 1 0 0 0-.59-.19h-.001a1 1 0 0 0-.59.19l-4.87 3.523a.5.5 0 0 1-.812-.353l-1.17-6.2a1 1 0 0 0-.318-.507L1.116 12.856a.5.5 0 0 1 .27-.868l5.897-2.74a1 1 0 0 0 .448-.378l2.952-5.604z" />
    </svg>
  );
}

/** The Trust 아이콘 — 방패 */
function TrustIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

/** The Pride 아이콘 — 다이아몬드/트로피 */
function PrideIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 3h12l4 6-10 13L2 9z" />
      <path d="M11 3l1 10" />
      <path d="M2 9h20" />
      <path d="M6.5 3 12 13" />
      <path d="M17.5 3 12 13" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AboutSection() {
  const t = useTranslations("about");

  // ----- useScrollFadeIn refs -----
  const headerRef = useScrollFadeIn({ direction: "up" });
  const missionVisionRef = useScrollFadeIn({ direction: "up", stagger: 0.15 });
  const valuesHeaderRef = useScrollFadeIn({ direction: "up" });
  const valuesRef = useScrollFadeIn({ direction: "up", stagger: 0.12 });
  const statsRef = useScrollFadeIn({ direction: "up", stagger: 0.1 });

  // ----- 카운트업 애니메이션 refs -----
  const statNumberRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    // 접근성: 모션 감소 설정 시 즉시 최종 값 표시
    if (prefersReducedMotion()) {
      STATS.forEach((stat, i) => {
        const el = statNumberRefs.current[i];
        if (el) {
          el.textContent = stat.value.toLocaleString();
        }
      });
      return;
    }

    const ctx = gsap.context(() => {
      STATS.forEach((stat, i) => {
        const el = statNumberRefs.current[i];
        if (!el) return;

        // 초기 값을 0으로 표시
        el.textContent = "0";

        const obj = { val: 0 };

        gsap.to(obj, {
          val: stat.value,
          duration: 2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            once: true,
          },
          onUpdate: () => {
            el.textContent = Math.floor(obj.val).toLocaleString();
          },
        });
      });
    });

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <section
      id="about"
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

          {/* 회사소개 설명 */}
          <p className="text-lead text-gray-600 mt-14 leading-relaxed text-center whitespace-pre-line">
            {t("description")}
          </p>
        </div>

        {/* ================================================================
            2. 미션 / 비전 2컬럼 카드
            ================================================================ */}
        <div
          ref={missionVisionRef}
          className="grid grid-cols-1 md:grid-cols-2 items-stretch gap-6 md:gap-8 mb-16 md:mb-20"
        >
          {/* ---- 미션 카드 ---- */}
          <div className="card relative overflow-hidden p-8 md:p-10">
            {/* 상단 accent bar — 골드 그라데이션 */}
            <div
              className="absolute top-0 left-0 right-0 h-1 bg-gradient-gold"
              aria-hidden="true"
            />

            {/* 아이콘 */}
            <div className="w-14 h-14 flex items-center justify-center bg-secondary/10 squircle-md mb-6">
              <MissionIcon className="text-secondary" />
            </div>

            {/* 제목 */}
            <h3 className="text-2xl font-bold text-primary mb-1">
              {t("mission.title")}
            </h3>
            <span className="text-sm font-semibold tracking-wider uppercase text-secondary">
              Mission
            </span>

            {/* 설명 */}
            <p className="text-lead text-gray-600 mt-4 leading-relaxed">
              {t("mission.description")}
            </p>
          </div>

          {/* ---- 비전 카드 ---- */}
          <div className="card relative overflow-hidden p-8 md:p-10">
            {/* 상단 accent bar — 네이비 그라데이션 */}
            <div
              className="absolute top-0 left-0 right-0 h-1 bg-gradient-brand"
              aria-hidden="true"
            />

            {/* 아이콘 */}
            <div className="w-14 h-14 flex items-center justify-center bg-primary/10 squircle-md mb-6">
              <VisionIcon className="text-primary" />
            </div>

            {/* 제목 */}
            <h3 className="text-2xl font-bold text-primary mb-1">
              {t("vision.title")}
            </h3>
            <span className="text-sm font-semibold tracking-wider uppercase text-primary-light">
              Vision
            </span>

            {/* 설명 */}
            <p className="text-lead text-gray-600 mt-4 leading-relaxed">
              {t("vision.description")}
            </p>
          </div>
        </div>

        {/* ================================================================
            3. 경영철학 3대 가치 카드
            ================================================================ */}
        <div ref={valuesHeaderRef} className="text-center mb-10 md:mb-12">
          <h3 className="text-heading text-primary">
            {t("values.title")}
          </h3>
          <div className="divider-gold mx-auto mt-4" />
        </div>

        <div
          ref={valuesRef}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 md:mb-20"
        >
          {/* ---- The Best ---- */}
          <div className="bg-primary squircle-lg p-8 md:p-10 text-white relative overflow-hidden group">
            {/* 배경 장식 — 우측 상단 미묘한 원형 */}
            <div
              className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/[0.03]"
              aria-hidden="true"
            />

            {/* 번호 + 아이콘 */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 flex items-center justify-center glass squircle-md">
                <BestIcon className="text-accent" />
              </div>
              <span className="text-sm font-bold text-white/40 tracking-widest">
                01
              </span>
            </div>

            {/* 타이틀 */}
            <h4 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
              {t("values.best.title")}
            </h4>

            {/* 설명 */}
            <p className="text-white/70 leading-relaxed">
              {t("values.best.description")}
            </p>
          </div>

          {/* ---- The Trust ---- */}
          <div className="bg-primary squircle-lg p-8 md:p-10 text-white relative overflow-hidden group">
            <div
              className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/[0.03]"
              aria-hidden="true"
            />

            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 flex items-center justify-center glass squircle-md">
                <TrustIcon className="text-accent" />
              </div>
              <span className="text-sm font-bold text-white/40 tracking-widest">
                02
              </span>
            </div>

            <h4 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
              {t("values.trust.title")}
            </h4>

            <p className="text-white/70 leading-relaxed">
              {t("values.trust.description")}
            </p>
          </div>

          {/* ---- The Pride ---- */}
          <div className="bg-primary squircle-lg p-8 md:p-10 text-white relative overflow-hidden group">
            <div
              className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/[0.03]"
              aria-hidden="true"
            />

            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 flex items-center justify-center glass squircle-md">
                <PrideIcon className="text-accent" />
              </div>
              <span className="text-sm font-bold text-white/40 tracking-widest">
                03
              </span>
            </div>

            <h4 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
              {t("values.pride.title")}
            </h4>

            <p className="text-white/70 leading-relaxed">
              {t("values.pride.description")}
            </p>
          </div>
        </div>

        {/* ================================================================
            4. 통계 카운트업
            ================================================================ */}
        <div
          ref={statsRef}
          className="grid grid-cols-3 gap-6 md:gap-8"
        >
          {STATS.map((stat, index) => (
            <div
              key={stat.labelKey}
              className="text-center p-6 md:p-8"
            >
              {/* 숫자 + 접미사 */}
              <div className="flex items-baseline justify-center gap-1">
                <span
                  ref={(el) => {
                    statNumberRefs.current[index] = el;
                  }}
                  className="text-4xl md:text-5xl font-extrabold text-primary tabular-nums"
                  aria-label={`${stat.value}${stat.suffix}`}
                >
                  {stat.value.toLocaleString()}
                </span>
                <span className="text-2xl md:text-3xl font-bold text-secondary">
                  {stat.suffix}
                </span>
              </div>

              {/* 레이블 */}
              <p className="mt-2 text-sm md:text-base font-medium text-gray-500 tracking-wide">
                {t(`stats.${stat.labelKey}`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default AboutSection;
