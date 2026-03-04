import { notFound } from "next/navigation";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/lib/i18n/navigation";
import { Badge, getCategoryBadgeVariant, getCategoryLabel } from "@/components/ui/Badge";
import { ProductImageGallery } from "@/components/products/ProductImageGallery";
import { ProductDetailTabs } from "@/components/products/ProductDetailTabs";
import { NearbyPharmacyModal } from "@/components/products/NearbyPharmacyModal";
import { AnimatedSection } from "@/components/products/AnimatedSection";
import { HtmlDetailFrame } from "@/components/products/HtmlDetailFrame";
import { detailUrl } from "@/lib/image";
import type { Product, ProductCategory } from "@/types/product";
import type { Metadata } from "next";

/* ==========================================================================
   Product Detail Page — /[locale]/products/[slug]

   제품 상세 페이지 (서버 컴포넌트).
   - Supabase에서 slug 기반 단일 제품 패칭
   - 카테고리별 탭 라벨 분기 처리
   - 이미지 갤러리 + 정보 탭 + 약국 모달 + 상세 이미지
   ========================================================================== */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type LocaleCode = "ko" | "en" | "zh" | "vi";

type LocalizedFieldPrefix =
  | "name"
  | "ingredients"
  | "functionality"
  | "how_to_use"
  | "other_info";

/**
 * 로케일별 필드 값 반환. 해당 로케일 값이 없으면 _ko 폴백.
 */
function getLocalizedField(
  product: Product,
  field: LocalizedFieldPrefix,
  locale: string,
): string | null {
  const localeCode = locale as LocaleCode;
  const key = `${field}_${localeCode}` as keyof Product;
  const value = product[key] as string | null;
  if (value) return value;

  // ko 폴백
  if (localeCode !== "ko") {
    const fallbackKey = `${field}_ko` as keyof Product;
    return (product[fallbackKey] as string | null) || null;
  }
  return null;
}

/**
 * 서브카테고리의 로케일별 이름 반환. 해당 로케일 값이 없으면 name_ko 폴백.
 */
function getSubcategoryName(
  subcategory: Product["product_subcategories"],
  locale: string,
): string | null {
  if (!subcategory) return null;
  const key = `name_${locale}` as keyof typeof subcategory;
  return (subcategory[key] as string | null) || subcategory.name_ko;
}

// ---------------------------------------------------------------------------
// Tab Configuration by Category
// ---------------------------------------------------------------------------

/**
 * 카테고리별 탭 구성을 결정한다.
 * 서버에서 라벨을 결정하여 클라이언트 컴포넌트에 전달.
 */
