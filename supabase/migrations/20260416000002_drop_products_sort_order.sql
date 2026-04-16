-- =============================================================
-- products.sort_order 제거
-- 목적: 전체상품 정렬은 created_at 기준으로 전환하고,
--       카테고리 내 정렬은 category_sort_order만 유지
-- =============================================================

DROP INDEX IF EXISTS idx_products_sort_order;

ALTER TABLE products
  DROP COLUMN IF EXISTS sort_order;
