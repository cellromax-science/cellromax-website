import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/auth'
import { checkAdminRole, createAdminClient } from '@/lib/supabase/admin'
import { assertSameOrigin } from '@/lib/security/csrf'

/**
 * 이벤트 구매 인증 파일 열람 URL 발급 API (관리자 전용)
 *
 * POST /api/events/file-urls
 * Request JSON: { paths: string[] }   (event-uploads 버킷 내 경로, 최대 20개)
 * Response JSON: { urls: [{ path, url }] }
 *
 * event-uploads 는 비공개 버킷이므로 관리자 페이지는 단기(10분) 서명 URL로만
 * 파일을 열람한다. 마케팅/총괄 관리자만 호출 가능.
 */

const BUCKET = 'event-uploads'
const MAX_PATHS = 20
const PATH_PATTERN = /^[\w-]+\/[\w.-]+$/

export async function POST(request: NextRequest) {
  const csrfError = assertSameOrigin(request)
  if (csrfError) return csrfError

  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { authorized } = await checkAdminRole(user.id, 'marketing')
    if (!authorized) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    let body: { paths?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: '잘못된 요청 형식입니다.' },
        { status: 400 }
      )
    }

    const paths = Array.isArray(body.paths) ? body.paths : null
    if (!paths || paths.length < 1 || paths.length > MAX_PATHS) {
      return NextResponse.json(
        { error: '파일 경로가 올바르지 않습니다.' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    const urls: { path: string; url: string }[] = []

    for (const p of paths) {
      if (typeof p !== 'string' || !PATH_PATTERN.test(p)) {
        return NextResponse.json(
          { error: '파일 경로가 올바르지 않습니다.' },
          { status: 400 }
        )
      }
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(p, 600)

      if (error || !data) {
        console.error('[events/file-urls] sign error:', p, error)
        return NextResponse.json(
          { error: '파일 열람 URL 생성에 실패했습니다.' },
          { status: 500 }
        )
      }
      urls.push({ path: p, url: data.signedUrl })
    }

    return NextResponse.json({ urls }, { status: 200 })
  } catch (err) {
    console.error('[events/file-urls] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
