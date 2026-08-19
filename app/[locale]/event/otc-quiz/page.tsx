import type { Metadata } from "next";

import { OtcQuizClient } from "@/components/event/OtcQuizClient";

/* ==========================================================================
   셀로맥스 OTC 퀴즈 이벤트 랜딩 페이지

   약사 대상 OTC 6품목 인식조사·교육 퀴즈. 독립형 랜딩 페이지로,
   LayoutShell에서 사이트 Header/Footer 를 제외하고 렌더링된다.
   ========================================================================== */

export const metadata: Metadata = {
  title: "셀로맥스 OTC 퀴즈 이벤트",
  description:
    "약사 대상 셀로맥스사이언스-퍼슨 OTC 6품목 인식조사·교육 퀴즈. 5문항 퀴즈를 풀고 제출하면 추첨을 통해 커피 모바일 상품권을 드립니다.",
  robots: { index: false, follow: false },
};

export default function OtcQuizEventPage() {
  return <OtcQuizClient />;
}
