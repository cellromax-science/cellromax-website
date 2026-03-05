-- =============================================================================
-- Migration: Add localized detail_html columns
--
-- detail_html 단일 컬럼을 언어별로 분리한다.
-- 기존 detail_html 값은 detail_html_ko로 복사하여 데이터 유실 없이 마이그레이션.
-- =============================================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS detail_html_ko TEXT,
  ADD COLUMN IF NOT EXISTS detail_html_en TEXT,
  ADD COLUMN IF NOT EXISTS detail_html_zh TEXT,
  ADD COLUMN IF NOT EXISTS detail_html_vi TEXT;

-- 기존 detail_html 데이터를 detail_html_ko로 이전
UPDATE products
SET detail_html_ko = detail_html
WHERE detail_html IS NOT NULL AND detail_html_ko IS NULL;
