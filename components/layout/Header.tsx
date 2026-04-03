"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

/* ==========================================================================
   Header Component — Cellromax Science

   고정 헤더: 스크롤 감지 → 투명/불투명 전환
   데스크탑 가로 내비게이션 + 모바일 햄버거 메뉴
   ========================================================================== */

// ---------------------------------------------------------------------------
// Navigation Items — MobileMenu에서도 사용하므로 export
// ---------------------------------------------------------------------------

export const NAV_ITEMS = [
  { key: "products", href: "/products" },
  { key: "ir", href: "/ir" },
  { key: "newsroom", href: "/newsroom" },
] as const;

export type NavItem = (typeof NAV_ITEMS)[number];

// ---------------------------------------------------------------------------
// Hamburger Icon Component
// ---------------------------------------------------------------------------

function HamburgerIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <div className="relative flex h-5 w-6 flex-col items-center justify-center">
      {/* 상단 줄 */}
      <span
        className={[
          "absolute h-[2px] w-full rounded-full bg-primary",
          "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          isOpen
            ? "translate-y-0 rotate-45"
            : "-translate-y-[7px] rotate-0",
        ].join(" ")}
      />
      {/* 중앙 줄 */}
      <span
        className={[
          "absolute h-[2px] w-full rounded-full bg-primary",
          "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          isOpen ? "scale-x-0 opacity-0" : "scale-x-100 opacity-100",
        ].join(" ")}
      />
      {/* 하단 줄 */}
      <span
        className={[
          "absolute h-[2px] w-full rounded-full bg-primary",
          "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          isOpen
            ? "translate-y-0 -rotate-45"
            : "translate-y-[7px] rotate-0",
        ].join(" ")}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header Component
// ---------------------------------------------------------------------------

export function Header() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  // 스크롤 상태: scrollY > 50 일 때 true
  const [isScrolled, setIsScrolled] = useState(false);
  // 모바일 메뉴 상태
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- 스크롤 감지 ---
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    // 초기 상태 설정 (새로고침 시 이미 스크롤된 경우)
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // --- 모바일 메뉴 토글 ---
  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  // --- 현재 경로 active 판별 ---
  const isActive = (href: string): boolean => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      <header
        className={[
          "fixed top-0 inset-x-0 z-[200]",
          "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          isScrolled
            ? "bg-white/95 backdrop-blur-2xl shadow-lg"
            : "bg-transparent",
        ].join(" ")}
      >
        <nav className="container-site flex items-center justify-between py-4">
          {/* ----------------------------------------------------------------
              로고
              ---------------------------------------------------------------- */}
          <Link
            href="/"
            className="relative block transition-opacity duration-300 hover:opacity-80"
            aria-label={t("home")}
          >
            <Image
              src="/logo-cellromax-white.png"
              alt="Cellromax Science"
              width={189}
              height={31}
              priority
              className="h-7 w-auto"
              style={{ filter: "brightness(0)" }}
            />
          </Link>

          {/* ----------------------------------------------------------------
              데스크탑 네비게이션 (lg 이상에서 표시)
              ---------------------------------------------------------------- */}
          <ul className="hidden lg:flex items-center gap-2">
            {NAV_ITEMS.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className={[
                    "relative px-7 py-2 text-sm font-semibold tracking-wide",
                    "squircle-sm",
                    "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
                    isActive(item.href)
                      ? "bg-primary text-white shadow-sm"
                      : "bg-primary/6 text-primary/85 hover:bg-primary/12 hover:text-primary",
                  ].join(" ")}
                >
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </ul>

          {/* ----------------------------------------------------------------
              우측 영역: LanguageSwitcher + CTA + 햄버거
              ---------------------------------------------------------------- */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="light" />

            {/* CTA 버튼 — 데스크탑에서만 표시 */}
            <Link href="/contact" className="hidden lg:block">
              <Button variant="secondary" size="sm">
                {t("contact")}
              </Button>
            </Link>

            {/* 모바일 햄버거 버튼 — lg 미만에서만 표시 */}
            <button
              type="button"
              className={[
                "relative lg:hidden flex items-center justify-center",
                "w-10 h-10 rounded-lg",
                "transition-colors duration-200",
                "hover:bg-primary/10",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              ].join(" ")}
              onClick={toggleMobileMenu}
              aria-label={
                isMobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"
              }
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
            >
              <HamburgerIcon isOpen={isMobileMenuOpen} />
            </button>
          </div>
        </nav>
      </header>

      {/* 모바일 메뉴 오버레이 */}
      <MobileMenu isOpen={isMobileMenuOpen} onClose={closeMobileMenu} />
    </>
  );
}
