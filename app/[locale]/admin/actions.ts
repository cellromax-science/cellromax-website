'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  checkLoginLockout,
  recordLoginAttempt,
  updateLastLogin,
} from '@/lib/auth/login'
import type { AuthResult } from '@/lib/auth/types'

// ---------------------------------------------------------------------------
// loginAction
// - useActionState 훅과 함께 사용되는 Server Action
// - 관리자 로그인 처리: 입력 검증 -> 잠금 확인 -> 인증 -> 관리자 프로필 확인
// ---------------------------------------------------------------------------
export async function loginAction(
  _prevState: AuthResult,
  formData: FormData
): Promise<AuthResult> {
  // 1. formData에서 값 추출
  const email = formData.get('email')
  const password = formData.get('password')

  // 2. 입력값 기본 검증
  if (!email || typeof email !== 'string' || email.trim() === '') {
    return { success: false, error: '이메일을 입력해주세요.' }
  }

  if (!password || typeof password !== 'string' || password.trim() === '') {
    return { success: false, error: '비밀번호를 입력해주세요.' }
  }

  // 3. IP 주소 획득
  const headerStore = await headers()
  const ip = headerStore.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'

  // 4. 로그인 잠금 여부 확인
  const isLocked = await checkLoginLockout(email, ip)
  if (isLocked) {
    return {
      success: false,
      error: '로그인 시도 횟수를 초과했습니다. 잠시 후 다시 시도해주세요.',
    }
  }

  // 5. Supabase Auth 로그인 시도
  const supabase = await createClient()
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

  // 6. 로그인 실패 처리
  if (authError || !authData.user) {
    await recordLoginAttempt(email, ip, false)
    return {
      success: false,
      error: '이메일 또는 비밀번호가 올바르지 않습니다.',
    }
  }

  // 7. 로그인 성공 기록
  await recordLoginAttempt(email, ip, true)

  // 8. 관리자 프로필 조회 (RLS 우회를 위해 admin 클라이언트 사용)
  const adminClient = createAdminClient()
  const { data: profile, error: profileError } = await adminClient
    .from('admin_profiles')
    .select('id, is_active')
    .eq('id', authData.user.id)
    .single()

  // 관리자 프로필이 없거나 비활성 상태인 경우 -> 로그아웃 처리 후 에러 반환
  if (profileError || !profile || !profile.is_active) {
    await supabase.auth.signOut()
    return {
      success: false,
      error: '관리자 권한이 없거나 비활성화된 계정입니다.',
    }
  }

  // 9. 최종 로그인 시간 업데이트
  await updateLastLogin(authData.user.id)

  // 10. 관리자 대시보드로 리다이렉트
  // - redirect()는 내부적으로 에러를 throw하므로 try-catch 밖에서 호출
  revalidatePath('/admin', 'layout')
  redirect('/admin/dashboard')
}

// ---------------------------------------------------------------------------
// logoutAction
// - 관리자 로그아웃 처리 후 로그인 페이지로 리다이렉트
// ---------------------------------------------------------------------------
export async function logoutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()

  revalidatePath('/admin', 'layout')
  redirect('/admin/login')
}
