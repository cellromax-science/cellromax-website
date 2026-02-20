import { HeroSection } from "@/components/sections/HeroSection";
import { AboutSection } from "@/components/sections/AboutSection";
import { BrandSection } from "@/components/sections/BrandSection";
import { PartnersSection } from "@/components/sections/PartnersSection";
import { HistorySection } from "@/components/sections/HistorySection";
import { LocationSection } from "@/components/sections/LocationSection";

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
