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
import { JsonLd } from "@/components/seo/JsonLd";
import { productJsonLd, breadcrumbJsonLd } from "@/lib/jsonld";
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
  const product = await getProduct(decodeURIComponent(slug));

  if (!product) return { title: "Product Not Found" };

  const name = getLocalizedField(product, "name", locale) ?? product.name_ko;

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
  const description = getLocalizedField(product, "ingredients", locale);

  return (
    <section className="section bg-surface">
      <JsonLd data={productJsonLd(product, locale, productName, description)} />
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
              const detailHtml =
                (product[`detail_html_${locale}` as keyof Product] as string | null) ||
                product.detail_html_ko ||
                product.detail_html;

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
