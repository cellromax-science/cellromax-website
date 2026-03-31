"use client";

import { useCallback } from "react";
import { useRouter, usePathname } from "@/lib/i18n/navigation";
import { useTranslations } from "next-intl";
import type { IrCategory } from "@/types/ir";

/* ==========================================================================
   IrCategoryFilter — IR 탭 네비게이션

   탭 구조:
   - IR자료실 (announcement) — 카드 목록
   - 전자공시 (annual_report) — DART iframe 페이지
   - 윤리강령 (ethics)       — 텍스트 + 파일 다운로드
   ========================================================================== */

const IR_TABS: (IrCategory | "ethics")[] = [
  "announcement",    // IR자료실
  "annual_report",   // 전자공시
  "ethics",          // 윤리강령
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IrCategoryFilterProps {
  activeCategory: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function IrCategoryFilter({
  activeCategory,
}: IrCategoryFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("ir");

  const currentTab = activeCategory || "announcement";

  const handleTabChange = useCallback(
    (tab: string) => {
      const params = new URLSearchParams();
      if (tab !== "announcement") params.set("category", tab);
      const queryString = params.toString();
      const url = queryString ? `${pathname}?${queryString}` : pathname;
      router.push(url);
    },
    [router, pathname],
  );

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {IR_TABS.map((tab) => {
        const isActive = currentTab === tab;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => handleTabChange(tab)}
            className={[
              "px-5 py-2.5 text-sm font-semibold squircle-sm cursor-pointer",
              "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
              "outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              isActive
                ? "bg-primary text-white shadow-sm hover:bg-primary-light"
                : "bg-transparent text-gray-600 hover:bg-primary/10 hover:text-primary",
            ].join(" ")}
            aria-pressed={isActive}
          >
            {t(`categories.${tab}`)}
          </button>
        );
      })}
    </div>
  );
}
