import Image from "next/image";
import { Link } from "@/lib/i18n/navigation";
import { Badge } from "@/components/ui/Badge";
import type { IrFile, IrCategory } from "@/types/ir";
import type { BadgeVariant } from "@/components/ui/Badge";

/* ==========================================================================
   IrFileCard — IR 자료 카드 (뉴스룸 PostCard 스타일)

   뉴스룸 PostCard.tsx와 동일한 디자인 패턴 적용.
   - 16:9 썸네일 + 카테고리 배지/날짜 + 제목 + 내용 미리보기 + CTA
   - 서버 컴포넌트 — 'use client' 불필요
   - 카드 전체가 Link로 감싸져 클릭 시 /ir/[id] 상세 페이지 이동
   ========================================================================== */

// ---------------------------------------------------------------------------
// Category -> Badge Variant 매핑
// ---------------------------------------------------------------------------

const categoryBadgeMap: Record<IrCategory, BadgeVariant> = {
  announcement: "info",
  annual_report: "gold",
  presentation: "primary",
  other: "outline",
};

// ---------------------------------------------------------------------------
// Category -> 한국어 라벨 매핑
// ---------------------------------------------------------------------------

const categoryLabelMap: Record<IrCategory, string> = {
  announcement: "공시자료",
  annual_report: "연간보고서",
  presentation: "IR 발표자료",
  other: "기타",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
 * 본문 텍스트에서 HTML 태그를 제거하여 순수 텍스트만 반환한다.
 * 내용 미리보기에 사용.
 */
function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "");
}

// ---------------------------------------------------------------------------
// IrFileCard Component
// ---------------------------------------------------------------------------

interface IrFileCardProps {
  /** 표시할 IR 파일 데이터 */
  file: IrFile;
}

/**
 * IR 자료 카드
 *
 * IR 목록에서 개별 자료를 카드 형태로 표시한다.
 * 전체 카드가 링크로 감싸져 클릭 시 /ir/[id] 상세 페이지로 이동한다.
 *
 * @example
 * ```tsx
 * <IrFileCard file={irFile} />
 * ```
 */
export function IrFileCard({ file }: IrFileCardProps) {
  const badgeVariant = categoryBadgeMap[file.category];
  const categoryLabel = categoryLabelMap[file.category];
  const contentPreview = file.content ? stripHtml(file.content) : "";

  return (
    <Link
      href={`/ir/${file.id}`}
      className="group block focus-ring"
      aria-label={file.title}
    >
      <article className="squircle-xl overflow-hidden bg-surface-raised border border-gray-100 shadow-sm transition-all duration-[250ms] ease-[var(--ease-default)] group-hover:shadow-md group-hover:-translate-y-0.5">
        {/* ----------------------------------------------------------------
            Thumbnail Area — 16:9 비율
            ---------------------------------------------------------------- */}
        <div className="relative aspect-video overflow-hidden bg-surface">
          {file.thumbnail_url ? (
            <Image
              src={file.thumbnail_url}
              alt={file.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-[250ms] ease-[var(--ease-default)] group-hover:scale-105"
            />
          ) : (
            /* Gradient Fallback — 썸네일이 없는 경우 문서 아이콘 표시 */
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
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                />
              </svg>
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------------
            Content Area
            ---------------------------------------------------------------- */}
        <div className="p-5">
          {/* Meta Row — 카테고리 배지 + 날짜 */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <Badge variant={badgeVariant} size="sm">
              {categoryLabel}
            </Badge>
            <time
              dateTime={file.published_at}
              className="text-xs text-gray-400 shrink-0"
            >
              {formatDate(file.published_at)}
            </time>
          </div>

          {/* Title — 최대 2줄 */}
          <h3 className="text-base font-semibold leading-snug text-primary truncate-2">
            {file.title}
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

export type { IrFileCardProps };
