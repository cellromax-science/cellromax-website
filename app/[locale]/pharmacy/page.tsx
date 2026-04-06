import { getLocale, getTranslations } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import { AnimatedSection } from "@/components/products/AnimatedSection";
import { PharmacyFinder } from "@/components/pharmacy/PharmacyFinder";
import type { Metadata } from "next";

/* ==========================================================================
   Pharmacy Page — /[locale]/pharmacy

   회원약국찾기 전용 페이지.
   네이버 비즈니스 프로필 등 외부 링크용 독립 URL 제공.
   ========================================================================== */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pharmacy");
  const locale = await getLocale();

  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical: `/${locale}/pharmacy`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `/${l}/pharmacy`])
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

export default async function PharmacyPage() {
  const t = await getTranslations("pharmacy");

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
          <PharmacyFinder />
        </AnimatedSection>
      </div>
    </section>
  );
}
