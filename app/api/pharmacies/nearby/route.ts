import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAX_NEARBY_RESULTS = 50

/**
 * 주변 약국 검색 API
 *
 * GET /api/pharmacies/nearby?lat=37.5665&lng=126.9780&radius=3
 *
 * Query Parameters:
 *   - lat (필수): 위도 (-90 ~ 90)
 *   - lng (필수): 경도 (-180 ~ 180)
 *   - radius (선택): 검색 반경 km (0.5 ~ 10, 기본값 3)
 */

interface NearbyPharmacy {
  id: string
  name: string
  address: string
  phone: string | null
  latitude: number
  longitude: number
  distance_km: number
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  // --- 1. 파라미터 추출 ---
  const latParam = searchParams.get('lat')
  const lngParam = searchParams.get('lng')
  const radiusParam = searchParams.get('radius')

  // --- 2. 필수 파라미터 검증 ---
  if (!latParam || !lngParam) {
    return NextResponse.json(
      { error: 'lat과 lng 파라미터는 필수입니다.' },
      { status: 400 }
    )
  }

  const lat = parseFloat(latParam)
  const lng = parseFloat(lngParam)

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: 'lat과 lng는 유효한 숫자여야 합니다.' },
      { status: 400 }
    )
  }

  // --- 3. 범위 검증 ---
  if (lat < -90 || lat > 90) {
    return NextResponse.json(
      { error: 'lat은 -90에서 90 사이의 값이어야 합니다.' },
      { status: 400 }
    )
  }

  if (lng < -180 || lng > 180) {
    return NextResponse.json(
      { error: 'lng는 -180에서 180 사이의 값이어야 합니다.' },
      { status: 400 }
    )
  }

  // --- 4. radius 클램프 (0.5 ~ 10km, 기본값 3) ---
  let radius = 3
  if (radiusParam) {
    const parsed = parseFloat(radiusParam)
    if (!isNaN(parsed)) {
      radius = Math.min(10, Math.max(0.5, parsed))
    }
  }

  // --- 5. Supabase RPC 호출 ---
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('get_nearby_pharmacies', {
      user_lat: lat,
      user_lng: lng,
      radius_km: radius,
      result_limit: MAX_NEARBY_RESULTS,
    })

    if (error) {
      console.error('[nearby-pharmacies] Supabase RPC error:', error)
      return NextResponse.json(
        { error: '약국 검색 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    const pharmacies: NearbyPharmacy[] = data ?? []

    return NextResponse.json({ pharmacies })
  } catch (err) {
    console.error('[nearby-pharmacies] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
