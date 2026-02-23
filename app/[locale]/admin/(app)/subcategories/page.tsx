import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SubcategoryListClient } from "@/components/admin/SubcategoryListClient";
import type { SubcategoryWithCount } from "@/types/product";

/* ==========================================================================
   Admin Subcategories Page — Server Component

   관리자 하위카테고리 관리 페이지.
   - Supabase에서 전체 하위카테고리 + 연관 제품 수 패칭
   - 초기 데이터를 SubcategoryListClient에 전달
   ========================================================================== */

export const metadata: Metadata = {
  title: "카테고리 관리",
};

export default async function SubcategoriesPage() {
  const supabase = await createClient();

  // 전체 하위카테고리 조회 (비활성 포함, 관리자 RLS 적용)
  const { data: subcategories } = await supabase
    .from("product_subcategories")
    .select("*")
    .order("parent_category", { ascending: true })
    .order("sort_order", { ascending: true });

  // 연관 제품 수 별도 집계
  const { data: products } = await supabase
    .from("products")
    .select("subcategory_id")
    .not("subcategory_id", "is", null);

  const countMap: Record<string, number> = {};
  for (const row of products ?? []) {
    if (row.subcategory_id) {
      countMap[row.subcategory_id] = (countMap[row.subcategory_id] ?? 0) + 1;
    }
  }

  const subcategoriesWithCount: SubcategoryWithCount[] = (
    subcategories ?? []
  ).map((sc) => ({
    ...sc,
    product_count: countMap[sc.id] ?? 0,
  }));

  return (
    <SubcategoryListClient initialSubcategories={subcategoriesWithCount} />
  );
}
