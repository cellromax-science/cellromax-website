"use client";

import { useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useScrollFadeIn } from "@/hooks/useScrollFadeIn";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";

/* ==========================================================================
   PartnersSection -- 글로벌 파트너사 섹션

   구성:
   1. 섹션 헤더 (배지 + 제목 + 골드 디바이더)
   2. GSAP 무한 로고 슬라이더 (16개 파트너사 로고 카드)

   GSAP 애니메이션:
   - useScrollFadeIn 훅으로 헤더 스크롤 기반 순차 등장
   - 로고 슬라이더: xPercent 0 → -50 무한 반복 (seamless loop)
   - 마우스 호버 시 일시정지 / 마우스 나감 시 재생
   - prefersReducedMotion 설정 시 슬라이더 정지, 모든 로고 정적 표시
   ========================================================================== */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PartnerItem {
  /** 파트너사 이름 */
  name: string;
  /** 원료 또는 역할 설명 */
  description: string;
  /** 국가 */
  country: string;
  /** 로고 이미지 파일 경로 (public 기준) */
  logo: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** 16개 글로벌 파트너사 데이터 */
const PARTNERS: PartnerItem[] = [
  {
    name: "노바렉스",
    description: "OEM 제조",
    country: "한국",
    logo: "/logos/partners/노바렉스_제조.jpg",
  },
  {
    name: "코스맥스",
    description: "화장품 OEM",
    country: "한국",
    logo: "/logos/partners/코스맥스_제조.jpg",
  },
  {
    name: "장생도라지",
    description: "도라지 원료",
    country: "한국",
    logo: "/logos/partners/장생도라지_장생도라지.jpg",
  },
  {
    name: "APIS FLORA",
    description: "그린프로폴리스",
    country: "브라질",
    logo: "/logos/partners/ApisFlora_그린프로폴리스.jpg",
  },
  {
    name: "DSM",
    description: "비타민D",
    country: "네덜란드",
    logo: "/logos/partners/DSM_비타민D.jpg",
  },
  {
    name: "DSM",
    description: "루테인",
    country: "네덜란드",
    logo: "/logos/partners/DSM_루테인.jpg",
  },
  {
    name: "Horphag",
    description: "피크노제놀",
    country: "프랑스",
    logo: "/logos/partners/Horphag_피크노제놀.jpg",
  },
  {
    name: "Ingredia",
    description: "락티움",
    country: "프랑스",
    logo: "/logos/partners/Ingredia_락티움.jpg",
  },
  {
    name: "Chr.HANSEN",
    description: "유산균 BB-12",
    country: "덴마크",
    logo: "/logos/partners/chrhansen_유산균(BB-12).jpg",
  },
  {
    name: "Chr.HANSEN",
    description: "유산균 LA-5",
    country: "덴마크",
    logo: "/logos/partners/chrhansen_유산균(LA-5).jpg",
  },
  {
    name: "Chr.HANSEN",
    description: "유산균 LGG",
    country: "덴마크",
    logo: "/logos/partners/Chrhansen_유산균(LGG).jpg",
  },
  {
    name: "KANEKA",
    description: "코엔자임Q10",
    country: "일본",
    logo: "/logos/partners/Kaneka_코엔자임큐텐.jpg",
  },
  {
    name: "ALASKOMEGA",
    description: "오메가3",
    country: "미국",
    logo: "/logos/partners/AlaskOmega_오메가3.jpg",
  },
  {
    name: "PANMOL",
    description: "퀴노아 비타민",
    country: "독일",
    logo: "/logos/partners/Panmol_비타민.jpg",
  },
  {
    name: "Balchem",
    description: "OptiMSM",
    country: "미국",
    logo: "/logos/partners/Balchem_OptiMSM.jpg",
  },
  {
    name: "Pharmalink",
    description: "리프리놀",
    country: "뉴질랜드",
    logo: "/logos/partners/Pharmalinkinternationl_리프리놀.jpg",
  },
];

/** 슬라이더 속도 — 한 바퀴 완주 시간 (초) */
const SLIDER_DURATION = 35;

// ---------------------------------------------------------------------------
// Sub-Components
// ---------------------------------------------------------------------------

/** 개별 파트너사 로고 카드 */
function PartnerCard({ partner }: { partner: PartnerItem }) {
  return (
    <div
      className="
        flex-shrink-0
        w-[140px] h-[100px]
        sm:w-[180px] sm:h-[120px]
        bg-white
        squircle-lg
        border border-gray-100
        shadow-xs
        flex flex-col items-center justify-center
        p-3 sm:p-4
        transition-shadow duration-normal
        hover:shadow-md
      "
    >
      {/* 로고 이미지 */}
      <div className="relative w-full h-[48px] sm:h-[56px] flex items-center justify-center">
        <Image
          src={partner.logo}
          alt={`${partner.name} - ${partner.description}`}
          width={140}
          height={56}
          sizes="(max-width: 640px) 120px, 140px"
          className="object-contain max-h-full"
        />
      </div>

      {/* 파트너사명 + 원료/역할 */}
      <div className="mt-2 text-center w-full">
        <p className="text-xs font-semibold text-primary leading-tight truncate">
          {partner.name}
        </p>
        <p className="text-[10px] sm:text-xs text-gray-400 leading-tight mt-0.5 truncate">
          {partner.description}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PartnersSection() {
  const t = useTranslations("partners");

  // ----- useScrollFadeIn refs -----
  const headerRef = useScrollFadeIn({ direction: "up" });

  // ----- 슬라이더 refs -----
  const sliderRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  // ----- 마우스 호버 핸들러 -----
  const handleMouseEnter = useCallback(() => {
    tweenRef.current?.pause();
  }, []);

  const handleMouseLeave = useCallback(() => {
    tweenRef.current?.resume();
  }, []);

  // ----- GSAP 무한 슬라이더 애니메이션 -----
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    // 접근성: 모션 감소 설정 시 슬라이더 정지
    if (prefersReducedMotion()) {
      gsap.set(track, { xPercent: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      // 트랙을 xPercent: 0 → -50 으로 이동 (2벌 복제이므로 -50%가 원점 복귀)
      tweenRef.current = gsap.to(track, {
        xPercent: -50,
        duration: SLIDER_DURATION,
        ease: "none",
        repeat: -1,
      });
    });

    return () => {
      tweenRef.current = null;
      ctx.revert();
    };
  }, []);

  // 2벌 복제 배열 (seamless loop 용)
  const duplicatedPartners = [...PARTNERS, ...PARTNERS];

  return (
    <section
      id="partners"
      className="section bg-surface"
      aria-label={t("title")}
    >
      {/* ================================================================
          1. 섹션 헤더
          ================================================================ */}
      <div className="container-site">
        <div ref={headerRef} className="text-center mb-12 md:mb-16">
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
      </div>

      {/* ================================================================
          2. 무한 로고 슬라이더
          ================================================================ */}
      <div
        ref={sliderRef}
        className="relative w-full overflow-hidden"
        role="region"
        aria-roledescription="carousel"
        aria-label="파트너사 로고 슬라이더"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleMouseEnter}
        onTouchEnd={handleMouseLeave}
      >
        {/* 좌우 페이드 마스크 — 시각적으로 양쪽 끝을 부드럽게 사라지게 */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-24 z-10 bg-gradient-to-r from-surface to-transparent"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-24 z-10 bg-gradient-to-l from-surface to-transparent"
          aria-hidden="true"
        />

        {/* 슬라이더 트랙 — 로고 카드 2벌 배치 */}
        <div
          ref={trackRef}
          className="flex gap-5 sm:gap-7 py-4 will-change-transform"
        >
          {duplicatedPartners.map((partner, index) => (
            <PartnerCard
              key={`${partner.name}-${partner.description}-${index}`}
              partner={partner}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default PartnersSection;
