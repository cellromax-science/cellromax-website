// lib/detail-html/bundle-storage.ts
//
// 상세페이지 ZIP 번들의 "임시 업로드 경로" 빌더 + 검증.
// 브라우저가 서명 URL로 ZIP을 직접 올린 뒤, process 라우트가 이 경로를
// service-role로 download 한다. 클라이언트가 임의 경로를 download 시키지
// 못하도록 productId(UUID) + bundleId(영숫자/하이픈/언더스코어) 만으로
// 서버가 경로를 재구성한다.

export const BUNDLE_BUCKET = "detail-bundles";

const TEMP_SEGMENT = "detail-bundles/_tmp";

// route 가 생성하는 `${Date.now()}-${hex6}` 형식을 포함. 슬래시·점·`..` 차단.
const BUNDLE_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function isValidBundleId(bundleId: string): boolean {
  return BUNDLE_ID_RE.test(bundleId);
}

export function isValidProductId(productId: string): boolean {
  return UUID_RE.test(productId);
}

export function buildBundleUploadKey(
  productId: string,
  bundleId: string,
): string {
  if (!isValidProductId(productId)) {
    throw new Error("잘못된 상품 ID 형식입니다.");
  }
  if (!isValidBundleId(bundleId)) {
    throw new Error("잘못된 번들 ID 형식입니다.");
  }
  return `${productId}/${TEMP_SEGMENT}/${bundleId}.zip`;
}
