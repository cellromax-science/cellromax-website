import 'server-only'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AdminProfile, AdminRole } from './types'

// ============================================================
// 세션 및 권한 관리 유틸리티 (서버 전용)
// Supabase Auth + admin_profiles 테이블 기반
// ============================================================

/**
 * 현재 로그인한 사용자 정보를 반환합니다.
 * 인증되지 않은 경우 null을 반환합니다.
 *
 * 참고: getSession() 대신 getUser()를 사용하여 서버 측 JWT 검증을 수행합니다.
 */
export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}

/**
 * 현재 사용자의 admin_profiles 레코드를 조회합니다.
 * 로그인하지 않았거나 관리자 프로필이 없으면 null을 반환합니다.
 */
export async function getAdminProfile(): Promise<AdminProfile | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('admin_profiles')
    .select('*')
    .eq('id', user.id)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return null
  }

  return data as AdminProfile
}

/**
 * 관리자 인증을 요구합니다.
 * 관리자가 아닌 경우 로그인 페이지로 리다이렉트합니다.
 *
 * @returns 인증된 관리자 프로필
 */
export async function requireAdmin(): Promise<AdminProfile> {
  const profile = await getAdminProfile()

  if (!profile) {
    redirect('/admin/login')
  }

  return profile
}

/**
 * 특정 역할을 가진 관리자만 접근할 수 있도록 권한을 체크합니다.
 * 권한이 없으면 로그인 페이지로 리다이렉트합니다.
 *
 * @param roles - 허용할 역할 목록
 * @returns 인증된 관리자 프로필
 *
 * @example
 * // super_admin 또는 marketing 역할만 허용
 * const profile = await requireRole(['super_admin', 'marketing'])
 */
export async function requireRole(roles: AdminRole[]): Promise<AdminProfile> {
  const profile = await requireAdmin()

  if (!roles.includes(profile.role)) {
    redirect('/admin/login')
  }

  return profile
}
