"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";

/* ==========================================================================
   LanguageSwitcher Component — Cellromax Science

   드롭다운 방식의 다국어 전환 컴포넌트
   - 4개 언어 지원: ko, en, zh, vi
   - variant: dark (헤더, 기본) / light (밝은 배경)
   - 외부 클릭 / ESC 키 → 드롭다운 닫기
   - 접근성: aria-haspopup, aria-expanded, role="listbox", role="option"
   ========================================================================== */

// ---------------------------------------------------------------------------
// Language Definitions
// ---------------------------------------------------------------------------

const LANGUAGES = [
  { code: "ko", label: "\uD55C\uAD6D\uC5B4", flag: "\uD83C\uDDF0\uD83C\uDDF7" },
  { code: "en", label: "English", flag: "\uD83C\uDDFA\uD83C\uDDF8" },
  { code: "zh", label: "\u4E2D\u6587", flag: "\uD83C\uDDE8\uD83C\uDDF3" },
  { code: "vi", label: "Ti\u1EBFng Vi\u1EC7t", flag: "\uD83C\uDDFB\uD83C\uDDF3" },
] as const;

// ---------------------------------------------------------------------------
// Props Interface
// ---------------------------------------------------------------------------

interface LanguageSwitcherProps {
  /** 배경 컨텍스트에 따른 스타일 변형 (헤더: dark, 밝은 배경: light) */
  variant?: "light" | "dark";
  className?: string;
}

// ---------------------------------------------------------------------------
// Globe Icon (16x16)
// ---------------------------------------------------------------------------

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
      <ellipse cx="8" cy="8" rx="3" ry="6.5" stroke="currentColor" strokeWidth="1.2" />
      <line x1="1.5" y1="8" x2="14.5" y2="8" stroke="currentColor" strokeWidth="1.2" />
      <line x1="3" y1="4.5" x2="13" y2="4.5" stroke="currentColor" strokeWidth="1" />
      <line x1="3" y1="11.5" x2="13" y2="11.5" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Chevron Icon (10x10, 열림 시 회전)
// ---------------------------------------------------------------------------

function ChevronIcon({ isOpen, className }: { isOpen: boolean; className?: string }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={[
        "transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
        isOpen ? "rotate-180" : "rotate-0",
        className ?? "",
      ].join(" ")}
      aria-hidden="true"
    >
      <path
        d="M2 3.5L5 6.5L8 3.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Check Icon (12x12, 현재 선택된 언어 표시)
// ---------------------------------------------------------------------------

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M2.5 6L5 8.5L9.5 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// LanguageSwitcher Component
// ---------------------------------------------------------------------------

export function LanguageSwitcher({
  variant = "dark",
  className,
}: LanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale() as Locale;

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 현재 선택된 언어 객체
  const currentLanguage = LANGUAGES.find((lang) => lang.code === currentLocale) ?? LANGUAGES[0];

  // --- 드롭다운 토글 ---
  const toggleDropdown = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
  }, []);

  // --- 언어 전환 ---
  const switchLanguage = useCallback(
    (newLocale: string) => {
      router.replace(pathname, { locale: newLocale as Locale });
      closeDropdown();
    },
    [router, pathname, closeDropdown]
  );

  // --- 외부 클릭 감지 ---
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        closeDropdown();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, closeDropdown]);

  // --- ESC 키 감지 ---
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeDropdown();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeDropdown]);

  // --- variant별 트리거 스타일 ---
  const triggerColorClasses =
    variant === "dark"
      ? "text-white/80 hover:text-white"
      : "text-gray-600 hover:text-primary";

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className ?? ""}`}
    >
      {/* ----------------------------------------------------------------
          트리거 버튼
          ---------------------------------------------------------------- */}
      <button
        type="button"
        className={[
          "flex items-center gap-1.5 px-2 py-1.5",
          "text-sm font-medium tracking-wide",
          "transition-colors duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
          "rounded-lg hover:bg-white/10",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
          triggerColorClasses,
        ].join(" ")}
        onClick={toggleDropdown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`현재 언어: ${currentLanguage.label}. 언어 변경`}
      >
        <GlobeIcon />
        <span className="uppercase">{currentLocale}</span>
        <ChevronIcon isOpen={isOpen} />
      </button>

      {/* ----------------------------------------------------------------
          드롭다운 패널
          ---------------------------------------------------------------- */}
      <div
        className={[
          "absolute right-0 top-full mt-2",
          "min-w-[160px] py-1",
          "bg-white shadow-lg squircle-sm",
          "z-[100]",
          /* 열림/닫힘 애니메이션 */
          "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
          "origin-top-right",
          isOpen
            ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
            : "opacity-0 -translate-y-1 scale-95 pointer-events-none",
        ].join(" ")}
        role="listbox"
        aria-label="언어 선택"
        tabIndex={-1}
      >
        {LANGUAGES.map((lang) => {
          const isCurrentLang = lang.code === currentLocale;

          return (
            <button
              key={lang.code}
              type="button"
              role="option"
              aria-selected={isCurrentLang}
              className={[
                "flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm",
                "transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]",
                "cursor-pointer",
                isCurrentLang
                  ? "bg-gray-100 text-primary font-medium"
                  : "text-gray-700 hover:bg-gray-50",
              ].join(" ")}
              onClick={() => switchLanguage(lang.code)}
            >
              {/* 국기 이모지 */}
              <span className="text-base leading-none" aria-hidden="true">
                {lang.flag}
              </span>

              {/* 언어명 */}
              <span className="flex-1 text-left">{lang.label}</span>

              {/* 현재 언어 체크 아이콘 */}
              {isCurrentLang && (
                <CheckIcon className="text-primary flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
