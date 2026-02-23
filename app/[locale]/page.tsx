import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { getLocale, getTranslations } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import { HeroSection } from "@/components/sections/HeroSection";
import { AboutSection } from "@/components/sections/AboutSection";

const BrandSection = dynamic(
  () => import("@/components/sections/BrandSection").then((m) => m.BrandSection),
);
const PartnersSection = dynamic(
  () => import("@/components/sections/PartnersSection").then((m) => m.PartnersSection),
);
const HistorySection = dynamic(
  () => import("@/components/sections/HistorySection").then((m) => m.HistorySection),
);
const LocationSection = dynamic(
  () => import("@/components/sections/LocationSection").then((m) => m.LocationSection),
);

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
