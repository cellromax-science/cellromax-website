import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/auth'
import { checkAdminRole } from '@/lib/supabase/admin'

/**
 * 약국 CSV 일괄 등록 API (관리자용)
 *
 * POST /api/pharmacies/upload
 *
 * Body (JSON):
 *   - pharmacies: Array<{ name, address, address_detail?, city?, district?, phone?, latitude, longitude }>
 */

interface PharmacyInput {
  name: string
  address: string
  address_detail?: string
  city?: string
  district?: string
  phone?: string
  latitude: number
  longitude: number
}

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

    const { authorized } = await checkAdminRole(user.id, ['super_admin', 'marketing'])
    if (!authorized) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    // --- 2. 요청 바디 파싱 ---
    const body = await request.json()
    const pharmacies: PharmacyInput[] = body.pharmacies

    if (!Array.isArray(pharmacies) || pharmacies.length === 0) {
      return NextResponse.json(
        { error: '등록할 약국 데이터가 없습니다.' },
        { status: 400 }
      )
    }

    // --- 3. 필수 필드 검증 ---
    for (let i = 0; i < pharmacies.length; i++) {
      const p = pharmacies[i]
      if (!p.name || !p.address || p.latitude == null || p.longitude == null) {
        return NextResponse.json(
          { error: `${i + 1}번째 약국 데이터에 필수 항목(name, address, latitude, longitude)이 누락되었습니다.` },
          { status: 400 }
        )
      }
    }

    // --- 4. 일괄 등록 ---
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('pharmacies')
      .insert(pharmacies)
      .select()

    if (error) {
      console.error('[pharmacies/upload/POST] Supabase insert error:', error)
      return NextResponse.json(
        { error: '약국 일괄 등록 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        inserted: data?.length ?? 0,
        total: pharmacies.length,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('[pharmacies/upload/POST] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
