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
import { thumbnailUrl } from "@/lib/image";
import type { Product, ProductSubcategory } from "@/types/product";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProductCardProps {
  /** 표시할 제품 데이터 */
  product: Product;
  /** 현재 로케일 (ko | en | zh | vi) */
  locale: string;
  /** LCP 최적화: 첫 몇 개 카드에 true 설정 시 이미지를 우선 로드 */
  priority?: boolean;
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
// 외부 링크 제품 — 클릭 시 외부 URL로 이동
// ---------------------------------------------------------------------------

const EXTERNAL_LINK_SLUGS: Record<string, string> = {
  "gf-038": "https://cellromax.kr/ttsyrup",  // 어린이튼튼시럽
  "gf-032": "https://cellromax.kr/ttsyrup",  // 어린이튼튼시럽 스틱
  "gf-023": "https://cellromax.kr/ttsyrup",  // 어린이튼튼 짜요
  "gf-003": "https://cellromax.kr/jsc",      // 장생천 키즈시럽
};

// ---------------------------------------------------------------------------
// ProductCard Component
// ---------------------------------------------------------------------------

/**
 * 제품 카드 컴포넌트
 *
 * 제품 목록 그리드에서 개별 제품을 카드 형태로 표시한다.
 * 전체 카드가 링크로 감싸져 클릭 시 제품 상세 페이지로 이동한다.
 * EXTERNAL_LINK_SLUGS에 등록된 제품은 외부 URL로 이동한다.
 *
 * @example
 * ```tsx
 * <ProductCard product={product} locale="ko" />
 * ```
 */
export function ProductCard({ product, locale, priority = false }: ProductCardProps) {
  const productName = getLocalizedName(product, locale);
  const subcategoryName =
    product.product_subcategories
      ? getLocalizedSubcategoryName(product.product_subcategories, locale)
      : null;

  const externalUrl = EXTERNAL_LINK_SLUGS[product.slug];

  const Wrapper = externalUrl
    ? (props: { children: React.ReactNode }) => (
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group block focus-ring"
          aria-label={productName}
        >
          {props.children}
        </a>
      )
    : (props: { children: React.ReactNode }) => (
        <Link
          href={`/products/${product.slug}`}
          className="group block focus-ring"
          aria-label={productName}
        >
          {props.children}
        </Link>
      );

  return (
    <Wrapper>
      <article className="squircle-xl overflow-hidden bg-surface-raised border border-gray-100 shadow-sm transition-all duration-300 ease-[var(--ease-default)] group-hover:shadow-lg group-hover:-translate-y-1.5 group-hover:border-secondary/20">
        {/* ----------------------------------------------------------------
            Thumbnail Area
            ---------------------------------------------------------------- */}
        <div className="relative aspect-square overflow-hidden bg-white flex items-center justify-center">
          {product.thumbnail_url ? (
            <Image
              src={thumbnailUrl(product.thumbnail_url)}
              alt={productName}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              quality={75}
              priority={priority}
              className="object-contain scale-[0.8] transition-transform duration-500 ease-[var(--ease-default)] group-hover:scale-[0.86]"
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

          {/* 호버 골드 틴트 오버레이 */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-[1]"
            aria-hidden="true"
          />

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
    </Wrapper>
  );
}

// ---------------------------------------------------------------------------
// Type Exports
// ---------------------------------------------------------------------------

export type { ProductCardProps };
