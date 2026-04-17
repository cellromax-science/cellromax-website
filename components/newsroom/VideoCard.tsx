import Image from "next/image";
import { Link } from "@/lib/i18n/navigation";
import type { Post } from "@/types/newsroom";

/* ==========================================================================
   VideoCard — 뉴스룸 홍보영상 카드 컴포넌트

   현대모터그룹 뉴스룸 스타일의 영상 카드 레이아웃.
   - YouTube 썸네일 (mqdefault) + 중앙 재생 아이콘 오버레이
   - 서버 컴포넌트 — 'use client' 불필요
   - 카드 전체가 Link로 감싸져 클릭 시 상세 페이지 이동
   - 다국어(ko/en/zh/vi) 제목 자동 선택
   ========================================================================== */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VideoCardProps {
  /** 표시할 영상 게시글 데이터 */
  post: Post;
  /** 현재 로케일 (ko | en | zh | vi) */
  locale: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * 로케일에 맞는 제목을 반환한다.
 * 해당 로케일 값이 없으면 한국어(ko) 폴백 사용.
 */
function getLocalizedTitle(post: Post, locale: string): string {
  const key = `title_${locale}` as keyof Post;
  return (post[key] as string | null) || post.title_ko;
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

/**
 * YouTube 영상 ID로 중화질 썸네일 URL을 생성한다.
 * mqdefault: 320x180 (16:9) 비율.
 */
function getYouTubeThumbnail(youtubeId: string): string {
  return `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
}

// ---------------------------------------------------------------------------
// PlayIcon — 재생 버튼 오버레이
// ---------------------------------------------------------------------------

function PlayIcon() {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-10">
      <div className="flex items-center justify-center size-14 sm:size-16 rounded-full bg-black/40 transition-colors duration-200 group-hover:bg-black/60">
        <svg
          className="size-6 sm:size-7 text-white ml-1"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M8 5.14v14l11-7-11-7z" />
        </svg>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VideoCard Component
// ---------------------------------------------------------------------------

/**
 * 뉴스룸 영상 카드
 *
 * 홍보영상 목록에서 개별 영상을 카드 형태로 표시한다.
 * YouTube 썸네일 위에 재생 아이콘 오버레이를 배치하여 영상임을 시각적으로 표현.
 * 전체 카드가 링크로 감싸져 클릭 시 /newsroom/[id] 상세 페이지로 이동한다.
 *
 * @example
 * ```tsx
 * <VideoCard post={videoPost} locale="ko" />
 * ```
 */
export function VideoCard({ post, locale }: VideoCardProps) {
  const title = getLocalizedTitle(post, locale);
  const thumbnailSrc =
    post.thumbnail_url ||
    (post.youtube_id ? getYouTubeThumbnail(post.youtube_id) : null);

  return (
    <Link
      href={`/newsroom/${post.id}`}
      className="group block focus-ring"
      aria-label={title}
    >
      <article className="squircle-xl overflow-hidden bg-surface-raised border border-gray-100 shadow-sm transition-all duration-[250ms] ease-[var(--ease-default)] group-hover:shadow-md group-hover:-translate-y-0.5">
        {/* ----------------------------------------------------------------
            Thumbnail Area — 16:9 비율 + 재생 아이콘 오버레이
            ---------------------------------------------------------------- */}
        <div className="relative aspect-video overflow-hidden squircle-t-lg bg-gray-900">
          {thumbnailSrc ? (
            <Image
              src={thumbnailSrc}
              alt={title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              quality={75}
              unoptimized
              className="object-cover transition-transform duration-[250ms] ease-[var(--ease-default)] group-hover:scale-105"
            />
          ) : (
            /* Gradient Fallback — youtube_id 없는 경우 */
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-light" />
          )}

          {/* Play Icon Overlay */}
          <PlayIcon />
        </div>

        {/* ----------------------------------------------------------------
            Content Area
            ---------------------------------------------------------------- */}
        <div className="p-5">
          {/* Date */}
          <time
            dateTime={post.published_at}
            className="block text-xs text-gray-400 mb-2"
          >
            {formatDate(post.published_at)}
          </time>

          {/* Title — 최대 2줄 */}
          <h3 className="text-base font-semibold leading-snug text-primary truncate-2">
            {title}
          </h3>
        </div>
      </article>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Type Exports
// ---------------------------------------------------------------------------

export type { VideoCardProps };
