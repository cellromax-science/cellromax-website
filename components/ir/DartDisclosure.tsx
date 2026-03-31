"use client";

import { useTranslations } from "next-intl";

/* ==========================================================================
   DartDisclosure — 전자공시 탭 컨텐츠
   DART 전자공시 페이지를 iframe으로 임베드하여 보여줌
   ========================================================================== */

const DART_EMBED_URL =
  "https://dart.fss.or.kr/html/search/SearchCompanyIR3_M.html?textCrpNM=%EC%85%80%EB%A1%9C%EB%A7%A5%EC%8A%A4%EC%82%AC%EC%9D%B4%EC%96%B8%EC%8A%A4";

export function DartDisclosure() {
  const t = useTranslations("ir.disclosure");

  return (
    <div className="w-full">
      {/* 안내 헤더 */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-primary">{t("title")}</h2>
        <p className="mt-1 text-sm text-gray-500">{t("description")}</p>
      </div>

      {/* DART iframe */}
      <div className="w-full squircle-xl border border-gray-200 overflow-hidden bg-white flex justify-center">
        <iframe
          src={DART_EMBED_URL}
          title={t("title")}
          className="border-0"
          style={{ width: "860px", maxWidth: "100%", height: "800px" }}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>

      {/* 출처 안내 */}
      <p className="mt-4 text-xs text-gray-400 text-center">
        {t("source")}
      </p>
    </div>
  );
}
