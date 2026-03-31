import { cache } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import { notFound } from "next/navigation";
import Image from "next/image";
import { createStaticClient } from "@/lib/supabase/server";
import { Link } from "@/lib/i18n/navigation";
import { AnimatedSection } from "@/components/products/AnimatedSection";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { detailUrl } from "@/lib/image";
import type { IrFile, IrCategory } from "@/types/ir";
import type { BadgeVariant } from "@/components/ui/Badge";
import type { Metadata } from "next";

/* ==========================================================================
   IR Detail Page — /[locale]/ir/[id]

   IR 자료 상세 페이지 (서버 컴포넌트).
   - UUID 유효성 검증 후 Supabase에서 단일 IR 파일 패칭
   - 카테고리 배지 + 게시일 + 제목 + 썸네일 + 본문 + PDF 다운로드
   - 뉴스룸 상세 페이지와 동일한 레이아웃/간격/타이포그래피 적용
   - IR 파일이 없거나 비활성이면 404 페이지로 전환
   ========================================================================== */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// Category -> Badge Variant 매핑
// ---------------------------------------------------------------------------

const categoryBadgeMap: Record<IrCategory, BadgeVariant> = {
  announcement: "info",
  annual_report: "gold",
  presentation: "primary",
  ethics: "primary",
  other: "outline",
};

const categoryLabelMap: Record<IrCategory, string> = {
  announcement: "IR자료실",
  annual_report: "전자공시",
  presentation: "IR 발표자료",
  ethics: "윤리강령",
  other: "기타",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
 * 파일 크기를 읽기 쉬운 단위로 변환.
 */
function formatFileSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
// Cached Supabase Query — generateMetadata + page에서 공유 (1회만 실행)
// ---------------------------------------------------------------------------

const getIrFile = cache(async (id: string) => {
  const supabase = createStaticClient();
  const { data } = await supabase
    .from("ir_files")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .single();
  return data as IrFile | null;
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
  const t = await getTranslations("ir");
  const locale = await getLocale();

  if (!UUID_REGEX.test(id)) {
    return { title: t("detail.notFound") };
  }

  const file = await getIrFile(id);

  if (!file) {
    return { title: t("detail.notFound") };
  }

  const description = file.content?.slice(0, 160) || undefined;

  return {
    title: file.title,
    description,
    alternates: {
      canonical: `/${locale}/ir/${id}`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `/${l}/ir/${id}`])
      ),
    },
    openGraph: {
      title: file.title,
      description,
      locale,
      type: "website",
      ...(file.thumbnail_url ? { images: [file.thumbnail_url] } : {}),
    },
  };
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

interface IrDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function IrDetailPage({ params }: IrDetailPageProps) {
  const { id } = await params;
  const t = await getTranslations("ir");

  if (!UUID_REGEX.test(id)) {
    notFound();
  }

  const file = await getIrFile(id);

  if (!file) {
    notFound();
  }
  const badgeVariant = categoryBadgeMap[file.category];
  const categoryLabel = categoryLabelMap[file.category];
  const fileSize = formatFileSize(file.file_size);

  return (
    <section className="section bg-surface">
      <div className="container-site max-w-4xl">
        {/* ---- Back to list ---- */}
        <AnimatedSection>
          <Link
            href="/ir"
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
            {t("detail.backToList")}
          </Link>
        </AnimatedSection>

        {/* ---- Header: Badge + Date + Title + Divider ---- */}
        <AnimatedSection>
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant={badgeVariant} size="sm">
                {categoryLabel}
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-3">
              {file.title}
            </h1>
            <time className="text-sm text-gray-400">
              {formatDate(file.published_at)}
            </time>
            <div className="divider-gold mt-6" />
          </div>
        </AnimatedSection>

        {/* ---- Thumbnail Image ---- */}
        {file.thumbnail_url && (
          <AnimatedSection direction="up">
            <div className="mb-8 squircle-xl overflow-hidden">
              <Image
                src={detailUrl(file.thumbnail_url)}
                alt={file.title}
                width={800}
                height={450}
                quality={75}
                sizes="(max-width: 800px) 100vw, 800px"
                className="w-full h-auto object-cover"
              />
            </div>
          </AnimatedSection>
        )}

        {/* ---- Content Body ---- */}
        {file.content && (
          <AnimatedSection direction="up">
            <div className="mb-8">
              <ContentRenderer content={file.content} />
            </div>
          </AnimatedSection>
        )}

        {/* ---- PDF Download Section ---- */}
        {file.file_url && (
          <AnimatedSection direction="up">
            <div className="mb-8 p-6 squircle-xl border border-primary/20 bg-primary/[0.03]">
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                {/* File Icon */}
                <div className="shrink-0 flex items-center justify-center size-12 squircle-md bg-primary/10">
                  <svg
                    className="size-6 text-primary"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                    <path d="M14 2v6h6" />
                    <path d="M12 18v-6" />
                    <path d="m9 15 3 3 3-3" />
                  </svg>
                </div>

                {/* File Info */}
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-base font-bold text-primary">
                    {t("detail.attachedFile")}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {file.file_name || file.title}
                    {file.file_type && (
                      <span className="text-gray-400">
                        {" "}({file.file_type.toUpperCase()})
                      </span>
                    )}
                    {fileSize && (
                      <span className="text-gray-400"> · {fileSize}</span>
                    )}
                  </p>
                </div>

                {/* Download Button */}
                <Button
                  href={file.file_url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="primary"
                  size="sm"
                  className="w-full sm:w-auto shrink-0"
                >
                  <svg
                    className="size-4"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                    <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                  </svg>
                  {t("detail.download")}
                </Button>
              </div>
            </div>
          </AnimatedSection>
        )}

        {/* ---- Back to list (Bottom) ---- */}
        <AnimatedSection direction="up">
          <div className="flex justify-center pt-4">
            <Link
              href="/ir"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors"
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
              {t("detail.backToList")}
            </Link>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
