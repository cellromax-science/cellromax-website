import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/auth'
import { getAdminProfile, createAdminClient } from '@/lib/supabase/admin'

/**
 * 이벤트 참여 개인정보 파기 API (총괄 관리자 전용)
 *
 * POST /api/events/destroy
 * Request JSON: { eventTitle: string }
 * Response JSON (200): { destroyedCount: number }
 *
 * DB 함수 destroy_event_entries() 가 파기(DELETE)와 파기 이력
 * (event_destruction_logs INSERT)을 하나의 트랜잭션으로 수행하므로,
 * 이력 없이 데이터가 삭제되는 경우는 없다. 복구 불가능한 영구 삭제.
 */

export async function POST(request: NextRequest) {
  try {
    // --- 1. 인증·권한 확인 (파기는 총괄 관리자만) ---
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const profile = await getAdminProfile(user.id)
    if (!profile || profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: '개인정보 파기는 총괄 관리자만 실행할 수 있습니다.' },
        { status: 403 }
      )
    }

    // --- 2. 요청 파싱 ---
    let body: { eventTitle?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: '잘못된 요청 형식입니다.' },
        { status: 400 }
      )
    }

    const eventTitle =
      typeof body.eventTitle === 'string' ? body.eventTitle.trim() : ''
    if (!eventTitle) {
      return NextResponse.json(
        { error: '파기할 이벤트 명을 입력해 주세요.' },
        { status: 400 }
      )
    }

    // --- 3. 파기 실행 (삭제 + 이력 기록, 단일 트랜잭션) ---
    const supabase = createAdminClient()

    const { data: destroyedCount, error } = await supabase.rpc(
      'destroy_event_entries',
      {
        p_event_title: eventTitle,
        p_destroyed_by: user.id,
        p_destroyed_by_name: profile.name,
      }
    )

    if (error) {
      console.error('[events/destroy] rpc error:', error)
      return NextResponse.json(
        { error: '파기 처리 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    if (!destroyedCount) {
      return NextResponse.json(
        { error: `'${eventTitle}' 이벤트의 참여 데이터가 없습니다. 이벤트 명을 확인해 주세요.` },
        { status: 404 }
      )
    }

    return NextResponse.json({ destroyedCount }, { status: 200 })
  } catch (err) {
    console.error('[events/destroy] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
