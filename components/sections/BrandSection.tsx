"use client";

import { useTranslations } from "next-intl";
import { useScrollFadeIn } from "@/hooks/useScrollFadeIn";

/* ==========================================================================
   BrandSection -- 브랜드소개 섹션

   구성:
   1. 섹션 헤더 (배지 + 제목 + 골드 디바이더)
   2. CEO 인사말 영역 (큰 따옴표 아이콘 + 3문단 텍스트 + 서명)
   3. 보유 인증 배지 5개 가로 나열 (glass 효과 카드)

   GSAP 애니메이션:
   - useScrollFadeIn 훅으로 스크롤 기반 순차 등장
   ========================================================================== */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CertificationItem {
  /** 인증 이름 번역 키 */
  nameKey: "iso9001" | "iso14001" | "kgsp" | "venture" | "innobiz";
  /** 인증 설명 번역 키 */
  descKey:
    | "iso9001Desc"
    | "iso14001Desc"
    | "kgspDesc"
    | "ventureDesc"
    | "innobizDesc";
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** 보유 인증 5개 목록 */
const CERTIFICATIONS: CertificationItem[] = [
  { nameKey: "iso9001", descKey: "iso9001Desc" },
  { nameKey: "iso14001", descKey: "iso14001Desc" },
  { nameKey: "kgsp", descKey: "kgspDesc" },
  { nameKey: "venture", descKey: "ventureDesc" },
  { nameKey: "innobiz", descKey: "innobizDesc" },
];

// ---------------------------------------------------------------------------
// SVG Icons (인라인)
// ---------------------------------------------------------------------------

/** 큰 따옴표 장식 아이콘 — CEO 인사말 상단 */
function QuoteIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M11.3 2.7c-.4-.4-1-.5-1.5-.2C5.3 5.2 2 9.5 2 14.5 2 18.6 4.5 21 7.5 21c2.5 0 4.5-2 4.5-4.5 0-2.3-1.8-4.2-4-4.5.3-2.5 2-4.8 4.2-6.4.5-.4.6-1 .2-1.5l-1.1-1.4zM22.3 2.7c-.4-.4-1-.5-1.5-.2C16.3 5.2 13 9.5 13 14.5c0 4.1 2.5 6.5 5.5 6.5 2.5 0 4.5-2 4.5-4.5 0-2.3-1.8-4.2-4-4.5.3-2.5 2-4.8 4.2-6.4.5-.4.6-1 .2-1.5l-1.1-1.4z" />
    </svg>
  );
}

/** ISO 인증 아이콘 — 체크마크 서클 */
function CertCheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
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
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

/** 방패 인증 아이콘 — 벤처/Inno-Biz */
function CertShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
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

/** KGSP 의약품 아이콘 */
function CertMedicalIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M12 10v6" />
      <path d="M9 13h6" />
    </svg>
  );
}

/** 인증 유형에 따른 아이콘 매핑 */
function getCertIcon(nameKey: CertificationItem["nameKey"]) {
  switch (nameKey) {
    case "iso9001":
    case "iso14001":
      return CertCheckIcon;
    case "kgsp":
      return CertMedicalIcon;
    case "venture":
    case "innobiz":
      return CertShieldIcon;
    default:
      return CertCheckIcon;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BrandSection() {
  const t = useTranslations("brand");

  // ----- useScrollFadeIn refs -----
  const headerRef = useScrollFadeIn({ direction: "up" });
  const quoteRef = useScrollFadeIn({ direction: "up", duration: 1 });
  const paragraphsRef = useScrollFadeIn({ direction: "up", stagger: 0.2 });
  const signatureRef = useScrollFadeIn({ direction: "up" });
  const certHeaderRef = useScrollFadeIn({ direction: "up" });
  const certGridRef = useScrollFadeIn({ direction: "up", stagger: 0.1 });

  return (
    <section
      id="brand"
      className="section bg-primary"
      aria-label={t("title")}
    >
      <div className="container-site">
        {/* ================================================================
            1. 섹션 헤더
            ================================================================ */}
        <div ref={headerRef} className="text-center mb-16 md:mb-20">
          {/* 서브타이틀 배지 — 다크 배경 위 glass 스타일 */}
          <span className="badge glass text-accent/90 mb-4 inline-flex">
            {t("ceoGreeting.title")}
          </span>

          {/* 섹션 제목 */}
          <h2 className="text-heading !text-white mt-3">
            {t("title")}
          </h2>

          {/* 골드 디바이더 */}
          <div className="divider-gold mx-auto mt-6" />
        </div>

        {/* ================================================================
            2. CEO 인사말 영역
            ================================================================ */}
        <div className="max-w-3xl mx-auto mb-20 md:mb-24">
          {/* 큰 따옴표 장식 아이콘 */}
          <div ref={quoteRef} className="mb-8">
            <QuoteIcon className="text-secondary/60" />
          </div>

          {/* 3문단 인사말 텍스트 */}
          <div ref={paragraphsRef} className="space-y-8 md:space-y-10 text-center">
            <p className="text-lg md:text-xl text-white/85 leading-loose whitespace-pre-line">
              {t("ceoGreeting.paragraph1")}
            </p>
            <p className="text-lg md:text-xl text-white/85 leading-loose whitespace-pre-line">
              {t("ceoGreeting.paragraph2")}
            </p>
            <p className="text-lg md:text-xl text-white/85 leading-loose whitespace-pre-line">
              {t("ceoGreeting.paragraph3")}
            </p>
          </div>

          {/* 닫는 따옴표 장식 아이콘 */}
          <div className="mt-8 flex justify-end">
            <QuoteIcon className="text-secondary/60 rotate-180" />
          </div>

          {/* 서명 영역 */}
          <div ref={signatureRef} className="mt-10 md:mt-12 pt-8 border-t border-white/10">
            <div className="flex flex-col items-end">
              <p className="text-sm text-white/50 tracking-wider uppercase">
                {t("ceoGreeting.name")}
              </p>
              {/* 서명 장식선 */}
              <div className="w-12 h-[2px] bg-gradient-gold my-2" aria-hidden="true" />
              <p className="text-xl md:text-2xl font-bold text-white">
                {t("ceoGreeting.ceoName")}
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

export default BrandSection;
