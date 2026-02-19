"use client";

import { useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { NAV_ITEMS } from "@/components/layout/Header";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

/* ==========================================================================
   MobileMenu Component — Cellromax Science

   풀스크린 모바일 내비게이션 오버레이
   - CSS transition 기반 열림/닫힘 애니메이션
   - body scroll lock
   - ESC 키 닫기 + aria-modal 접근성
   ========================================================================== */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// MobileMenu Component
// ---------------------------------------------------------------------------

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const pathname = usePathname();

  // --- 현재 경로 active 판별 ---
  const isActive = (href: string): boolean => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  // --- body scroll lock ---
  useEffect(() => {
    if (isOpen) {
      // 현재 스크롤 위치 저장 후 overflow 숨김
      const scrollY = window.scrollY;
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";

      return () => {
        document.body.style.overflow = "";
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // --- ESC 키로 닫기 ---
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, handleKeyDown]);

  // --- 링크 클릭 핸들러 ---
  const handleLinkClick = () => {
    onClose();
  };

  // isOpen이 false면 렌더링하지 않음
  if (!isOpen) return null;

  return (
    <div
      id="mobile-menu"
      role="dialog"
      aria-modal="true"
      aria-label="모바일 내비게이션 메뉴"
      className={[
        "fixed inset-0 z-[300]",
        // 등장 애니메이션: opacity 페이드인
        "animate-fade-in",
      ].join(" ")}
    >
      {/* ----------------------------------------------------------------
          배경 오버레이
          ---------------------------------------------------------------- */}
      <div
        className="absolute inset-0 bg-primary/95 backdrop-blur-xl"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ----------------------------------------------------------------
          메뉴 콘텐츠
          ---------------------------------------------------------------- */}
      <div className="relative flex h-full flex-col px-6 py-4">
        {/* --- 상단: 로고 + 닫기 버튼 --- */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="font-display font-bold text-xl tracking-widest text-white transition-colors duration-300 hover:text-secondary hover:opacity-100"
            onClick={handleLinkClick}
            aria-label={t("home")}
          >
            CELLROMAX
          </Link>

          <button
            type="button"
            className={[
              "flex items-center justify-center",
              "w-10 h-10 rounded-lg",
              "text-white/80 transition-colors duration-200",
              "hover:bg-white/10 hover:text-white",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
            ].join(" ")}
            onClick={onClose}
            aria-label={tCommon("close")}
          >
            {/* X 아이콘 */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-6 w-6"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* --- 골드 디바이더 --- */}
        <div className="mt-6 mb-8">
          <div className="divider-gold" />
        </div>

        {/* --- 중앙: 세로 네비게이션 링크 --- */}
        <nav className="flex flex-1 flex-col justify-center -mt-16">
          <ul className="flex flex-col gap-2">
            {NAV_ITEMS.map((item, index) => (
              <li
                key={item.key}
                className="animate-slide-up"
                style={{
                  // 순차적 등장 딜레이: 각 항목마다 60ms 간격
                  animationDelay: `${80 + index * 60}ms`,
                  animationFillMode: "both",
                }}
              >
                <Link
                  href={item.href}
                  className={[
                    "block py-3 text-2xl md:text-3xl font-bold tracking-tight",
                    "transition-colors duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
                    "hover:text-secondary hover:opacity-100",
                    isActive(item.href) ? "text-secondary" : "text-white",
                  ].join(" ")}
                  onClick={handleLinkClick}
                >
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* --- 하단: CTA 버튼 --- */}
        <div
          className="flex flex-col gap-4 pb-8 animate-slide-up"
          style={{
            animationDelay: `${80 + NAV_ITEMS.length * 60 + 60}ms`,
            animationFillMode: "both",
          }}
        >
          {/* 골드 디바이더 */}
          <div className="divider-gold mb-2" />

          <LanguageSwitcher variant="dark" />

          {/* CTA 버튼 */}
          <Link href="/contact" className="block" onClick={handleLinkClick}>
            <Button variant="secondary" size="lg" className="w-full">
              {t("contact")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
