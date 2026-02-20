-- =============================================================
-- [Phase5-5] 온라인 문의 탭 기반 3분류 스키마 변경
-- inquiry_type: product/buyer/partnership/other → consumer/pharmacist/business
-- =============================================================

-- 1. 기존 CHECK 제약조건 제거
ALTER TABLE inquiries DROP CONSTRAINT IF EXISTS inquiries_inquiry_type_check;

-- 2. 새 CHECK 제약조건 추가
ALTER TABLE inquiries ADD CONSTRAINT inquiries_inquiry_type_check
  CHECK (inquiry_type IN ('consumer', 'pharmacist', 'business'));

-- 3. 새 컬럼 추가
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS subject VARCHAR(300);
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS pharmacy_name VARCHAR(200);
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS pharmacy_address TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS department_position VARCHAR(200);
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS recipient_email VARCHAR(200);

-- 4. country를 NULL 허용으로 변경 (비즈니스만 사용)
ALTER TABLE inquiries ALTER COLUMN country DROP NOT NULL;

-- 5. inquiry_type 인덱스
CREATE INDEX IF NOT EXISTS idx_inquiries_type ON inquiries(inquiry_type);
