-- =============================================
-- [Phase2-2] 셀로맥스사이언스 DB 초기 스키마
-- Project: Cellromax-Homepage_Renewal
-- =============================================

-- =============================================
-- 확장 기능 활성화
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================
-- 1. products (제품 테이블)
-- =============================================
CREATE TABLE IF NOT EXISTS products (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug             VARCHAR(200) UNIQUE NOT NULL,
  -- 다국어 제품명
  name_ko          VARCHAR(200) NOT NULL,
  name_en          VARCHAR(200),
  name_zh          VARCHAR(200),
  name_vi          VARCHAR(200),
  -- 카테고리
  category         VARCHAR(50) NOT NULL
                   CHECK (category IN (
                     'health_functional',
                     'general_food',
                     'cosmetic',
                     'medicine',
                     'nutra_pet',
                     'other'
                   )),
  -- 이미지
  thumbnail_url    TEXT,
  images           TEXT[] DEFAULT '{}',
  detail_image_url TEXT,
  -- 제품 정보 (다국어)
  ingredients_ko   TEXT,
  ingredients_en   TEXT,
  ingredients_zh   TEXT,
  ingredients_vi   TEXT,
  functionality_ko TEXT,
  functionality_en TEXT,
  functionality_zh TEXT,
  functionality_vi TEXT,
  how_to_use_ko    TEXT,
  how_to_use_en    TEXT,
  how_to_use_zh    TEXT,
  how_to_use_vi    TEXT,
  caution_ko       TEXT,
  caution_en       TEXT,
  -- 상태
  is_active        BOOLEAN DEFAULT true,
  is_new           BOOLEAN DEFAULT false,
  sort_order       INTEGER DEFAULT 0,
  -- 메타
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  created_by       UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_products_category   ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active  ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_sort_order ON products(sort_order);
CREATE INDEX IF NOT EXISTS idx_products_name_ko    ON products USING gin(name_ko gin_trgm_ops);

-- updated_at 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_products_updated_at ON products;
CREATE TRIGGER trigger_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- 2. ir_files (IR 자료 테이블)
-- =============================================
CREATE TABLE IF NOT EXISTS ir_files (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        VARCHAR(300) NOT NULL,
  category     VARCHAR(50) NOT NULL
               CHECK (category IN (
                 'announcement',
                 'annual_report',
                 'presentation',
                 'other'
               )),
  file_url     TEXT NOT NULL,
  file_name    VARCHAR(300),
  file_size    BIGINT,
  file_type    VARCHAR(50),
  published_at DATE NOT NULL,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  created_by   UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_ir_files_category     ON ir_files(category);
CREATE INDEX IF NOT EXISTS idx_ir_files_published_at ON ir_files(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_ir_files_is_active    ON ir_files(is_active);

-- =============================================
-- 3. posts (게시판 테이블: 공지/소식/홍보영상)
-- =============================================
CREATE TABLE IF NOT EXISTS posts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_type     VARCHAR(20) NOT NULL
                CHECK (post_type IN (
                  'notice',
                  'news',
                  'video'
                )),
  -- 다국어 제목
  title_ko      VARCHAR(500) NOT NULL,
  title_en      VARCHAR(500),
  title_zh      VARCHAR(500),
  title_vi      VARCHAR(500),
  -- 다국어 내용
  content_ko    TEXT,
  content_en    TEXT,
  content_zh    TEXT,
  content_vi    TEXT,
  -- 영상 전용
  youtube_id    VARCHAR(50),
  thumbnail_url TEXT,
  images        TEXT[] DEFAULT '{}',
  -- 상태
  is_pinned    BOOLEAN DEFAULT false,
  is_active    BOOLEAN DEFAULT true,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  created_by   UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_posts_post_type    ON posts(post_type);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_is_pinned    ON posts(is_pinned);
CREATE INDEX IF NOT EXISTS idx_posts_is_active    ON posts(is_active);

-- =============================================
-- 4. pharmacies (회원약국 테이블)
-- =============================================
CREATE TABLE IF NOT EXISTS pharmacies (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           VARCHAR(200) NOT NULL,
  address        TEXT NOT NULL,
  address_detail VARCHAR(200),
  city           VARCHAR(50),
  district       VARCHAR(50),
  phone          VARCHAR(20),
  latitude       DECIMAL(10, 8) NOT NULL,
  longitude      DECIMAL(11, 8) NOT NULL,
  is_active      BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pharmacies_location ON pharmacies(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_pharmacies_city      ON pharmacies(city);
CREATE INDEX IF NOT EXISTS idx_pharmacies_is_active ON pharmacies(is_active);

-- 주변 약국 검색 함수 (Haversine 공식)
CREATE OR REPLACE FUNCTION get_nearby_pharmacies(
  user_lat     DECIMAL,
  user_lng     DECIMAL,
  radius_km    DECIMAL  DEFAULT 3.0,
  result_limit INTEGER  DEFAULT 20
)
RETURNS TABLE (
  id           UUID,
  name         VARCHAR,
  address      TEXT,
  phone        VARCHAR,
  latitude     DECIMAL,
  longitude    DECIMAL,
  distance_km  DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.address,
    p.phone,
    p.latitude,
    p.longitude,
    ROUND(
      CAST(
        6371 * 2 * ASIN(SQRT(
          SIN(RADIANS(p.latitude - user_lat) / 2) ^ 2 +
          COS(RADIANS(user_lat)) * COS(RADIANS(p.latitude)) *
          SIN(RADIANS(p.longitude - user_lng) / 2) ^ 2
        ))
      AS DECIMAL), 2
    ) AS distance_km
  FROM pharmacies p
  WHERE
    p.is_active = true
    AND ABS(p.latitude - user_lat) < radius_km / 111.0
    AND ABS(p.longitude - user_lng) < radius_km / 88.0
  ORDER BY distance_km
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 5. inquiries (온라인 문의 테이블)
-- =============================================
CREATE TABLE IF NOT EXISTS inquiries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(100) NOT NULL,
  company         VARCHAR(200),
  country         VARCHAR(100) NOT NULL,
  email           VARCHAR(200) NOT NULL,
  inquiry_type    VARCHAR(50) NOT NULL
                  CHECK (inquiry_type IN (
                    'product',
                    'buyer',
                    'partnership',
                    'other'
                  )),
  message         TEXT NOT NULL,
  status          VARCHAR(20) DEFAULT 'pending'
                  CHECK (status IN (
                    'pending',
                    'reviewing',
                    'replied',
                    'closed'
                  )),
  admin_memo      TEXT,
  replied_at      TIMESTAMPTZ,
  replied_by      UUID REFERENCES auth.users(id),
  recaptcha_score DECIMAL(3,2),
  ip_address      INET,
  email_sent_at   TIMESTAMPTZ,
  email_status    VARCHAR(20) DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_status     ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_email      ON inquiries(email);

-- =============================================
-- 6. admin_profiles (관리자 프로필 테이블)
-- =============================================
CREATE TABLE IF NOT EXISTS admin_profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         VARCHAR(200) NOT NULL,
  name          VARCHAR(100) NOT NULL,
  role          VARCHAR(30) NOT NULL
                CHECK (role IN (
                  'super_admin',
                  'marketing',
                  'ir',
                  'inquiry'
                )),
  department    VARCHAR(100),
  is_active     BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  totp_secret   TEXT,
  totp_enabled  BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_profiles_role      ON admin_profiles(role);
CREATE INDEX IF NOT EXISTS idx_admin_profiles_is_active ON admin_profiles(is_active);

-- =============================================
-- 7. login_attempts (로그인 시도 기록: 브루트포스 방어)
-- =============================================
CREATE TABLE IF NOT EXISTS login_attempts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email        VARCHAR(200) NOT NULL,
  ip_address   INET NOT NULL,
  is_success   BOOLEAN NOT NULL,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip    ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_time  ON login_attempts(attempted_at DESC);

-- 5분 내 5회 이상 실패 시 잠금 체크 함수
CREATE OR REPLACE FUNCTION check_login_lockout(
  check_email VARCHAR,
  check_ip    INET
) RETURNS BOOLEAN AS $$
DECLARE
  fail_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fail_count
  FROM login_attempts
  WHERE
    (email = check_email OR ip_address = check_ip)
    AND is_success = false
    AND attempted_at > NOW() - INTERVAL '5 minutes';

  RETURN fail_count >= 5;
END;
$$ LANGUAGE plpgsql;
