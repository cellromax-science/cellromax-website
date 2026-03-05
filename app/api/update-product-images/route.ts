import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { slug, images } = await request.json();

  if (!slug || !Array.isArray(images)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabase = await createClient();

  // First, verify the product exists
  const { data: existing, error: fetchError } = await supabase
    .from("products")
    .select("id, slug, name_ko")
    .eq("slug", slug)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Update the images
  const { data, error } = await supabase
    .from("products")
    .update({ images })
    .eq("slug", slug)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, updated: data });
}
