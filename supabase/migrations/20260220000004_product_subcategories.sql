-- =============================================================
-- [Phase2-6] 제품 서브카테고리 테이블 및 FK 추가
-- Project: Cellromax-Homepage_Renewal (cellromax science)
-- Created: 2026-02-20
-- Depends on:
--   - 20260219000001_initial_schema.sql (products, update_updated_at)
--   - 20260220000001_rls_policies.sql   (RLS patterns)
--
-- 변경 내역:
--   1. product_subcategories 테이블 신규 생성
--   2. products.subcategory_id FK 컬럼 추가 (NULL 허용)
--   3. 인덱스 생성 (parent_category, slug unique, subcategory_id FK)
--   4. RLS 활성화 및 정책 정의
--   5. updated_at 트리거 연결
--   6. 초기 시드 데이터 (건강기능식품 서브카테고리)
-- =============================================================


-- =============================================================
-- 1. product_subcategories 테이블 생성
-- =============================================================
-- parent_category는 products.category와 동일한 CHECK 제약을 가짐
-- 동일 parent_category 내에서 slug는 고유해야 함

CREATE TABLE IF NOT EXISTS product_subcategories (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 상위 카테고리 (products.category CHECK와 동일한 값 세트)
  parent_category  VARCHAR(50) NOT NULL
                   CHECK (parent_category IN (
                     'health_functional',
                     'general_food',
                     'cosmetic',
                     'medicine',
                     'nutra_pet',
                     'other'
                   )),

  -- URL 및 프로그래밍용 식별자 (예: 'liver-health', 'gut-health')
  slug             VARCHAR(100) NOT NULL,

  -- 다국어 서브카테고리명
  name_ko          VARCHAR(100) NOT NULL,
  name_en          VARCHAR(100),
  name_zh          VARCHAR(100),
  name_vi          VARCHAR(100),

  -- 정렬 순서 (같은 parent_category 내에서의 표시 순서)
  sort_order       INTEGER DEFAULT 0 NOT NULL,

  -- 활성화 여부 (비활성 시 프론트엔드에 표시 안 됨)
  is_active        BOOLEAN DEFAULT true NOT NULL,

  -- 메타
  created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- 동일 상위 카테고리 내 slug 중복 방지
  CONSTRAINT uq_subcategory_parent_slug UNIQUE (parent_category, slug)
);

COMMENT ON TABLE product_subcategories IS
  '제품 서브카테고리 테이블. 각 대분류(parent_category) 하위에 세부 분류를 정의합니다.';


-- =============================================================
-- 2. 인덱스 (product_subcategories)
-- =============================================================

-- parent_category별 조회 최적화 (필터링, 관리자 목록)
CREATE INDEX IF NOT EXISTS idx_subcategories_parent_category
  ON product_subcategories(parent_category);

-- 정렬 순서별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_subcategories_sort_order
  ON product_subcategories(parent_category, sort_order);

-- 활성 상태 필터
CREATE INDEX IF NOT EXISTS idx_subcategories_is_active
  ON product_subcategories(is_active);


-- =============================================================
-- 3. updated_at 트리거 (기존 update_updated_at() 함수 재사용)
-- =============================================================

DROP TRIGGER IF EXISTS trigger_subcategories_updated_at ON product_subcategories;
CREATE TRIGGER trigger_subcategories_updated_at
  BEFORE UPDATE ON product_subcategories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- =============================================================
-- 4. products 테이블에 subcategory_id FK 추가
-- =============================================================
-- NULL 허용: 서브카테고리가 정의되지 않은 카테고리의 제품,
-- 또는 아직 서브카테고리를 지정하지 않은 제품에 대응

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS subcategory_id UUID
  REFERENCES product_subcategories(id)
  ON DELETE SET NULL;

COMMENT ON COLUMN products.subcategory_id IS
  '서브카테고리 FK. NULL 허용 - 서브카테고리 미지정 제품 허용. 삭제 시 SET NULL.';

-- subcategory_id 조회 최적화 (JOIN, 필터링)
CREATE INDEX IF NOT EXISTS idx_products_subcategory_id
  ON products(subcategory_id);

-- category + subcategory_id 복합 인덱스 (카테고리별 서브카테고리 필터링)
CREATE INDEX IF NOT EXISTS idx_products_category_subcategory
  ON products(category, subcategory_id);


