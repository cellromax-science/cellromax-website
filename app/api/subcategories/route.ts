import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/auth'
import { getAdminProfile } from '@/lib/supabase/admin'

const VALID_CATEGORIES = [
  'health_functional',
  'general_food',
  'cosmetic',
  'medicine',
  'nutra_pet',
  'other',
] as const

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/

/**
 * 하위카테고리 조회 API
 *
 * GET /api/subcategories?category=health_functional&include_inactive=true&include_count=true
 *
 * Query Parameters:
 *   - category (선택): ProductCategory 값으로 필터링. 없으면 전체 반환.
 *   - include_inactive (선택): true이면 비활성 포함 (관리자 인증 필요)
 *   - include_count (선택): true이면 연관 제품 수 포함
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const category = searchParams.get('category')
    const includeInactive = searchParams.get('include_inactive') === 'true'
    const includeCount = searchParams.get('include_count') === 'true'

    const supabase = await createClient()

    // 관리자 인증 확인 (include_inactive 또는 include_count 요청 시)
    let isAdmin = false
    if (includeInactive || includeCount) {
      const user = await getUser()
      if (user) {
        const profile = await getAdminProfile(user.id)
        if (profile) isAdmin = true
      }
    }

    // 기본 쿼리: 하위카테고리 조회
    let query = supabase
      .from('product_subcategories')
      .select('*')
      .order('parent_category', { ascending: true })
      .order('sort_order', { ascending: true })

    // 비활성 포함 여부 (관리자만)
    if (!(includeInactive && isAdmin)) {
      query = query.eq('is_active', true)
    }

    if (category) {
      query = query.eq('parent_category', category)
    }

    const { data: subcategories, error } = await query

    if (error) {
      console.error('[subcategories/GET] Supabase query error:', error)
      return NextResponse.json(
        { error: '하위카테고리 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    let result = subcategories ?? []

    // 연관 제품 수 포함 시 별도 집계
    if (includeCount && isAdmin && result.length > 0) {
      const ids = result.map((sc) => sc.id)
      const { data: counts } = await supabase
        .from('products')
        .select('subcategory_id')
        .in('subcategory_id', ids)

      const countMap: Record<string, number> = {}
      for (const row of counts ?? []) {
        if (row.subcategory_id) {
          countMap[row.subcategory_id] = (countMap[row.subcategory_id] ?? 0) + 1
        }
      }

      return NextResponse.json({
        subcategories: result.map((sc) => ({
          ...sc,
          product_count: countMap[sc.id] ?? 0,
        })),
      })
    }

    return NextResponse.json({ subcategories: result })
  } catch (err) {
    console.error('[subcategories/GET] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * 하위카테고리 등록 API (관리자용)
 *
 * POST /api/subcategories
 *
 * Body: { parent_category, slug, name_ko, name_en?, name_zh?, name_vi?, sort_order?, is_active? }
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
    if (!adminProfile || !['super_admin', 'marketing'].includes(adminProfile.role)) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    // --- 2. 요청 바디 파싱 ---
    const body = await request.json()
    const { parent_category, slug, name_ko, name_en, name_zh, name_vi, sort_order, is_active } = body

    // --- 3. 유효성 검증 ---
    if (!parent_category || !slug || !name_ko) {
      return NextResponse.json(
        { error: 'parent_category, slug, name_ko는 필수 항목입니다.' },
        { status: 400 }
      )
    }

    if (!VALID_CATEGORIES.includes(parent_category)) {
      return NextResponse.json(
        { error: '유효하지 않은 상위 카테고리입니다.' },
        { status: 400 }
      )
    }

    if (!SLUG_REGEX.test(slug)) {
      return NextResponse.json(
        { error: '슬러그는 영문 소문자, 숫자, 하이픈만 사용 가능합니다.' },
        { status: 400 }
      )
    }

    // --- 4. sort_order 자동 설정 ---
    const supabase = await createClient()
    let finalSortOrder = sort_order

    if (finalSortOrder == null) {
      const { data: maxRow } = await supabase
        .from('product_subcategories')
        .select('sort_order')
        .eq('parent_category', parent_category)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single()

      finalSortOrder = (maxRow?.sort_order ?? 0) + 1
    }

    // --- 5. 등록 ---
    const { data, error } = await supabase
      .from('product_subcategories')
      .insert({
        parent_category,
        slug,
        name_ko,
        name_en: name_en || null,
        name_zh: name_zh || null,
        name_vi: name_vi || null,
        sort_order: finalSortOrder,
        is_active: is_active ?? true,
      })
      .select()
      .single()

    if (error) {
      console.error('[subcategories/POST] Supabase insert error:', error)

      if (error.code === '23505') {
        return NextResponse.json(
          { error: '동일한 상위 카테고리 내에 이미 동일한 슬러그가 존재합니다.' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: '하위카테고리 등록 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ subcategory: data }, { status: 201 })
  } catch (err) {
    console.error('[subcategories/POST] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
