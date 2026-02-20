"use client";

import { useCallback } from "react";
import { useRouter, usePathname } from "@/lib/i18n/navigation";
import { useTranslations } from "next-intl";
import { Select } from "@/components/ui/Select";
import type { IrCategory } from "@/types/ir";

/* ==========================================================================
   IrCategoryFilter — IR 카테고리 탭 + 연도 Select
   ProductFilter.tsx 패턴 기반, URL searchParams 연동
   ========================================================================== */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const IR_CATEGORIES: IrCategory[] = [
  "announcement",
  "annual_report",
  "presentation",
  "other",
];

/** 최근 5년 연도 목록 생성 */
function getRecentYears(): number[] {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => currentYear - i);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IrCategoryFilterProps {
  activeCategory: string | null;
  activeYear: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function IrCategoryFilter({
  activeCategory,
  activeYear,
}: IrCategoryFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("ir");

  const years = getRecentYears();

  const handleCategoryChange = useCallback(
    (category: string | null) => {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (activeYear) params.set("year", activeYear);
      // page 초기화
      const queryString = params.toString();
      const url = queryString ? `${pathname}?${queryString}` : pathname;
      router.push(url);
    },
    [router, pathname, activeYear],
  );

  const handleYearChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const year = e.target.value;
      const params = new URLSearchParams();
      if (activeCategory) params.set("category", activeCategory);
      if (year) params.set("year", year);
      // page 초기화
      const queryString = params.toString();
      const url = queryString ? `${pathname}?${queryString}` : pathname;
      router.push(url);
    },
    [router, pathname, activeCategory],
  );

  const yearOptions = [
    { value: "", label: t("files.year") },
    ...years.map((y) => ({ value: String(y), label: String(y) })),
  ];

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      {/* Category Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {/* "전체" 버튼 */}
        <button
          type="button"
          onClick={() => handleCategoryChange(null)}
          className={[
            "px-5 py-2.5 text-sm font-semibold squircle-sm cursor-pointer",
            "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
            "outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            !activeCategory
              ? "bg-primary text-white shadow-sm hover:bg-primary-light"
              : "bg-transparent text-gray-600 hover:bg-primary/10 hover:text-primary",
          ].join(" ")}
          aria-pressed={!activeCategory}
        >
          {t("categories.all")}
        </button>

        {IR_CATEGORIES.map((category) => {
          const isActive = activeCategory === category;
          return (
            <button
              key={category}
              type="button"
              onClick={() => handleCategoryChange(category)}
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
              {t(`categories.${category}`)}
            </button>
          );
        })}
      </div>

      {/* Year Select */}
      <div className="w-32 shrink-0">
        <Select
          options={yearOptions}
          value={activeYear ?? ""}
          onChange={handleYearChange}
          aria-label={t("files.year")}
        />
      </div>
    </div>
  );
}
