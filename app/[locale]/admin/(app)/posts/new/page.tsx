import type { Metadata } from "next";
import { PostForm } from "@/components/admin/PostForm";

/* ==========================================================================
   Admin New Post Page — Server Component

   관리자 새 게시글 작성 페이지.
   - PostForm에 mode="create"를 전달하여 등록 모드로 렌더링
   - 인증 및 레이아웃은 상위 (app)/layout.tsx에서 처리
   ========================================================================== */

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "새 게시글 작성",
};

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function NewPostPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          새 게시글 작성
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          새로운 게시글 정보를 입력하세요
        </p>
      </div>
      <PostForm mode="create" />
    </div>
  );
}
