-- =============================================================
-- 주의사항(caution) / 보관방법(storage) 컬럼 삭제
-- Created: 2026-02-22
-- Depends on: 20260219000001_initial_schema.sql
--             20260220000006_product_detail_fields.sql
--
-- 사유: 주의사항·보관방법 내용은 기타정보(other_info) 컬럼에 통합
-- =============================================================

ALTER TABLE products
  DROP COLUMN IF EXISTS caution_ko,
  DROP COLUMN IF EXISTS caution_en,
  DROP COLUMN IF EXISTS caution_zh,
  DROP COLUMN IF EXISTS caution_vi,
  DROP COLUMN IF EXISTS storage_ko,
  DROP COLUMN IF EXISTS storage_en,
  DROP COLUMN IF EXISTS storage_zh,
  DROP COLUMN IF EXISTS storage_vi;
