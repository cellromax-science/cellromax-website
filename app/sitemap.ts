import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://cellromax.kr";
const locales = ["ko", "en", "zh", "vi"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // 정적 페이지
  const staticPages = ["", "/products", "/ir", "/newsroom", "/contact"];

  const staticEntries = staticPages.flatMap((page) =>
    locales.map((locale) => ({
      url: `${BASE_URL}/${locale}${page}`,
      lastModified: new Date(),
      changeFrequency: page === "" ? ("weekly" as const) : ("monthly" as const),
      priority: page === "" ? 1.0 : 0.8,
    })),
  );

  // 동적 페이지: 제품 상세
  const { data: products } = await supabase
    .from("products")
    .select("slug, updated_at")
    .eq("is_active", true);

  const productEntries = (products ?? []).flatMap((product) =>
    locales.map((locale) => ({
      url: `${BASE_URL}/${locale}/products/${product.slug}`,
      lastModified: new Date(product.updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  );

  // 동적 페이지: 뉴스룸 게시글
  const { data: posts } = await supabase
    .from("posts")
    .select("id, updated_at")
    .eq("is_published", true);

  const postEntries = (posts ?? []).flatMap((post) =>
    locales.map((locale) => ({
      url: `${BASE_URL}/${locale}/newsroom/${post.id}`,
      lastModified: new Date(post.updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  );

  return [...staticEntries, ...productEntries, ...postEntries];
}
