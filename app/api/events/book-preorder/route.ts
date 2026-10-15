import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertSameOrigin } from '@/lib/security/csrf'
import type { EventCategory } from '@/types/event'
import {
  CONSENT_VERSION,
  EVENT_SLUG,
  EVENT_TITLE,
  FILE_PATH_PATTERN,
  MAX_FILES,
  UPLOAD_BUCKET,
  eventClosed,
} from './shared'

/**
 * 『약국경영학개론』 사전예약 구매 인증 이벤트 참여 제출 API (공개)
 *
 * POST /api/events/book-preorder
 * Request JSON: {
 *   name, tel, type('약사'|'약대생'|'일반인'), org, zip, addr1, addr2,
 *   agree: true, files: string[]  // upload-urls 가 발급한 경로 (1~5개)
 * }
 * Response JSON: { result: 'success' | 'duplicate' | 'error' }
 *
 * - 파일은 upload-urls 라우트가 발급한 서명 URL로 먼저 업로드된 상태이며,
 *   여기서는 경로 형식 검증 + 실제 업로드 여부 확인 후 행에 저장한다.
 * - 중복 참여는 unique index (event_slug, phone) WHERE license_number IS NULL
 *   위반(23505)으로 감지하며, 이때 업로드된 파일은 삭제해 고아를 막는다.
 */

/** 폼의 구분 값 → DB category 코드 */
const CATEGORY_MAP: Record<string, EventCategory> = {
  약사: 'pharmacist',
  약대생: 'pharmacy_student',
  일반인: 'general',
}

/** 필드 최대 길이 (비정상 입력 방어) */
const MAX_LEN = {
  name: 50,
  tel: 20,
  org: 100,
  zip: 10,
  addr1: 200,
  addr2: 200,
}

export async function POST(request: NextRequest) {
  const csrfError = assertSameOrigin(request)
  if (csrfError) return csrfError

  try {
    // --- 0. 이벤트 종료 확인 ---
    if (eventClosed()) {
      return NextResponse.json(
        { result: 'error', error: '이벤트가 종료되었습니다.' },
        { status: 410 }
      )
    }

    // --- 1. 요청 본문 파싱 ---
    let body: {
      name?: unknown
      tel?: unknown
      type?: unknown
      org?: unknown
      zip?: unknown
      addr1?: unknown
      addr2?: unknown
      agree?: unknown
      files?: unknown
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { result: 'error', error: '잘못된 요청 형식입니다.' },
        { status: 400 }
      )
    }

    // --- 2. 필드 검증 ---
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const tel = typeof body.tel === 'string' ? body.tel.trim() : ''
    const type = typeof body.type === 'string' ? body.type.trim() : ''
    const org = typeof body.org === 'string' ? body.org.trim() : ''
    const zip = typeof body.zip === 'string' ? body.zip.trim() : ''
    const addr1 = typeof body.addr1 === 'string' ? body.addr1.trim() : ''
    const addr2 = typeof body.addr2 === 'string' ? body.addr2.trim() : ''
    const agree = body.agree === true
    const files = Array.isArray(body.files) ? body.files : null

    const category = CATEGORY_MAP[type]

    if (!name || !tel || !category || !zip || !addr1 || !agree || !files) {
      return NextResponse.json(
        { result: 'error', error: '필수 항목을 모두 입력하고 동의해 주세요.' },
        { status: 400 }
      )
    }

    // 약사·약대생은 소속명(약국명/학교명) 필수
    if (category !== 'general' && !org) {
      return NextResponse.json(
        { result: 'error', error: '소속명을 입력해 주세요.' },
        { status: 400 }
      )
    }

    if (
      name.length > MAX_LEN.name ||
      tel.length > MAX_LEN.tel ||
      org.length > MAX_LEN.org ||
      zip.length > MAX_LEN.zip ||
      addr1.length > MAX_LEN.addr1 ||
      addr2.length > MAX_LEN.addr2
    ) {
      return NextResponse.json(
        { result: 'error', error: '입력값이 너무 깁니다.' },
        { status: 400 }
      )
    }

    if (!/^01[016789]-?\d{3,4}-?\d{4}$/.test(tel)) {
      return NextResponse.json(
        { result: 'error', error: '올바른 휴대전화 번호를 입력해 주세요.' },
        { status: 400 }
      )
    }

    if (!/^\d{5}$/.test(zip)) {
      return NextResponse.json(
        { result: 'error', error: '올바른 우편번호를 입력해 주세요.' },
        { status: 400 }
      )
    }

    // --- 3. 파일 경로 검증 (upload-urls 가 발급한 형식만 허용) ---
    if (files.length < 1 || files.length > MAX_FILES) {
      return NextResponse.json(
        { result: 'error', error: '구매 인증 파일을 첨부해 주세요.' },
        { status: 400 }
      )
    }

    const filePaths: string[] = []
    for (const p of files) {
      if (typeof p !== 'string' || !FILE_PATH_PATTERN.test(p)) {
        return NextResponse.json(
          { result: 'error', error: '구매 인증 파일 정보가 올바르지 않습니다.' },
          { status: 400 }
        )
      }
      filePaths.push(p)
    }

    const supabase = createAdminClient()

    // 실제 업로드 완료 여부 확인 (미업로드 경로가 저장되는 것을 방지)
    for (const p of filePaths) {
      const fileName = p.slice(EVENT_SLUG.length + 1)
      const { data: found, error: listError } = await supabase.storage
        .from(UPLOAD_BUCKET)
        .list(EVENT_SLUG, { limit: 1, search: fileName })

      if (listError || !found || found.length === 0) {
        return NextResponse.json(
          {
            result: 'error',
            error: '구매 인증 파일 업로드가 완료되지 않았습니다. 다시 시도해 주세요.',
          },
          { status: 400 }
        )
      }
    }

    // --- 4. 저장 (중복은 unique index 로 감지) ---
    const { error: insertError } = await supabase.from('event_entries').insert({
      event_slug: EVENT_SLUG,
      event_title: EVENT_TITLE,
      name,
      phone: tel.replace(/-/g, ''),
      category,
      affiliation: org || null,
      zipcode: zip,
      address: addr1,
      address_detail: addr2 || null,
      file_paths: filePaths,
      consent: true,
      consent_version: CONSENT_VERSION,
    })

    if (insertError) {
      // 23505: unique_violation → 이미 같은 연락처로 참여함
      if (insertError.code === '23505') {
        // 이번 제출로 올라간 파일은 고아가 되므로 즉시 삭제
        await supabase.storage.from(UPLOAD_BUCKET).remove(filePaths)
        return NextResponse.json({ result: 'duplicate' }, { status: 409 })
      }
      console.error('[events/book-preorder] insert error:', insertError)
      return NextResponse.json({ result: 'error' }, { status: 500 })
    }

    return NextResponse.json({ result: 'success' }, { status: 201 })
  } catch (err) {
    console.error('[events/book-preorder] Unexpected error:', err)
    return NextResponse.json({ result: 'error' }, { status: 500 })
  }
}
