/**
 * 상세 텍스트 추출 전수 리포트 (로컬 검수용)
 *
 * HTML형 상세(detail_html_ko)를 가진 활성 제품 전체에 extractDetailText를
 * 돌려서 품질 확인용 리포트를 만든다. 운영에는 아무 영향이 없다.
 *
 * 실행:
 *   npx tsx scripts/detail-text-report.ts <SUPABASE_URL> <ANON_KEY> <OUT_DIR>
 *
 * 산출물:
 *   <OUT_DIR>/report.html          — 전 제품 추출 결과 검수 페이지
 *   <OUT_DIR>/fragments/<slug>.html — 제품별 추출 조각
 *   stdout                          — 요약 표
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { extractDetailText, MIN_DETAIL_TEXT_LENGTH } from "../lib/detail-text";

const [, , SUPABASE_URL, ANON_KEY, OUT_DIR] = process.argv;

if (!SUPABASE_URL || !ANON_KEY || !OUT_DIR) {
  console.error(
    "사용법: npx tsx scripts/detail-text-report.ts <SUPABASE_URL> <ANON_KEY> <OUT_DIR>",
  );
  process.exit(1);
}

interface Row {
  slug: string;
  name_ko: string;
  category: string;
  detail_html_ko: string;
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

async function main() {
  const query =
    `${SUPABASE_URL}/rest/v1/products` +
    `?select=slug,name_ko,category,detail_html_ko` +
    `&is_active=eq.true&detail_html_ko=not.is.null&order=name_ko.asc`;
  const res = await fetch(query, {
    headers: { apikey: ANON_KEY!, Authorization: `Bearer ${ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase 조회 실패: ${res.status}`);
  const rows = (await res.json()) as Row[];

  await mkdir(path.join(OUT_DIR!, "fragments"), { recursive: true });

  const results = rows.map((row) => {
    const extracted = extractDetailText(row.detail_html_ko);
    const rawLen = rawVisibleTextLength(row.detail_html_ko);
    return {
      slug: row.slug,
      name: row.name_ko,
      category: row.category,
      originalBytes: row.detail_html_ko.length,
      rawTextLen: rawLen,
      extractedTextLen: extracted?.textLength ?? 0,
      coverage: rawLen > 0 ? (extracted?.textLength ?? 0) / rawLen : 0,
      included: extracted !== null,
      fragment: extracted?.html ?? "",
    };
  });

  // 제품별 조각 파일
  for (const r of results) {
    if (r.included) {
      await writeFile(
        path.join(OUT_DIR!, "fragments", `${r.slug}.html`),
        r.fragment,
        "utf8",
      );
    }
  }

  // 요약 표 (stdout)
  console.log(
    ["slug", "포함", "원본자수", "추출자수", "보존율", "제품명"].join("\t"),
  );
  for (const r of results) {
    console.log(
      [
        r.slug,
        r.included ? "O" : "생략",
        r.rawTextLen,
        r.extractedTextLen,
        `${Math.round(r.coverage * 100)}%`,
        r.name,
      ].join("\t"),
    );
  }

  // 검수용 리포트 페이지
  const included = results.filter((r) => r.included);
  const skipped = results.filter((r) => !r.included);

  const cards = included
    .map(
      (r) => `
    <article class="card" id="${esc(r.slug)}">
      <header>
        <h2>${esc(r.name)}</h2>
        <p class="meta">
          <a href="https://www.cellromax.kr/ko/products/${encodeURIComponent(r.slug)}" target="_blank" rel="noreferrer">${esc(r.slug)}</a>
          · 원본 ${r.rawTextLen.toLocaleString()}자 → 추출 ${r.extractedTextLen.toLocaleString()}자
          (보존율 ${Math.round(r.coverage * 100)}%)
        </p>
      </header>
      <div class="fragment">${r.fragment}</div>
    </article>`,
    )
    .join("\n");

  const skippedRows = skipped
    .map(
      (r) =>
        `<tr><td>${esc(r.name)}</td><td>${esc(r.slug)}</td><td>${r.rawTextLen}자</td><td>텍스트 ${MIN_DETAIL_TEXT_LENGTH}자 미만 — 섹션 생략(정상)</td></tr>`,
    )
    .join("\n");

  const summaryRows = results
    .map(
      (r) =>
        `<tr>
          <td>${r.included ? `<a href="#${esc(r.slug)}">${esc(r.name)}</a>` : esc(r.name)}</td>
          <td>${r.included ? "포함" : "<em>생략</em>"}</td>
          <td class="num">${r.rawTextLen.toLocaleString()}</td>
          <td class="num">${r.extractedTextLen.toLocaleString()}</td>
          <td class="num">${r.included ? Math.round(r.coverage * 100) + "%" : "—"}</td>
        </tr>`,
    )
    .join("\n");

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
<p class="sub">HTML형 상세를 가진 활성 제품 ${results.length}개 · 포함 ${included.length} / 생략 ${skipped.length} · 기준: 순수 텍스트 ${MIN_DETAIL_TEXT_LENGTH}자 이상 · 생성 ${new Date().toISOString().slice(0, 10)}</p>
<table>
  <tr><th>제품</th><th>판정</th><th>원본 텍스트</th><th>추출 텍스트</th><th>보존율</th></tr>
  ${summaryRows}
</table>
${skipped.length ? `<h2 class="section">생략 판정 (${skipped.length})</h2>\n<table><tr><th>제품</th><th>slug</th><th>원본 텍스트</th><th>사유</th></tr>${skippedRows}</table>` : ""}
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
