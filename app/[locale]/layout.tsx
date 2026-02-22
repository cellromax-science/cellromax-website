import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages } from "next-intl/server";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { routing } from "@/lib/i18n/routing";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ToastContainer } from "@/components/ui/Toast";
import "../globals.css";

export const metadata: Metadata = {
  title: {
    default: "셀로맥스사이언스",
    template: "%s | 셀로맥스사이언스",
  },
  description: "프리미엄 솔루션으로 당신의 건강한 삶을 응원합니다.",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages();

  // 미들웨어에서 설정한 x-pathname 헤더로 admin 경로 여부를 판별합니다.
  // admin 경로에서는 공개 사이트의 Header/Footer를 렌더링하지 않습니다.
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "";
  const isAdmin = pathname.includes("/admin");

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider messages={messages}>
          {!isAdmin && <Header />}
          <main>{children}</main>
          {!isAdmin && <Footer />}
          <ToastContainer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
