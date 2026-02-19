import 'server-only'

import { createClient } from '@supabase/supabase-js'
import type { AdminRole, AdminProfile } from '@/types/admin'

/**
 * RLS를 우회하는 서버 전용 Supabase Admin 클라이언트를 생성합니다.
 *
 * 사용 사례:
 * - 로그인 시도 기록 저장
 * - 관리자 계정 생성
 * - 사용자 데이터 일괄 처리 등 RLS 우회가 필요한 관리 작업
 *
 * 주의: 이 클라이언트는 RLS를 완전히 우회하므로,
 * Server Actions / Route Handlers / 서버 컴포넌트에서만 사용해야 합니다.
 * 절대로 클라이언트 컴포넌트에서 import하지 마세요.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다.'
    )
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * userId로 활성 상태인 관리자 프로필을 조회합니다.
 * 비활성(is_active=false) 계정은 null을 반환합니다.
 */
export async function getAdminProfile(
  userId: string
): Promise<AdminProfile | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('admin_profiles')
    .select('*')
    .eq('id', userId)
    .eq('is_active', true)
    .single()

  if (error || !data) return null

  return data as AdminProfile
}

/**
 * 특정 사용자가 요구되는 역할을 가지고 있는지 확인합니다.
 * super_admin은 모든 역할에 대해 접근이 허용됩니다.
 */
export async function checkAdminRole(
  userId: string,
  requiredRole: AdminRole | AdminRole[]
): Promise<{ authorized: boolean; profile: AdminProfile | null }> {
  const profile = await getAdminProfile(userId)

  if (!profile) {
    return { authorized: false, profile: null }
  }

  if (profile.role === 'super_admin') {
    return { authorized: true, profile }
  }

  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
  const authorized = roles.includes(profile.role)

  return { authorized, profile }
}
