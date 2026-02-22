import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PostListClient } from "@/components/admin/PostListClient";

/* ==========================================================================
   Admin Posts Page — Server Component

   관리자 게시판 관리 페이지.
   - Supabase에서 게시글 목록 패칭
   - 초기 데이터를 PostListClient에 전달
   - 이후 검색/필터/페이지네이션은 클라이언트에서 API 호출로 처리
   ========================================================================== */

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "게시판 관리",
};

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function PostsPage() {
  const supabase = await createClient();

  // 초기 데이터 패칭: 고정 우선, 게시일 최신순, 20개 제한
  const { data: posts, count } = await supabase
    .from("posts")
    .select("*", { count: "exact" })
    .order("is_pinned", { ascending: false })
    .order("published_at", { ascending: false })
    .range(0, 19);

  return (
    <PostListClient
      initialPosts={posts ?? []}
      initialTotal={count ?? 0}
    />
  );
}
