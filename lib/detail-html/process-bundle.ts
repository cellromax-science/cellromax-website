// lib/detail-html/process-bundle.ts
//
// ZIP(폴더 압축) 상세페이지 번들을 처리한다.
//  1. ZIP 안에서 HTML 진입점을 찾고
//  2. HTML/CSS 안의 로컬 자산 참조(img/css/js/video/font 등)를 수집하여
//  3. Supabase Storage 에 업로드한 뒤 절대 URL 로 치환한다.
//
// 출력은 "완전한 HTML 문서" 다. cellromax 의 HtmlDetailFrame 이 srcDoc 으로
// iframe 에 렌더링하면서 자체적으로 스타일을 격리하므로, employee-store 처럼
// CSS 스코핑/ body 추출은 하지 않는다. 자산 경로는 모두 절대 URL 로 박히므로
// HtmlDetailFrame 의 상대경로(`image/N`) 치환 로직과도 충돌하지 않는다.

import JSZip from "jszip";
import * as cheerio from "cheerio";
import {
  normalizeZipPath,
  extname,
  mimeFromExt,
  ALLOWED_ASSET_EXTENSIONS,
  ALLOWED_HTML_EXTENSIONS,
} from "./path-utils";

/* ------------------------------------------------------------------ */
/*  Limits                                                            */
/* ------------------------------------------------------------------ */
const MAX_ZIP_BYTES = 50 * 1024 * 1024; // 50 MB
const MAX_FILE_COUNT = 200;
const MAX_ASSET_BYTES = 10 * 1024 * 1024; // 10 MB per asset (mp4 포함)

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */
export type AssetInfo = {
  localPath: string;
  publicUrl: string;
  size: number;
};

export type BundleResult = {
  html: string;
  assets: AssetInfo[];
  warnings: string[];
};

type UploadFn = (
  key: string,
  data: Buffer,
  contentType: string,
) => Promise<string>;

