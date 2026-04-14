"use client";

import { useTranslations } from "next-intl";

/* ==========================================================================
   DartDisclosure — 전자공시 탭 컨텐츠
   DART 전자공시 페이지를 iframe으로 임베드하여 보여줌
   ========================================================================== */

const DART_EMBED_URL =
  "https://dart.fss.or.kr/html/search/SearchCompanyIR3_M.html?textCrpNM=%EC%85%80%EB%A1%9C%EB%A7%A5%EC%8A%A4%EC%82%AC%EC%9D%B4%EC%96%B8%EC%8A%A4";

const DART_FRAME_WIDTH = 750;
const DART_FRAME_HEIGHT = 1200;
const DART_FRAME_SIDE_PADDING = 15;
const DART_FRAME_TOP_PADDING = 30;
const DART_SHELL_WIDTH = DART_FRAME_WIDTH + DART_FRAME_SIDE_PADDING * 2;

export function DartDisclosure() {
  const t = useTranslations("ir.disclosure");

  return (
    <div className="w-full">
      {/* 안내 헤더 */}
      <div
        className="mx-auto mb-6 w-full"
        style={{ maxWidth: `${DART_SHELL_WIDTH}px` }}
      >
        <h2 className="text-xl font-bold text-primary">{t("title")}</h2>
        <p className="mt-1 text-sm text-gray-500">{t("description")}</p>
      </div>

      {/* DART iframe */}
      <div
        className="mx-auto w-full squircle-xl border border-gray-200 overflow-hidden bg-white"
        style={{ maxWidth: `${DART_SHELL_WIDTH}px` }}
      >
        <div
          style={{
            paddingLeft: `${DART_FRAME_SIDE_PADDING}px`,
            paddingRight: `${DART_FRAME_SIDE_PADDING}px`,
            paddingTop: `${DART_FRAME_TOP_PADDING}px`,
          }}
        >
          <iframe
            src={DART_EMBED_URL}
            title={t("title")}
            className="block w-full border-0"
            style={{
              width: "100%",
              maxWidth: `${DART_FRAME_WIDTH}px`,
              height: `${DART_FRAME_HEIGHT}px`,
            }}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      </div>

      {/* 출처 안내 */}
      <p
        className="mx-auto mt-4 w-full text-center text-xs text-gray-400"
        style={{ maxWidth: `${DART_SHELL_WIDTH}px` }}
      >
        {t("source")}
      </p>
    </div>
  );
}
