import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, getLocale } from "next-intl/server";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Inter, Noto_Sans_SC, Be_Vietnam_Pro } from "next/font/google";
import localFont from "next/font/local";
import { routing } from "@/lib/i18n/routing";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ToastContainer } from "@/components/ui/Toast";
import { PageTransition } from "@/components/layout/PageTransition";
import "../globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sc",
  display: "swap",
});

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-vietnam",
  display: "swap",
});

const pretendard = localFont({
  src: [
    { path: "../../public/fonts/Pretendard-Regular.woff2", weight: "400" },
    { path: "../../public/fonts/Pretendard-Medium.woff2", weight: "500" },
    { path: "../../public/fonts/Pretendard-SemiBold.woff2", weight: "600" },
    { path: "../../public/fonts/Pretendard-Bold.woff2", weight: "700" },
    { path: "../../public/fonts/Pretendard-ExtraBold.woff2", weight: "800" },
  ],
  variable: "--font-pretendard",
  display: "swap",
});

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://cellromax.kr";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0A1628",
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  const locale = await getLocale();

  return {
    title: {
      default: t("siteName"),
      template: `%s | ${t("siteName")}`,
    },
    description: t("siteDescription"),
    metadataBase: new URL(BASE_URL),
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `/${l}`])
      ),
    },
    openGraph: {
      siteName: t("siteName"),
      locale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("siteName"),
      description: t("siteDescription"),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

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
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${pretendard.variable} ${inter.variable} ${notoSansSC.variable} ${beVietnamPro.variable}`}
    >
      <body>
        <NextIntlClientProvider messages={messages}>
          {!isAdmin && <Header />}
          <main>
            {!isAdmin ? (
              <PageTransition>{children}</PageTransition>
            ) : (
              children
            )}
          </main>
          {!isAdmin && <Footer />}
          <ToastContainer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
