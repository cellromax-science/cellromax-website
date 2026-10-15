/* ==========================================================================
   이벤트 참여 관련 타입 정의
   ========================================================================== */

/** 참여자 구분 (책 이벤트 등 일반 이벤트용) */
export type EventCategory = "pharmacist" | "pharmacy_student" | "general";

/** event_entries 테이블 행 */
export interface EventEntry {
  id: string;
  event_slug: string;
  event_title: string;
  name: string;
  /** 퀴즈 이벤트 전용 — 일반 이벤트는 null */
  license_number: string | null;
  phone: string;
  /** 퀴즈 이벤트 전용 — 일반 이벤트는 null */
  pharmacy_name: string | null;
  consent: boolean;
  q1: number | null;
  q2: number | null;
  /** 이하 일반 이벤트(책 구매 인증 등) 전용 — 퀴즈 이벤트 행은 null */
  category: EventCategory | null;
  affiliation: string | null;
  zipcode: string | null;
  address: string | null;
  address_detail: string | null;
  /** event-uploads 버킷 내 구매 인증 파일 경로 (최대 5개) */
  file_paths: string[] | null;
  consent_version: string | null;
  created_at: string;
}

/** 퀴즈 이벤트 제출 요청 본문 */
export interface QuizEntryRequest {
  name: string;
  license: string;
  phone: string;
  pharmacy: string;
  consent: boolean;
  q1: number;
  q2: number;
}

/** 퀴즈 이벤트 제출 결과 */
export type QuizSubmitResult = "success" | "wrong" | "duplicate" | "error";

/** event_destruction_logs 테이블 행 — 개인정보 파기 이력 */
export interface EventDestructionLog {
  id: string;
  event_slug: string;
  event_title: string;
  destroyed_count: number;
  /** 함께 삭제된 구매 인증 파일 수 (파일 없는 이벤트는 null) */
  destroyed_file_count: number | null;
  entries_from: string | null;
  entries_to: string | null;
  destroyed_by: string | null;
  destroyed_by_name: string;
  created_at: string;
}
