import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * 약국 텍스트 검색 API (공개용)
 *
 * GET /api/pharmacies/search?q=검색어
 *
 * 약국명 또는 주소로 검색하여 최대 20개 결과를 반환합니다.
 */

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const query = searchParams.get('q')

  if (!query || !query.trim()) {
    return NextResponse.json(
      { error: '검색어를 입력해 주세요.' },
      { status: 400 }
    )
  }

  const keyword = query.trim()

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('pharmacies')
      .select('id, name, address, phone, latitude, longitude')
      .or(`name.ilike.%${keyword}%,address.ilike.%${keyword}%`)
      .limit(20)

    if (error) {
      console.error('[pharmacies/search] Supabase query error:', error)
      return NextResponse.json(
        { error: '약국 검색 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ pharmacies: data ?? [] })
  } catch (err) {
    console.error('[pharmacies/search] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
