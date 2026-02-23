import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { IrFileListClient } from "@/components/admin/IrFileListClient";

/* ==========================================================================
   Admin IR Files Page — Server Component

   관리자 IR 파일 관리 페이지.
   - Supabase에서 IR 파일 목록 패칭
   - 초기 데이터를 IrFileListClient에 전달
   - 이후 검색/필터/페이지네이션은 클라이언트에서 API 호출로 처리
   ========================================================================== */

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "IR 자료 관리",
};

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function IrFilesPage() {
  const supabase = await createClient();

  // 초기 데이터 패칭: 게시일 최신순, 20개 제한
  const { data: irFiles, count } = await supabase
    .from("ir_files")
    .select("*", { count: "exact" })
    .order("published_at", { ascending: false })
    .range(0, 19);

  return (
    <IrFileListClient
      initialItems={irFiles ?? []}
      initialTotal={count ?? 0}
    />
  );
}
