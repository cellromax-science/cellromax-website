import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import { HeroSection } from "@/components/sections/HeroSection";
import { AboutSection } from "@/components/sections/AboutSection";
import { BrandSection } from "@/components/sections/BrandSection";
import { PartnersSection } from "@/components/sections/PartnersSection";
import { HistorySection } from "@/components/sections/HistorySection";
import { LocationSection } from "@/components/sections/LocationSection";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  const locale = await getLocale();

  return {
    title: t("homeTitle"),
    description: t("homeDescription"),
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `/${l}`])
      ),
    },
    openGraph: {
      title: t("homeTitle"),
      description: t("homeDescription"),
      locale,
      type: "website",
    },
  };
}

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <AboutSection />
      <BrandSection />
      <PartnersSection />
      <HistorySection />
      <LocationSection />
    </>
  );
}
