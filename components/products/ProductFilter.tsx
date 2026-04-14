"use client";

import { useCallback } from "react";
import { useRouter, usePathname } from "@/lib/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import type { ProductCategory, ProductSubcategory } from "@/types/product";

/* ==========================================================================
   ProductFilter Component — Cellromax Design System

   제품 카테고리 + 서브카테고리 필터 컴포넌트.
   - URL searchParams ?category=&subcategory= 파라미터와 양방향 동기화
   - 메인 카테고리: 딥네이비 스쿼클 버튼
   - 서브카테고리: 셀렉트 박스 (드롭다운)
   ========================================================================== */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProductFilterProps {
  activeCategory: ProductCategory;
  activeSubcategory: string | null;
  subcategories: ProductSubcategory[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES: ProductCategory[] = [
  "health_functional",
  "general_food",
  "cosmetic",
  "medicine",
  "nutra_pet",
  "other",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSubcategoryName(
  subcategory: ProductSubcategory,
  locale: string,
): string {
  const key = `name_${locale}` as keyof ProductSubcategory;
  return (subcategory[key] as string) || subcategory.name_ko;
}

// ---------------------------------------------------------------------------
// ProductFilter Component
// ---------------------------------------------------------------------------

export function ProductFilter({
  activeCategory,
  activeSubcategory,
  subcategories,
}: ProductFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("products.categories");
  const tProducts = useTranslations("products");

  const hasSubcategories = subcategories.length > 0;

  // ---- URL Navigation Handlers ----

  const handleCategoryChange = useCallback(
    (category: ProductCategory) => {
      const params = new URLSearchParams();
      params.set("category", category);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname],
  );

  const handleSubcategoryChange = useCallback(
    (slug: string | null) => {
      const params = new URLSearchParams();
      params.set("category", activeCategory);
      if (slug) {
        params.set("subcategory", slug);
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, activeCategory],
  );

  // ---- Render ----

  return (
    <div className="flex flex-col items-center gap-4">
      {/* 메인 카테고리 탭 */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {CATEGORIES.map((category) => {
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
                  : [
                      "bg-transparent text-gray-600",
                      "hover:bg-primary/10 hover:text-primary hover:scale-[1.03]",
                      "active:scale-[0.98]",
                    ].join(" "),
              ].join(" ")}
              aria-pressed={isActive}
            >
              {t(category)}
            </button>
          );
        })}
      </div>

      {/* 서브카테고리 셀렉트 박스 */}
      {hasSubcategories && (
        <div
          className="flex flex-wrap items-center justify-center gap-2"
          role="group"
          aria-label={tProducts("subcategorySelect")}
        >
          <button
            type="button"
            onClick={() => handleSubcategoryChange(null)}
            className={[
              "px-4 py-2 text-sm font-medium squircle-pill border cursor-pointer",
              "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
              "outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              activeSubcategory === null
                ? "border-primary bg-primary/8 text-primary shadow-sm"
                : "border-gray-200 bg-white text-gray-600 hover:border-primary/30 hover:bg-primary/5 hover:text-primary",
            ].join(" ")}
            aria-pressed={activeSubcategory === null}
          >
            {tProducts("allSubcategory")}
          </button>
          {subcategories.map((sub) => (
            <button
              key={sub.id}
              type="button"
              onClick={() => handleSubcategoryChange(sub.slug)}
              className={[
                "px-4 py-2 text-sm font-medium squircle-pill border cursor-pointer",
                "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
                "outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                activeSubcategory === sub.slug
                  ? "border-primary bg-primary/8 text-primary shadow-sm"
                  : "border-gray-200 bg-white text-gray-600 hover:border-primary/30 hover:bg-primary/5 hover:text-primary",
              ].join(" ")}
              aria-pressed={activeSubcategory === sub.slug}
            >
              {getSubcategoryName(sub, locale)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Type Exports
// ---------------------------------------------------------------------------

export type { ProductFilterProps };
