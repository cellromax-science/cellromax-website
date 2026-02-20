/* ==========================================================================
   ProductCard Component — Cellromax Design System

   제품 목록 페이지에서 사용하는 카드형 제품 표시 컴포넌트.
   - 썸네일 + 카테고리 뱃지 + 제품명 + 서브카테고리 구성
   - 서버 컴포넌트 — 'use client' 불필요
   - 순수 CSS(Tailwind group-hover)로 인터랙티브 hover 효과 구현
   - 다국어(ko/en/zh/vi) 제품명 지원
   ========================================================================== */

import Image from "next/image";
import { Link } from "@/lib/i18n/navigation";
import { Badge, getCategoryBadgeVariant, getCategoryLabel } from "@/components/ui/Badge";
import type { Product, ProductSubcategory } from "@/types/product";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProductCardProps {
  /** 표시할 제품 데이터 */
  product: Product;
  /** 현재 로케일 (ko | en | zh | vi) */
  locale: string;
}

// ---------------------------------------------------------------------------
// Locale Helpers
// ---------------------------------------------------------------------------

/**
 * 로케일에 맞는 제품명을 반환한다.
 * 해당 로케일의 값이 없으면 name_ko를 폴백으로 사용.
 */
function getLocalizedName(product: Product, locale: string): string {
  const key = `name_${locale}` as keyof Product;
  return (product[key] as string) || product.name_ko;
}

/**
 * 로케일에 맞는 서브카테고리명을 반환한다.
 * 해당 로케일의 값이 없으면 name_ko를 폴백으로 사용.
 */
function getLocalizedSubcategoryName(
  subcategory: ProductSubcategory,
  locale: string,
): string {
  const key = `name_${locale}` as keyof ProductSubcategory;
  return (subcategory[key] as string) || subcategory.name_ko;
}

// ---------------------------------------------------------------------------
// ProductCard Component
// ---------------------------------------------------------------------------

/**
 * 제품 카드 컴포넌트
 *
 * 제품 목록 그리드에서 개별 제품을 카드 형태로 표시한다.
 * 전체 카드가 링크로 감싸져 클릭 시 제품 상세 페이지로 이동한다.
 *
 * @example
 * ```tsx
 * <ProductCard product={product} locale="ko" />
 * ```
 */
export function ProductCard({ product, locale }: ProductCardProps) {
  const productName = getLocalizedName(product, locale);
  const subcategoryName =
    product.product_subcategories
      ? getLocalizedSubcategoryName(product.product_subcategories, locale)
      : null;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block focus-ring"
      aria-label={productName}
    >
      <article className="squircle-xl overflow-hidden bg-surface-raised border border-gray-100 shadow-sm transition-all duration-[250ms] ease-[var(--ease-default)] group-hover:shadow-md group-hover:-translate-y-1">
        {/* ----------------------------------------------------------------
            Thumbnail Area
            ---------------------------------------------------------------- */}
        <div className="relative aspect-card overflow-hidden bg-surface">
          {product.thumbnail_url ? (
            <Image
              src={product.thumbnail_url}
              alt={productName}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-[250ms] ease-[var(--ease-default)] group-hover:scale-105"
            />
          ) : (
            /* Placeholder — 이미지가 없는 경우 그라디언트 + 아이콘 */
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-surface to-gray-100">
              <svg
                className="size-12 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 7.5-2.25-1.313M21 7.5v2.25m0-2.25-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3 2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75 2.25-1.313M12 21.75V15m0 0 2.25 1.313M12 15l-2.25 1.313M12 15V12.75m0-9L9.75 5.063M12 3.75l2.25 1.313M12 3.75V6m-1.5-.75L12 6.75l1.5-1.5"
                />
              </svg>
            </div>
          )}

          {/* NEW Badge — 신제품 표시 */}
          {product.is_new && (
            <span className="absolute top-3 right-3 z-10 inline-flex items-center squircle-xs bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase leading-none tracking-wider text-primary-dark shadow-gold">
              NEW
            </span>
          )}
        </div>

        {/* ----------------------------------------------------------------
            Content Area
            ---------------------------------------------------------------- */}
        <div className="p-5">
          {/* Category Badge */}
          <Badge
            variant={getCategoryBadgeVariant(product.category)}
            size="sm"
          >
            {getCategoryLabel(product.category)}
          </Badge>

          {/* Product Name */}
          <h3 className="mt-3 text-base font-semibold leading-snug text-primary truncate-2">
            {productName}
          </h3>

          {/* Subcategory */}
          {subcategoryName && (
            <p className="mt-1.5 text-sm text-gray-500 leading-normal truncate">
              {subcategoryName}
            </p>
          )}
        </div>
      </article>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Type Exports
// ---------------------------------------------------------------------------

export type { ProductCardProps };
