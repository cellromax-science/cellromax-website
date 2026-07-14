import type { Metadata } from "next";

import { BeberaxQuizClient } from "@/components/event/BeberaxQuizClient";

/* ==========================================================================
   베베락스액 퀴즈 이벤트 랜딩 페이지

   약사 대상 제품 인식 퀴즈 이벤트. 독립형 랜딩 페이지로,
   LayoutShell에서 사이트 Header/Footer 를 제외하고 렌더링된다.
   ========================================================================== */

export const metadata: Metadata = {
  title: "베베락스액 퀴즈 이벤트",
  description:
    "약사 대상 베베락스액 제품 인식 퀴즈 이벤트. 정보 입력 후 퀴즈를 풀고 제출하면 추첨을 통해 커피 쿠폰을 드립니다.",
  robots: { index: false, follow: false },
};

export default function BeberaxQuizEventPage() {
  return <BeberaxQuizClient />;
}
