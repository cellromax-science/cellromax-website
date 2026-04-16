-- =============================================================
-- posts 테이블에 레거시 공지사항 식별자 추가
-- 목적: CSV 공지사항 import를 재실행해도 중복 없이 upsert 가능하도록 지원
-- =============================================================

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS legacy_notice_id BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'posts_legacy_notice_id_key'
  ) THEN
    ALTER TABLE posts
      ADD CONSTRAINT posts_legacy_notice_id_key UNIQUE (legacy_notice_id);
  END IF;
END $$;
