import { getLocale, getTranslations } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import { createStaticClient } from "@/lib/supabase/server";
import { AnimatedSection } from "@/components/products/AnimatedSection";
import { IrFileCard } from "@/components/ir/IrFileCard";
import { IrCategoryFilter } from "@/components/ir/IrCategoryFilter";
import { IrPagination } from "@/components/ir/IrPagination";
import { DartDisclosure } from "@/components/ir/DartDisclosure";
import { EthicsCode } from "@/components/ir/EthicsCode";
import type { IrFile } from "@/types/ir";
import type { Metadata } from "next";

/* ==========================================================================
   IR Page — /[locale]/ir

   IR 자료실 페이지 (서버 컴포넌트).
   탭 구조:
   - IR자료실 (announcement)  — 카드 목록
   - 전자공시 (annual_report) — DART iframe 임베드
   - 윤리강령 (ethics)        — 텍스트 + PDF 다운로드
   ========================================================================== */

// ISR — 5분 캐싱 (관리자 수정 시에만 갱신)
export const revalidate = 300;

const FILES_PER_PAGE = 9;

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
    page?: string;
  }>;
}

export default async function IrPage({ searchParams }: IrPageProps) {
  const resolvedParams = await searchParams;
  const t = await getTranslations("ir");

  const activeTab = resolvedParams.category || "announcement";

  const currentPage = Math.max(
    1,
    parseInt(resolvedParams.page ?? "1", 10) || 1,
  );

  const isListTab = activeTab === "announcement";
  const isDartTab = activeTab === "annual_report";
  const isEthicsTab = activeTab === "ethics";

  /* ---- 카드 목록 탭일 때만 Supabase 패칭 ---- */
  let irFiles: IrFile[] = [];
  let totalCount = 0;
  let totalPages = 0;

  if (isListTab) {
    const supabase = createStaticClient();

    const query = supabase
      .from("ir_files")
      .select(
        "id, title, category, thumbnail_url, published_at, file_size, file_type",
        { count: "exact" },
      )
      .eq("is_active", true)
      .eq("category", "announcement")
      .order("published_at", { ascending: false });

    const from = (currentPage - 1) * FILES_PER_PAGE;
    const to = from + FILES_PER_PAGE - 1;

    const { data: files, count } = await query.range(from, to);

    totalCount = count ?? 0;
    totalPages = Math.ceil(totalCount / FILES_PER_PAGE);
    irFiles = (files as IrFile[]) ?? [];
  }

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

        {/* ---- Tab Navigation ---- */}
        <AnimatedSection direction="up">
          <div className="flex flex-col items-center gap-4 mb-8">
            <IrCategoryFilter
              activeCategory={activeTab === "announcement" ? null : activeTab}
            />
            {isListTab && (
              <p className="text-sm text-gray-500">
                {t("files.title")} {totalCount}
              </p>
            )}
          </div>

          {/* 1) IR자료실 — 카드 목록 */}
          {isListTab && (
            <>
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

              {totalPages > 1 && (
                <div className="mt-12">
                  <IrPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                  />
                </div>
              )}
            </>
          )}

          {/* 2) 전자공시 — DART iframe */}
          {isDartTab && <DartDisclosure />}

          {/* 3) 윤리강령 — 텍스트 + 파일 다운로드 */}
          {isEthicsTab && <EthicsCode />}
        </AnimatedSection>
      </div>
    </section>
  );
}
