"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { useRouter, usePathname } from "@/lib/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { gsap } from "@/lib/gsap";
import type { ProductCategory, ProductSubcategory } from "@/types/product";

/* ==========================================================================
   ProductFilter Component — Cellromax Design System

   제품 카테고리 + 서브카테고리 탭 필터 컴포넌트.
   - URL searchParams ?category=&subcategory= 파라미터와 양방향 동기화
   - 메인 카테고리: 딥네이비 스쿼클 버튼 (squircle-sm)
   - 서브카테고리: 골드 스쿼클 버튼 (squircle-xs), 슬라이드+페이드 애니메이션
   - "전체" 항목 없이 6개 카테고리만 표시
   ========================================================================== */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProductFilterProps {
  /** 현재 선택된 카테고리 (URL에서 파싱) */
  activeCategory: ProductCategory;
  /** 현재 선택된 서브카테고리 slug (URL에서 파싱, null이면 해당 카테고리 전체) */
  activeSubcategory: string | null;
  /** 현재 메인 카테고리에 속하는 서브카테고리 목록 */
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

  const subcategoryRowRef = useRef<HTMLDivElement>(null);
  const prevCategoryRef = useRef<ProductCategory>(activeCategory);
  const hasSubcategories = subcategories.length > 0;
  const [isSubcategoryVisible, setIsSubcategoryVisible] = useState(hasSubcategories);

  // ---- URL Navigation Handlers ----

  const handleCategoryChange = useCallback(
    (category: ProductCategory) => {
      const params = new URLSearchParams();
      params.set("category", category);
      // 카테고리 변경 시 subcategory, page 파라미터 초기화
      const queryString = params.toString();
      const url = `${pathname}?${queryString}`;
      router.push(url);
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
      // page 파라미터 초기화 (서브카테고리 변경 시 1페이지로)
      const queryString = params.toString();
      const url = `${pathname}?${queryString}`;
      router.push(url);
    },
    [router, pathname, activeCategory],
  );

  // ---- Subcategory Row Animation ----

  useEffect(() => {
    const row = subcategoryRowRef.current;
    const categoryChanged = prevCategoryRef.current !== activeCategory;
    prevCategoryRef.current = activeCategory;

    if (hasSubcategories) {
      setIsSubcategoryVisible(true);
    }

    const rafId = requestAnimationFrame(() => {
      const currentRow = subcategoryRowRef.current;
      if (!currentRow) return;

      if (hasSubcategories && categoryChanged) {
        gsap.fromTo(
          currentRow,
          { opacity: 0, y: -12, height: 0, overflow: "hidden" },
          {
            opacity: 1,
            y: 0,
            height: "auto",
            overflow: "visible",
            duration: 0.35,
            ease: "power3.out",
          },
        );
      } else if (!hasSubcategories && row) {
        gsap.to(row, {
          opacity: 0,
          y: -8,
          height: 0,
          overflow: "hidden",
          duration: 0.25,
          ease: "power2.in",
          onComplete: () => setIsSubcategoryVisible(false),
        });
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [activeCategory, hasSubcategories]);

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

      {/* 카테고리-서브카테고리 구분선 */}
      {isSubcategoryVisible && (
        <div className="flex justify-center w-full">
          <div
            className="w-72 h-[2px] rounded-full"
            style={{
              background:
                "linear-gradient(90deg, var(--color-secondary), var(--color-accent))",
            }}
          />
        </div>
      )}

      {/* 서브카테고리 탭 (해당 카테고리에 서브카테고리가 있을 때만 표시) */}
      {isSubcategoryVisible && (
        <div
          ref={subcategoryRowRef}
          className="flex flex-wrap items-center justify-center gap-2"
        >
          {subcategories.map((sub) => {
            const isActive = activeSubcategory === sub.slug;
            const displayName = getSubcategoryName(sub, locale);

            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => handleSubcategoryChange(sub.slug)}
                className={[
                  "px-3.5 py-1.5 text-xs font-medium squircle-xs cursor-pointer",
                  "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
                  "outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-1",
                  isActive
                    ? "bg-secondary text-white shadow-sm hover:bg-secondary-light"
                    : [
                        "bg-transparent text-gray-500",
                        "hover:bg-secondary/10 hover:text-secondary-dark hover:scale-[1.04]",
                        "active:scale-[0.97]",
                      ].join(" "),
                ].join(" ")}
                aria-pressed={isActive}
              >
                {displayName}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Type Exports
// ---------------------------------------------------------------------------

export type { ProductFilterProps };
