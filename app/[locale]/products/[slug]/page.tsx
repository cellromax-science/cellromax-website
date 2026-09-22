import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import { createStaticClient } from "@/lib/supabase/server";
import { Link } from "@/lib/i18n/navigation";
import {
  Badge,
  getCategoryBadgeVariant,
  getCategoryLabel,
} from "@/components/ui/Badge";
import { ProductImageGallery } from "@/components/products/ProductImageGallery";
import { NearbyPharmacyModal } from "@/components/products/NearbyPharmacyModal";
import { HtmlDetailFrame } from "@/components/products/HtmlDetailFrame";
import { DetailTextSection } from "@/components/products/DetailTextSection";
import { JsonLd } from "@/components/seo/JsonLd";
import { productJsonLd, breadcrumbJsonLd } from "@/lib/jsonld";
import { isMeaningfulFieldValue, flattenFieldValue } from "@/lib/products";
import type { Product, ProductCategory } from "@/types/product";
import type { Metadata } from "next";

export const revalidate = 60;

export async function generateStaticParams() {
  const supabase = createStaticClient();
  const { data: products } = await supabase
    .from("products")
    .select("slug")
    .eq("is_active", true);

  if (!products) return [];

  return routing.locales.flatMap((locale) =>
    products.map((p) => ({ locale, slug: p.slug }))
  );
}

type LocaleCode = "ko" | "en" | "zh" | "vi";

type LocalizedFieldPrefix =
  | "name"
  | "ingredients"
  | "functionality"
  | "how_to_use"
  | "other_info";

function getLocalizedField(
  product: Product,
  field: LocalizedFieldPrefix,
  locale: string,
): string | null {
  const localeCode = locale as LocaleCode;
  const key = `${field}_${localeCode}` as keyof Product;
  const value = product[key] as string | null;
  if (value) return value;

  if (localeCode !== "ko") {
    const fallbackKey = `${field}_ko` as keyof Product;
    return (product[fallbackKey] as string | null) || null;
  }
  return null;
}

function getSubcategoryName(
  subcategory: Product["product_subcategories"],
  locale: string,
): string | null {
  if (!subcategory) return null;
  const key = `name_${locale}` as keyof typeof subcategory;
  return (subcategory[key] as string | null) || subcategory.name_ko;
}

function buildDetailSections(
  product: Product,
  locale: string,
  t: Awaited<ReturnType<typeof getTranslations>>,
) {
  const category = product.category;
  const sections: { key: string; label: string; content: string | null }[] = [];

  sections.push({
    key: "ingredients",
    label: t("ingredients"),
    content: getLocalizedField(product, "ingredients", locale),
  });

  if (category === "health_functional") {
    sections.push({
      key: "functionality",
      label: t("functionality"),
      content: getLocalizedField(product, "functionality", locale),
    });
  } else if (category === "medicine" || category === "other") {
    sections.push({
      key: "functionality",
      label: t("efficacy"),
      content: getLocalizedField(product, "functionality", locale),
    });
  }

  const howToUseLabels: Record<ProductCategory, string> = {
    health_functional: t("intakeMethod"),
    general_food: t("intakeMethod"),
    cosmetic: t("usageMethod"),
    other: t("usageMethod"),
    medicine: t("dosage"),
    nutra_pet: t("recommendedFeeding"),
  };

  sections.push({
    key: "howToUse",
    label: howToUseLabels[category],
    content: getLocalizedField(product, "how_to_use", locale),
  });

  sections.push({
    key: "otherInfo",
    label: t("otherInfo"),
    content: getLocalizedField(product, "other_info", locale),
  });

  return sections.filter((section) => section.content !== null);
}

const META_DESCRIPTION_MAX = 160;

/**
 * 제품 데이터로 검색용 설명문을 만듭니다 (meta description · JSON-LD 공용).
 * 기능정보를 우선 사용하고 주요성분을 덧붙이며, 자리표시 값(".", "해당없음" 등)은
 * 걸러서 의미 있는 값이 없으면 null을 반환합니다 (→ 사이트 공통 문구 유지).
 */
function buildProductDescription(
  product: Product,
  locale: string,
  ingredientsLabel: string,
  maxLength?: number,
): string | null {
  const rawIngredients = getLocalizedField(product, "ingredients", locale);
  const rawFunctionality = getLocalizedField(product, "functionality", locale);

  const ingredients = isMeaningfulFieldValue(rawIngredients)
    ? flattenFieldValue(rawIngredients)
    : null;
  const functionality = isMeaningfulFieldValue(rawFunctionality)
    ? flattenFieldValue(rawFunctionality)
    : null;

  let description: string | null = null;
  if (functionality && ingredients) {
    description = `${functionality} · ${ingredientsLabel}: ${ingredients}`;
  } else if (functionality) {
    description = functionality;
  } else if (ingredients) {
    description = `${ingredientsLabel}: ${ingredients}`;
  }

  if (description && maxLength && description.length > maxLength) {
    description = `${description.slice(0, maxLength - 1).trimEnd()}…`;
  }
  return description;
}

