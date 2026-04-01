/**
 * Supabase Storage 이미지 최적화 유틸리티
 *
 * Supabase Storage의 이미지 변환 API를 활용하여
 * 원본 이미지 대신 리사이즈된 이미지를 요청한다.
 *
 * URL 변환: /storage/v1/object/public/ → /storage/v1/render/image/public/
 * 쿼리 파라미터: width, height, quality, format 등
 */

interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  /** resize 모드: cover(잘림 허용), contain(빈 공간 허용), fill(비율 무시) */
  resize?: "cover" | "contain" | "fill";
}

/**
 * Supabase Storage URL에 이미지 변환 파라미터를 적용한다.
 * Supabase URL이 아닌 경우 원본을 그대로 반환한다.
 */
export function optimizeImageUrl(
  url: string | null | undefined,
  options: ImageTransformOptions = {},
): string {
  if (!url) return "";

  // Supabase Storage URL인지 확인
  if (!url.includes("supabase.co/storage/v1/object/public/")) {
    return url;
  }

  // object → render/image 경로로 변환
  const transformedUrl = url.replace(
    "/storage/v1/object/public/",
    "/storage/v1/render/image/public/",
  );

  const params = new URLSearchParams();
  if (options.width) params.set("width", String(options.width));
  if (options.height) params.set("height", String(options.height));
  if (options.quality) params.set("quality", String(options.quality));
  if (options.resize) params.set("resize", options.resize);

  const queryString = params.toString();
  return queryString ? `${transformedUrl}?${queryString}` : transformedUrl;
}

/** 카드 썸네일용 (작은 크기) */
export function thumbnailUrl(url: string | null | undefined): string {
  return optimizeImageUrl(url, { width: 480, quality: 75, resize: "contain" });
}

/** 갤러리/리스트용 (중간 크기) */
export function galleryUrl(url: string | null | undefined): string {
  return optimizeImageUrl(url, { width: 800, quality: 75, resize: "cover" });
}

/** 상세 페이지용 (큰 크기) */
export function detailUrl(url: string | null | undefined): string {
  return optimizeImageUrl(url, { width: 1200, quality: 80 });
}

/** 갤러리 썸네일 스트립용 (아주 작은 크기) */
export function thumbStripUrl(url: string | null | undefined): string {
  return optimizeImageUrl(url, { width: 128, quality: 60, resize: "cover" });
}
