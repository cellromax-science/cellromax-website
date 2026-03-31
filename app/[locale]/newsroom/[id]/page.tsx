import { cache } from "react";
import { getTranslations, getLocale } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import { notFound } from "next/navigation";
import Image from "next/image";
import { createStaticClient } from "@/lib/supabase/server";
import { Link } from "@/lib/i18n/navigation";
import { AnimatedSection } from "@/components/products/AnimatedSection";
import { Badge } from "@/components/ui/Badge";
import { detailUrl, galleryUrl } from "@/lib/image";
import type { Post } from "@/types/newsroom";
import type { Metadata } from "next";

/* ==========================================================================
   Newsroom Detail Page — /[locale]/newsroom/[id]

   게시글 상세 페이지 (서버 컴포넌트).
   - UUID 유효성 검증 후 Supabase에서 단일 게시글 패칭
   - post_type에 따라 공지/뉴스 레이아웃 또는 홍보영상 레이아웃 분기
   - 다국어 필드(title, content)를 현재 locale 기준으로 선택
   - 게시글 없으면 404 페이지로 전환
   ========================================================================== */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * locale에 맞는 다국어 필드를 반환하며, 해당 locale 값이 없으면 한국어로 폴백.
 */
function getLocalizedField(
  post: Post,
  field: "title" | "content",
  locale: string,
): string {
  const key = `${field}_${locale}` as keyof Post;
  return (post[key] as string | null) || (post[`${field}_ko`] as string) || "";
}

/**
 * ISO 날짜 문자열을 읽기 쉬운 형태로 포맷팅.
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * 콘텐츠 텍스트를 단락별로 분리하여 <p> 태그 배열로 렌더링.
 * 관리자 입력 콘텐츠를 XSS 위험 없이 안전하게 표시.
 */
function ContentRenderer({ content }: { content: string }) {
  const paragraphs = content.split(/\n\s*\n/).filter(Boolean);
  return (
    <div className="prose prose-gray max-w-none space-y-4">
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="text-gray-700 leading-relaxed whitespace-pre-line">
          {paragraph.trim()}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Cached Supabase Query — generateMetadata + page에서 공유 (1회만 실행)
// ---------------------------------------------------------------------------

const getPost = cache(async (id: string) => {
  const supabase = createStaticClient();
  const { data } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .single();
  return data as Post | null;
});

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

interface PageParams {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const { id } = await params;
  const t = await getTranslations("newsroom");
  const locale = await getLocale();

  if (!UUID_REGEX.test(id)) {
    return { title: t("detail.notFound") };
  }

  const post = await getPost(id);

  if (!post) {
    return { title: t("detail.notFound") };
  }

  const title = getLocalizedField(post, "title", locale);
  const description =
    getLocalizedField(post, "content", locale).slice(0, 160) ||
    undefined;

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/newsroom/${id}`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `/${l}/newsroom/${id}`])
      ),
    },
    openGraph: {
      title,
      description,
      locale,
      type: "website",
      ...(post.thumbnail_url ? { images: [post.thumbnail_url] } : {}),
    },
  };
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

interface NewsroomDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function NewsroomDetailPage({
  params,
}: NewsroomDetailPageProps) {
  const { id } = await params;
  const t = await getTranslations("newsroom");
  const locale = await getLocale();

  if (!UUID_REGEX.test(id)) {
    notFound();
  }

  const post = await getPost(id);

  if (!post) {
    notFound();
  }
  const title = getLocalizedField(post, "title", locale);
  const content = getLocalizedField(post, "content", locale);
  const thumbnailSrc =
    post.thumbnail_url || (post.images.length > 0 ? post.images[0] : null);

  /* ---- Video Layout ---- */
  if (post.post_type === "video") {
    return (
      <section className="section bg-surface">
        <div className="container-site max-w-4xl">
          {/* Back to list */}
          <AnimatedSection>
            <Link
              href="/newsroom?tab=video"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary mb-8 transition-colors"
            >
              <svg
                className="size-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
              {t("backToList")}
            </Link>
          </AnimatedSection>

          {/* Header */}
          <AnimatedSection>
            <div className="mb-8">
              <Badge variant="primary" size="sm">
                {t("tabs.video")}
              </Badge>
              <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-3 mt-3">
                {title}
              </h1>
              <time className="text-sm text-gray-400">
                {formatDate(post.published_at)}
              </time>
              <div className="divider-gold mt-6" />
            </div>
          </AnimatedSection>

          {/* YouTube Embed */}
          {post.youtube_id && (
            <AnimatedSection direction="up">
              <div className="mb-8 squircle-xl overflow-hidden">
                <div className="aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${post.youtube_id}`}
                    title={title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            </AnimatedSection>
          )}

          {/* Description */}
          {content && (
            <AnimatedSection direction="up">
              <ContentRenderer content={content} />
            </AnimatedSection>
          )}
        </div>
      </section>
    );
  }

  /* ---- Notice / News Layout ---- */
  return (
    <section className="section bg-surface">
      <div className="container-site max-w-4xl">
        {/* Back to list */}
        <AnimatedSection>
          <Link
            href={`/newsroom?tab=${post.post_type}`}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary mb-8 transition-colors"
          >
            <svg
              className="size-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            {t("backToList")}
          </Link>
        </AnimatedSection>

        {/* Header */}
        <AnimatedSection>
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="info" size="sm">
                {t(`tabs.${post.post_type}`)}
              </Badge>
              {post.is_pinned && (
                <Badge variant="gold" size="sm">
                  {t("pinnedBadge")}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-3">
              {title}
            </h1>
            <time className="text-sm text-gray-400">
              {formatDate(post.published_at)}
            </time>
            <div className="divider-gold mt-6" />
          </div>
        </AnimatedSection>

        {/* Thumbnail Image */}
        {thumbnailSrc && (
          <AnimatedSection direction="up">
            <div className="mb-8 squircle-xl overflow-hidden">
              <Image
                src={detailUrl(thumbnailSrc)}
                alt={title}
                width={800}
                height={450}
                quality={75}
                sizes="(max-width: 800px) 100vw, 800px"
                className="w-full h-auto object-cover"
              />
            </div>
          </AnimatedSection>
        )}

        {/* Content Body */}
        {content && (
          <AnimatedSection direction="up">
            <div className="mb-8">
              <ContentRenderer content={content} />
            </div>
          </AnimatedSection>
        )}

        {/* Additional Images */}
        {post.images.length > 1 && (
          <AnimatedSection direction="up">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {post.images.slice(1).map((img, i) => (
                <div key={i} className="squircle-lg overflow-hidden">
                  <Image
                    src={galleryUrl(img)}
                    alt={`${title} ${i + 2}`}
                    width={600}
                    height={400}
                    quality={75}
                    sizes="(max-width: 640px) 100vw, 50vw"
                    className="w-full h-auto object-cover"
                  />
                </div>
              ))}
            </div>
          </AnimatedSection>
        )}
      </div>
    </section>
  );
}
