import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { slug } = await request.json();

  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  const supabase = await createClient();

  // Get product data
  const { data: product, error: fetchError } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .single();

  if (fetchError || !product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  let html = product.detail_html_ko as string;
  if (!html) {
    return NextResponse.json({ error: "No HTML to fix" }, { status: 400 });
  }

  // Replace relative image paths with Supabase URLs
  const images = product.images as string[] || [];
  const thumbnailUrl = product.thumbnail_url as string;

  // Replace 글라우빌_assets/product1.jpg → images[0]
  // Replace 글라우빌_assets/product2.jpg → images[1]
  const replacements: Record<string, string> = {
    "글라우빌_assets/product1.jpg": images[0] || thumbnailUrl,
    "글라우빌_assets/product2.jpg": images[1] || images[0] || thumbnailUrl,
  };

  Object.entries(replacements).forEach(([oldPath, newUrl]) => {
    html = html.replace(new RegExp(oldPath, 'g'), newUrl);
  });

  // Update the HTML
  const { data: updated, error: updateError } = await supabase
    .from("products")
    .update({ detail_html_ko: html })
    .eq("slug", slug)
    .select();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    replacements_made: Object.keys(replacements).length,
    updated
  });
}
