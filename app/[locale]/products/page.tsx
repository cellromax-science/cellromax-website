import { Suspense } from "react";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import { createStaticClient } from "@/lib/supabase/server";
import { ProductFilter } from "@/components/products/ProductFilter";
import { ProductGrid } from "@/components/products/ProductGrid";
import { ProductPagination } from "@/components/products/ProductPagination";
import type { ProductCategory, Product, ProductSubcategory } from "@/types/product";
import type { Metadata } from "next";

/* ==========================================================================
   Products Page — /[locale]/products

   Suspense 기반 Streaming:
   - 헤더는 즉시 렌더링
   - DB 의존 필터 + 그리드는 Suspense로 스트리밍
   ========================================================================== */

export const revalidate = 300;

const PRODUCTS_PER_PAGE = 12;

const VALID_CATEGORIES: ProductCategory[] = [
  "health_functional",
  "general_food",
  "cosmetic",
  "medicine",
  "nutra_pet",
  "other",
];

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("products");
  const locale = await getLocale();

  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical: `/${locale}/products`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `/${l}/products`])
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
// Grid Skeleton (Suspense fallback)
// ---------------------------------------------------------------------------

function ProductGridSkeleton() {
  return (
    <>
      {/* Filter Skeleton */}
      <div className="flex flex-col items-center gap-4 mb-10">
        <div className="flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-10 w-24 bg-gray-100 rounded-full animate-pulse"
            />
          ))}
        </div>
        <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
    </>
  );
}

// ---------------------------------------------------------------------------
// Async Product Content (Suspense boundary 내부)
// ---------------------------------------------------------------------------

async function ProductContent({
  category,
  subcategory,
  page,
  locale,
}: {
  category: ProductCategory;
  subcategory: string | null;
  page: number;
  locale: string;
}) {
  const t = await getTranslations("products");
  const supabase = createStaticClient();

  const from = (page - 1) * PRODUCTS_PER_PAGE;
  const to = from + PRODUCTS_PER_PAGE - 1;

  let subcategories: ProductSubcategory[];
  let products: unknown[] | null;
  let count: number | null;

  if (!subcategory) {
    const [subcategoryResult, productsResult] = await Promise.all([
      supabase
        .from("product_subcategories")
        .select("id, slug, name_ko, name_en, name_zh, name_vi, parent_category, sort_order, is_active")
        .eq("parent_category", category)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("products")
        .select(
          "id, slug, name_ko, name_en, name_zh, name_vi, category, subcategory_id, thumbnail_url, is_new, product_subcategories(id, slug, name_ko, name_en, name_zh, name_vi)",
          { count: "exact" }
        )
        .eq("is_active", true)
        .eq("category", category)
        .order("price", { ascending: false })
        .order("created_at", { ascending: false })
        .range(from, to),
    ]);

    subcategories = (subcategoryResult.data as ProductSubcategory[]) ?? [];
    products = productsResult.data;
    count = productsResult.count;
  } else {
    const { data: subcategoryData } = await supabase
      .from("product_subcategories")
      .select("id, slug, name_ko, name_en, name_zh, name_vi, parent_category, sort_order, is_active")
      .eq("parent_category", category)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    subcategories = (subcategoryData as ProductSubcategory[]) ?? [];

    let query = supabase
      .from("products")
      .select(
        "id, slug, name_ko, name_en, name_zh, name_vi, category, subcategory_id, thumbnail_url, is_new, product_subcategories(id, slug, name_ko, name_en, name_zh, name_vi)",
        { count: "exact" }
      )
      .eq("is_active", true)
      .eq("category", category)
      .order("price", { ascending: false })
      .order("created_at", { ascending: false });

    const matchedSubcategory = subcategories.find(
      (sc) => sc.slug === subcategory
    );
    if (matchedSubcategory) {
      query = query.eq("subcategory_id", matchedSubcategory.id);
    }

    const result = await query.range(from, to);
    products = result.data;
    count = result.count;
  }

  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / PRODUCTS_PER_PAGE);

  return (
    <>
      <div className="flex flex-col items-center gap-4 mb-10">
        <ProductFilter
          activeCategory={category}
          activeSubcategory={subcategory}
          subcategories={subcategories}
        />
        <p className="text-sm text-gray-500">
          {t("totalCount", { count: totalCount })}
        </p>
      </div>

      <ProductGrid
        products={(products as unknown as Product[]) ?? []}
        locale={locale}
        emptyMessage={t("noProducts")}
      />

      {totalPages > 1 && (
        <div className="mt-12">
          <ProductPagination
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

interface ProductsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    category?: string;
    subcategory?: string;
    page?: string;
  }>;
}

export default async function ProductsPage({ params, searchParams }: ProductsPageProps) {
  const { locale: paramLocale } = await params;
  setRequestLocale(paramLocale);

  const resolvedParams = await searchParams;
  const t = await getTranslations("products");

  const rawCategory = resolvedParams.category;
  const activeCategory: ProductCategory =
    rawCategory && VALID_CATEGORIES.includes(rawCategory as ProductCategory)
      ? (rawCategory as ProductCategory)
      : "health_functional";

  const activeSubcategory = resolvedParams.subcategory ?? null;
  const currentPage = Math.max(1, parseInt(resolvedParams.page ?? "1", 10) || 1);

  return (
    <section className="section bg-surface">
      <div className="container-site">
        {/* ---- 즉시 렌더링: 헤더 ---- */}
        <div className="text-center mb-12">
          <h1 className="text-heading text-primary">{t("title")}</h1>
          <div className="divider-gold mx-auto mt-4 mb-4" />
          <p className="text-lead text-gray-600">{t("subtitle")}</p>
        </div>

        {/* ---- 스트리밍: DB 의존 필터 + 그리드 ---- */}
        <Suspense fallback={<ProductGridSkeleton />}>
          <ProductContent
            category={activeCategory}
            subcategory={activeSubcategory}
            page={currentPage}
            locale={paramLocale}
          />
        </Suspense>
      </div>
    </section>
  );
}