const getProduct = unstable_cache(
  async (slug: string) => {
    const supabase = createStaticClient();
    const { data } = await supabase
      .from("products")
      .select("*, product_subcategories(*)")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();
    return data as Product | null;
  },
  ["product-detail"],
  { revalidate: 60 },
);

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const [product, t] = await Promise.all([
    getProduct(decodeURIComponent(slug)),
    getTranslations({ locale, namespace: "products.detail" }),
  ]);

  if (!product) return { title: "Product Not Found" };

  const name = getLocalizedField(product, "name", locale) ?? product.name_ko;
  const description = buildProductDescription(
    product,
    locale,
    t("ingredients"),
    META_DESCRIPTION_MAX,
  );
  const keywords = (product.search_tags ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  return {
    title: name,
    ...(description && { description }),
    ...(keywords.length > 0 && { keywords }),
    alternates: {
      canonical: `/${locale}/products/${slug}`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `/${l}/products/${slug}`])
      ),
    },
    openGraph: {
      title: name,
      ...(description && { description }),
      locale,
      type: "website",
      ...(product.thumbnail_url ? { images: [{ url: product.thumbnail_url }] } : {}),
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { locale: paramLocale, slug } = await params;
  setRequestLocale(paramLocale);

  const locale = paramLocale;
  const decodedSlug = decodeURIComponent(slug);
  const [t, tNav, product] = await Promise.all([
    getTranslations("products.detail"),
    getTranslations("nav"),
    getProduct(decodedSlug),
  ]);

  if (!product) {
    console.error("[ProductDetailPage] slug:", decodedSlug, "| not found");
    notFound();
  }

  const productName = getLocalizedField(product, "name", locale) ?? product.name_ko;
  const subcategoryName = getSubcategoryName(product.product_subcategories, locale);
  const detailSections = buildDetailSections(product, locale, t);
  const description = buildProductDescription(product, locale, t("ingredients"));
  const jsonLdProperties = detailSections
    .filter((section) => isMeaningfulFieldValue(section.content))
    .map((section) => ({
      name: section.label,
      value: flattenFieldValue(section.content as string),
    }));
  const detailHtml =
    (product[`detail_html_${locale}` as keyof Product] as string | null) ||
    product.detail_html_ko ||
    product.detail_html;

  return (
    <section className="section bg-surface">
      <JsonLd
        data={productJsonLd(
          product,
          locale,
          productName,
          description,
          jsonLdProperties,
        )}
      />
      <JsonLd
        data={breadcrumbJsonLd(
          [
            { name: tNav("home"), url: "/" },
            { name: tNav("products"), url: "/products" },
            { name: productName },
          ],
          locale,
        )}
      />
      <div className="container-site">
        <div className="container-product-detail">
          <nav aria-label="breadcrumb" className="mb-8 text-sm text-gray-500">
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div>
              <ProductImageGallery
                images={product.images}
                productName={productName}
                thumbnailUrl={product.thumbnail_url}
              />
            </div>

            <div>
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={getCategoryBadgeVariant(product.category)}>
                    {getCategoryLabel(product.category)}
                  </Badge>
                  {subcategoryName && <Badge variant="outline">{subcategoryName}</Badge>}
                  {product.is_new && (
                    <Badge variant="error" dot>
                      NEW
                    </Badge>
                  )}
                </div>

                <h1 className="text-2xl md:text-3xl font-bold text-primary leading-tight">
                  {productName}
                </h1>

                <div className="divider-gold" />

                {detailSections.length > 0 && (
                  <div className="space-y-6">
                    {detailSections.map((section, index) => (
                      <section
                        key={section.key}
                        className={index === 0 ? "" : "border-t border-gray-200 pt-6"}
                      >
                        <h2 className="text-base md:text-lg font-semibold text-primary">
                          {section.label}
                        </h2>
                        <p className="mt-3 text-sm md:text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {section.content}
                        </p>
                      </section>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-16 space-y-8">
            <div className="flex justify-center">
              <NearbyPharmacyModal />
            </div>

            {(() => {
              if (detailHtml) {
                return (
                  <HtmlDetailFrame
                    html={detailHtml}
                    detailImages={product.detail_images ?? []}
                  />
                );
              }
              if (product.detail_image_url) {
                return (
                  <div className="flex justify-center">
                    <div className="inline-block max-w-full squircle-xl overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={product.detail_image_url}
                        alt={`${productName} - detail`}
                        className="block w-auto h-auto max-w-full"
                        loading="eager"
                        decoding="async"
                      />
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {product.nutrition_image_url && (
              <div className="flex justify-center">
                <div className="inline-block max-w-full squircle-xl overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.nutrition_image_url}
                    alt={`${productName} - nutrition`}
                    className="block w-auto h-auto max-w-full"
                    loading="eager"
                    decoding="async"
                  />
                </div>
              </div>
            )}

            {detailHtml && (
              <DetailTextSection html={detailHtml} label={t("textVersion")} />
            )}
          </div>

          <div className="mt-12 flex justify-center">
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
          </div>
        </div>
      </div>
    </section>
  );
}
