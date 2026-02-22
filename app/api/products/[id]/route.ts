import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/auth'
import { getAdminProfile } from '@/lib/supabase/admin'

/**
 * 제품 수정 API (관리자용)
 *
 * PUT /api/products/:id
 *
 * Body: 수정할 필드들 (Partial<ProductInsert>)
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

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: '유효하지 않은 제품 ID입니다.' },
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

    // created_by, id, created_at 등 수정 불가 필드 제거
    delete body.id
    delete body.created_by
    delete body.created_at

    // --- 3. 제품 수정 ---
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('products')
      .update(body)
      .eq('id', id)
      .select('*, product_subcategories(*)')
      .single()

    if (error) {
      console.error('[products/PUT] Supabase update error:', error)

      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: '해당 제품을 찾을 수 없습니다.' },
          { status: 404 }
        )
      }

      if (error.code === '23505') {
        return NextResponse.json(
          { error: '이미 동일한 slug가 존재합니다.' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: '제품 수정 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ product: data })
  } catch (err) {
    console.error('[products/PUT] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * 제품 삭제 API (관리자용)
 *
 * DELETE /api/products/:id
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
    if (!adminProfile) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    // --- 2. 파라미터 추출 ---
    const { id } = await params

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: '유효하지 않은 제품 ID입니다.' },
        { status: 400 }
      )
    }

    // --- 3. 제품 삭제 ---
    const supabase = await createClient()

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[products/DELETE] Supabase delete error:', error)
      return NextResponse.json(
        { error: '제품 삭제 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: '제품이 삭제되었습니다.' })
  } catch (err) {
    console.error('[products/DELETE] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
