/**
 * 상세 텍스트 추출 전수 리포트 (로컬 검수용)
 *
 * ① HTML형 상세(detail_html_ko) — extractDetailText 자동 추출 결과
 * ② 이미지형 상세 — DB에 반영된 detail_text_ko (컬럼이 있으면)
 * ③ 이미지형 상세 — OCR 초안 (<OCR_DIR>/*.txt, 검수 전)
 * 을 한 리포트로 만든다. 운영에는 아무 영향이 없다.
 *
 * 실행:
 *   npx tsx scripts/detail-text-report.ts <SUPABASE_URL> <ANON_KEY> <OUT_DIR> [OCR_DIR]
 *
 * 산출물:
 *   <OUT_DIR>/report.html           — 전체 검수 페이지
 *   <OUT_DIR>/fragments/<slug>.html — 제품별 추출 조각 (HTML형)
 *   stdout                          — 요약 표
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  extractDetailText,
  plainTextToDetailHtml,
  MIN_DETAIL_TEXT_LENGTH,
} from "../lib/detail-text";

const [, , SUPABASE_URL, ANON_KEY, OUT_DIR, OCR_DIR] = process.argv;

if (!SUPABASE_URL || !ANON_KEY || !OUT_DIR) {
  console.error(
    "사용법: npx tsx scripts/detail-text-report.ts <SUPABASE_URL> <ANON_KEY> <OUT_DIR> [OCR_DIR]",
  );
  process.exit(1);
}

const HEADERS = {
  apikey: ANON_KEY!,
  Authorization: `Bearer ${ANON_KEY}`,
};

interface HtmlRow {
  slug: string;
  name_ko: string;
  category: string;
  detail_html_ko: string;
}

interface Entry {
  group: "html" | "db" | "draft";
  slug: string;
  name: string;
  rawTextLen: number;
  extractedTextLen: number;
  included: boolean;
  fragment: string;
  note: string;
}

/** 원본에서 보이는 텍스트 길이 (추출 손실률 진단용) */
function rawVisibleTextLength(html: string): number {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim().length;
}

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const GROUP_LABEL: Record<Entry["group"], string> = {
  html: "HTML형 · 자동 추출",
  db: "이미지형 · DB 반영분",
  draft: "이미지형 · OCR 초안 (검수 전)",
};

