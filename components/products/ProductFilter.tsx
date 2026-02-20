"use client";

import { useCallback } from "react";
import { useRouter, usePathname } from "@/lib/i18n/navigation";
import { useTranslations } from "next-intl";
import type { ProductCategory } from "@/types/product";

/* ==========================================================================
   ProductFilter Component — Cellromax Design System

   제품 카테고리 탭 필터 컴포넌트.
   - URL searchParams ?category= 파라미터와 양방향 동기화
   - pill 스타일 탭 UI
   - "전체" + 6개 카테고리 탭 표시
   ========================================================================== */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProductFilterProps {
  /** 현재 선택된 카테고리 (URL에서 파싱) */
  activeCategory: ProductCategory | "all";
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES: Array<ProductCategory | "all"> = [
  "all",
  "health_functional",
  "general_food",
  "cosmetic",
  "medicine",
  "nutra_pet",
  "other",
];

// ---------------------------------------------------------------------------
// ProductFilter Component
// ---------------------------------------------------------------------------

/**
 * 제품 카테고리 탭 필터
 *
 * 탭을 클릭하면 URL의 ?category= 파라미터를 업데이트하고,
 * 서버 컴포넌트에서 해당 카테고리의 제품만 조회한다.
 *
 * @example
 * ```tsx
 * <ProductFilter activeCategory="health_functional" />
 * ```
 */
export function ProductFilter({ activeCategory }: ProductFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("products.categories");

  const handleCategoryChange = useCallback(
    (category: ProductCategory | "all") => {
      const params = new URLSearchParams();
      if (category !== "all") {
        params.set("category", category);
      }
      // page 파라미터 초기화 (카테고리 변경 시 1페이지로)
      const queryString = params.toString();
      const url = queryString ? `${pathname}?${queryString}` : pathname;
      router.push(url);
    },
    [router, pathname],
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {CATEGORIES.map((category) => {
        const isActive = activeCategory === category;

        return (
          <button
            key={category}
            type="button"
            onClick={() => handleCategoryChange(category)}
            className={[
              "px-4 py-2 text-sm font-medium squircle-sm",
              "transition-all duration-[150ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
              "outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              isActive
                ? "bg-primary text-white shadow-sm"
                : "bg-transparent text-gray-600 hover:bg-gray-100",
            ].join(" ")}
            aria-pressed={isActive}
          >
            {t(category)}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Type Exports
// ---------------------------------------------------------------------------

export type { ProductFilterProps };
