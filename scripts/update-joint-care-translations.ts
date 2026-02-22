/**
 * 명품 조인트케어프리미엄 — 다국어 번역 업데이트
 *
 * 실행: npx tsx scripts/update-joint-care-translations.ts
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
      // --- 기능성 (Functionality) ---
      functionality_en:
        "May help support joint health. Essential for bone formation and maintenance.",
      functionality_zh:
        "有助于关节健康。骨骼的形成和维持所必需。",
      functionality_vi:
        "Có thể hỗ trợ sức khỏe khớp. Cần thiết cho sự hình thành và duy trì xương.",

      // --- 주요성분 (Ingredients) ---
      ingredients_zh:
        "MSM、蛋白聚糖、三七提取物等复合物、维生素D3",
      ingredients_vi:
        "MSM, Proteoglycan, hỗn hợp chiết xuất Tam thất, Vitamin D3",

      // --- 섭취방법 (How to Use) ---
      how_to_use_en:
        "Take 2 tablets once daily with water.",
      how_to_use_zh:
        "每日1次，每次2片，用水送服。",
      how_to_use_vi:
        "Uống 2 viên mỗi ngày 1 lần với nước.",

      // --- 기타 정보 (Other Info) ---
      other_info_en:
        "Food type: Health functional food\nManufacturer: Novarex Co., Ltd. / 80, Osong Saengmyeong 14-ro, Osong-eup, Heungdeok-gu, Cheongju-si, Chungbuk\nPackaging: 1,100 mg x 120 tablets x 2 ea (264 g)",
      other_info_zh:
        "食品类型：健康功能食品\n制造商：㈜诺瓦莱克斯 / 忠北清州市兴德区五松邑五松生命14路80\n包装规格：1,100 mg x 120片 x 2 ea（264 g）",
      other_info_vi:
        "Loại thực phẩm: Thực phẩm chức năng sức khỏe\nNhà sản xuất: Novarex Co., Ltd. / 80, Osong Saengmyeong 14-ro, Osong-eup, Heungdeok-gu, Cheongju-si, Chungbuk\nQuy cách đóng gói: 1.100 mg x 120 viên x 2 ea (264 g)",

    })
    .eq("slug", "myungpum-joint-care-premium")
    .select("slug, name_ko");

  if (error) {
    console.error("[ERROR]", error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.error("[ERROR] 'myungpum-joint-care-premium' 제품을 찾을 수 없습니다.");
    process.exit(1);
  }

  console.log("[OK] 다국어 번역 업데이트 완료:", data[0].name_ko);
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
