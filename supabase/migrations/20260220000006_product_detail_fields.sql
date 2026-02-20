-- =============================================================
-- 제품 상세 페이지용 누락 컬럼 추가
-- Created: 2026-02-20
-- Depends on: 20260219000001_initial_schema.sql
--
-- 변경 내역:
--   1. products: storage_ko/en/zh/vi TEXT 컬럼 추가 (보관 방법)
--   2. products: caution_zh/vi TEXT 컬럼 추가 (주의 사항 4개국어 완성)
-- =============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS storage_ko  TEXT,
  ADD COLUMN IF NOT EXISTS storage_en  TEXT,
  ADD COLUMN IF NOT EXISTS storage_zh  TEXT,
  ADD COLUMN IF NOT EXISTS storage_vi  TEXT,
  ADD COLUMN IF NOT EXISTS caution_zh  TEXT,
  ADD COLUMN IF NOT EXISTS caution_vi  TEXT;
