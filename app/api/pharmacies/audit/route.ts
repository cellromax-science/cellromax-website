import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/auth'
import { checkAdminRole } from '@/lib/supabase/admin'

/**
 * 약국 좌표 검증 API (관리자용)
 *
 * GET  /api/pharmacies/audit
 *   활성 약국 전체의 id/name/address/latitude/longitude를 반환한다.
 *   관리자 화면에서 카카오 지오코딩으로 좌표를 재검증할 때 사용.
 *
 * PATCH /api/pharmacies/audit
 *   Body: { updates: Array<{ id, latitude, longitude }> } (최대 100건)
 *   검증에서 어긋난 약국들의 좌표를 일괄 정정한다.
 */

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const MAX_UPDATES_PER_REQUEST = 100

// 대한민국 좌표 범위 — 명백히 잘못된 값 유입 차단
const KOREA_LAT = { min: 33, max: 39 }
const KOREA_LNG = { min: 124, max: 132 }

async function requireAdmin() {
  const user = await getUser()
  if (!user) {
    return { error: NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 }) }
  }
  const { authorized } = await checkAdminRole(user.id, ['super_admin', 'marketing'])
  if (!authorized) {
    return { error: NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 }) }
  }
  return { error: null }
}

export async function GET() {
  try {
    const { error: authError } = await requireAdmin()
    if (authError) return authError

    const supabase = await createClient()

    // Supabase는 요청당 최대 1,000행이므로 range로 전체를 수집한다
    const PAGE = 1000
    const pharmacies: unknown[] = []
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from('pharmacies')
        .select('id, name, address, latitude, longitude')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .range(from, from + PAGE - 1)

      if (error) {
        console.error('[pharmacies/audit/GET] Supabase query error:', error)
        return NextResponse.json(
          { error: '약국 목록 조회 중 오류가 발생했습니다.' },
          { status: 500 }
        )
      }

      pharmacies.push(...(data ?? []))
      if (!data || data.length < PAGE) break
    }

    return NextResponse.json({ pharmacies, total: pharmacies.length })
  } catch (err) {
    console.error('[pharmacies/audit/GET] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

interface CoordUpdate {
  id: string
  latitude: number
  longitude: number
}

export async function PATCH(request: NextRequest) {
  try {
    const { error: authError } = await requireAdmin()
    if (authError) return authError

    const body = await request.json()
    const updates: CoordUpdate[] = body.updates

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: '정정할 좌표 데이터가 없습니다.' },
        { status: 400 }
      )
    }

    if (updates.length > MAX_UPDATES_PER_REQUEST) {
      return NextResponse.json(
        { error: `한 번에 최대 ${MAX_UPDATES_PER_REQUEST}건까지 정정할 수 있습니다.` },
        { status: 400 }
      )
    }

    for (let i = 0; i < updates.length; i++) {
      const u = updates[i]
      const latOk =
        typeof u.latitude === 'number' &&
        u.latitude >= KOREA_LAT.min &&
        u.latitude <= KOREA_LAT.max
      const lngOk =
        typeof u.longitude === 'number' &&
        u.longitude >= KOREA_LNG.min &&
        u.longitude <= KOREA_LNG.max
      if (!u.id || !uuidRegex.test(u.id) || !latOk || !lngOk) {
        return NextResponse.json(
          { error: `${i + 1}번째 항목의 id 또는 좌표가 유효하지 않습니다.` },
          { status: 400 }
        )
      }
    }

    const supabase = await createClient()

    const results = await Promise.all(
      updates.map((u) =>
        supabase
          .from('pharmacies')
          .update({ latitude: u.latitude, longitude: u.longitude })
          .eq('id', u.id)
      )
    )

    const failed = results.filter((r) => r.error).length
    if (failed > 0) {
      console.error(`[pharmacies/audit/PATCH] ${failed}/${updates.length} updates failed`)
      return NextResponse.json(
        { error: `${failed}건의 좌표 정정에 실패했습니다.`, updated: updates.length - failed },
        { status: 500 }
      )
    }

    return NextResponse.json({ updated: updates.length })
  } catch (err) {
    console.error('[pharmacies/audit/PATCH] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
