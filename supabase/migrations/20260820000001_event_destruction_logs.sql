-- =============================================================
-- 이벤트 개인정보 파기 이력(event_destruction_logs) 및 파기 함수
-- Project: Cellromax-Homepage_Renewal (셀로맥스사이언스)
-- Created: 2026-08-20
--
-- 관리자 페이지의 "개인정보 파기" 기능:
--   - destroy_event_entries() 함수가 파기(DELETE)와 이력(INSERT)을
--     하나의 트랜잭션으로 수행 → 이력 없이 삭제되는 일이 없음
--   - 이력 테이블에는 개인정보를 저장하지 않음 (건수·기간·처리자만)
-- =============================================================

CREATE TABLE event_destruction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 파기된 이벤트 식별 정보
  event_slug TEXT NOT NULL,
  event_title TEXT NOT NULL,

  -- 파기 내역 (개인정보 없음)
  destroyed_count INTEGER NOT NULL,
  entries_from TIMESTAMPTZ,  -- 파기된 데이터의 최초 수집 시각
  entries_to TIMESTAMPTZ,    -- 파기된 데이터의 최종 수집 시각

  -- 처리자 (계정 삭제 후에도 이력이 남도록 이름을 별도 저장)
  destroyed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  destroyed_by_name TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_destruction_logs_created
  ON event_destruction_logs (created_at DESC);

-- =============================================================
-- RLS: 마케팅/슈퍼어드민 조회만 허용. 기록은 함수(service role)로만.
-- =============================================================

ALTER TABLE event_destruction_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized admins can view destruction logs"
  ON event_destruction_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'marketing')
      AND is_active = true
    )
  );

-- =============================================================
-- 파기 함수: 이벤트명(event_title) 기준으로 참여 데이터를 삭제하고
-- 파기 이력을 같은 트랜잭션에서 기록한다.
-- 반환값: 파기된 총 건수 (해당 이벤트가 없으면 0)
-- =============================================================

CREATE OR REPLACE FUNCTION destroy_event_entries(
  p_event_title TEXT,
  p_destroyed_by UUID,
  p_destroyed_by_name TEXT
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER := 0;
  v_slug TEXT;
  v_count INTEGER;
  v_from TIMESTAMPTZ;
  v_to TIMESTAMPTZ;
BEGIN
  -- 같은 제목을 가진 이벤트 슬러그별로 이력을 남기고 삭제
  FOR v_slug IN
    SELECT DISTINCT event_slug FROM event_entries WHERE event_title = p_event_title
  LOOP
    SELECT COUNT(*), MIN(created_at), MAX(created_at)
      INTO v_count, v_from, v_to
      FROM event_entries
     WHERE event_slug = v_slug AND event_title = p_event_title;

    INSERT INTO event_destruction_logs
      (event_slug, event_title, destroyed_count, entries_from, entries_to,
       destroyed_by, destroyed_by_name)
    VALUES
      (v_slug, p_event_title, v_count, v_from, v_to,
       p_destroyed_by, p_destroyed_by_name);

    DELETE FROM event_entries
     WHERE event_slug = v_slug AND event_title = p_event_title;

    v_total := v_total + v_count;
  END LOOP;

  RETURN v_total;
END;
$$;

-- 함수는 서버(service role)에서만 호출 — 일반 클라이언트 실행 차단
REVOKE ALL ON FUNCTION destroy_event_entries(TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION destroy_event_entries(TEXT, UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION destroy_event_entries(TEXT, UUID, TEXT) FROM authenticated;
