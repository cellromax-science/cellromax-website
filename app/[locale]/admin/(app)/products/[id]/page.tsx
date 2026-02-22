import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/admin/ProductForm";

/* ==========================================================================
   Admin Edit Product Page — Server Component

   관리자 제품 수정 페이지.
   - params에서 제품 ID 추출 (Next.js 16: params는 Promise)
   - Supabase에서 해당 제품 + 하위카테고리 JOIN 조회
   - 제품 미존재 시 notFound()
   - ProductForm에 mode="edit"와 initialData 전달
   ========================================================================== */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "제품 수정",
};

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params;

  // UUID 형식 검증
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    notFound();
  }

  // Supabase에서 제품 조회
  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from("products")
    .select("*, product_subcategories(*)")
    .eq("id", id)
    .single();

  if (error || !product) {
    notFound();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          제품 수정
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          <span className="font-medium text-gray-700">{product.name_ko}</span>
          의 정보를 수정합니다
        </p>
      </div>
      <ProductForm mode="edit" initialData={product} />
    </div>
  );
}
