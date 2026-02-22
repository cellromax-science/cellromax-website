import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/auth'
import { getAdminProfile } from '@/lib/supabase/admin'

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * 게시글 단건 조회 API (관리자용)
 *
 * GET /api/posts/:id
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
        { error: '유효하지 않은 게시글 ID입니다.' },
        { status: 400 }
      )
    }

    // --- 3. 게시글 조회 ---
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('[posts/GET:id] Supabase query error:', error)

      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: '해당 게시글을 찾을 수 없습니다.' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: '게시글 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ post: data })
  } catch (err) {
    console.error('[posts/GET:id] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * 게시글 수정 API (관리자용)
 *
 * PUT /api/posts/:id
 *
 * Body: 수정할 필드들 (Partial<PostInsert>)
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
        { error: '유효하지 않은 게시글 ID입니다.' },
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

    // --- 3. 게시글 수정 ---
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('posts')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[posts/PUT] Supabase update error:', error)

      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: '해당 게시글을 찾을 수 없습니다.' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: '게시글 수정 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ post: data })
  } catch (err) {
    console.error('[posts/PUT] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * 게시글 삭제 API (관리자용)
 *
 * DELETE /api/posts/:id
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

    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: '유효하지 않은 게시글 ID입니다.' },
        { status: 400 }
      )
    }

    // --- 3. 게시글 삭제 ---
    const supabase = await createClient()

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[posts/DELETE] Supabase delete error:', error)
      return NextResponse.json(
        { error: '게시글 삭제 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: '게시글이 삭제되었습니다.' })
  } catch (err) {
    console.error('[posts/DELETE] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
