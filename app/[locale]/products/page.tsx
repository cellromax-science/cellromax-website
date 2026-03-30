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

   제품 목록 페이지 (서버 컴포넌트).
   - URL searchParams로 카테고리 필터 및 페이지네이션 상태 관리
   - Supabase에서 활성 제품 목록 패칭 (12개씩)
   - 카테고리 탭 필터 + 제품 그리드 + 페이지네이션
   ========================================================================== */

// 5분 ISR — 제품 목록은 관리자 업데이트 시에만 변경됨
export const revalidate = 300;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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
  const locale = paramLocale;
  const t = await getTranslations("products");

  /* ---- Parse search params ---- */
  const rawCategory = resolvedParams.category;
  const activeCategory: ProductCategory =
    rawCategory && VALID_CATEGORIES.includes(rawCategory as ProductCategory)
      ? (rawCategory as ProductCategory)
      : "health_functional";

  const activeSubcategory = resolvedParams.subcategory ?? null;
  const currentPage = Math.max(1, parseInt(resolvedParams.page ?? "1", 10) || 1);

  /* ---- Fetch products from Supabase ---- */
  const supabase = createStaticClient();

  /* Pagination range */
  const from = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const to = from + PRODUCTS_PER_PAGE - 1;

  /* ---- 서브카테고리 + 제품 목록 조회 ---- */
  let subcategories: ProductSubcategory[];
  let products: unknown[] | null;
  let count: number | null;

  if (!activeSubcategory) {
    // 서브카테고리 필터 없음 → 두 쿼리를 병렬 실행
    const [subcategoryResult, productsResult] = await Promise.all([
      supabase
        .from("product_subcategories")
        .select("id, slug, name_ko, name_en, name_zh, name_vi, parent_category, sort_order, is_active")
        .eq("parent_category", activeCategory)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("products")
        .select(
          "id, slug, name_ko, name_en, name_zh, name_vi, category, subcategory_id, thumbnail_url, is_new, product_subcategories(id, slug, name_ko, name_en, name_zh, name_vi)",
          { count: "exact" }
        )
        .eq("is_active", true)
        .eq("category", activeCategory)
        .order("price", { ascending: false })
        .order("created_at", { ascending: false })
        .range(from, to),
    ]);

    subcategories = (subcategoryResult.data as ProductSubcategory[]) ?? [];
    products = productsResult.data;
    count = productsResult.count;
  } else {
    // 서브카테고리 필터 있음 → 순차 실행 (slug→id 변환 필요)
    const { data: subcategoryData } = await supabase
      .from("product_subcategories")
      .select("id, slug, name_ko, name_en, name_zh, name_vi, parent_category, sort_order, is_active")
      .eq("parent_category", activeCategory)
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
      .eq("category", activeCategory)
      .order("price", { ascending: false })
      .order("created_at", { ascending: false });

    const matchedSubcategory = subcategories.find(
      (sc) => sc.slug === activeSubcategory
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
    <section className="section bg-surface">
      <div className="container-site">
        {/* ---- Page Header ---- */}
        <div className="text-center mb-12">
          <h1 className="text-heading text-primary">{t("title")}</h1>
          <div className="divider-gold mx-auto mt-4 mb-4" />
          <p className="text-lead text-gray-600">{t("subtitle")}</p>
        </div>

        {/* ---- Category Filter ---- */}
        <div className="flex flex-col items-center gap-4 mb-10">
          <ProductFilter
            activeCategory={activeCategory}
            activeSubcategory={activeSubcategory}
            subcategories={subcategories}
          />
          <p className="text-sm text-gray-500">
            {t("totalCount", { count: totalCount })}
          </p>
        </div>

        {/* ---- Product Grid ---- */}
        <ProductGrid
          products={(products as unknown as Product[]) ?? []}
          locale={locale}
          emptyMessage={t("noProducts")}
        />

        {/* ---- Pagination ---- */}
        {totalPages > 1 && (
          <div className="mt-12">
            <ProductPagination
              currentPage={currentPage}
              totalPages={totalPages}
            />
          </div>
        )}
      </div>
    </section>
  );
}
