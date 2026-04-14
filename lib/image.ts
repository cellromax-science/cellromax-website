/**
 * Supabase Storage 이미지 유틸리티
 *
 * Supabase Storage URL을 반환하고, Next.js Image의 unoptimized 여부를 판단한다.
 * Supabase 이미지 변환 API(/render/image/)는 유료 플랜이 필요하므로 사용하지 않는다.
 * 대신 원본 URL을 그대로 사용하고 Next.js 자체 최적화를 비활성화(unoptimized)한다.
 */

/**
 * Supabase Storage URL 여부 판단.
 * true 반환 시 Next.js Image에 unoptimized 적용 필요.
 */
export function isSupabaseStorageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes("supabase.co/storage/");
}

/** 카드 썸네일용 */
export function thumbnailUrl(url: string | null | undefined): string {
  return url ?? "";
}

/** 갤러리/리스트용 */
export function galleryUrl(url: string | null | undefined): string {
  return url ?? "";
}

/** 상세 페이지용 */
export function detailUrl(url: string | null | undefined): string {
  return url ?? "";
}

/** 갤러리 썸네일 스트립용 */
export function thumbStripUrl(url: string | null | undefined): string {
  return url ?? "";
}
