import { getLocale, getTranslations } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import { AnimatedSection } from "@/components/products/AnimatedSection";
import { InnerBeautyPage } from "@/components/innerbeauty/InnerBeautyPage";
import type { Metadata } from "next";

/* ==========================================================================
   Inner Beauty Page — /[locale]/innerbeauty

   이너뷰티 제품 정보 페이지.
   제품 상세 정보, 원재료, 영양정보 등을 체계적으로 표시.
   ========================================================================== */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("innerbeauty");
  const locale = await getLocale();

  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical: `/${locale}/innerbeauty`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `/${l}/innerbeauty`])
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

export default async function InnerBeauty() {
  const t = await getTranslations("innerbeauty");

  return (
    <section className="section bg-surface">
      <div className="container-site">
        <AnimatedSection>
          <div className="text-center mb-12">
            <h1 className="text-heading text-primary">{t("title")}</h1>
            <div className="divider-gold mx-auto mt-4 mb-4" />
            <p className="text-lead text-gray-600">{t("subtitle")}</p>
          </div>
        </AnimatedSection>

        <AnimatedSection direction="up">
          <InnerBeautyPage />
        </AnimatedSection>
      </div>
    </section>
  );
}
