-- 영양정보 이미지 URL 컬럼 추가
-- 제품 상세 페이지에서 상세페이지 이미지 다음에 표출됨
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS nutrition_image_url TEXT;

COMMENT ON COLUMN products.nutrition_image_url IS '영양정보 이미지 URL (상세페이지 이미지 다음에 표출)';
