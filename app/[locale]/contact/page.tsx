import { getTranslations } from "next-intl/server";
import { AnimatedSection } from "@/components/products/AnimatedSection";
import { ContactPage } from "@/components/contact/ContactPage";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contact");
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default async function Contact() {
  const t = await getTranslations("contact");

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
          <ContactPage />
        </AnimatedSection>
      </div>
    </section>
  );
}
