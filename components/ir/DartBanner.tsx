import { useTranslations } from "next-intl";

/* ==========================================================================
   DartBanner — DART 공시 안내 배너 (버튼 없이 안내 문구만 표시)
   ========================================================================== */

export function DartBanner() {
  const t = useTranslations("ir.dart");

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 p-6 squircle-xl border border-primary/20 bg-primary/[0.03]">
      {/* Icon */}
      <div className="shrink-0 flex items-center justify-center size-12 squircle-md bg-primary/10">
        <svg
          className="size-6 text-primary"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <path d="M14 2v6h6" />
          <path d="M16 13H8" />
          <path d="M16 17H8" />
          <path d="M10 9H8" />
        </svg>
      </div>

      {/* Text */}
      <div className="flex-1 text-center sm:text-left">
        <h3 className="text-base font-bold text-primary">{t("title")}</h3>
        <p className="mt-1 text-sm text-gray-600">{t("description")}</p>
      </div>
    </div>
  );
}
