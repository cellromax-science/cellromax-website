import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * 하위카테고리 조회 API
 *
 * GET /api/subcategories?category=health_functional
 *
 * Query Parameters:
 *   - category (선택): ProductCategory 값으로 필터링. 없으면 전체 반환.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const category = searchParams.get('category')

    const supabase = await createClient()

    let query = supabase
      .from('product_subcategories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

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

    return NextResponse.json({ subcategories: subcategories ?? [] })
  } catch (err) {
    console.error('[subcategories/GET] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
