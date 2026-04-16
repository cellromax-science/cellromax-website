import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/auth'
import { getAdminProfile, createAdminClient } from '@/lib/supabase/admin'
import type { AdminRole } from '@/types/admin'

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const VALID_ROLES: AdminRole[] = ['super_admin', 'marketing', 'ir', 'inquiry']

/**
 * 관리자 계정 정보 수정 API (Super Admin 전용)
 *
 * PATCH /api/accounts/:id
 *
 * Body: { name?: string, role?: AdminRole, department?: string, is_active?: boolean, password?: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    const { id } = await params

    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: '유효하지 않은 계정 ID입니다.' },
        { status: 400 }
      )
    }

    const body = await request.json()

    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: '수정할 데이터가 없습니다.' },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        return NextResponse.json(
          { error: '이름은 비어 있을 수 없습니다.' },
          { status: 400 }
        )
      }
      updateData.name = body.name.trim()
    }

    if (body.role !== undefined) {
      if (!VALID_ROLES.includes(body.role)) {
        return NextResponse.json(
          { error: `유효하지 않은 역할입니다. 사용 가능 역할: ${VALID_ROLES.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.role = body.role
    }

    if (body.department !== undefined) {
      updateData.department = body.department
    }

    if (body.is_active !== undefined) {
      if (typeof body.is_active !== 'boolean') {
        return NextResponse.json(
          { error: 'is_active는 boolean 값이어야 합니다.' },
          { status: 400 }
        )
      }

      if (body.is_active === false && id === user.id) {
        return NextResponse.json(
          { error: '자기 자신의 계정은 비활성화할 수 없습니다.' },
          { status: 400 }
        )
      }

      updateData.is_active = body.is_active
    }

    const nextPassword =
      body.password !== undefined ? String(body.password).trim() : undefined

    if (nextPassword !== undefined && nextPassword.length < 8) {
      return NextResponse.json(
        { error: '비밀번호는 최소 8자 이상이어야 합니다.' },
        { status: 400 }
      )
    }

    if (Object.keys(updateData).length === 0 && nextPassword === undefined) {
      return NextResponse.json(
        {
          error:
            '수정 가능한 필드가 없습니다. 사용 가능 필드: name, role, department, is_active, password',
        },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    if (nextPassword !== undefined) {
      const { error: passwordError } = await adminClient.auth.admin.updateUserById(
        id,
        {
          password: nextPassword,
        }
      )

      if (passwordError) {
        console.error('[accounts/PATCH] Auth password update error:', passwordError)
        return NextResponse.json(
          { error: `비밀번호 변경 중 오류가 발생했습니다: ${passwordError.message}` },
          { status: 500 }
        )
      }
    }

    if (Object.keys(updateData).length === 0) {
      const { data: account, error: accountError } = await adminClient
        .from('admin_profiles')
        .select('*')
        .eq('id', id)
        .single()

      if (accountError) {
        console.error('[accounts/PATCH] Profile fetch error:', accountError)
        return NextResponse.json(
          { error: '비밀번호는 변경되었지만 계정 정보를 다시 불러오지 못했습니다.' },
          { status: 500 }
        )
      }

      return NextResponse.json({ account })
    }

    const { data, error } = await adminClient
      .from('admin_profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[accounts/PATCH] Supabase update error:', error)

      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: '해당 계정을 찾을 수 없습니다.' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: '계정 수정 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ account: data })
  } catch (err) {
    console.error('[accounts/PATCH] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
