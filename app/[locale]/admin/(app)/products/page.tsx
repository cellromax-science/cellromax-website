import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ProductListClient } from "@/components/admin/ProductListClient";

/* ==========================================================================
   Admin Products Page — Server Component

   관리자 제품 목록 페이지.
   - Supabase에서 제품 목록 + 하위카테고리 JOIN 패칭
   - 초기 데이터를 ProductListClient에 전달
   - 이후 검색/필터/페이지네이션은 클라이언트에서 API 호출로 처리
   ========================================================================== */

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "제품 관리",
};

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function ProductsPage() {
  const supabase = await createClient();

  // 초기 데이터 패칭: 최신순 정렬, 20개 제한
  const { data: products, count } = await supabase
    .from("products")
    .select("*, product_subcategories(*)", { count: "exact" })
    .order("price", { ascending: false })
    .order("created_at", { ascending: false })
    .range(0, 19);

  return (
    <ProductListClient
      initialProducts={products ?? []}
      initialTotal={count ?? 0}
    />
  );
}
