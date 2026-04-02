import { Suspense } from "react";
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

   Suspense 기반 Streaming:
   - 헤더 + 탭 네비게이션은 즉시 렌더링
   - DB 의존 카드 목록은 Suspense로 스트리밍
   ========================================================================== */

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
// Card Grid Skeleton (Suspense fallback)
// ---------------------------------------------------------------------------

function CardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="squircle-xl overflow-hidden bg-surface-raised border border-gray-100"
        >
          <div className="aspect-card bg-gray-100 animate-pulse" />
          <div className="p-5 space-y-3">
            <div className="h-5 w-20 bg-gray-200 rounded-full animate-pulse" />
            <div className="h-5 w-full bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-2/3 bg-gray-50 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Async Card List (Suspense boundary 내부)
// ---------------------------------------------------------------------------

async function IrFileList({
  page,
}: {
  page: number;
}) {
  const t = await getTranslations("ir");
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

  const from = (page - 1) * FILES_PER_PAGE;
  const to = from + FILES_PER_PAGE - 1;

  const { data: files, count } = await query.range(from, to);

  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / FILES_PER_PAGE);
  const irFiles = (files as IrFile[]) ?? [];

  return (
    <>
      <p className="text-sm text-gray-500 text-center mb-8">
        {t("files.title")} {totalCount}
      </p>

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

interface IrPageProps {
  searchParams: Promise<{
    category?: string;
    page?: string;
  }>;
}

export default async function IrPage({ searchParams }: IrPageProps) {
  const resolvedParams = await searchParams;
  const t = await getTranslations("ir");

  const activeTab = resolvedParams.category || "annual_report";

  const currentPage = Math.max(
    1,
    parseInt(resolvedParams.page ?? "1", 10) || 1,
  );

  const isListTab = activeTab === "announcement";
  const isDartTab = activeTab === "annual_report";
  const isEthicsTab = activeTab === "ethics";

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

        <AnimatedSection direction="up">
          <div className="flex flex-col items-center gap-4 mb-8">
            <IrCategoryFilter
              activeCategory={activeTab === "annual_report" ? null : activeTab}
            />
          </div>

          {/* ---- 스트리밍: DB 의존 컨텐츠 ---- */}

          {isListTab && (
            <Suspense fallback={<CardGridSkeleton />}>
              <IrFileList page={currentPage} />
            </Suspense>
          )}

          {isDartTab && <DartDisclosure />}

          {isEthicsTab && <EthicsCode />}
        </AnimatedSection>
      </div>
    </section>
  );
}
