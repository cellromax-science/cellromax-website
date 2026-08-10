import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_PRODUCT_LIST_SELECT } from '@/lib/products'
import { buildSearchTagFilter } from '@/lib/product-search'
import { getUser } from '@/lib/supabase/auth'
import { getAdminProfile } from '@/lib/supabase/admin'
import { assertSameOrigin } from '@/lib/security/csrf'
import type { ProductInsert } from '@/types/product'

export async function GET(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const adminProfile = await getAdminProfile(user.id)
    if (!adminProfile) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))

    const supabase = await createClient()

    let query = supabase
      .from('products')
      .select(ADMIN_PRODUCT_LIST_SELECT)

    if (search) {
      const searchFilters = [
        `name_ko.ilike.%${search}%`,
        `name_en.ilike.%${search}%`,
        `name_zh.ilike.%${search}%`,
        `name_vi.ilike.%${search}%`,
        `ingredients_ko.ilike.%${search}%`,
      ]
      const searchTagFilter = buildSearchTagFilter(search)
      if (searchTagFilter) {
        searchFilters.push(searchTagFilter)
      }

      query = query.or(searchFilters.join(','))
    }

    if (category) {
      query = query.eq('category', category)
    }

    const from = (page - 1) * limit
    const to = from + limit

    if (category) {
      query = query
        .order('category_sort_order', { ascending: true })
        .order('created_at', { ascending: false })
        .range(from, to)
    } else {
      query = query
        .order('created_at', { ascending: false })
        .range(from, to)
    }

    const { data: products, error } = await query

    if (error) {
      console.error('[products/GET] Supabase query error:', error)
      return NextResponse.json(
        { error: '제품 목록 조회 중 오류가 발생했습니다.' },
        { status: 500 },
      )
    }

    const items = (products ?? []).slice(0, limit)
    const hasMore = (products?.length ?? 0) > limit

    return NextResponse.json({
      products: items,
      total: from + items.length + (hasMore ? 1 : 0),
      hasMore,
      page,
      limit,
    })
  } catch (err) {
    console.error('[products/GET] Unexpected error:', err)
    return NextResponse.json(
      { error: '예상치 못한 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const csrfError = assertSameOrigin(request)
    if (csrfError) {
      return csrfError
    }

    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const adminProfile = await getAdminProfile(user.id)
    if (!adminProfile) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const body: ProductInsert = await request.json()

    if (!body.name_ko || !body.slug || !body.category) {
      return NextResponse.json(
        { error: 'name_ko, slug, category는 필수 항목입니다.' },
        { status: 400 },
      )
    }

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
          { error: '이미 사용 중인 slug입니다.' },
          { status: 409 },
        )
      }

      return NextResponse.json(
        { error: '제품 등록 중 오류가 발생했습니다.' },
        { status: 500 },
      )
    }

    return NextResponse.json({ product: data }, { status: 201 })
  } catch (err) {
    console.error('[products/POST] Unexpected error:', err)
    return NextResponse.json(
      { error: '예상치 못한 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}
