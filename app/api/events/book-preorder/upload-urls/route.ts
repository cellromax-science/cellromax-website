import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertSameOrigin } from '@/lib/security/csrf'
import {
  ALLOWED_FILES,
  EVENT_SLUG,
  MAX_FILES,
  MAX_FILE_SIZE,
  UPLOAD_BUCKET,
  eventClosed,
} from '../shared'

/**
 * 구매 인증 파일 업로드 URL 발급 API (공개)
 *
 * POST /api/events/book-preorder/upload-urls
 * Request JSON: { files: [{ name, type, size }] }  (1~5개)
 * Response JSON: { uploads: [{ path, url }] }
 *
 * Vercel 서버리스는 요청 본문이 4.5MB로 제한되어 파일(개당 최대 10MB)을
 * 서버로 직접 받을 수 없다. 대신 비공개 버킷(event-uploads)에 대한
 * 1회용 서명 업로드 URL을 발급하고, 브라우저가 스토리지로 직접 PUT 한다.
 * 실제 용량·MIME 제한은 버킷 설정(10MB, 이미지/PDF)이 최종 강제한다.
 */

export async function POST(request: NextRequest) {
  const csrfError = assertSameOrigin(request)
  if (csrfError) return csrfError

  try {
    if (eventClosed()) {
      return NextResponse.json(
        { error: '이벤트가 종료되었습니다.' },
        { status: 410 }
      )
    }

    let body: { files?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: '잘못된 요청 형식입니다.' },
        { status: 400 }
      )
    }

    const files = Array.isArray(body.files) ? body.files : null
    if (!files || files.length < 1 || files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `파일은 1개 이상 ${MAX_FILES}개 이하로 첨부해 주세요.` },
        { status: 400 }
      )
    }

    // 파일별 확장자·용량 검증 후 업로드 경로 확정
    const targets: { path: string }[] = []
    for (const f of files) {
      const name = typeof f?.name === 'string' ? f.name : ''
      const size = typeof f?.size === 'number' ? f.size : 0
      const ext = name.split('.').pop()?.toLowerCase() ?? ''

      if (!ALLOWED_FILES[ext]) {
        return NextResponse.json(
          { error: 'JPG, PNG, WEBP, HEIC, PDF 파일만 첨부할 수 있습니다.' },
          { status: 400 }
        )
      }
      if (size <= 0 || size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: '파일 1개당 최대 10MB까지 첨부할 수 있습니다.' },
          { status: 400 }
        )
      }
      targets.push({ path: `${EVENT_SLUG}/${randomUUID()}.${ext}` })
    }

    const supabase = createAdminClient()
    const uploads: { path: string; url: string }[] = []

    for (const t of targets) {
      const { data, error } = await supabase.storage
        .from(UPLOAD_BUCKET)
        .createSignedUploadUrl(t.path)

      if (error || !data) {
        console.error('[book-preorder/upload-urls] sign error:', error)
        return NextResponse.json(
          { error: '업로드 준비 중 오류가 발생했습니다.' },
          { status: 500 }
        )
      }
      uploads.push({ path: data.path, url: data.signedUrl })
    }

    return NextResponse.json({ uploads }, { status: 200 })
  } catch (err) {
    console.error('[book-preorder/upload-urls] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
