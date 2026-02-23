import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PharmacyListClient } from "@/components/admin/PharmacyListClient";

/* ==========================================================================
   Admin Pharmacies Page — Server Component

   관리자 약국 관리 페이지.
   - Supabase에서 약국 목록 패칭
   - 초기 데이터를 PharmacyListClient에 전달
   - 이후 검색/페이지네이션은 클라이언트에서 API 호출로 처리
   ========================================================================== */

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "약국 관리",
};

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function PharmaciesPage() {
  const supabase = await createClient();

  // 초기 데이터 패칭: 최신순, 20개 제한
  const { data: pharmacies, count } = await supabase
    .from("pharmacies")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(0, 19);

  return (
    <PharmacyListClient
      initialItems={pharmacies ?? []}
      initialTotal={count ?? 0}
    />
  );
}
