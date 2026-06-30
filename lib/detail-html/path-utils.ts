// lib/detail-html/path-utils.ts

/**
 * ZIP 내부 상대 경로를 정규화한다.
 * htmlBase: HTML 파일이 위치한 ZIP 내부 디렉토리 (예: "subdir" 또는 "")
 * rawRef:   HTML에서 참조한 경로 (예: "./images/01.jpg", "../shared/x.png")
 *
 * 반환: ZIP 내부 절대 경로 (예: "subdir/images/01.jpg")
 *       path traversal이면 null 반환
 */
export function normalizeZipPath(
  htmlBase: string,
  rawRef: string,
): string | null {
  // URL 쿼리/해시 제거
  const cleaned = rawRef.split("?")[0].split("#")[0];
  if (!cleaned) return null;

  // 이미 절대 URL이면 null (외부 URL)
  if (/^(https?:|data:|mailto:|\/\/)/i.test(cleaned)) return null;

  const parts = [...htmlBase.split("/").filter(Boolean), ...cleaned.split("/")];
  const resolved: string[] = [];

  for (const seg of parts) {
    if (seg === "." || seg === "") continue;
    if (seg === "..") {
      if (resolved.length === 0) return null; // zip 루트 위로 탈출 시도
      resolved.pop();
    } else {
      resolved.push(seg);
    }
  }

  const result = resolved.join("/");
  // 이중 체크: ".." 가 남아 있으면 거부
  if (result.includes("..")) return null;

  return result;
}

/**
 * 파일명에서 확장자 추출 (.jpg 형태)
 */
export function extname(filepath: string): string {
  const idx = filepath.lastIndexOf(".");
  return idx >= 0 ? filepath.slice(idx).toLowerCase() : "";
}

/**
 * 확장자 → MIME type 매핑
 */
const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".css": "text/css",
  ".js": "application/javascript",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ogg": "video/ogg",
  ".mov": "video/quicktime",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
};

export function mimeFromExt(ext: string): string {
  return MIME_MAP[ext.toLowerCase()] ?? "application/octet-stream";
}

/**
 * 허용 확장자 화이트리스트
 */
export const ALLOWED_ASSET_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".svg",
  ".css",
  ".js",
  ".mp4",
  ".webm",
  ".ogg",
  ".mov",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
];

export const ALLOWED_HTML_EXTENSIONS = [".html", ".htm"];
