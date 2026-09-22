/**
 * 이미지형 상세 OCR 배치 — 검수용 초안 생성 (로컬 전용, DB에 쓰지 않음)
 *
 * 세로로 긴 상세 이미지(+영양정보 이미지)를 조각으로 잘라 Claude에 전사시키고,
 * 제품별 초안 텍스트와 검수용 엑셀을 만든다. 검수·수정된 텍스트만 이후
 * detail_text_ko 컬럼에 반영한다.
 *
 * 실행:
 *   ANTHROPIC_API_KEY=... npx tsx scripts/ocr-detail-images.ts \
 *     <SUPABASE_URL> <ANON_KEY> <OUT_DIR> <slug> [slug...]
 *
 * 산출물:
 *   <OUT_DIR>/ocr/<slug>.txt   — 제품별 전사 초안 (# / ## / - 마커 형식)
 *   <OUT_DIR>/ocr-review.xlsx  — 검수용 엑셀 (전 제품 취합)
 */

import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import * as XLSX from "xlsx";

const [, , SUPABASE_URL, ANON_KEY, OUT_DIR, ...slugs] = process.argv;
const API_KEY = process.env.ANTHROPIC_API_KEY;

if (!SUPABASE_URL || !ANON_KEY || !OUT_DIR || slugs.length === 0 || !API_KEY) {
  console.error(
    "사용법: ANTHROPIC_API_KEY=... npx tsx scripts/ocr-detail-images.ts <SUPABASE_URL> <ANON_KEY> <OUT_DIR> <slug...>",
  );
  process.exit(1);
}

const MODEL = "claude-sonnet-5";
const SLICE_SCRIPT = path.join(__dirname, "slice-image.ps1");

const PROMPT = `다음 이미지들은 한 제품 상세페이지를 위에서 아래로 자른 조각들입니다(마지막 조각은 영양정보표일 수 있습니다). 이미지에 보이는 모든 텍스트를 위에서 아래 순서로 충실히 전사하세요.

형식 규칙:
- 큰 섹션 제목: "# 제목"
- 소제목: "## 소제목"
- 나열 항목: "- 항목"
- 그 외 문장·문단: 일반 줄 (한 문단 = 한 줄)
- 표(영양정보 등)는 "- 항목명: 값 (비율)" 형식의 목록으로
- 조각 사이 겹침 때문에 중복되는 줄은 한 번만
- 단독 장식용 영문 라벨(SCROLL 등)과 로고 워터마크는 제외하되, 의미 있는 소제목은 유지
- 숫자·단위·함량·기능성 문구는 이미지 표기 그대로, 한 글자도 바꾸지 말 것
- 글자가 흐릿해 확신이 없으면 그 부분에 (판독불가) 표시
- 전사 텍스트 외의 설명·인사말 등 다른 출력 금지`;

interface Row {
  slug: string;
  name_ko: string;
  detail_image_url: string | null;
  nutrition_image_url: string | null;
}

async function fetchRow(slug: string): Promise<Row | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/products?select=slug,name_ko,detail_image_url,nutrition_image_url&slug=eq.${encodeURIComponent(slug)}`,
    { headers: { apikey: ANON_KEY!, Authorization: `Bearer ${ANON_KEY}` } },
  );
  if (!res.ok) throw new Error(`조회 실패(${slug}): ${res.status}`);
  const rows = (await res.json()) as Row[];
  return rows[0] ?? null;
}

async function download(url: string, file: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`다운로드 실패: ${res.status} ${url}`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
}

function slice(sourceFile: string, outPrefix: string): number {
  const stdout = execFileSync(
    "powershell",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      SLICE_SCRIPT,
      "-Source",
      sourceFile,
      "-OutPrefix",
      outPrefix,
    ],
    { encoding: "utf8" },
  );
  const count = parseInt(stdout.trim(), 10);
  if (!Number.isFinite(count) || count < 1) {
    throw new Error(`분할 실패: ${sourceFile} → "${stdout.trim()}"`);
  }
  return count;
}

async function main() {
  const client = new Anthropic({ apiKey: API_KEY });
  const ocrDir = path.join(OUT_DIR!, "ocr");
  await mkdir(ocrDir, { recursive: true });

  const reviewRows: Record<string, string | number>[] = [];

  for (const slug of slugs) {
    try {
      const row = await fetchRow(slug);
      if (!row) {
        console.log(`✗ ${slug} — 제품 없음`);
        continue;
      }

      const workDir = path.join(OUT_DIR!, "work", slug);
      await mkdir(workDir, { recursive: true });

      const segmentFiles: string[] = [];
      const sources = [row.detail_image_url, row.nutrition_image_url].filter(
        (u): u is string => Boolean(u),
      );
      if (sources.length === 0) {
        console.log(`✗ ${slug} — 상세 이미지 없음`);
        continue;
      }

      for (let s = 0; s < sources.length; s += 1) {
        const srcFile = path.join(workDir, `src-${s + 1}.jpg`);
        await download(sources[s], srcFile);
        const prefix = path.join(workDir, `seg${s + 1}`);
        const count = slice(srcFile, prefix);
        for (let i = 1; i <= count; i += 1) {
          segmentFiles.push(`${prefix}-${String(i).padStart(2, "0")}.jpg`);
        }
      }

      if (segmentFiles.length > 24) {
        console.log(`✗ ${slug} — 조각 ${segmentFiles.length}개, 과대(수동 처리 필요)`);
        continue;
      }

      const images = await Promise.all(
        segmentFiles.map(async (file) => ({
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: "image/jpeg" as const,
            data: (await readFile(file)).toString("base64"),
          },
        })),
      );

      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 8000,
        messages: [
          { role: "user", content: [...images, { type: "text", text: PROMPT }] },
        ],
      });

      const text = response.content
        .filter((block) => block.type === "text")
        .map((block) => ("text" in block ? block.text : ""))
        .join("\n")
        .trim();

      await writeFile(path.join(ocrDir, `${slug}.txt`), text, "utf8");
      reviewRows.push({
        slug,
        제품명: row.name_ko,
        글자수: text.replace(/\s+/g, "").length,
        상태: "검수 대기",
        "추출 텍스트 (수정해서 사용)": text,
        비고: "",
      });
      console.log(
        `✓ ${slug} — ${row.name_ko} · 조각 ${segmentFiles.length}개 → ${text.length}자`,
      );
    } catch (err) {
      console.log(`✗ ${slug} — 오류: ${err instanceof Error ? err.message : err}`);
    }
  }

  if (reviewRows.length > 0) {
    const sheet = XLSX.utils.json_to_sheet(reviewRows);
    sheet["!cols"] = [
      { wch: 22 },
      { wch: 22 },
      { wch: 8 },
      { wch: 10 },
      { wch: 120 },
      { wch: 30 },
    ];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "OCR 검수");
    XLSX.writeFile(book, path.join(OUT_DIR!, "ocr-review.xlsx"));
  }

  console.log(
    `\n완료: ${reviewRows.length}/${slugs.length} · 검수 파일: ${path.join(OUT_DIR!, "ocr-review.xlsx")}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