-- =============================================================
-- 5. RLS 활성화 및 정책
-- =============================================================

ALTER TABLE product_subcategories ENABLE ROW LEVEL SECURITY;

-- [SELECT] 일반 방문자(anon 포함): 활성화된 서브카테고리만 조회
-- 프론트엔드 필터 UI에서 서브카테고리 목록을 가져올 때 사용
CREATE POLICY "Public can view active subcategories"
  ON product_subcategories FOR SELECT
  USING (is_active = true);

-- [SELECT] 인증된 관리자: 모든 서브카테고리 조회 (비활성 포함)
-- 관리자 대시보드에서 전체 목록 관리 시 사용
CREATE POLICY "Admins can view all subcategories"
  ON product_subcategories FOR SELECT
  TO authenticated
  USING (true);

-- [INSERT] 마케팅/슈퍼어드민: 서브카테고리 생성
CREATE POLICY "Marketing can insert subcategories"
  ON product_subcategories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'marketing')
      AND is_active = true
    )
  );

-- [UPDATE] 마케팅/슈퍼어드민: 서브카테고리 수정
CREATE POLICY "Marketing can update subcategories"
  ON product_subcategories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'marketing')
      AND is_active = true
    )
  );

-- [DELETE] 슈퍼어드민만: 서브카테고리 삭제
-- products.subcategory_id는 ON DELETE SET NULL이므로,
-- 서브카테고리 삭제 시 해당 제품의 subcategory_id가 NULL로 변경됨
CREATE POLICY "Super admin can delete subcategories"
  ON product_subcategories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
      AND is_active = true
    )
  );


-- =============================================================
-- 6. 초기 시드 데이터: 건강기능식품(health_functional) 서브카테고리
-- =============================================================
-- ON CONFLICT로 멱등성 보장 (중복 실행 시 기존 데이터 유지)

INSERT INTO product_subcategories (parent_category, slug, name_ko, name_en, name_zh, name_vi, sort_order)
VALUES
  ('health_functional', 'liver-health',    '간건강',     'Liver Health',    '肝脏健康',   'Suc khoe gan',        1),
  ('health_functional', 'gut-health',      '장건강',     'Gut Health',      '肠道健康',   'Suc khoe duong ruot', 2),
  ('health_functional', 'eye-health',      '눈건강',     'Eye Health',      '眼睛健康',   'Suc khoe mat',        3),
  ('health_functional', 'joint-health',    '관절건강',   'Joint Health',    '关节健康',   'Suc khoe khop',       4),
  ('health_functional', 'immune-health',   '면역건강',   'Immune Health',   '免疫健康',   'Suc khoe mien dich',  5),
  ('health_functional', 'blood-flow',      '혈행건강',   'Blood Circulation', '血液循环', 'Luu thong mau',       6),
  ('health_functional', 'skin-health',     '피부건강',   'Skin Health',     '皮肤健康',   'Suc khoe da',         7),
  ('health_functional', 'body-fat',        '체지방감소', 'Body Fat Reduction', '减少体脂', 'Giam mo co the',      8)
ON CONFLICT ON CONSTRAINT uq_subcategory_parent_slug DO NOTHING;


-- =============================================================
-- 7. 데이터 정합성 체크 함수 (선택적 사용)
-- =============================================================
-- products.subcategory_id가 지정된 경우,
-- 해당 서브카테고리의 parent_category가 products.category와
-- 일치하는지 검증하는 트리거

CREATE OR REPLACE FUNCTION check_subcategory_parent_match()
RETURNS TRIGGER AS $$
BEGIN
  -- subcategory_id가 NULL이면 검증 불필요
  IF NEW.subcategory_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 서브카테고리의 parent_category와 제품의 category 일치 여부 확인
  IF NOT EXISTS (
    SELECT 1
    FROM product_subcategories
    WHERE id = NEW.subcategory_id
      AND parent_category = NEW.category
  ) THEN
    RAISE EXCEPTION
      'Subcategory (%) does not belong to category (%)',
      NEW.subcategory_id, NEW.category;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_subcategory_parent_match IS
  '제품의 category와 subcategory의 parent_category 일치 여부를 검증합니다.';

DROP TRIGGER IF EXISTS trigger_check_subcategory_match ON products;
CREATE TRIGGER trigger_check_subcategory_match
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION check_subcategory_parent_match();
