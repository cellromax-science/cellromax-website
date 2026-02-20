import Image from "next/image";
import { Link } from "@/lib/i18n/navigation";
import { Badge } from "@/components/ui/Badge";
import type { Post } from "@/types/newsroom";

/* ==========================================================================
   PostCard — 뉴스룸 공지사항/뉴스 카드 컴포넌트

   현대모터그룹 뉴스룸 스타일의 카드형 레이아웃.
   - 16:9 썸네일 + 메타(고정 뱃지, 날짜) + 제목 + 내용 미리보기 + CTA
   - 서버 컴포넌트 — 'use client' 불필요
   - 카드 전체가 Link로 감싸져 클릭 시 상세 페이지 이동
   - 다국어(ko/en/zh/vi) 필드 자동 선택
   ========================================================================== */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PostCardProps {
  /** 표시할 게시글 데이터 */
  post: Post;
  /** 현재 로케일 (ko | en | zh | vi) */
  locale: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * 로케일에 맞는 다국어 필드를 반환한다.
 * 해당 로케일 값이 없으면 한국어(ko) 폴백 사용.
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
 * HTML 태그를 제거하여 순수 텍스트만 반환한다.
 * 내용 미리보기에 사용.
 */
function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "");
}

/**
 * ISO 날짜 문자열을 YYYY.MM.DD 형식으로 변환한다.
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

// ---------------------------------------------------------------------------
// PostCard Component
// ---------------------------------------------------------------------------

/**
 * 뉴스룸 게시글 카드
 *
 * 공지사항/뉴스 목록에서 개별 게시글을 카드 형태로 표시한다.
 * 전체 카드가 링크로 감싸져 클릭 시 /newsroom/[id] 상세 페이지로 이동한다.
 *
 * @example
 * ```tsx
 * <PostCard post={post} locale="ko" />
 * ```
 */
export function PostCard({ post, locale }: PostCardProps) {
  const title = getLocalizedField(post, "title", locale);
  const rawContent = getLocalizedField(post, "content", locale);
  const contentPreview = rawContent ? stripHtml(rawContent) : "";
  const thumbnailSrc =
    post.thumbnail_url || (post.images.length > 0 ? post.images[0] : null);

  return (
    <Link
      href={`/newsroom/${post.id}`}
      className="group block focus-ring"
      aria-label={title}
    >
      <article className="squircle-xl overflow-hidden bg-surface-raised border border-gray-100 shadow-sm transition-all duration-[250ms] ease-[var(--ease-default)] group-hover:shadow-md group-hover:-translate-y-0.5">
        {/* ----------------------------------------------------------------
            Thumbnail Area — 16:9 비율
            ---------------------------------------------------------------- */}
        <div className="relative aspect-video overflow-hidden bg-surface">
          {thumbnailSrc ? (
            <Image
              src={thumbnailSrc}
              alt={title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-[250ms] ease-[var(--ease-default)] group-hover:scale-105"
            />
          ) : (
            /* Gradient Fallback — 이미지가 없는 경우 */
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/5 to-surface">
              <svg
                className="size-12 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5"
                />
              </svg>
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------------
            Content Area
            ---------------------------------------------------------------- */}
        <div className="p-5">
          {/* Meta Row — 고정 뱃지 + 날짜 */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              {post.is_pinned && (
                <Badge variant="gold" size="sm">
                  고정
                </Badge>
              )}
            </div>
            <time
              dateTime={post.published_at}
              className="text-xs text-gray-400 shrink-0"
            >
              {formatDate(post.published_at)}
            </time>
          </div>

          {/* Title — 최대 2줄 */}
          <h3 className="text-base font-semibold leading-snug text-primary truncate-2">
            {title}
          </h3>

          {/* Content Preview — 최대 2줄 */}
          {contentPreview && (
            <p className="mt-2 text-sm text-gray-500 leading-relaxed truncate-2">
              {contentPreview}
            </p>
          )}

          {/* Read More CTA */}
          <span className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-primary/70 transition-colors duration-150 group-hover:text-primary">
            자세히 보기
            <svg
              className="size-4 transition-transform duration-150 group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
              />
            </svg>
          </span>
        </div>
      </article>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Type Exports
// ---------------------------------------------------------------------------

export type { PostCardProps };
