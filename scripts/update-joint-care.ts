/**
 * 명품 조인트케어프리미엄 — other_info 데이터 업데이트
 *
 * 실행: npx tsx scripts/update-joint-care.ts
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
      other_info_ko: `식품의 유형 : 건강기능식품\n제조원 : ㈜노바렉스 / 충북 청주시 흥덕구 오송읍 오송생명14로 80\n포장단위 : 1,100 mg x 120정 x 2 ea(264 g)`,
    })
    .eq("slug", "myungpum-joint-care-premium")
    .select("slug, name_ko, other_info_ko");

  if (error) {
    console.error("[ERROR]", error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.error("[ERROR] 'myungpum-joint-care-premium' 제품을 찾을 수 없습니다.");
    process.exit(1);
  }

  console.log("[OK] 업데이트 완료:", data[0].name_ko);
  console.log("\n--- other_info_ko ---");
  console.log(data[0].other_info_ko);
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
