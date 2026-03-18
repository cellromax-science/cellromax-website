"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useScrollFadeIn } from "@/hooks/useScrollFadeIn";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";

/* ==========================================================================
   PartnersSection -- 글로벌 파트너사 섹션

   구성:
   1. 섹션 헤더 (배지 + 제목 + 골드 디바이더)
   2. 스크롤 반응형 로고 그리드 (16개 파트너사 로고 카드)

   GSAP 애니메이션:
   - useScrollFadeIn 훅으로 헤더 스크롤 기반 순차 등장
   - 로고 카드: 스크롤 시 행(row) 단위로 순차 페이드인 + 위로 등장
   - prefersReducedMotion 설정 시 모든 애니메이션 비활성화, 즉시 표시
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

/** 행 단위 stagger 딜레이 (초) */
const ROW_STAGGER = 0.15;

/** 카드 개별 stagger 딜레이 (초) */
const CARD_STAGGER = 0.06;

// ---------------------------------------------------------------------------
// Sub-Components
// ---------------------------------------------------------------------------

/** 개별 파트너사 로고 카드 */
function PartnerCard({ partner }: { partner: PartnerItem }) {
  return (
    <div
      className="
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

  // ----- 그리드 ref -----
  const gridRef = useRef<HTMLDivElement>(null);

  // ----- GSAP 스크롤 기반 행 단위 등장 애니메이션 -----
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const cards = Array.from(grid.children) as HTMLElement[];
    if (cards.length === 0) return;

    // 접근성: 모션 감소 설정 시 즉시 표시
    if (prefersReducedMotion()) {
      gsap.set(cards, { opacity: 1, y: 0 });
      return;
    }

    // 초기 상태: 숨김
    gsap.set(cards, { opacity: 0, y: 30 });

    const ctx = gsap.context(() => {
      // 행(row) 단위로 그룹핑: 같은 offsetTop을 가진 카드끼리 묶기
      const rows: HTMLElement[][] = [];
      let currentRowTop = -1;

      cards.forEach((card) => {
        const cardTop = card.offsetTop;
        if (cardTop !== currentRowTop) {
          rows.push([]);
          currentRowTop = cardTop;
        }
        rows[rows.length - 1].push(card);
      });

      // 각 행을 ScrollTrigger로 개별 등장
      rows.forEach((rowCards, rowIndex) => {
        gsap.to(rowCards, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: CARD_STAGGER,
          ease: "power3.out",
          delay: rowIndex * ROW_STAGGER,
          scrollTrigger: {
            trigger: rowCards[0],
            start: "top 90%",
            once: true,
          },
        });
      });
    }, grid);

    return () => {
      ctx.revert();
    };
  }, []);

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
          2. 스크롤 반응형 로고 그리드
          ================================================================ */}
      <div className="container-site">
        <div
          ref={gridRef}
          className="
            grid
            grid-cols-3
            sm:grid-cols-4
            md:grid-cols-5
            lg:grid-cols-6
            xl:grid-cols-8
            gap-3 sm:gap-4 md:gap-5
          "
          role="list"
          aria-label="파트너사 목록"
        >
          {PARTNERS.map((partner, index) => (
            <div
              key={`${partner.name}-${partner.description}-${index}`}
              role="listitem"
            >
              <PartnerCard partner={partner} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default PartnersSection;
