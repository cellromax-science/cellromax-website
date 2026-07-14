-- =============================================================
-- 이벤트 참여(event_entries) 테이블 생성
-- Project: Cellromax-Homepage_Renewal (셀로맥스사이언스)
-- Created: 2026-07-14
--
-- 약사 대상 퀴즈 이벤트(베베락스액 등) 참여 정보 저장.
-- 이벤트별 슬러그(event_slug)로 구분해 향후 이벤트에도 재사용.
--
-- 개인정보(성함·약사면허번호·연락처·약국명)를 담으므로:
--   - INSERT 는 서버 API(service role)에서만 수행 (anon 정책 없음)
--   - SELECT 는 마케팅/슈퍼어드민만 허용
--   - 이벤트 종료 후 고지된 보유기간 내 행 삭제로 파기
-- =============================================================

CREATE TABLE event_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 이벤트 식별 슬러그 (예: 'beberax-quiz')
  event_slug TEXT NOT NULL,

  -- 참여자 정보 (모두 필수)
  name TEXT NOT NULL,
  license_number TEXT NOT NULL,
  phone TEXT NOT NULL,
  pharmacy_name TEXT NOT NULL,

  -- 개인정보 수집·이용 동의 (제출 시점 기준 항상 true)
  consent BOOLEAN NOT NULL DEFAULT true,

  -- 퀴즈 응답 (선택 인덱스, 서버에서 정답 검증 후 저장)
  q1 SMALLINT,
  q2 SMALLINT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 같은 이벤트에 같은 면허번호로 중복 참여 불가
  CONSTRAINT event_entries_unique_license UNIQUE (event_slug, license_number)
);

-- 관리자 목록 조회용 인덱스 (이벤트별 최신순)
CREATE INDEX idx_event_entries_slug_created
  ON event_entries (event_slug, created_at DESC);

-- =============================================================
-- RLS 정책
-- =============================================================

ALTER TABLE event_entries ENABLE ROW LEVEL SECURITY;

-- 마케팅/슈퍼어드민: 참여 목록 조회 가능 (관리자 페이지)
CREATE POLICY "Authorized admins can view event entries"
  ON event_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'marketing')
      AND is_active = true
    )
  );

-- 슈퍼어드민: 참여 데이터 삭제 가능 (보유기간 만료 파기용)
CREATE POLICY "Super admin can delete event entries"
  ON event_entries FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
      AND is_active = true
    )
  );

-- INSERT 정책 없음: 제출은 서버 API(service role, RLS 우회)에서만 수행.
-- 퀴즈 정답·중복 검증을 서버에서 강제하기 위함.
