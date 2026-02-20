import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

/* ==========================================================================
   DartBanner — DART 공시 외부 링크 배너
   서버 컴포넌트 — 'use client' 불필요
   ========================================================================== */

const DART_URL =
  "https://dart.fss.or.kr/dsab002/search.do?textCrpNm=셀로맥스사이언스";

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

      {/* CTA Button */}
      <Button
        href={DART_URL}
        target="_blank"
        rel="noopener noreferrer"
        variant="outline"
        size="sm"
        className="w-full sm:w-auto shrink-0"
      >
        {t("link")}
        <svg
          className="size-3.5"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Z"
            clipRule="evenodd"
          />
          <path
            fillRule="evenodd"
            d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.553l-9.056 8.194a.75.75 0 0 0-.053 1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </Button>
    </div>
  );
}
