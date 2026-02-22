import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PostForm } from "@/components/admin/PostForm";

/* ==========================================================================
   Admin Edit Post Page — Server Component

   관리자 게시글 수정 페이지.
   - params에서 게시글 ID 추출 (Next.js 16: params는 Promise)
   - Supabase에서 해당 게시글 조회
   - 게시글 미존재 시 notFound()
   - PostForm에 mode="edit"와 initialData 전달
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
  title: "게시글 수정",
};

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function EditPostPage({ params }: PageProps) {
  const { id } = await params;

  // UUID 형식 검증
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    notFound();
  }

  // Supabase에서 게시글 조회
  const supabase = await createClient();

  const { data: post, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !post) {
    notFound();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          게시글 수정
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          <span className="font-medium text-gray-700">{post.title_ko}</span>
          의 정보를 수정합니다
        </p>
      </div>
      <PostForm mode="edit" initialData={post} />
    </div>
  );
}
