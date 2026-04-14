/* ==========================================================================
   ProductGrid Component — Cellromax Design System

   제품 카드를 반응형 그리드로 배치하는 레이아웃 컴포넌트.
   - 서버 컴포넌트 — 'use client' 불필요
   - 반응형: 1열(모바일) → 2열(태블릿) → 3열(데스크톱)
   - 제품이 없을 때 빈 상태 메시지 표시
   ========================================================================== */

import { ProductCard } from "@/components/products/ProductCard";
import type { Product } from "@/types/product";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProductGridProps {
  /** 표시할 제품 목록 */
  products: Product[];
  /** 현재 로케일 */
  locale: string;
  /** 제품이 없을 때 표시할 메시지 */
  emptyMessage?: string;
}

// ---------------------------------------------------------------------------
// ProductGrid Component
// ---------------------------------------------------------------------------

/**
 * 제품 카드 그리드
 *
 * @example
 * ```tsx
 * <ProductGrid products={products} locale="ko" emptyMessage="등록된 제품이 없습니다." />
 * ```
 */
export function ProductGrid({ products, locale, emptyMessage }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <svg
          className="size-16 text-gray-300 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
          />
        </svg>
        <p className="text-gray-500 text-base">
          {emptyMessage ?? "등록된 제품이 없습니다."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} locale={locale} priority={index < 4} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Type Exports
// ---------------------------------------------------------------------------

export type { ProductGridProps };
