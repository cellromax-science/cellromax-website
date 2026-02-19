import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

// ============================================================
// 로그인 관련 유틸리티 (서버 전용)
// RLS를 우회해야 하므로 Admin 클라이언트 사용
// ============================================================

/**
 * 로그인 시도를 login_attempts 테이블에 기록합니다.
 * 보안 감사 및 잠금 정책 판단에 사용됩니다.
 *
 * @param email - 로그인 시도 이메일
 * @param ip - 요청 IP 주소
 * @param isSuccess - 로그인 성공 여부
 */
export async function recordLoginAttempt(
  email: string,
  ip: string,
  isSuccess: boolean
): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('login_attempts')
    .insert({
      email,
      ip_address: ip,
      is_success: isSuccess,
    })

  if (error) {
    // 로그인 시도 기록 실패가 인증 흐름을 차단해서는 안 됨
    console.error('로그인 시도 기록 실패:', error.message)
  }
}

/**
 * 해당 이메일/IP 조합이 잠금 상태인지 확인합니다.
 * DB의 check_login_lockout 함수를 RPC로 호출합니다.
 * (5분 내 5회 이상 실패 시 잠금)
 *
 * @param email - 확인할 이메일
 * @param ip - 확인할 IP 주소
 * @returns 잠금 상태이면 true
 */
export async function checkLoginLockout(
  email: string,
  ip: string
): Promise<boolean> {
  const supabase = createAdminClient()

  const { data, error } = await supabase.rpc('check_login_lockout', {
    check_email: email,
    check_ip: ip,
  })

  if (error) {
    console.error('잠금 상태 확인 실패:', error.message)
    // 안전 측면에서 오류 시 잠금으로 처리
    return true
  }

  return data === true
}

/**
 * 로그인 성공 시 admin_profiles의 last_login_at을 현재 시각으로 갱신합니다.
 *
 * @param userId - 관리자 사용자 ID (auth.users.id)
 */
export async function updateLastLogin(userId: string): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('admin_profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) {
    console.error('최근 로그인 시각 갱신 실패:', error.message)
  }
}
