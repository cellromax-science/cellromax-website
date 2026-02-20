"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";

interface ErrorPageProps {
  error: Error;
  reset: () => void;
}

export default function ProductDetailError({ reset }: ErrorPageProps) {
  const t = useTranslations("common");
  const tDetail = useTranslations("products.detail");

  return (
    <section className="section bg-surface">
      <div className="container-site flex flex-col items-center justify-center text-center py-20">
        <svg
          className="size-16 text-gray-300 mb-6"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>

        <p className="text-lg font-semibold text-primary mb-2">
          {t("error")}
        </p>

        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={reset}
            type="button"
            className="px-5 py-2.5 squircle-md bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors duration-150"
          >
            {t("retry")}
          </button>

          <Link
            href="/products"
            className="px-5 py-2.5 squircle-md border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors duration-150"
          >
            {tDetail("backToList")}
          </Link>
        </div>
      </div>
    </section>
  );
}
