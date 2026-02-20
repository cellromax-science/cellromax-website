import { HeroSection } from "@/components/sections/HeroSection";
import { AboutSection } from "@/components/sections/AboutSection";
import { BrandSection } from "@/components/sections/BrandSection";
import { HistorySection } from "@/components/sections/HistorySection";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <AboutSection />
      <BrandSection />
      <HistorySection />
    </>
  );
}
