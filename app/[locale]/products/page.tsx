import { Suspense } from "react";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import {
  PRODUCT_CARD_SELECT,
  PRODUCT_SUBCATEGORY_FILTER_SELECT,
} from "@/lib/products";
import { buildSearchTagFilter } from "@/lib/product-search";
import { createStaticClient } from "@/lib/supabase/server";
import { ProductFilter } from "@/components/products/ProductFilter";
import { ProductSearchBar } from "@/components/products/ProductSearchBar";
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

const CATEGORY_LABELS_KO: Record<ProductCategory, string> = {
  health_functional: "건강기능식품",
  general_food: "일반식품",
  cosmetic: "화장품",
  medicine: "일반의약품",
  nutra_pet: "뉴트라펫",
  other: "기타",
};

const CATEGORY_SEARCH_TERMS: Record<ProductCategory, string[]> = {
  health_functional: [
    CATEGORY_LABELS_KO.health_functional,
    "health functional food",
    "functional food",
    "health supplement",
    "保健食品",
    "保健功能食品",
    "thuc pham chuc nang",
    "thực phẩm chức năng",
  ],
  general_food: [
    CATEGORY_LABELS_KO.general_food,
    "general food",
    "food",
    "普通食品",
    "一般食品",
    "thuc pham",
    "thực phẩm",
  ],
  cosmetic: [
    CATEGORY_LABELS_KO.cosmetic,
    "cosmetic",
    "cosmetics",
    "skincare",
    "化妆品",
    "護膚品",
    "my pham",
    "mỹ phẩm",
  ],
  medicine: [
    CATEGORY_LABELS_KO.medicine,
    "medicine",
    "medicines",
    "otc",
    "drug",
    "一般医药品",
    "药品",
    "thuoc",
    "thuốc",
  ],
  nutra_pet: [
    CATEGORY_LABELS_KO.nutra_pet,
    "nutra pet",
    "pet supplement",
    "pet",
    "宠物营养",
    "宠物保健",
    "thu cung",
    "thú cưng",
  ],
  other: [
    CATEGORY_LABELS_KO.other,
    "other",
    "others",
    "其他",
    "khac",
    "khác",
  ],
};

const PRODUCT_SEARCH_FIELDS = [
  "name_ko",
  "name_en",
  "name_zh",
  "name_vi",
  "ingredients_ko",
  "ingredients_en",
  "ingredients_zh",
  "ingredients_vi",
  "functionality_ko",
  "functionality_en",
  "functionality_zh",
  "functionality_vi",
];

const SUBCATEGORY_SEARCH_FIELDS = [
  "name_ko",
  "name_en",
  "name_zh",
  "name_vi",
];

