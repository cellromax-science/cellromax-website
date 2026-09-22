import * as cheerio from "cheerio";

/* ==========================================================================
   상세 HTML → 검색용 텍스트 조각 추출

   detail_html_*(완전한 HTML 문서 또는 조각)에서 글과 뼈대만 남긴
   화이트리스트 HTML 조각을 만든다. 결과물은:
   - 허용 태그만 포함 (제목/문단/목록/표), 속성은 전부 제거
     → 그 자체로 소독(sanitize)된 상태라 dangerouslySetInnerHTML에 안전
   - 페이지 아웃라인 보호를 위해 원본 h1·h2는 h3로, h3~h6은 h4로 강등
   - 이미지·스크립트·스타일 등 비텍스트 요소는 모두 제거
   순수 텍스트가 MIN_DETAIL_TEXT_LENGTH 미만이면(이미지 위주 상세)
   null을 반환해 섹션 자체를 생략하게 한다.
   ========================================================================== */

export const MIN_DETAIL_TEXT_LENGTH = 80;

export interface ExtractedDetailText {
  /** 화이트리스트 태그만 남은 HTML 조각 */
  html: string;
  /** 태그를 제외한 순수 텍스트 길이 */
  textLength: number;
}

/** 내용까지 통째로 버리는 요소 */
const DROP_TAGS = new Set([
  "script",
  "style",
  "noscript",
  "template",
  "iframe",
  "frame",
  "object",
  "embed",
  "svg",
  "canvas",
  "img",
  "picture",
  "source",
  "video",
  "audio",
  "track",
  "map",
  "form",
  "input",
  "select",
  "option",
  "textarea",
  "button",
  "link",
  "meta",
  "base",
  "title",
  "head",
  "nav",
]);

/** 태그를 유지하는 인라인 요소 (출력 태그로 매핑) */
const INLINE_KEEP: Record<string, string> = {
  strong: "strong",
  b: "strong",
  em: "em",
  i: "em",
};

/** 태그는 버리고 내용만 살리는 인라인 요소 */
const UNWRAP_INLINE = new Set([
  "span",
  "a",
  "font",
  "small",
  "u",
  "s",
  "sub",
  "sup",
  "mark",
  "abbr",
  "time",
  "label",
  "code",
]);

/** 제목 강등 매핑 */
const HEADING_MAP: Record<string, string> = {
  h1: "h3",
  h2: "h3",
  h3: "h4",
  h4: "h4",
  h5: "h4",
  h6: "h4",
};

/** 문단형 리프 블록 (내용은 인라인으로 평탄화) */
const PARAGRAPH_LIKE = new Set(["p", "figcaption", "blockquote", "pre"]);

type DomNode = {
  type: string;
  name?: string;
  data?: string;
  children?: DomNode[];
  attribs?: Record<string, string>;
};

function escapeText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizeText(text: string): string {
  return text.replace(/ /g, " ").replace(/\s+/g, " ");
}

/** 사람에게 보이지 않는 요소(숨김·장식)는 텍스트도 노출하지 않는다 */
function isHidden(node: DomNode): boolean {
  const attribs = node.attribs ?? {};
  if ("hidden" in attribs) return true;
  if (attribs["aria-hidden"] === "true") return true;
  const style = attribs.style ?? "";
  return /display\s*:\s*none|visibility\s*:\s*hidden/i.test(style);
}

function isTag(node: DomNode): boolean {
  return node.type === "tag" || node.type === "script" || node.type === "style";
}

/** 자식들을 인라인 텍스트로 평탄화 (strong/em/br만 허용) */
function inlineContent(nodes: DomNode[] | undefined): string {
  if (!nodes) return "";
  let out = "";

  for (const node of nodes) {
    if (node.type === "text") {
      out += escapeText(normalizeText(node.data ?? ""));
      continue;
    }
    if (!isTag(node)) continue;

    const name = (node.name ?? "").toLowerCase();
    if (DROP_TAGS.has(name) || isHidden(node)) continue;

    if (name === "br") {
      // 디자인용 강제 줄바꿈은 텍스트 뷰에선 공백으로 충분하다
      out += " ";
      continue;
    }
    const keep = INLINE_KEEP[name];
    if (keep) {
      const inner = inlineContent(node.children).trim();
      if (inner) out += `<${keep}>${inner}</${keep}>`;
      continue;
    }
    // 그 외(인라인·블록 불문)는 내용만 이어붙인다. 블록 경계엔 공백을 넣어
    // 단어가 붙어버리는 것을 막는다.
    const inner = inlineContent(node.children);
    if (inner) {
      const needsSpace =
        out && !out.endsWith(" ") && !UNWRAP_INLINE.has(name);
      out += (needsSpace ? " " : "") + inner;
    }
  }

  return out;
}

/** 한 단어짜리 문단이 연달아 나오면(성분 칩 등) 하나로 병합한다 */
function mergeShortParagraphs(html: string): string {
  return html.replace(
    /(?:<p>[^<]{1,14}<\/p>\s*){2,}/g,
    (run) => {
      const items = [...run.matchAll(/<p>([^<]{1,14})<\/p>/g)].map((m) =>
        m[1].trim(),
      );
      return `<p>${items.join(" · ")}</p>`;
    },
  );
}