/* ------------------------------------------------------------------ */
/*  Main entry                                                        */
/* ------------------------------------------------------------------ */
export async function processBundle(
  zipBuffer: Buffer,
  productId: string,
  bundleId: string,
  upload: UploadFn,
): Promise<BundleResult> {
  /* 1. Safety checks */
  if (zipBuffer.byteLength > MAX_ZIP_BYTES) {
    throw new Error(`ZIP 파일 크기가 ${MAX_ZIP_BYTES / 1024 / 1024}MB를 초과합니다`);
  }

  const zip = await JSZip.loadAsync(zipBuffer);
  const entries = Object.values(zip.files).filter((f) => !f.dir);

  if (entries.length > MAX_FILE_COUNT) {
    throw new Error(`파일 개수가 ${MAX_FILE_COUNT}개를 초과합니다`);
  }

  /* 2. Detect HTML entry point */
  const htmlEntries = entries.filter((f) =>
    ALLOWED_HTML_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext)),
  );
  if (htmlEntries.length === 0) {
    throw new Error("ZIP에 HTML 파일이 없습니다");
  }

  // Priority: root-level .html > index.html > first found
  const htmlEntry =
    htmlEntries.find((f) => !f.name.includes("/")) ??
    htmlEntries.find((f) => f.name.toLowerCase().endsWith("index.html")) ??
    htmlEntries[0];

  const htmlBase = htmlEntry.name.includes("/")
    ? htmlEntry.name.split("/").slice(0, -1).join("/")
    : "";
  const htmlRaw = await htmlEntry.async("string");

  /* 3. Parse DOM & collect local asset references */
  const $ = cheerio.load(htmlRaw, { xmlMode: false });
  const PLACEHOLDER_PREFIX = "__BUNDLE_PH__";

  const refPaths = new Set<string>();
  const warnings: string[] = [];

  /** Collect references from element attributes (img src, link href, etc.) */
  function collectAttr(selector: string, attr: string) {
    $(selector).each((_, el) => {
      const raw = $(el).attr(attr);
      if (!raw) return;
      if (/^(https?:|data:|mailto:|#|\/\/)/i.test(raw)) return;

      const normalized = normalizeZipPath(htmlBase, raw);
      if (!normalized) return;

      refPaths.add(normalized);
      $(el).attr(attr, `${PLACEHOLDER_PREFIX}${normalized}`);
    });
  }

  // Images (including responsive & lazy-load patterns)
  collectAttr("img", "src");
  collectAttr("img", "srcset");
  collectAttr("img", "data-src");
  collectAttr("img", "data-srcset");
  // Picture element sources
  collectAttr("picture source", "srcset");
  // Video & audio
  collectAttr("video", "src");
  collectAttr("video", "poster");
  collectAttr("audio", "src");
  collectAttr("source", "src");
  collectAttr("source", "srcset");
  // Stylesheets & scripts
  collectAttr("link[rel='stylesheet']", "href");
  collectAttr("script", "src");
  // Anchors with local file refs (e.g. download links)
  collectAttr("a", "href");

  /** Collect references from inline style attributes & <style> tags */
  const STYLE_URL_RE = /url\(\s*['"]?([^'")]+)['"]?\s*\)/g;

  function replaceStyleUrls(css: string): string {
    return css.replace(STYLE_URL_RE, (match, p1: string) => {
      if (/^(https?:|data:|\/\/)/i.test(p1)) return match;
      const normalized = normalizeZipPath(htmlBase, p1);
      if (!normalized) return match;
      refPaths.add(normalized);
      return `url("${PLACEHOLDER_PREFIX}${normalized}")`;
    });
  }

  // Inline style attributes
  $("[style]").each((_, el) => {
    const s = $(el).attr("style");
    if (s) {
      $(el).attr("style", replaceStyleUrls(s));
    }
  });

  // <style> tags
  $("style").each((_, el) => {
    const content = $(el).html();
    if (content) {
      $(el).html(replaceStyleUrls(content));
    }
  });

  /* 4. Upload assets in parallel */
  const assetResults: AssetInfo[] = [];

  const uploadTasks = Array.from(refPaths).map(async (zipPath) => {
    // Find entry in zip
    const entry = entries.find(
      (e) =>
        e.name === zipPath ||
        e.name === `${htmlBase}/${zipPath}`.replace(/^\//, ""),
    );
    if (!entry) {
      // Try case-insensitive lookup
      const lowerPath = zipPath.toLowerCase();
      const fallback = entries.find((e) => e.name.toLowerCase() === lowerPath);
      if (!fallback) {
        warnings.push(`누락된 자산: ${zipPath}`);
        return;
      }
      return processEntry(fallback, zipPath);
    }
    return processEntry(entry, zipPath);
  });

  async function processEntry(entry: JSZip.JSZipObject, zipPath: string) {
    const ext = extname(zipPath);
    if (!ALLOWED_ASSET_EXTENSIONS.includes(ext)) {
      warnings.push(`허용되지 않은 확장자: ${zipPath} (${ext})`);
      return;
    }

    // Path traversal double-check
    if (entry.name.split("/").some((s) => s === "..")) {
      warnings.push(`경로 위험: ${zipPath}`);
      return;
    }

    const buf = Buffer.from(await entry.async("arraybuffer"));
    if (buf.byteLength > MAX_ASSET_BYTES) {
      warnings.push(
        `크기 초과 (${(buf.byteLength / 1024 / 1024).toFixed(1)}MB): ${zipPath}`,
      );
      return;
    }

    const contentType = mimeFromExt(ext);
    // Generate ASCII-safe storage key: strip non-ASCII directory names,
    // keep only the filename with a hash prefix for uniqueness
    const baseName = zipPath.split("/").pop() ?? zipPath;
    const safeBase = baseName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const hash = Array.from(
      new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(zipPath),
        ),
      ),
    )
      .slice(0, 4)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const storageKey = `${productId}/detail-bundles/${bundleId}/${hash}-${safeBase}`;

    try {
      const publicUrl = await upload(storageKey, buf, contentType);
      assetResults.push({ localPath: zipPath, publicUrl, size: buf.byteLength });
    } catch (err) {
      warnings.push(
        `업로드 실패: ${zipPath} — ${err instanceof Error ? err.message : "unknown"}`,
      );
    }
  }

  await Promise.all(uploadTasks);

  /* 5. Replace placeholders with public URLs */
  let finalHtml = $.html();

  for (const asset of assetResults) {
    const placeholder = `${PLACEHOLDER_PREFIX}${asset.localPath}`;
    finalHtml = finalHtml.split(placeholder).join(asset.publicUrl);
  }

  // Remove any remaining placeholders (assets that failed to upload)
  finalHtml = finalHtml.replace(
    new RegExp(
      `${PLACEHOLDER_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^"'\\)\\s]+`,
      "g",
    ),
    "",
  );

  /* 6. <video> 태그에 모바일 자동재생 속성 자동 주입
   *
   * 상세페이지 영상은 보통 "자동 반복 재생"을 의도한다. 모바일 브라우저는
   * `muted + playsinline` 이 없으면 autoplay 를 막으므로 제작자가 깜빡해도
   * 업로드 시 자동 반영한다. `data-no-autoplay` 가 있으면 건드리지 않는다.
   */
  const $final = cheerio.load(finalHtml, { xmlMode: false });
  $final("video").each((_, el) => {
    const $v = $final(el);
    if ($v.attr("data-no-autoplay") !== undefined) return;
    if ($v.attr("autoplay") === undefined) $v.attr("autoplay", "");
    if ($v.attr("muted") === undefined) $v.attr("muted", "");
    if ($v.attr("playsinline") === undefined) $v.attr("playsinline", "");
    if ($v.attr("loop") === undefined) $v.attr("loop", "");
    if ($v.attr("preload") === undefined) $v.attr("preload", "metadata");
  });

  return {
    html: $final.html(),
    assets: assetResults,
    warnings,
  };
}
