import 'server-only'

import { createClient } from '@/lib/supabase/server'

/**
 * 현재 세션을 가져옵니다.
 *
 * 주의: getSession()은 JWT를 서버에서 검증하지 않으므로
 * 인증 판단에는 반드시 getUser()를 사용하세요.
 * 이 함수는 세션 메타데이터(토큰 만료 시간 등)가 필요한 경우에만 사용합니다.
 */
export async function getSession() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    console.error('[Auth] getSession error:', error.message)
    return null
  }

  return data.session
}

/**
 * 현재 인증된 사용자를 가져옵니다.
 *
 * Supabase 서버에서 JWT를 검증하므로 getSession()보다 안전합니다.
 * 서버 컴포넌트, Server Action에서 인증 확인 시 항상 이 함수를 사용하세요.
 */
export async function getUser() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    // PGRST 에러나 세션 만료 등은 정상적인 미인증 상태일 수 있으므로
    // error level이 아닌 debug level로 처리
    return null
  }

  return data.user
}

/**
 * 이메일/비밀번호로 로그인합니다.
 *
 * Server Action에서 호출하세요.
 * 성공 시 사용자 객체, 실패 시 에러 메시지를 반환합니다.
 */
export async function signInWithEmail(email: string, password: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { user: null, error: error.message }
  }

  return { user: data.user, error: null }
}

/**
 * 로그아웃합니다.
 *
 * Server Action에서 호출하세요.
 */
export async function signOut() {
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('[Auth] signOut error:', error.message)
    return { error: error.message }
  }

  return { error: null }
}
