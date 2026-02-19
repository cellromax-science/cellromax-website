import { useTranslations } from "next-intl";

export default function HomePage() {
  const t = useTranslations("hero");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center px-4">
        <h1 className="text-4xl font-bold whitespace-pre-line">{t("title")}</h1>
        <p className="mt-4 text-lg text-gray-600 whitespace-pre-line">
          {t("subtitle")}
        </p>
      </div>
    </main>
  );
}
