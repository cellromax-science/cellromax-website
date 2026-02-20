/**
 * =============================================================
 * 테스트 제품 시드 스크립트
 * =============================================================
 *
 * 실행 방법:
 *   npx tsx scripts/seed-products.ts
 *
 * 사전 조건:
 *   .env.local에 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 설정
 *
 * 멱등성:
 *   slug 기반 ON CONFLICT DO NOTHING — 중복 실행 안전
 * =============================================================
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// -----------------------------------------------------------------
// 환경변수 로드
// -----------------------------------------------------------------
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

// -----------------------------------------------------------------
// 제품 데이터
// -----------------------------------------------------------------
const PRODUCTS = [
  {
    slug: "myungpum-joint-care-premium",
    name_ko: "명품 조인트케어프리미엄",
    name_en: "Premium Joint Care",
    name_zh: "名品关节护理高级版",
    name_vi: "Premium Joint Care",
    category: "health_functional",
    subcategory_slug: "joint-health",
    ingredients_ko:
      "MSM, 프로테오글리칸, 전칠삼추출물 등 복합물, 비타민D3",
    ingredients_en:
      "MSM, Proteoglycan, Notoginseng Extract Complex, Vitamin D3",
    functionality_ko:
      "관절 건강에 도움을 줄 수 있음. 뼈의 형성과 유지에 필요.",
    how_to_use_ko: "1일 1회, 1회 2정을 물과 함께 섭취하십시오.",
    is_new: true,
    sort_order: 1,
  },
  {
    slug: "repair-cream",
    name_ko: "리페어크림",
    name_en: "Repair Cream",
    name_zh: "修复面霜",
    name_vi: "Kem Phục Hồi",
    category: "cosmetic",
    subcategory_slug: "functional",
    ingredients_ko: "EGF(상피세포성장인자), 병풀추출물(시카)",
    ingredients_en: "EGF (Epidermal Growth Factor), Centella Asiatica Extract",
    functionality_ko:
      "피부 장벽 강화 및 손상된 피부의 빠른 회복을 도와주는 기능성 크림",
    how_to_use_ko:
      "세안 후 적당량을 취해 얼굴 전체에 부드럽게 펴 발라주세요.",
    is_new: false,
    sort_order: 2,
  },
  {
    slug: "easy-cold-plus",
    name_ko: "이지콜드플러스",
    name_en: "Easy Cold Plus",
    name_zh: "易舒感冒加强版",
    name_vi: "Easy Cold Plus",
    category: "medicine",
    subcategory_slug: "cold",
    ingredients_ko:
      "아세트아미노펜, 덱스트로메트로판, 클로르페니라민",
    ingredients_en:
      "Acetaminophen, Dextromethorphan, Chlorpheniramine",
    functionality_ko:
      "감기의 제증상(발열, 두통, 기침, 콧물, 코막힘, 인후통) 완화",
    how_to_use_ko:
      "성인: 1회 1정, 1일 3회 식후 30분에 복용하십시오.",
    is_new: false,
    sort_order: 3,
  },
];

// -----------------------------------------------------------------
// 메인
// -----------------------------------------------------------------
async function seedProducts(): Promise<void> {
  loadEnvFile();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[ERROR] NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("=".repeat(50));
  console.log(" 테스트 제품 시드 스크립트");
  console.log("=".repeat(50));

  for (const product of PRODUCTS) {
    const { subcategory_slug, ...productData } = product;

    // 서브카테고리 ID 조회
    let subcategory_id: string | null = null;
    if (subcategory_slug) {
      const { data: sub } = await supabase
        .from("product_subcategories")
        .select("id")
        .eq("parent_category", product.category)
        .eq("slug", subcategory_slug)
        .single();

      subcategory_id = sub?.id ?? null;
      if (!subcategory_id) {
        console.warn(`  [WARN] 서브카테고리 '${subcategory_slug}' 을 찾을 수 없습니다.`);
      }
    }

    // 제품 삽입 (slug 충돌 시 무시)
    const { error } = await supabase.from("products").upsert(
      { ...productData, subcategory_id },
      { onConflict: "slug", ignoreDuplicates: true },
    );

    if (error) {
      console.error(`  [ERROR] ${product.name_ko}: ${error.message}`);
    } else {
      console.log(`  [OK] ${product.name_ko} (${product.category})`);
    }
  }

  console.log("");
  console.log("=".repeat(50));
  console.log(" 시드 완료! http://localhost:3000/products 에서 확인하세요.");
  console.log("=".repeat(50));
}

seedProducts().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
