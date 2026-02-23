import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/auth'
import { getAdminProfile } from '@/lib/supabase/admin'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/

/**
 * 하위카테고리 수정 API (관리자용)
 *
 * PUT /api/subcategories/:id
 *
 * Body: { name_ko?, name_en?, name_zh?, name_vi?, slug?, sort_order?, is_active? }
 * 주의: parent_category는 수정 불가 (연관 제품 정합성 보호)
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
    if (!adminProfile || !['super_admin', 'marketing'].includes(adminProfile.role)) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    // --- 2. 파라미터 및 바디 추출 ---
    const { id } = await params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: '유효하지 않은 하위카테고리 ID입니다.' },
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

    // 수정 불가 필드 제거
    delete body.id
    delete body.parent_category
    delete body.created_at

    // --- 3. 유효성 검증 ---
    if (body.slug !== undefined && !SLUG_REGEX.test(body.slug)) {
      return NextResponse.json(
        { error: '슬러그는 영문 소문자, 숫자, 하이픈만 사용 가능합니다.' },
        { status: 400 }
      )
    }

    if (body.name_ko !== undefined && !body.name_ko.trim()) {
      return NextResponse.json(
        { error: '이름(한국어)은 비어있을 수 없습니다.' },
        { status: 400 }
      )
    }

    // --- 4. 수정 ---
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('product_subcategories')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[subcategories/PUT] Supabase update error:', error)

      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: '해당 하위카테고리를 찾을 수 없습니다.' },
          { status: 404 }
        )
      }

      if (error.code === '23505') {
        return NextResponse.json(
          { error: '동일한 상위 카테고리 내에 이미 동일한 슬러그가 존재합니다.' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: '하위카테고리 수정 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ subcategory: data })
  } catch (err) {
    console.error('[subcategories/PUT] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * 하위카테고리 삭제 API (총괄 관리자 전용)
 *
 * DELETE /api/subcategories/:id
 *
 * 주의: super_admin만 삭제 가능 (RLS + API 이중 검증)
 * DB ON DELETE SET NULL로 연관 제품의 subcategory_id 자동 NULL 처리
 */
export async function DELETE(
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
    if (!adminProfile || adminProfile.role !== 'super_admin') {
      return NextResponse.json(
        { error: '총괄 관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    // --- 2. 파라미터 추출 ---
    const { id } = await params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: '유효하지 않은 하위카테고리 ID입니다.' },
        { status: 400 }
      )
    }

    // --- 3. 삭제 ---
    const supabase = await createClient()

    const { error } = await supabase
      .from('product_subcategories')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[subcategories/DELETE] Supabase delete error:', error)
      return NextResponse.json(
        { error: '하위카테고리 삭제 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: '하위카테고리가 삭제되었습니다.' })
  } catch (err) {
    console.error('[subcategories/DELETE] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
