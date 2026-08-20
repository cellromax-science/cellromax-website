/* ==========================================================================
   이벤트 참여 관련 타입 정의
   ========================================================================== */

/** event_entries 테이블 행 */
export interface EventEntry {
  id: string;
  event_slug: string;
  event_title: string;
  name: string;
  license_number: string;
  phone: string;
  pharmacy_name: string;
  consent: boolean;
  q1: number | null;
  q2: number | null;
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
  entries_from: string | null;
  entries_to: string | null;
  destroyed_by: string | null;
  destroyed_by_name: string;
  created_at: string;
}
