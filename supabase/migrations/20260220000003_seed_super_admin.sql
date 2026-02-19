-- =============================================================
-- [Phase2-5] Super Admin 시드 데이터 준비
-- Project: Cellromax-Homepage_Renewal (셀로맥스사이언스)
-- Created: 2026-02-20
-- Depends on:
--   - 20260219000001_initial_schema.sql (admin_profiles 테이블)
--   - 20260220000001_rls_policies.sql   (테이블 RLS 정책)
--
-- 주의:
--   Supabase 마이그레이션 SQL에서는 auth.users 테이블에
--   직접 INSERT할 수 없습니다. 사용자 생성은 반드시
--   Supabase Auth Admin API를 통해 처리해야 합니다.
--
--   따라서 이 마이그레이션은 다음 두 가지 역할을 합니다:
--   1) admin_profiles에 Super Admin을 INSERT하는 함수 생성
--   2) 실제 시드는 scripts/seed-admin.ts 스크립트에서 실행
--
-- 실행 순서:
--   1. npx supabase db push  (이 마이그레이션 반영)
--   2. npx tsx scripts/seed-admin.ts  (Auth 사용자 + 프로필 생성)
-- =============================================================


-- =============================================================
-- Super Admin 프로필 생성/업데이트 함수
-- =============================================================
-- TypeScript 시드 스크립트에서 auth.users 생성 후
-- 반환된 UUID로 이 함수를 호출하여 admin_profiles를 삽입합니다.
-- ON CONFLICT로 멱등성을 보장하여 중복 실행 시에도 안전합니다.

CREATE OR REPLACE FUNCTION seed_admin_profile(
  admin_id    UUID,
  admin_email VARCHAR(200),
  admin_name  VARCHAR(100),
  admin_role  VARCHAR(30),
  admin_dept  VARCHAR(100) DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO admin_profiles (id, email, name, role, department, is_active, created_at, updated_at)
  VALUES (admin_id, admin_email, admin_name, admin_role, admin_dept, true, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    name       = EXCLUDED.name,
    role       = EXCLUDED.role,
    department = EXCLUDED.department,
    is_active  = true,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SECURITY DEFINER: service_role 권한으로 실행되므로 RLS를 우회합니다.
-- 이 함수는 시드 스크립트에서만 호출되며, 일반 클라이언트에서는
-- RLS 정책에 의해 admin_profiles 직접 INSERT가 제한됩니다.

COMMENT ON FUNCTION seed_admin_profile IS
  'Super Admin 시드용 함수. scripts/seed-admin.ts에서 호출. 멱등성 보장 (ON CONFLICT DO UPDATE).';
