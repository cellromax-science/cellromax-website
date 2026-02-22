import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/auth'
import { getAdminProfile } from '@/lib/supabase/admin'
import type { PostInsert } from '@/types/newsroom'

/**
 * 게시글 목록 조회 API (관리자용)
 *
 * GET /api/posts?search=검색어&post_type=notice&page=1&limit=20
 *
 * Query Parameters:
 *   - search (선택): 제목 검색어 (title_ko 기준 ILIKE)
 *   - post_type (선택): 게시글 타입 필터 (notice, news, video)
 *   - page (선택): 페이지 번호 (기본값 1)
 *   - limit (선택): 페이지당 항목 수 (기본값 20)
 */
export async function GET(request: NextRequest) {
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
    const { searchParams } = request.nextUrl
    const search = searchParams.get('search')
    const postType = searchParams.get('post_type')
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))

    // --- 3. Supabase 쿼리 구성 ---
    const supabase = await createClient()

    let query = supabase
      .from('posts')
      .select('*', { count: 'exact' })

    if (search) {
      query = query.ilike('title_ko', `%${search}%`)
    }

    if (postType) {
      query = query.eq('post_type', postType)
    }

    // --- 4. 정렬 및 페이지네이션 ---
    const from = (page - 1) * limit
    const to = from + limit - 1

    query = query
      .order('is_pinned', { ascending: false })
      .order('published_at', { ascending: false })
      .range(from, to)

    const { data: posts, count, error } = await query

    if (error) {
      console.error('[posts/GET] Supabase query error:', error)
      return NextResponse.json(
        { error: '게시글 목록 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      posts: posts ?? [],
      total: count ?? 0,
      page,
      limit,
    })
  } catch (err) {
    console.error('[posts/GET] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * 게시글 등록 API (관리자용)
 *
 * POST /api/posts
 *
 * Body: PostInsert
 */
export async function POST(request: NextRequest) {
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

    // --- 2. 요청 바디 파싱 ---
    const body: PostInsert = await request.json()

    if (!body.post_type || !body.title_ko) {
      return NextResponse.json(
        { error: 'post_type, title_ko는 필수 항목입니다.' },
        { status: 400 }
      )
    }

    if (body.post_type === 'video' && !body.youtube_id) {
      return NextResponse.json(
        { error: '영상 타입 게시글에는 youtube_id가 필수입니다.' },
        { status: 400 }
      )
    }

    // --- 3. 게시글 등록 ---
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('posts')
      .insert({
        ...body,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('[posts/POST] Supabase insert error:', error)
      return NextResponse.json(
        { error: '게시글 등록 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ post: data }, { status: 201 })
  } catch (err) {
    console.error('[posts/POST] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
