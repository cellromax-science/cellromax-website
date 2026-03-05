import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug") || "글라우빌";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Product not found" }, { status: 404 });
  }

  return NextResponse.json({
    slug: data.slug,
    name: data.name_ko,
    thumbnail_url: data.thumbnail_url,
    images: data.images,
    detail_html_ko: (data as any).detail_html_ko,
    detail_html: (data as any).detail_html,
  });
}
