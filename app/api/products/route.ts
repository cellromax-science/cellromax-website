import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_PRODUCT_LIST_SELECT } from '@/lib/products'
import { getUser } from '@/lib/supabase/auth'
import { getAdminProfile } from '@/lib/supabase/admin'
import type { ProductInsert } from '@/types/product'

/**
 * 제품 목록 조회 API (관리자용)
 *
 * GET /api/products?search=검색어&category=health_functional&page=1&limit=20
 *
 * Query Parameters:
 *   - search (선택): 제품명 검색어 (name_ko 기준 ILIKE)
 *   - category (선택): 카테고리 필터
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
    const category = searchParams.get('category')
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))

    // --- 3. Supabase 쿼리 구성 ---
    const supabase = await createClient()

    let query = supabase
      .from('products')
      .select(ADMIN_PRODUCT_LIST_SELECT, { count: 'exact' })

    if (search) {
      query = query.ilike('name_ko', `%${search}%`)
    }

    if (category) {
      query = query.eq('category', category)
    }

    // --- 4. 정렬 및 페이지네이션 ---
    const from = (page - 1) * limit
    const to = from + limit - 1

    query = query
      .order('price', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to)

    const { data: products, count, error } = await query

    if (error) {
      console.error('[products/GET] Supabase query error:', error)
      return NextResponse.json(
        { error: '제품 목록 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      products: products ?? [],
      total: count ?? 0,
      page,
      limit,
    })
  } catch (err) {
    console.error('[products/GET] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * 제품 등록 API (관리자용)
 *
 * POST /api/products
 *
 * Body: ProductInsert
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
    const body: ProductInsert = await request.json()

    if (!body.name_ko || !body.slug || !body.category) {
      return NextResponse.json(
        { error: 'name_ko, slug, category는 필수 항목입니다.' },
        { status: 400 }
      )
    }

    // --- 3. 제품 등록 ---
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('products')
      .insert({
        ...body,
        created_by: user.id,
      })
      .select('*, product_subcategories(*)')
      .single()

    if (error) {
      console.error('[products/POST] Supabase insert error:', error)

      if (error.code === '23505') {
        return NextResponse.json(
          { error: '이미 동일한 slug가 존재합니다.' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: '제품 등록 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ product: data }, { status: 201 })
  } catch (err) {
    console.error('[products/POST] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
