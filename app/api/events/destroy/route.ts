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
 *
 * 구매 인증 파일(event-uploads 버킷)이 있는 이벤트는 행 파기 후
 * 해당 이벤트 슬러그 폴더의 파일 전체(미제출 고아 파일 포함)를 삭제하고,
 * 삭제 건수를 파기 이력의 destroyed_file_count 에 기록한다.
 */

const UPLOAD_BUCKET = 'event-uploads'

/** 슬러그 폴더의 모든 객체 경로 나열 (1000개 단위 페이지네이션) */
async function listAllFiles(
  supabase: ReturnType<typeof createAdminClient>,
  slug: string
): Promise<string[]> {
  const paths: string[] = []
  const pageSize = 1000
  let offset = 0

  for (;;) {
    const { data, error } = await supabase.storage
      .from(UPLOAD_BUCKET)
      .list(slug, { limit: pageSize, offset })

    if (error) {
      console.error('[events/destroy] storage list error:', slug, error)
      break
    }
    if (!data || data.length === 0) break

    for (const obj of data) {
      if (obj.name) paths.push(`${slug}/${obj.name}`)
    }
    if (data.length < pageSize) break
    offset += pageSize
  }

  return paths
}

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

    // 파기 전에 파일이 있는 이벤트 슬러그를 파악해 둔다 (행 삭제 후에는 조회 불가)
    const { data: fileRows } = await supabase
      .from('event_entries')
      .select('event_slug')
      .eq('event_title', eventTitle)
      .not('file_paths', 'is', null)

    const fileSlugs = [...new Set((fileRows ?? []).map((r) => r.event_slug))]

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

    // --- 4. 구매 인증 파일 파기 (고아 파일 포함 슬러그 폴더 전체) ---
    let destroyedFileCount = 0
    for (const slug of fileSlugs) {
      const paths = await listAllFiles(supabase, slug)
      if (paths.length === 0) continue

      const { error: removeError } = await supabase.storage
        .from(UPLOAD_BUCKET)
        .remove(paths)

      if (removeError) {
        // 행은 이미 파기됨 — 파일 삭제 실패는 로그만 남기고 계속 진행
        console.error('[events/destroy] storage remove error:', slug, removeError)
        continue
      }
      destroyedFileCount += paths.length
    }

    // 방금 기록된 파기 이력에 파일 삭제 건수 반영
    if (destroyedFileCount > 0) {
      await supabase
        .from('event_destruction_logs')
        .update({ destroyed_file_count: destroyedFileCount })
        .eq('event_title', eventTitle)
        .is('destroyed_file_count', null)
        .gte('created_at', new Date(Date.now() - 60_000).toISOString())
    }

    return NextResponse.json({ destroyedCount, destroyedFileCount }, { status: 200 })
  } catch (err) {
    console.error('[events/destroy] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