function buildTabs(
  product: Product,
  locale: string,
  t: Awaited<ReturnType<typeof getTranslations>>,
) {
  const category = product.category;

  const tabs: { key: string; label: string; content: string | null }[] = [];

  // 1. 주요성분 (모든 카테고리)
  tabs.push({
    key: "ingredients",
    label: t("ingredients"),
    content: getLocalizedField(product, "ingredients", locale),
  });

  // 2. 기능성/효능효과 (카테고리별 분기)
  if (category === "health_functional") {
    tabs.push({
      key: "functionality",
      label: t("functionality"),
      content: getLocalizedField(product, "functionality", locale),
    });
  } else if (category === "medicine" || category === "other") {
    tabs.push({
      key: "functionality",
      label: t("efficacy"),
      content: getLocalizedField(product, "functionality", locale),
    });
  }
  // general_food, cosmetic, nutra_pet → 기능성 탭 없음

  // 3. 복용/사용방법 (카테고리별 라벨 분기)
  const howToUseLabels: Record<ProductCategory, string> = {
    health_functional: t("intakeMethod"),
    general_food: t("intakeMethod"),
    cosmetic: t("usageMethod"),
    other: t("usageMethod"),
    medicine: t("dosage"),
    nutra_pet: t("recommendedFeeding"),
  };

  tabs.push({
    key: "howToUse",
    label: howToUseLabels[category],
    content: getLocalizedField(product, "how_to_use", locale),
  });

  // 4. 기타 정보 (모든 카테고리)
  tabs.push({
    key: "otherInfo",
    label: t("otherInfo"),
    content: getLocalizedField(product, "other_info", locale),
  });

  return tabs;
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("name_ko, name_en, name_zh, name_vi, thumbnail_url")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!product) return { title: "Product Not Found" };

  const name = getLocalizedField(product as Product, "name", locale) ?? product.name_ko;

  return {
    title: name,
    alternates: {
      canonical: `/${locale}/products/${slug}`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `/${l}/products/${slug}`])
      ),
    },
    openGraph: {
      title: name,
      locale,
      type: "website",
      ...(product.thumbnail_url ? { images: [{ url: product.thumbnail_url }] } : {}),
    },
  };
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = await getTranslations("products.detail");
  const tNav = await getTranslations("nav");

  /* ---- Fetch product ---- */
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*, product_subcategories(*)")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!data) notFound();

  const product = data as Product;

  /* ---- Localized fields ---- */
  const productName = getLocalizedField(product, "name", locale) ?? product.name_ko;
  const subcategoryName = getSubcategoryName(product.product_subcategories, locale);

  /* ---- Build tabs ---- */
  const tabs = buildTabs(product, locale, t);

  return (
    <section className="section bg-surface">
      <div className="container-site">
        {/* ---- Breadcrumb ---- */}
        <AnimatedSection direction="none" duration={0.5}>
          <nav
            aria-label="breadcrumb"
            className="mb-8 text-sm text-gray-500"
          >
            <ol className="flex items-center gap-1.5 flex-wrap">
              <li>
                <Link href="/" className="hover:text-primary transition-colors">
                  {tNav("home")}
                </Link>
              </li>
              <li aria-hidden="true" className="text-gray-300">/</li>
              <li>
                <Link href="/products" className="hover:text-primary transition-colors">
                  {tNav("products")}
                </Link>
              </li>
              <li aria-hidden="true" className="text-gray-300">/</li>
              <li className="text-primary font-medium truncate max-w-[200px]">
                {productName}
              </li>
            </ol>
          </nav>
        </AnimatedSection>

        {/* ---- 2-Column Grid ---- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left: Image Gallery */}
          <AnimatedSection direction="left" duration={0.8}>
            <ProductImageGallery
              images={product.images}
              productName={productName}
              thumbnailUrl={product.thumbnail_url}
            />
          </AnimatedSection>

          {/* Right: Product Info */}
          <AnimatedSection direction="right" duration={0.8}>
            <div className="space-y-6">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={getCategoryBadgeVariant(product.category)}>
                  {getCategoryLabel(product.category)}
                </Badge>
                {subcategoryName && (
                  <Badge variant="outline">{subcategoryName}</Badge>
                )}
                {product.is_new && (
                  <Badge variant="error" dot>NEW</Badge>
                )}
              </div>

              {/* Product Name */}
              <h1 className="text-2xl md:text-3xl font-bold text-primary leading-tight">
                {productName}
              </h1>

              {/* Gold Divider */}
              <div className="divider-gold" />

              {/* Detail Tabs */}
              <ProductDetailTabs tabs={tabs} />
            </div>
          </AnimatedSection>
        </div>

        {/* ---- Nearby Pharmacy Button + Detail Image ---- */}
        <AnimatedSection direction="up" className="mt-16 space-y-8">
          {/* Pharmacy Button */}
          <div className="flex justify-center">
            <NearbyPharmacyModal />
          </div>

          {/* Detail Section: HTML형 우선, 없으면 이미지형 fallback */}
          {product.detail_html ? (
            <HtmlDetailFrame html={product.detail_html} />
          ) : product.detail_image_url ? (
            <div className="w-full squircle-xl overflow-hidden">
              <Image
                src={detailUrl(product.detail_image_url)}
                alt={`${productName} - detail`}
                width={1200}
                height={1600}
                quality={75}
                className="w-full h-auto"
                sizes="(max-width: 1280px) 100vw, 1200px"
              />
            </div>
          ) : null}

          {/* Nutrition Image (영양정보) */}
          {product.nutrition_image_url && (
            <div className="w-full squircle-xl overflow-hidden">
              <Image
                src={detailUrl(product.nutrition_image_url)}
                alt={`${productName} - nutrition`}
                width={1200}
                height={1600}
                quality={75}
                className="w-full h-auto"
                sizes="(max-width: 1280px) 100vw, 1200px"
              />
            </div>
          )}
        </AnimatedSection>

        {/* ---- Back to List ---- */}
        <AnimatedSection direction="up" className="mt-12 flex justify-center">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-6 py-3 squircle-md border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors duration-150"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-4"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
                clipRule="evenodd"
              />
            </svg>
            {t("backToList")}
          </Link>
        </AnimatedSection>
      </div>
    </section>
  );
}
