-- =============================================================
-- admin_profiles RLS 무한 재귀 수정
--
-- 문제:
--   "Super admin can manage all profiles" 정책이 admin_profiles
--   테이블을 자기 참조하여 무한 재귀(42P17) 발생.
--   다른 테이블(posts, products 등)의 RLS 정책이 admin_profiles를
--   서브쿼리할 때도 이 재귀가 트리거됨.
--
-- 해결:
--   SECURITY DEFINER 함수로 RLS를 우회하여 역할을 조회.
--   이 함수는 RLS 정책 평가 시 재귀를 발생시키지 않음.
-- =============================================================

-- 1. RLS를 우회하여 현재 사용자의 역할을 반환하는 헬퍼 함수
CREATE OR REPLACE FUNCTION public.get_my_admin_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM admin_profiles WHERE id = auth.uid()
$$;

-- 2. 기존 재귀 정책 삭제
DROP POLICY IF EXISTS "Super admin can manage all profiles" ON admin_profiles;

-- 3. 비재귀 정책으로 재생성 (헬퍼 함수 사용)
CREATE POLICY "Super admin can manage all profiles"
  ON admin_profiles FOR ALL
  TO authenticated
  USING (
    public.get_my_admin_role() = 'super_admin'
  );
