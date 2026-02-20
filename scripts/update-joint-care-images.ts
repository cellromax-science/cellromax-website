/**
 * 명품 조인트케어프리미엄 — 썸네일 및 이미지 업데이트
 *
 * 실행: npx tsx scripts/update-joint-care-images.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnvFile(): void {
  try {
    const envPath = resolve(process.cwd(), ".env.local");
    const envContent = readFileSync(envPath, "utf-8");

    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;

      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    console.warn("[WARN] .env.local 파일을 찾을 수 없습니다.");
  }
}

async function main() {
  loadEnvFile();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[ERROR] 환경변수가 설정되지 않았습니다.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase
    .from("products")
    .update({
      thumbnail_url: "/images/products/조인트케어1.jpg",
      images: [
        "/images/products/조인트케어1.jpg",
        "/images/products/조인트케어2.jpg",
        "/images/products/조인트케어3.jpg",
      ],
    })
    .eq("slug", "myungpum-joint-care-premium")
    .select("slug, name_ko, thumbnail_url, images");

  if (error) {
    console.error("[ERROR]", error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.error("[ERROR] 'myungpum-joint-care-premium' 제품을 찾을 수 없습니다.");
    process.exit(1);
  }

  console.log("[OK] 이미지 업데이트 완료:", data[0].name_ko);
  console.log("  thumbnail_url:", data[0].thumbnail_url);
  console.log("  images:", data[0].images);
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
