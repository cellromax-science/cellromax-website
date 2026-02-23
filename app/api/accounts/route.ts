import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/auth'
import { getAdminProfile, createAdminClient } from '@/lib/supabase/admin'
import type { AdminRole } from '@/types/admin'

const VALID_ROLES: AdminRole[] = ['super_admin', 'marketing', 'ir', 'inquiry']

/**
 * 관리자 계정 목록 조회 API (Super Admin 전용)
 *
 * GET /api/accounts
 *
 * 응답: { accounts: AdminProfile[], total: number }
 */
export async function GET() {
  try {
    // --- 1. 인증 및 권한 확인 ---
    const user = await getUser()
    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const adminProfile = await getAdminProfile(user.id)
    if (!adminProfile) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    if (adminProfile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Super Admin 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    // --- 2. 계정 목록 조회 ---
    const adminClient = createAdminClient()

    const { data: accounts, error } = await adminClient
      .from('admin_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[accounts/GET] Supabase query error:', error)
      return NextResponse.json(
        { error: '계정 목록 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      accounts: accounts ?? [],
      total: accounts?.length ?? 0,
    })
  } catch (err) {
    console.error('[accounts/GET] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * 관리자 계정 생성 API (Super Admin 전용)
 *
 * POST /api/accounts
 *
 * Body: { email: string, password: string, name: string, role: AdminRole, department?: string }
 */
export async function POST(request: NextRequest) {
  try {
    // --- 1. 인증 및 권한 확인 ---
    const user = await getUser()
    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const adminProfile = await getAdminProfile(user.id)
    if (!adminProfile) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    if (adminProfile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Super Admin 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    // --- 2. 요청 바디 파싱 및 유효성 검사 ---
    const body = await request.json()
    const { email, password, name, role, department } = body as {
      email: string
      password: string
      name: string
      role: AdminRole
      department?: string
    }

    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: 'email, password, name, role은 필수 항목입니다.' },
        { status: 400 }
      )
    }

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: `유효하지 않은 역할입니다. 허용된 역할: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: '비밀번호는 최소 6자 이상이어야 합니다.' },
        { status: 400 }
      )
    }

    // --- 3. Auth 사용자 생성 ---
    const adminClient = createAdminClient()

    const { data: authData, error: authError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

    if (authError) {
      console.error('[accounts/POST] Auth createUser error:', authError)

      // 이메일 중복 에러 처리
      if (
        authError.message.includes('already been registered') ||
        authError.message.includes('already exists')
      ) {
        return NextResponse.json(
          { error: '이미 등록된 이메일 주소입니다.' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: `사용자 생성 중 오류가 발생했습니다: ${authError.message}` },
        { status: 500 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: '사용자 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    // --- 4. admin_profiles 테이블에 프로필 INSERT ---
    const { data: profileData, error: profileError } = await adminClient
      .from('admin_profiles')
      .insert({
        id: authData.user.id,
        email,
        name,
        role,
        department: department ?? null,
        is_active: true,
      })
      .select()
      .single()

    if (profileError) {
      console.error('[accounts/POST] Profile insert error:', profileError)

      // 프로필 생성 실패 시 Auth 사용자도 정리
      await adminClient.auth.admin.deleteUser(authData.user.id)

      return NextResponse.json(
        { error: '관리자 프로필 생성 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ account: profileData }, { status: 201 })
  } catch (err) {
    console.error('[accounts/POST] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
