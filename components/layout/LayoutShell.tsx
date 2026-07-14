/* ==========================================================================
   LayoutShell — Admin/Public 레이아웃 분기 컴포넌트

   클라이언트에서 pathname을 읽어 admin 경로인 경우
   Header/Footer를 숨기고 PageTransition을 비활성화한다.
   서버 레이아웃에서 headers()를 호출하지 않아 ISR 정적 캐싱이 가능해진다.
   ========================================================================== */

"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";

interface LayoutShellProps {
  children: React.ReactNode;
}

export function LayoutShell({ children }: LayoutShellProps) {
  const pathname = usePathname();
  // admin: 자체 셸 사용, event: 독립형 랜딩 페이지 (사이트 Header/Footer 제외)
  const isStandalone =
    pathname.includes("/admin") || pathname.includes("/event/");

  if (isStandalone) {
    return <main>{children}</main>;
  }

  return (
    <>
      <Header />
      <main>
        <PageTransition>{children}</PageTransition>
      </main>
      <Footer />
    </>
  );
}
