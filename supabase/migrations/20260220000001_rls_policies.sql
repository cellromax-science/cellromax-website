-- =============================================================
-- [Phase2-3] Row Level Security (RLS) 정책
-- Project: Cellromax-Homepage_Renewal (셀로맥스사이언스)
-- Created: 2026-02-20
-- Depends on: 20260219000001_initial_schema.sql
--
-- 7개 테이블에 대한 RLS 활성화 및 접근 정책 정의
--   1. products       - 제품
--   2. ir_files       - IR 자료
--   3. posts          - 게시판 (공지/소식/홍보영상)
--   4. pharmacies     - 회원약국
--   5. inquiries      - 온라인 문의
--   6. admin_profiles - 관리자 프로필
--   7. login_attempts - 로그인 시도 기록
-- =============================================================


-- =============================================================
-- RLS 활성화 (모든 테이블)
-- =============================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE ir_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;


-- =============================================================
-- 1. products (제품) 정책
-- =============================================================

-- 일반 방문자(anon) 및 인증 사용자: 활성화된 제품만 조회 가능
-- 웹사이트 프론트엔드에서 제품 목록/상세를 표시할 때 사용
CREATE POLICY "Public can view active products"
  ON products FOR SELECT
  USING (is_active = true);

-- 로그인한 관리자: 모든 제품 조회 가능 (비활성 포함)
-- 관리자 대시보드에서 전체 제품 관리 시 사용
CREATE POLICY "Admins can view all products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

-- 마케팅/슈퍼어드민: 제품 생성 가능
-- admin_profiles 테이블에서 역할(role) 및 활성 상태(is_active)를 확인
CREATE POLICY "Marketing can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'marketing')
      AND is_active = true
    )
  );

-- 마케팅/슈퍼어드민: 제품 수정 가능
CREATE POLICY "Marketing can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'marketing')
      AND is_active = true
    )
  );

-- 슈퍼어드민만: 제품 삭제 가능
-- 삭제 권한은 최고 관리자에게만 부여하여 실수 방지
CREATE POLICY "Super admin can delete products"
  ON products FOR DELETE
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
-- 2. ir_files (IR 자료) 정책
-- =============================================================

-- 일반 방문자: 활성화된 IR 자료만 조회 가능
-- 투자정보 페이지에서 공개된 자료 다운로드 시 사용
CREATE POLICY "Public can view active ir files"
  ON ir_files FOR SELECT
  USING (is_active = true);

-- IR담당자/슈퍼어드민: IR 자료 전체 관리 (조회/생성/수정/삭제)
CREATE POLICY "IR and super admin can manage ir files"
  ON ir_files FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'ir')
      AND is_active = true
    )
  );


-- =============================================================
-- 3. posts (게시판: 공지/소식/홍보영상) 정책
-- =============================================================

-- 일반 방문자: 활성화된 게시물만 조회 가능
CREATE POLICY "Public can view active posts"
  ON posts FOR SELECT
  USING (is_active = true);

-- 마케팅/슈퍼어드민: 게시물 전체 관리 (조회/생성/수정/삭제)
CREATE POLICY "Marketing and super admin can manage posts"
  ON posts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'marketing')
      AND is_active = true
    )
  );


-- =============================================================
-- 4. pharmacies (회원약국) 정책
-- =============================================================

-- 일반 방문자: 활성화된 약국만 조회 가능
-- 약국 찾기 기능에서 지도 표시 시 사용
CREATE POLICY "Public can view active pharmacies"
  ON pharmacies FOR SELECT
  USING (is_active = true);

-- 마케팅/슈퍼어드민: 약국 전체 관리 (조회/생성/수정/삭제)
CREATE POLICY "Marketing and super admin can manage pharmacies"
  ON pharmacies FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'marketing')
      AND is_active = true
    )
  );


-- =============================================================
-- 5. inquiries (온라인 문의) 정책
-- =============================================================

-- 일반 방문자(anon 포함): 문의 생성만 가능 (조회 불가)
-- 비로그인 상태에서도 문의 폼 제출이 가능해야 함
CREATE POLICY "Anyone can create inquiry"
  ON inquiries FOR INSERT
  WITH CHECK (true);

-- 문의담당/마케팅/슈퍼어드민: 문의 목록 조회 가능
-- 관리자 대시보드에서 접수된 문의를 확인할 때 사용
CREATE POLICY "Authorized admins can view inquiries"
  ON inquiries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'marketing', 'inquiry')
      AND is_active = true
    )
  );

-- 문의담당/슈퍼어드민: 문의 상태 업데이트 가능
-- 문의 처리 상태(status) 변경, 관리자 메모(admin_memo) 작성 시 사용
CREATE POLICY "Authorized admins can update inquiries"
  ON inquiries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'inquiry')
      AND is_active = true
    )
  );


-- =============================================================
-- 6. admin_profiles (관리자 프로필) 정책
-- =============================================================

-- 관리자 본인: 자신의 프로필만 조회 가능
-- 로그인 후 본인 정보 확인, 역할 체크 등에 사용
CREATE POLICY "Admin can view own profile"
  ON admin_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- 슈퍼어드민: 모든 관리자 프로필 관리 (조회/생성/수정/삭제)
-- 관리자 계정 관리 페이지에서 사용
CREATE POLICY "Super admin can manage all profiles"
  ON admin_profiles FOR ALL
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
-- 7. login_attempts (로그인 시도 기록) 정책
-- =============================================================
-- 이 테이블은 service_role 키를 통해서만 접근 가능
-- anon/authenticated 클라이언트의 직접 접근을 완전히 차단
-- 브루트포스 방어 로직은 서버 측(Server Actions/API)에서
-- service_role 클라이언트를 통해 처리

-- RLS가 활성화된 상태에서 정책이 없으면 기본적으로 모든 접근이 차단됨
-- 아래 명시적 차단 정책은 의도를 명확히 문서화하기 위해 추가

-- anon 역할: 모든 작업 차단
CREATE POLICY "Deny all access for anon"
  ON login_attempts FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- authenticated 역할: 모든 작업 차단
CREATE POLICY "Deny all access for authenticated"
  ON login_attempts FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);
