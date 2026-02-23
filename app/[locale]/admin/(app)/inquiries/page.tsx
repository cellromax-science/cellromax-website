import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { InquiryListClient } from "@/components/admin/InquiryListClient";

/* ==========================================================================
   Admin Inquiries Page — Server Component

   관리자 문의 관리 페이지.
   - Supabase에서 문의 목록 패칭
   - 초기 데이터를 InquiryListClient에 전달
   - 이후 검색/필터/페이지네이션은 클라이언트에서 API 호출로 처리
   ========================================================================== */

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "문의 관리",
};

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function InquiriesPage() {
  const supabase = await createClient();

  // 초기 데이터 패칭: 접수일 최신순, 20개 제한
  const { data: inquiries, count } = await supabase
    .from("inquiries")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(0, 19);

  return (
    <InquiryListClient
      initialItems={inquiries ?? []}
      initialTotal={count ?? 0}
    />
  );
}