async function main() {
  const entries: Entry[] = [];

  /* ── ① HTML형: detail_html_ko 자동 추출 ─────────────────────────── */
  const htmlRes = await fetch(
    `${SUPABASE_URL}/rest/v1/products?select=slug,name_ko,category,detail_html_ko&is_active=eq.true&detail_html_ko=not.is.null&order=name_ko.asc`,
    { headers: HEADERS },
  );
  if (!htmlRes.ok) throw new Error(`Supabase 조회 실패: ${htmlRes.status}`);
  const htmlRows = (await htmlRes.json()) as HtmlRow[];

  await mkdir(path.join(OUT_DIR!, "fragments"), { recursive: true });

  for (const row of htmlRows) {
    const extracted = extractDetailText(row.detail_html_ko);
    const rawLen = rawVisibleTextLength(row.detail_html_ko);
    const entry: Entry = {
      group: "html",
      slug: row.slug,
      name: row.name_ko,
      rawTextLen: rawLen,
      extractedTextLen: extracted?.textLength ?? 0,
      included: extracted !== null,
      fragment: extracted?.html ?? "",
      note: extracted
        ? `보존율 ${rawLen > 0 ? Math.round(((extracted.textLength ?? 0) / rawLen) * 100) : 0}%`
        : `텍스트 ${MIN_DETAIL_TEXT_LENGTH}자 미만 — 섹션 생략(정상)`,
    };
    entries.push(entry);
    if (entry.included) {
      await writeFile(
        path.join(OUT_DIR!, "fragments", `${row.slug}.html`),
        entry.fragment,
        "utf8",
      );
    }
  }

  /* ── ② 이미지형: DB에 반영된 detail_text_ko (컬럼 없으면 건너뜀) ── */
  const dbRes = await fetch(
    `${SUPABASE_URL}/rest/v1/products?select=slug,name_ko,detail_text_ko&is_active=eq.true&detail_text_ko=not.is.null&order=name_ko.asc`,
    { headers: HEADERS },
  );
  let dbColumnExists = dbRes.ok;
  if (dbRes.ok) {
    const dbRows = (await dbRes.json()) as {
      slug: string;
      name_ko: string;
      detail_text_ko: string;
    }[];
    for (const row of dbRows) {
      const converted = plainTextToDetailHtml(row.detail_text_ko);
      entries.push({
        group: "db",
        slug: row.slug,
        name: row.name_ko,
        rawTextLen: row.detail_text_ko.length,
        extractedTextLen: converted?.textLength ?? 0,
        included: converted !== null,
        fragment: converted?.html ?? "",
        note: converted ? "검수 완료본" : "기준 미달",
      });
    }
  }

  /* ── ③ 이미지형: OCR 초안 (로컬 검수 전 텍스트) ─────────────────── */
  if (OCR_DIR && existsSync(OCR_DIR)) {
    const dbSlugs = new Set(
      entries.filter((e) => e.group === "db").map((e) => e.slug),
    );
    const files = (await readdir(OCR_DIR)).filter((f) => f.endsWith(".txt"));
    for (const file of files.sort()) {
      const slug = file.replace(/\.txt$/, "");
      if (dbSlugs.has(slug)) continue; // DB 반영분이 있으면 초안은 생략
      const text = await readFile(path.join(OCR_DIR, file), "utf8");
      const converted = plainTextToDetailHtml(text);
      entries.push({
        group: "draft",
        slug,
        name: slug,
        rawTextLen: text.length,
        extractedTextLen: converted?.textLength ?? 0,
        included: converted !== null,
        fragment: converted?.html ?? "",
        note: converted ? "검수 대기" : "기준 미달",
      });
    }
  }

  /* ── 요약 표 (stdout) ───────────────────────────────────────────── */
  console.log(["구분", "slug", "포함", "추출자수", "비고", "제품명"].join("\t"));
  for (const e of entries) {
    console.log(
      [
        e.group,
        e.slug,
        e.included ? "O" : "생략",
        e.extractedTextLen,
        e.note,
        e.name,
      ].join("\t"),
    );
  }

  /* ── 검수용 리포트 페이지 ───────────────────────────────────────── */
  const summaryRows = entries
    .map(
      (e) =>
        `<tr>
          <td><span class="tag tag-${e.group}">${GROUP_LABEL[e.group]}</span></td>
          <td>${e.included ? `<a href="#${esc(e.slug)}">${esc(e.name)}</a>` : esc(e.name)}</td>
          <td>${e.included ? "포함" : "<em>생략</em>"}</td>
          <td class="num">${e.extractedTextLen.toLocaleString()}</td>
          <td>${esc(e.note)}</td>
        </tr>`,
    )
    .join("\n");

  const cards = entries
    .filter((e) => e.included)
    .map(
      (e) => `
    <article class="card" id="${esc(e.slug)}">
      <header>
        <h2>${esc(e.name)} <span class="tag tag-${e.group}">${GROUP_LABEL[e.group]}</span></h2>
        <p class="meta">
          <a href="https://www.cellromax.kr/ko/products/${encodeURIComponent(e.slug)}" target="_blank" rel="noreferrer">${esc(e.slug)}</a>
          · 추출 ${e.extractedTextLen.toLocaleString()}자 · ${esc(e.note)}
        </p>
      </header>
      <div class="fragment">${e.fragment}</div>
    </article>`,
    )
    .join("\n");

  const counts = {
    html: entries.filter((e) => e.group === "html").length,
    db: entries.filter((e) => e.group === "db").length,
    draft: entries.filter((e) => e.group === "draft").length,
  };

  const report = `<title>상세 텍스트 추출 리포트</title>
<style>
  :root { --navy:#0a1628; --gold:#c5a55a; --line:#e3e7ee; --ink:#26303f; --soft:#5b6675; }
  * { box-sizing:border-box; }
  body { background:#f4f6f9; color:var(--ink); margin:0 auto; max-width:960px;
    font-family:"Pretendard Variable",Pretendard,"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;
    font-size:15px; line-height:1.65; padding-block:40px 80px; padding-inline:20px; word-break:keep-all; }
  h1 { font-size:24px; color:var(--navy); margin:0 0 6px; }
  .sub { color:var(--soft); font-size:13.5px; margin:0 0 28px; }
  table { border-collapse:collapse; width:100%; background:#fff; border:1px solid var(--line); border-radius:12px; overflow:hidden; }
  th,td { padding:9px 14px; border-bottom:1px solid var(--line); text-align:left; font-size:13.5px; }
  th { background:#eef1f6; color:var(--navy); font-weight:700; }
  tr:last-child td { border-bottom:0; }
  td.num { text-align:right; font-variant-numeric:tabular-nums; }
  .tag { display:inline-block; font-size:11px; font-weight:700; border-radius:999px; padding:2px 10px; vertical-align:1px; }
  .tag-html { background:#e7eef9; color:#1a2d4a; }
  .tag-db { background:#e5f4ec; color:#1e6b45; }
  .tag-draft { background:#fdf3dc; color:#8a6d2f; }
  h2.section { font-size:17px; color:var(--navy); margin:36px 0 12px; }
  .card { background:#fff; border:1px solid var(--line); border-radius:16px; padding:22px 26px; margin:18px 0; }
  .card h2 { font-size:17px; color:var(--navy); margin:0 0 2px; }
  .card .meta { font-size:12.5px; color:var(--soft); margin:0 0 14px; }
  .card .meta a { color:var(--gold); }
  .fragment { border:1px dashed #c9d2df; border-radius:10px; padding:4px 18px; max-height:420px; overflow:auto; background:#fbfcfe; }
  .fragment h3 { font-size:15.5px; color:var(--navy); margin:16px 0 6px; }
  .fragment h4 { font-size:14px; color:var(--navy); margin:14px 0 4px; }
  .fragment p { margin:6px 0; }
  .fragment ul,.fragment ol { margin:6px 0; padding-left:20px; }
  .fragment table { margin:8px 0; border-radius:6px; }
  a { color:var(--navy); }
</style>
<h1>상세 텍스트 추출 리포트</h1>
<p class="sub">HTML형 ${counts.html} · 이미지형 DB 반영 ${counts.db}${dbColumnExists ? "" : " (detail_text_ko 컬럼 미생성)"} · OCR 초안 ${counts.draft} · 기준: 순수 텍스트 ${MIN_DETAIL_TEXT_LENGTH}자 이상 · 생성 ${new Date().toISOString().slice(0, 10)}</p>
<table>
  <tr><th>구분</th><th>제품</th><th>판정</th><th>추출 텍스트</th><th>비고</th></tr>
  ${summaryRows}
</table>
<h2 class="section">추출 결과 전문</h2>
${cards}
`;

  await writeFile(path.join(OUT_DIR!, "report.html"), report, "utf8");
  console.log(`\n리포트: ${path.join(OUT_DIR!, "report.html")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
