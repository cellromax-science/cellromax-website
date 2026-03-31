import { Suspense } from "react";
import { getTranslations, getLocale } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import { createStaticClient } from "@/lib/supabase/server";
import { AnimatedSection } from "@/components/products/AnimatedSection";
import { NewsroomTabs } from "@/components/newsroom/NewsroomTabs";
import { PostCard } from "@/components/newsroom/PostCard";
import { VideoCard } from "@/components/newsroom/VideoCard";
import { NewsroomPagination } from "@/components/newsroom/NewsroomPagination";
import type { Post, PostType } from "@/types/newsroom";
import type { Metadata } from "next";

/* ==========================================================================
   Newsroom Page — /[locale]/newsroom

   Suspense 기반 Streaming:
   - 헤더 + 탭은 즉시 렌더링
   - DB 의존 카드 목록은 Suspense로 스트리밍
   ========================================================================== */

export const revalidate = 300;

const POSTS_PER_PAGE = 9;

const VALID_TABS: PostType[] = ["notice", "news", "video"];

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("newsroom");
  const locale = await getLocale();

  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical: `/${locale}/newsroom`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `/${l}/newsroom`])
      ),
    },
    openGraph: {
      title: t("title"),
      description: t("subtitle"),
      locale,
      type: "website",
    },
  };
}

// ---------------------------------------------------------------------------
// Card Grid Skeleton (Suspense fallback)
// ---------------------------------------------------------------------------

function CardGridSkeleton() {
  return (
    <>
      <div className="h-4 w-16 bg-gray-100 rounded animate-pulse mx-auto mb-8" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="squircle-xl overflow-hidden bg-surface-raised border border-gray-100"
          >
            <div className="aspect-card bg-gray-100 animate-pulse" />
            <div className="p-5 space-y-3">
              <div className="h-4 w-16 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-5 w-full bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-gray-50 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Async Post List (Suspense boundary 내부)
// ---------------------------------------------------------------------------

async function PostList({
  tab,
  page,
  locale,
}: {
  tab: PostType;
  page: number;
  locale: string;
}) {
  const t = await getTranslations("newsroom");
  const supabase = createStaticClient();

  const query = supabase
    .from("posts")
    .select(
      "id, title_ko, title_en, title_zh, title_vi, content_ko, content_en, content_zh, content_vi, thumbnail_url, published_at, post_type, is_pinned, images, youtube_id",
      { count: "exact" },
    )
    .eq("post_type", tab)
    .eq("is_active", true)
    .order("is_pinned", { ascending: false })
    .order("published_at", { ascending: false });

  const from = (page - 1) * POSTS_PER_PAGE;
  const to = from + POSTS_PER_PAGE - 1;

  const { data: posts, count } = await query.range(from, to);

  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / POSTS_PER_PAGE);
  const postList = (posts as Post[]) ?? [];

  return (
    <>
      <p className="text-sm text-gray-500 text-center mb-8">
        {t("totalCount", { count: totalCount })}
      </p>

      {postList.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {postList.map((post) =>
            tab === "video" ? (
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
          <p className="text-gray-400">{t(`${tab}.noItems`)}</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-12">
          <NewsroomPagination
            currentPage={page}
            totalPages={totalPages}
          />
        </div>
      )}
    </>
  );
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

  const rawTab = resolvedParams.tab;
  const activeTab: PostType =
    rawTab && VALID_TABS.includes(rawTab as PostType)
      ? (rawTab as PostType)
      : "notice";

  const currentPage = Math.max(
    1,
    parseInt(resolvedParams.page ?? "1", 10) || 1,
  );

  return (
    <section className="section bg-surface">
      <div className="container-site">
        {/* ---- 즉시 렌더링: 헤더 + 탭 ---- */}
        <AnimatedSection>
          <div className="text-center mb-12">
            <h1 className="text-heading text-primary">{t("title")}</h1>
            <div className="divider-gold mx-auto mt-4 mb-4" />
            <p className="text-lead text-gray-600">{t("subtitle")}</p>
          </div>
        </AnimatedSection>

        <AnimatedSection direction="up" className="mb-8">
          <div className="flex flex-col items-center gap-4">
            <NewsroomTabs activeTab={activeTab} />
          </div>
        </AnimatedSection>

        {/* ---- 스트리밍: DB 의존 카드 목록 ---- */}
        <AnimatedSection direction="up">
          <Suspense fallback={<CardGridSkeleton />}>
            <PostList tab={activeTab} page={currentPage} locale={locale} />
          </Suspense>
        </AnimatedSection>
      </div>
    </section>
  );
}
