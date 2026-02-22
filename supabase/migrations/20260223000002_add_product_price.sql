-- =============================================
-- products 테이블에 price(가격) 컬럼 추가
-- 단위: 원(KRW), 정수형
-- =============================================

-- 1. price 컬럼 추가
--    - INTEGER 타입: 원 단위이므로 소수점 불필요
--    - DEFAULT 0: 가격 미정 제품은 0으로 표시
--    - NOT NULL: 모든 제품은 반드시 가격 값을 가져야 함
ALTER TABLE products
  ADD COLUMN price INTEGER NOT NULL DEFAULT 0;

-- 2. 컬럼 코멘트 (용도 명확화)
COMMENT ON COLUMN products.price IS '제품 판매가격 (단위: 원/KRW). 0은 가격 미정을 의미.';

-- 3. 가격 내림차순 인덱스
--    - 고가순 정렬 조회에 최적화 (DESC)
--    - is_active 조건과 함께 사용되는 경우가 많으므로 부분 인덱스 적용
CREATE INDEX IF NOT EXISTS idx_products_price
  ON products (price DESC)
  WHERE is_active = true;
