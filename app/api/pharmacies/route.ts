import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/auth'
import { getAdminProfile } from '@/lib/supabase/admin'

/**
 * 약국 목록 조회 API (관리자용)
 *
 * GET /api/pharmacies?search=검색어&city=서울&page=1&limit=20
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
    const city = searchParams.get('city')
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))

    // --- 3. Supabase 쿼리 구성 ---
    const supabase = await createClient()

    let query = supabase
      .from('pharmacies')
      .select('*', { count: 'exact' })

    if (search) {
      query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%`)
    }

    if (city) {
      query = query.eq('city', city)
    }

    // --- 4. 정렬 및 페이지네이션 ---
    const from = (page - 1) * limit
    const to = from + limit - 1

    query = query
      .order('created_at', { ascending: false })
      .range(from, to)

    const { data: pharmacies, count, error } = await query

    if (error) {
      console.error('[pharmacies/GET] Supabase query error:', error)
      return NextResponse.json(
        { error: '약국 목록 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      pharmacies: pharmacies ?? [],
      total: count ?? 0,
      page,
      limit,
    })
  } catch (err) {
    console.error('[pharmacies/GET] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
