import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Inter, Noto_Sans_SC, Be_Vietnam_Pro } from "next/font/google";
import localFont from "next/font/local";
import { routing } from "@/lib/i18n/routing";
import { LayoutShell } from "@/components/layout/LayoutShell";
import { ToastContainer } from "@/components/ui/Toast";
import { Analytics } from "@vercel/analytics/next";
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("meta");

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
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any", type: "image/x-icon" },
        { url: "/icon.png", sizes: "192x192", type: "image/png" },
      ],
      shortcut: [{ url: "/favicon.ico", type: "image/x-icon" }],
      apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    },
  };
}

// 빌드 타임에 모든 로케일을 미리 생성
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${pretendard.variable} ${inter.variable} ${notoSansSC.variable} ${beVietnamPro.variable}`}
    >
      <body>
        <NextIntlClientProvider messages={messages}>
          <LayoutShell>{children}</LayoutShell>
          <ToastContainer />
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
