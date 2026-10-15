/**
 * 『약국경영학개론』 사전예약 구매 인증 이벤트 — 공통 상수
 *
 * 제출 라우트(./route.ts)와 업로드 URL 발급 라우트(./upload-urls/route.ts)가
 * 함께 사용한다.
 */

export const EVENT_SLUG = 'book-preorder'
export const EVENT_TITLE = '약국경영학개론 사전예약 구매 인증 이벤트'

/** 제출 시점에 노출된 동의 문구 버전 (public/book/index.html 동의 안내 기준) */
export const CONSENT_VERSION = 'book-preorder-v1'

/** 이벤트 종료 여부 — true면 신규 제출을 거부 (수동 종료용) */
export const EVENT_CLOSED = false

/** 이벤트 마감 시각 (2026-10-27 자정, KST) — 이후 제출 자동 거부 */
export const EVENT_DEADLINE = new Date('2026-10-27T23:59:59+09:00')

/** 구매 인증 파일 제한 (event-uploads 버킷 설정과 동일하게 유지) */
export const MAX_FILES = 5
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

/** 허용 확장자 → MIME 매핑 (버킷 allowed_mime_types와 동일) */
export const ALLOWED_FILES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  pdf: 'application/pdf',
}

export const UPLOAD_BUCKET = 'event-uploads'

/** 업로드 경로 형식: book-preorder/<uuid>.<허용 확장자> */
export const FILE_PATH_PATTERN = new RegExp(
  `^${EVENT_SLUG}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(${Object.keys(ALLOWED_FILES).join('|')})$`
)

/** 이벤트 진행 여부 공통 검사 */
export function eventClosed(): boolean {
  return EVENT_CLOSED || Date.now() > EVENT_DEADLINE.getTime()
}
