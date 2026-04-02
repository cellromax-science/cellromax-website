import type { Product } from "@/types/product";
import type { Post } from "@/types/newsroom";

/* ==========================================================================
   JSON-LD Structured Data Generators

   Google Rich Results를 위한 schema.org 구조화 데이터 생성 유틸리티.
   각 함수는 해당 스키마의 plain object를 반환한다.
   페이지에서 <script type="application/ld+json">으로 삽입.
   ========================================================================== */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://cellromax.kr";

// ---------------------------------------------------------------------------
// Organization — 회사 정보 (전체 사이트 공통)
// ---------------------------------------------------------------------------

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "셀로맥스사이언스",
    alternateName: "Cellromax Science",
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    description:
      "프리미엄 건강기능식품, 일반식품, 화장품, 의약품 전문 기업. KOSDAQ 상장사.",
    foundingDate: "2014",
    address: {
      "@type": "PostalAddress",
      streetAddress: "구성로 357, 용인테크노밸리 D동 710호",
      addressLocality: "용인시 기흥구",
      addressRegion: "경기도",
      postalCode: "16880",
      addressCountry: "KR",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+82-31-662-1395",
      email: "health1395@kshp.co.kr",
      contactType: "customer service",
      availableLanguage: ["Korean", "English"],
    },
    sameAs: [],
  };
}

// ---------------------------------------------------------------------------
// WebSite — 사이트 검색 (홈페이지)
// ---------------------------------------------------------------------------

export function webSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "셀로맥스사이언스",
    alternateName: "Cellromax Science",
    url: BASE_URL,
  };
}

// ---------------------------------------------------------------------------
// Product — 제품 상세페이지
// ---------------------------------------------------------------------------

const CATEGORY_MAP: Record<string, string> = {
  health_functional: "건강기능식품",
  general_food: "일반식품",
  cosmetic: "화장품",
  medicine: "의약품",
  nutra_pet: "반려동물 영양제",
  other: "기타",
};

export function productJsonLd(
  product: Product,
  locale: string,
  productName: string,
  description?: string | null,
) {
  const image = product.thumbnail_url
    ? product.thumbnail_url
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: productName,
    ...(image && { image }),
    ...(description && { description }),
    brand: {
      "@type": "Brand",
      name: "셀로맥스사이언스",
    },
    manufacturer: {
      "@type": "Organization",
      name: "셀로맥스사이언스",
    },
    category: CATEGORY_MAP[product.category] ?? product.category,
    url: `${BASE_URL}/${locale}/products/${product.slug}`,
    ...(product.price > 0 && {
      offers: {
        "@type": "Offer",
        price: product.price,
        priceCurrency: "KRW",
        availability: "https://schema.org/InStock",
      },
    }),
  };
}

// ---------------------------------------------------------------------------
// NewsArticle — 뉴스룸 게시글
// ---------------------------------------------------------------------------

export function newsArticleJsonLd(
  post: Post,
  locale: string,
  title: string,
  description?: string,
) {
  const image = post.thumbnail_url
    ? post.thumbnail_url
    : post.images.length > 0
      ? post.images[0]
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: title,
    ...(image && { image }),
    ...(description && { description }),
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: {
      "@type": "Organization",
      name: "셀로맥스사이언스",
      url: BASE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "셀로맥스사이언스",
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/logo.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BASE_URL}/${locale}/newsroom/${post.id}`,
    },
    ...(post.post_type === "video" && post.youtube_id && {
      video: {
        "@type": "VideoObject",
        name: title,
        embedUrl: `https://www.youtube.com/embed/${post.youtube_id}`,
        uploadDate: post.published_at,
      },
    }),
  };
}

// ---------------------------------------------------------------------------
// BreadcrumbList — 빵크럼 네비게이션
// ---------------------------------------------------------------------------

interface BreadcrumbItem {
  name: string;
  url?: string;
}

export function breadcrumbJsonLd(items: BreadcrumbItem[], locale: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.url && {
        item: item.url.startsWith("http")
          ? item.url
          : `${BASE_URL}/${locale}${item.url}`,
      }),
    })),
  };
}
