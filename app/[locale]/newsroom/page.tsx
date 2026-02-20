import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { AnimatedSection } from "@/components/products/AnimatedSection";
import { NewsroomTabs } from "@/components/newsroom/NewsroomTabs";
import { PostCard } from "@/components/newsroom/PostCard";
import { VideoCard } from "@/components/newsroom/VideoCard";
import { NewsroomPagination } from "@/components/newsroom/NewsroomPagination";
import type { Post, PostType } from "@/types/newsroom";
import type { Metadata } from "next";

/* ==========================================================================
   Newsroom Page — /[locale]/newsroom

   뉴스룸 메인 페이지 (서버 컴포넌트).
   - URL searchParams로 탭(공지/뉴스/영상) 전환 및 페이지네이션 상태 관리
   - Supabase에서 활성 게시글 목록 패칭 (9개씩)
   - 고정글 우선 정렬 + 최신순 정렬
   - 탭 필터 + 카드 그리드 + 페이지네이션
   ========================================================================== */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POSTS_PER_PAGE = 9;

const VALID_TABS: PostType[] = ["notice", "news", "video"];

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("newsroom");
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

interface NewsroomPageProps {
  searchParams: Promise<{
    tab?: string;
    page?: string;
  }>;
}

export default async function NewsroomPage({ searchParams }: NewsroomPageProps) {
  const resolvedParams = await searchParams;
  const t = await getTranslations("newsroom");
  const locale = await getLocale();

  /* ---- Parse search params ---- */
  const rawTab = resolvedParams.tab;
  const activeTab: PostType =
    rawTab && VALID_TABS.includes(rawTab as PostType)
      ? (rawTab as PostType)
      : "notice";

  const currentPage = Math.max(
    1,
    parseInt(resolvedParams.page ?? "1", 10) || 1,
  );

  /* ---- Fetch posts from Supabase ---- */
  const supabase = await createClient();

  let query = supabase
    .from("posts")
    .select("*", { count: "exact" })
    .eq("post_type", activeTab)
    .eq("is_active", true)
    .order("is_pinned", { ascending: false })
    .order("published_at", { ascending: false });

  /* Pagination range */
  const from = (currentPage - 1) * POSTS_PER_PAGE;
  const to = from + POSTS_PER_PAGE - 1;

  const { data: posts, count } = await query.range(from, to);

  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / POSTS_PER_PAGE);
  const postList = (posts as Post[]) ?? [];

  return (
    <section className="section bg-surface">
      <div className="container-site">
        {/* ---- Page Header ---- */}
        <AnimatedSection>
          <div className="text-center mb-12">
            <h1 className="text-heading text-primary">{t("title")}</h1>
            <div className="divider-gold mx-auto mt-4 mb-4" />
            <p className="text-lead text-gray-600">{t("subtitle")}</p>
          </div>
        </AnimatedSection>

        {/* ---- Tabs ---- */}
        <AnimatedSection direction="up" className="mb-8">
          <div className="flex flex-col items-center gap-4">
            <NewsroomTabs activeTab={activeTab} />
            <p className="text-sm text-gray-500">
              {t("totalCount", { count: totalCount })}
            </p>
          </div>
        </AnimatedSection>

        {/* ---- Card Grid or Empty State ---- */}
        <AnimatedSection direction="up">
          {postList.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {postList.map((post) =>
                activeTab === "video" ? (
                  <VideoCard key={post.id} post={post} locale={locale} />
                ) : (
                  <PostCard key={post.id} post={post} locale={locale} />
                ),
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <svg
                className="size-16 text-gray-300 mb-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
                <path d="M18 14h-8" />
                <path d="M15 18h-5" />
                <path d="M10 6h8v4h-8V6Z" />
              </svg>
              <p className="text-gray-400">{t(`${activeTab}.noItems`)}</p>
            </div>
          )}

          {/* ---- Pagination ---- */}
          {totalPages > 1 && (
            <div className="mt-12">
              <NewsroomPagination
                currentPage={currentPage}
                totalPages={totalPages}
              />
            </div>
          )}
        </AnimatedSection>
      </div>
    </section>
  );
}
