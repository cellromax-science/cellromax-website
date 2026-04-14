import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/auth'
import { getAdminProfile } from '@/lib/supabase/admin'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/
const ADMIN_ROLES = ['super_admin', 'marketing']

type RelatedProductPayload = {
  id: string
  category_sort_order: number
}

async function requireAdmin() {
  const user = await getUser()
  if (!user) {
    return {
      error: NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      ),
    }
  }

  const adminProfile = await getAdminProfile(user.id)
  if (!adminProfile || !ADMIN_ROLES.includes(adminProfile.role)) {
    return {
      error: NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      ),
    }
  }

  return { user, adminProfile }
}

function normalizeRelatedProducts(
  rawValue: unknown
): RelatedProductPayload[] | NextResponse | undefined {
  if (rawValue === undefined) return undefined

  if (!Array.isArray(rawValue)) {
    return NextResponse.json(
      { error: '연관 제품 순서 데이터 형식이 올바르지 않습니다.' },
      { status: 400 }
    )
  }

  const seenProductIds = new Set<string>()
  const normalized: RelatedProductPayload[] = []

  for (const product of rawValue) {
    if (
      !product ||
      typeof product !== 'object' ||
      !('id' in product) ||
      !('category_sort_order' in product)
    ) {
      return NextResponse.json(
        { error: '연관 제품 순서 값이 올바르지 않습니다.' },
        { status: 400 }
      )
    }

    const productId = String(product.id)
    const sortOrder = Number(product.category_sort_order)

    if (
      !UUID_REGEX.test(productId) ||
      !Number.isInteger(sortOrder) ||
      sortOrder < 0
    ) {
      return NextResponse.json(
        { error: '연관 제품 순서 값이 올바르지 않습니다.' },
        { status: 400 }
      )
    }

    if (seenProductIds.has(productId)) {
      return NextResponse.json(
        { error: '중복된 연관 제품이 포함되어 있습니다.' },
        { status: 400 }
      )
    }

    seenProductIds.add(productId)
    normalized.push({
      id: productId,
      category_sort_order: sortOrder,
    })
  }

  return normalized
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { id } = await params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: '유효하지 않은 하위카테고리 ID입니다.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const [
      { data: subcategory, error: subcategoryError },
      { data: relatedProducts, error: relatedProductsError },
    ] = await Promise.all([
      supabase
        .from('product_subcategories')
        .select('*')
        .eq('id', id)
        .single(),
      supabase
        .from('products')
        .select('id, slug, name_ko, thumbnail_url, is_active, category_sort_order')
        .eq('subcategory_id', id)
        .order('category_sort_order', { ascending: true })
        .order('name_ko', { ascending: true }),
    ])

    if (subcategoryError) {
      console.error('[subcategories/GET] Supabase subcategory error:', subcategoryError)

      if (subcategoryError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '해당 하위카테고리를 찾을 수 없습니다.' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: '하위카테고리 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    if (relatedProductsError) {
      console.error('[subcategories/GET] Supabase related products error:', relatedProductsError)
      return NextResponse.json(
        { error: '연관 제품 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      subcategory,
      related_products: relatedProducts ?? [],
    })
  } catch (err) {
    console.error('[subcategories/GET] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

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

    const normalizedRelatedProducts = normalizeRelatedProducts(body.related_products)
    if (normalizedRelatedProducts instanceof NextResponse) {
      return normalizedRelatedProducts
    }

    delete body.id
    delete body.parent_category
    delete body.created_at
    delete body.related_products

    if (body.slug !== undefined && !SLUG_REGEX.test(body.slug)) {
      return NextResponse.json(
        { error: '슬러그는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.' },
        { status: 400 }
      )
    }

    if (body.name_ko !== undefined && !String(body.name_ko).trim()) {
      return NextResponse.json(
        { error: '이름(국문)은 비워둘 수 없습니다.' },
        { status: 400 }
      )
    }

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
          { error: '동일한 상위 카테고리에 이미 같은 슬러그가 존재합니다.' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: '하위카테고리 수정 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    if (normalizedRelatedProducts && normalizedRelatedProducts.length > 0) {
      const { data: matchingProducts, error: matchingProductsError } = await supabase
        .from('products')
        .select('id')
        .eq('subcategory_id', id)
        .in(
          'id',
          normalizedRelatedProducts.map((product) => product.id)
        )

      if (matchingProductsError) {
        console.error('[subcategories/PUT] Related products validation error:', matchingProductsError)
        return NextResponse.json(
          { error: '연관 제품 확인 중 오류가 발생했습니다.' },
          { status: 500 }
        )
      }

      if ((matchingProducts?.length ?? 0) !== normalizedRelatedProducts.length) {
        return NextResponse.json(
          { error: '선택한 연관 제품 중 현재 하위카테고리에 속하지 않는 항목이 있습니다.' },
          { status: 400 }
        )
      }

      const updateResults = await Promise.all(
        normalizedRelatedProducts.map((product) =>
          supabase
            .from('products')
            .update({ category_sort_order: product.category_sort_order })
            .eq('id', product.id)
            .eq('subcategory_id', id)
        )
      )

      const updateError = updateResults.find((result) => result.error)?.error
      if (updateError) {
        console.error('[subcategories/PUT] Related products update error:', updateError)
        return NextResponse.json(
          { error: '연관 제품 순서 저장 중 오류가 발생했습니다.' },
          { status: 500 }
        )
      }
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
        { error: '최고 관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    const { id } = await params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: '유효하지 않은 하위카테고리 ID입니다.' },
        { status: 400 }
      )
    }

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
