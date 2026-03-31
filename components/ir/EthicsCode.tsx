import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

/* ==========================================================================
   EthicsCode — 윤리강령 탭 컨텐츠
   텍스트 안내 + PDF 파일 다운로드
   ========================================================================== */

/** 윤리강령 PDF 파일 경로 (public/files/) */
const ETHICS_PDF_URL = "/files/셀로맥스사이언스_윤리강령.pdf";
const ETHICS_PDF_NAME = "셀로맥스사이언스_윤리강령.pdf";

export function EthicsCode() {
  const t = useTranslations("ir.ethics");

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* 제목 */}
      <div className="border-t-2 border-primary mb-8">
        <div className="bg-gray-50 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">{t("heading")}</h2>
        </div>
        <div className="border-b border-gray-200" />
      </div>

      {/* 본문 */}
      <div className="px-2 space-y-6 text-gray-700 leading-relaxed">
        <p>{t("body1")}</p>
        <p>{t("body2")}</p>
        <p>{t("body3")}</p>
        <p>{t("body4")}</p>
      </div>

      {/* 파일 다운로드 */}
      <div className="mt-10 p-5 squircle-xl border border-gray-200 bg-gray-50/50">
        <div className="flex items-center gap-4">
          {/* File Icon */}
          <div className="shrink-0">
            <svg
              className="size-10 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
              <path d="M14 2v6h6" />
            </svg>
          </div>

          {/* File Info */}
          <div className="flex-1 min-w-0">
            <a
              href={ETHICS_PDF_URL}
              download={ETHICS_PDF_NAME}
              className="text-sm font-semibold text-gray-900 hover:text-primary transition-colors"
            >
              {ETHICS_PDF_NAME}
            </a>
          </div>

          {/* Download Button */}
          <Button
            href={ETHICS_PDF_URL}
            download={ETHICS_PDF_NAME}
            variant="primary"
            size="sm"
            className="shrink-0"
          >
            <svg
              className="size-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
              <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
            </svg>
            {t("download")}
          </Button>
        </div>
      </div>
    </div>
  );
}