/** 빈 문단·장식 조각 등 출력 잡음 정리 */
function tidyFragment(html: string): string {
  return mergeShortParagraphs(
    html
      .replace(/ {2,}/g, " ")
      .replace(/<p>\s*<\/p>/g, "")
      // 스텝 번호·화살표 등 그래픽 장식에서 나온 기호뿐인 문단 제거
      .replace(/<p>[\s\d→←↔↑↓·•\-–—+*=~※○●◇◆□■✓]{1,6}<\/p>/g, "")
      // 제목 바로 앞의 영문 장식 라벨(MOMENT, INSIDE 등) 제거
      .replace(
        /<p>[A-Za-z0-9 .,:;&#'’!?()+\-–—·•*%$]{1,40}<\/p>(?=<h[34]>)/g,
        "",
      )
      .replace(/\s+<\/(p|h3|h4|li|th|td|dt|dd|caption)>/g, "</$1>")
      .replace(/<(p|h3|h4|li|th|td|dt|dd|caption)>\s+/g, "<$1>")
      .trim(),
  );
}

function renderList(node: DomNode, tag: "ul" | "ol"): string {
  let items = "";
  for (const child of node.children ?? []) {
    if (!isTag(child)) continue;
    const name = (child.name ?? "").toLowerCase();
    if (name !== "li" || isHidden(child)) continue;
    const inner = blockContent(child.children, false).trim();
    if (inner) items += `<li>${inner}</li>`;
  }
  return items ? `<${tag}>${items}</${tag}>` : "";
}

function renderDl(node: DomNode): string {
  let items = "";
  for (const child of node.children ?? []) {
    if (!isTag(child) || isHidden(child)) continue;
    const name = (child.name ?? "").toLowerCase();
    if (name === "dt" || name === "dd") {
      const inner = inlineContent(child.children).trim();
      if (inner) items += `<${name}>${inner}</${name}>`;
    } else if (name === "div") {
      // <dl><div><dt/><dd/></div></dl> 패턴 지원
      items += renderDl(child).replace(/^<dl>|<\/dl>$/g, "");
    }
  }
  return items ? `<dl>${items}</dl>` : "";
}

function renderTable(node: DomNode): string {
  const renderRows = (nodes: DomNode[] | undefined): string => {
    let rows = "";
    for (const child of nodes ?? []) {
      if (!isTag(child) || isHidden(child)) continue;
      const name = (child.name ?? "").toLowerCase();
      if (name === "tr") {
        let cells = "";
        for (const cell of child.children ?? []) {
          if (!isTag(cell) || isHidden(cell)) continue;
          const cellName = (cell.name ?? "").toLowerCase();
          if (cellName !== "td" && cellName !== "th") continue;
          const inner = blockContent(cell.children, false).trim();
          cells += `<${cellName}>${inner}</${cellName}>`;
        }
        if (cells) rows += `<tr>${cells}</tr>`;
      } else if (["thead", "tbody", "tfoot"].includes(name)) {
        rows += renderRows(child.children);
      }
    }
    return rows;
  };

  let caption = "";
  for (const child of node.children ?? []) {
    if (isTag(child) && (child.name ?? "").toLowerCase() === "caption") {
      const inner = inlineContent(child.children).trim();
      if (inner) caption = `<caption>${inner}</caption>`;
    }
  }

  const rows = renderRows(node.children);
  return rows ? `<table>${caption}${rows}</table>` : "";
}

/**
 * 블록 컨텍스트 처리. div 수프에서도 문단이 유지되도록,
 * 흩어진 인라인 텍스트는 버퍼에 모았다가 블록 경계에서 <p>로 감싼다.
 * (wrapLooseText=false면 <li>·<td> 내부처럼 감싸지 않고 그대로 둔다)
 */
function blockContent(
  nodes: DomNode[] | undefined,
  wrapLooseText: boolean,
): string {
  if (!nodes) return "";
  let out = "";
  let buffer = "";

  const flush = () => {
    const text = buffer.trim();
    buffer = "";
    if (!text) return;
    out += wrapLooseText ? `<p>${text}</p>` : `${out ? " " : ""}${text}`;
  };

  for (const node of nodes) {
    if (node.type === "text") {
      buffer += escapeText(normalizeText(node.data ?? ""));
      continue;
    }
    if (!isTag(node)) continue;

    const name = (node.name ?? "").toLowerCase();
    if (DROP_TAGS.has(name) || isHidden(node)) continue;

    if (name === "br") {
      buffer += " ";
      continue;
    }
    if (INLINE_KEEP[name] || UNWRAP_INLINE.has(name)) {
      buffer += inlineContent([node]);
      continue;
    }

    const heading = HEADING_MAP[name];
    if (heading) {
      flush();
      const inner = inlineContent(node.children).trim();
      if (inner) out += `<${heading}>${inner}</${heading}>`;
      continue;
    }
    if (PARAGRAPH_LIKE.has(name)) {
      flush();
      const inner = inlineContent(node.children).trim();
      if (inner) out += `<p>${inner}</p>`;
      continue;
    }
    if (name === "ul" || name === "ol") {
      flush();
      out += renderList(node, name);
      continue;
    }
    if (name === "dl") {
      flush();
      out += renderDl(node);
      continue;
    }
    if (name === "table") {
      flush();
      out += renderTable(node);
      continue;
    }

    // 그 외 블록 컨테이너(div/section/figure/…)는 태그를 버리고 재귀
    flush();
    out += blockContent(node.children, wrapLooseText);
  }

  flush();
  return out;
}

/**
 * 상세 HTML에서 검색용 텍스트 조각을 추출한다.
 * 텍스트 분량이 기준 미만이면(이미지 위주 상세) null.
 */
export function extractDetailText(
  detailHtml: string,
): ExtractedDetailText | null {
  if (!detailHtml || !detailHtml.trim()) return null;

  const $ = cheerio.load(detailHtml);
  const body = $("body")[0] as unknown as DomNode | undefined;

  const fragment = tidyFragment(blockContent(body?.children, true));
  const textLength = fragment
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim().length;

  if (textLength < MIN_DETAIL_TEXT_LENGTH) return null;
  return { html: fragment, textLength };
}