function buildIlikeFilters(fields: string[], keyword: string) {
  return fields.map((field) => `${field}.ilike.%${keyword}%`);
}

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
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
  search,
}: {
  category: ProductCategory;
  subcategory: string | null;
  page: number;
  locale: string;
  search: string | null;
}) {
  const t = await getTranslations("products");
  const supabase = createStaticClient();

  const from = (page - 1) * PRODUCTS_PER_PAGE;
  const to = from + PRODUCTS_PER_PAGE - 1;

  let subcategories: ProductSubcategory[] = [];
  let products: unknown[] | null;
  let count: number | null;

  // ---- 검색 모드: 카테고리 무관 전체 검색 ----
  if (search && search.trim()) {
    const keyword = search.trim();
    const loweredKeyword = keyword.toLocaleLowerCase();
    const matchedCategories = VALID_CATEGORIES.filter((category) =>
      CATEGORY_SEARCH_TERMS[category].some((term) =>
        term.toLocaleLowerCase().includes(loweredKeyword)
      )
    );
    const subcategoryFilters = buildIlikeFilters(
      SUBCATEGORY_SEARCH_FIELDS,
      keyword
    );
    const { data: matchedSubcategories } = await supabase
      .from("product_subcategories")
      .select("id")
      .eq("is_active", true)
      .or(subcategoryFilters.join(","));

    const orFilters = buildIlikeFilters(PRODUCT_SEARCH_FIELDS, keyword);
    const searchTagFilter = buildSearchTagFilter(keyword);
    if (searchTagFilter) {
      orFilters.push(searchTagFilter);
    }

    if (matchedCategories.length > 0) {
      orFilters.push(`category.in.(${matchedCategories.join(",")})`);
    }

    const matchedSubcategoryIds =
      matchedSubcategories?.map((subcategory) => subcategory.id) ?? [];
    if (matchedSubcategoryIds.length > 0) {
      orFilters.push(`subcategory_id.in.(${matchedSubcategoryIds.join(",")})`);
    }

    const query = supabase
      .from("products")
      .select(PRODUCT_CARD_SELECT, { count: "exact" })
      .eq("is_active", true)
      .or(orFilters.join(","))
      .order("created_at", { ascending: false })
      .range(from, to);

    const result = await query;
    products = result.data;
    count = result.count;
  }
  // ---- 필터 모드: 기존 카테고리/서브카테고리 필터링 ----
  else if (!subcategory) {
    const [subcategoryResult, productsResult] = await Promise.all([
      supabase
        .from("product_subcategories")
        .select(PRODUCT_SUBCATEGORY_FILTER_SELECT)
        .eq("parent_category", category)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("products")
        .select(PRODUCT_CARD_SELECT, { count: "exact" })
        .eq("is_active", true)
        .eq("category", category)
        .order("category_sort_order", { ascending: true })
        .range(from, to),
    ]);

    subcategories = (subcategoryResult.data as ProductSubcategory[]) ?? [];
    products = productsResult.data;
    count = productsResult.count;
  } else {
    const { data: subcategoryData } = await supabase
      .from("product_subcategories")
      .select(PRODUCT_SUBCATEGORY_FILTER_SELECT)
      .eq("parent_category", category)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    subcategories = (subcategoryData as ProductSubcategory[]) ?? [];

    let query = supabase
      .from("products")
      .select(PRODUCT_CARD_SELECT, { count: "exact" })
      .eq("is_active", true)
      .eq("category", category)
      .order("category_sort_order", { ascending: true });

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
  const isSearchMode = !!(search && search.trim());

  return (
    <>
      {/* 검색 모드가 아닐 때만 카테고리 필터 표시 */}
      {!isSearchMode && (
        <div className="flex flex-col items-center gap-4 mb-10">
          <ProductFilter
            activeCategory={category}
            activeSubcategory={subcategory}
            subcategories={subcategories}
          />
        </div>
      )}

      {/* 검색 결과 안내 또는 총 개수 */}
      <div className="text-center mb-6">
        {isSearchMode ? (
          <p className="text-sm text-gray-500">
            {t("searchResult", { keyword: search!.trim(), count: totalCount })}
          </p>
        ) : (
          <p className="text-sm text-gray-500">
            {t("totalCount", { count: totalCount })}
          </p>
        )}
      </div>

      <ProductGrid
        products={(products as unknown as Product[]) ?? []}
        locale={locale}
        emptyMessage={isSearchMode ? t("noSearchResult") : t("noProducts")}
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
    search?: string;
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
  const searchQuery = resolvedParams.search ?? null;

  return (
    <section className="section bg-surface">
      <div className="container-site">
        {/* ---- 즉시 렌더링: 헤더 + 검색바 ---- */}
        <div className="text-center mb-12">
          <h1 className="text-heading text-primary">{t("title")}</h1>
          <div className="divider-gold mx-auto mt-4 mb-4" />
          <p className="text-lead text-gray-600">{t("subtitle")}</p>
        </div>

        <ProductSearchBar initialSearch={searchQuery ?? ""} />

        {/* ---- 스트리밍: DB 의존 필터 + 그리드 ---- */}
        <Suspense fallback={<ProductGridSkeleton />}>
          <ProductContent
            category={activeCategory}
            subcategory={activeSubcategory}
            page={currentPage}
            locale={paramLocale}
            search={searchQuery}
          />
        </Suspense>
      </div>
    </section>
  );
}
