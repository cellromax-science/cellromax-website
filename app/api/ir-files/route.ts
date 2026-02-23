import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/auth'
import { getAdminProfile } from '@/lib/supabase/admin'
import type { IrFileInsert } from '@/types/ir'

/**
 * IR 파일 목록 조회 API (관리자용)
 *
 * GET /api/ir-files?search=검색어&category=announcement&page=1&limit=20
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
    const category = searchParams.get('category')
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))

    // --- 3. Supabase 쿼리 구성 ---
    const supabase = await createClient()

    let query = supabase
      .from('ir_files')
      .select('*', { count: 'exact' })

    if (search) {
      query = query.ilike('title', `%${search}%`)
    }

    if (category) {
      query = query.eq('category', category)
    }

    // --- 4. 정렬 및 페이지네이션 ---
    const from = (page - 1) * limit
    const to = from + limit - 1

    query = query
      .order('published_at', { ascending: false })
      .range(from, to)

    const { data: irFiles, count, error } = await query

    if (error) {
      console.error('[ir-files/GET] Supabase query error:', error)
      return NextResponse.json(
        { error: 'IR 파일 목록 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      irFiles: irFiles ?? [],
      total: count ?? 0,
      page,
      limit,
    })
  } catch (err) {
    console.error('[ir-files/GET] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * IR 파일 등록 API (관리자용)
 *
 * POST /api/ir-files
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
    const body: IrFileInsert = await request.json()

    if (!body.title || !body.category || !body.file_url || !body.published_at) {
      return NextResponse.json(
        { error: 'title, category, file_url, published_at은 필수 항목입니다.' },
        { status: 400 }
      )
    }

    // --- 3. IR 파일 등록 ---
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('ir_files')
      .insert({
        ...body,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('[ir-files/POST] Supabase insert error:', error)
      return NextResponse.json(
        { error: 'IR 파일 등록 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ irFile: data }, { status: 201 })
  } catch (err) {
    console.error('[ir-files/POST] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
