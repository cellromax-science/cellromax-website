-- =============================================================================
-- Migration: Add detail_images column to products
--
-- 상세페이지 전용 이미지 배열 (원료·소재 사진 등)
-- 기존 images(갤러리)와 분리하여 프론트 갤러리에 미표시,
-- detailpage-agent가 HTML 상세페이지 생성 시에만 참조한다.
-- =============================================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS detail_images TEXT[] DEFAULT '{}';

COMMENT ON COLUMN products.detail_images IS
  '상세페이지 전용 이미지 URL 배열. 프론트 갤러리에 미표시, HTML 상세페이지에서만 사용.';
