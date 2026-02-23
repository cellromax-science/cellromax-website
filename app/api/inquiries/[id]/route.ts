import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/auth'
import { getAdminProfile } from '@/lib/supabase/admin'

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * 문의 단건 조회 API (관리자용)
 *
 * GET /api/inquiries/:id
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // --- 1. 인증 확인 ---
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

    // --- 2. 파라미터 추출 ---
    const { id } = await params

    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: '유효하지 않은 문의 ID입니다.' },
        { status: 400 }
      )
    }

    // --- 3. 문의 조회 ---
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('inquiries')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('[inquiries/GET:id] Supabase query error:', error)

      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: '해당 문의를 찾을 수 없습니다.' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: '문의 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ inquiry: data })
  } catch (err) {
    console.error('[inquiries/GET:id] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * 문의 상태 변경 + 관리자 메모 API (관리자용)
 *
 * PUT /api/inquiries/:id
 *
 * Body: { status?, admin_memo? }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // --- 1. 인증 확인 ---
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

    // --- 2. 파라미터 및 바디 추출 ---
    const { id } = await params

    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: '유효하지 않은 문의 ID입니다.' },
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

    // --- 3. 업데이트 데이터 구성 ---
    const updateData: Record<string, unknown> = {}

    if (body.status !== undefined) {
      updateData.status = body.status
    }

    if (body.admin_memo !== undefined) {
      updateData.admin_memo = body.admin_memo
    }

    if (body.status === 'replied') {
      updateData.replied_at = new Date().toISOString()
      updateData.replied_by = user.id
    }

    // --- 4. 문의 수정 ---
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('inquiries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[inquiries/PUT] Supabase update error:', error)

      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: '해당 문의를 찾을 수 없습니다.' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: '문의 수정 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ inquiry: data })
  } catch (err) {
    console.error('[inquiries/PUT] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
