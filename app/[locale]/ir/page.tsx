import { getLocale, getTranslations } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { AnimatedSection } from "@/components/products/AnimatedSection";
import { DartBanner } from "@/components/ir/DartBanner";
import { IrFileCard } from "@/components/ir/IrFileCard";
import { IrCategoryFilter } from "@/components/ir/IrCategoryFilter";
import { IrPagination } from "@/components/ir/IrPagination";
import type { IrFile, IrCategory } from "@/types/ir";
import type { Metadata } from "next";

/* ==========================================================================
   IR Page — /[locale]/ir

   IR 자료실 페이지 (서버 컴포넌트).
   - URL searchParams로 카테고리/연도 필터 및 페이지네이션 상태 관리
   - Supabase에서 활성 IR 파일 목록 패칭 (9개씩)
   - DART 배너 + 카테고리 필터 + 파일 그리드 + 페이지네이션
   ========================================================================== */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FILES_PER_PAGE = 9;

const VALID_CATEGORIES: IrCategory[] = [
  "announcement",
  "annual_report",
  "presentation",
  "other",
];

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ir");
  const locale = await getLocale();

  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical: `/${locale}/ir`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `/${l}/ir`])
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
// Page Component
// ---------------------------------------------------------------------------

interface IrPageProps {
  searchParams: Promise<{
    category?: string;
    year?: string;
    page?: string;
  }>;
}

export default async function IrPage({ searchParams }: IrPageProps) {
  const resolvedParams = await searchParams;
  const t = await getTranslations("ir");

  /* ---- Parse search params ---- */
  const rawCategory = resolvedParams.category;
  const activeCategory: IrCategory | null =
    rawCategory && VALID_CATEGORIES.includes(rawCategory as IrCategory)
      ? (rawCategory as IrCategory)
      : null;

  const rawYear = resolvedParams.year;
  const activeYear =
    rawYear && /^\d{4}$/.test(rawYear) ? rawYear : null;

  const currentPage = Math.max(
    1,
    parseInt(resolvedParams.page ?? "1", 10) || 1,
  );

  /* ---- Fetch IR files from Supabase ---- */
  const supabase = await createClient();

  let query = supabase
    .from("ir_files")
    .select("*", { count: "exact" })
    .eq("is_active", true)
    .order("published_at", { ascending: false });

  if (activeCategory) {
    query = query.eq("category", activeCategory);
  }

  if (activeYear) {
    query = query
      .gte("published_at", `${activeYear}-01-01`)
      .lte("published_at", `${activeYear}-12-31`);
  }

  /* Pagination range */
  const from = (currentPage - 1) * FILES_PER_PAGE;
  const to = from + FILES_PER_PAGE - 1;

  const { data: files, count } = await query.range(from, to);

  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / FILES_PER_PAGE);
  const irFiles = (files as IrFile[]) ?? [];

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

        {/* ---- DART Banner ---- */}
        <AnimatedSection direction="up" className="mb-10">
          <DartBanner />
        </AnimatedSection>

        {/* ---- IR Files Section ---- */}
        <AnimatedSection direction="up">
          {/* Category Filter + Year Select */}
          <div className="flex flex-col items-center gap-4 mb-8">
            <IrCategoryFilter
              activeCategory={activeCategory}
              activeYear={activeYear}
            />
            <p className="text-sm text-gray-500">
              {t("files.title")} {totalCount}
            </p>
          </div>

          {/* File Grid or Empty State */}
          {irFiles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {irFiles.map((file) => (
                <IrFileCard key={file.id} file={file} />
              ))}
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
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                <path d="M14 2v6h6" />
                <path d="M12 18v-6" />
                <path d="m9 15 3-3 3 3" />
              </svg>
              <p className="text-gray-400">{t("files.noFiles")}</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12">
              <IrPagination
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
