-- =============================================================
-- posts 테이블에 기존 뉴스 import 추적용 컬럼 추가
-- 목적: CSV 뉴스 import를 재실행해도 중복 없이 upsert 가능하게 지원
-- =============================================================

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS legacy_news_id BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'posts_legacy_news_id_key'
  ) THEN
    ALTER TABLE posts
      ADD CONSTRAINT posts_legacy_news_id_key UNIQUE (legacy_news_id);
  END IF;
END $$;
