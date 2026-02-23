import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IrFileForm } from "@/components/admin/IrFileForm";

/* ==========================================================================
   Admin Edit IR File Page — Server Component

   관리자 IR 파일 수정 페이지.
   - params에서 IR 파일 ID 추출 (Next.js 16: params는 Promise)
   - Supabase에서 해당 IR 파일 조회
   - IR 파일 미존재 시 notFound()
   - IrFileForm에 mode="edit"와 initialData 전달
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
  title: "IR 파일 수정",
};

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function EditIrFilePage({ params }: PageProps) {
  const { id } = await params;

  // UUID 형식 검증
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    notFound();
  }

  // Supabase에서 IR 파일 조회
  const supabase = await createClient();

  const { data: irFile, error } = await supabase
    .from("ir_files")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !irFile) {
    notFound();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          IR 파일 수정
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          <span className="font-medium text-gray-700">{irFile.title}</span>
          의 정보를 수정합니다
        </p>
      </div>
      <IrFileForm mode="edit" initialData={irFile} />
    </div>
  );
}
