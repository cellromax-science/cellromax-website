import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * 셀로맥스 OTC 퀴즈 이벤트 참여 제출 API (공개)
 *
 * POST /api/events/otc-quiz
 *
 * Request JSON: { name, license, phone, pharmacy, consent, answers: number[] }
 * Response JSON: { result: 'success' | 'wrong' | 'duplicate' | 'error' }
 *
 * - 5문항 전 문항 정답일 때만 저장한다 (클라이언트를 신뢰하지 않고 재검증).
 * - 중복 참여는 event_entries 의 unique(event_slug, license_number)
 *   제약 위반(23505)으로 감지한다.
 * - INSERT 는 service role 클라이언트로 수행한다 (anon INSERT 정책 없음).
 */

const EVENT_SLUG = 'otc-quiz'
const EVENT_TITLE = '셀로맥스 OTC 퀴즈 이벤트'

/** 이벤트 종료 여부 — true면 신규 제출을 거부 (페이지 쪽 플래그와 함께 관리) */
const EVENT_CLOSED = false

/** 문항별 정답 인덱스 (0-based) — 핸드오프 QUIZ 데이터 기준 */
const CORRECT_ANSWERS = [0, 1, 0, 1, 0] as const

/** 필드 최대 길이 (비정상 입력 방어) */
const MAX_LEN = {
  name: 50,
  license: 20,
  phone: 20,
  pharmacy: 100,
}

export async function POST(request: NextRequest) {
  try {
    // --- 0. 이벤트 종료 확인 ---
    if (EVENT_CLOSED) {
      return NextResponse.json(
        { result: 'error', error: '이벤트가 종료되었습니다.' },
        { status: 410 }
      )
    }

    // --- 1. 요청 본문 파싱 ---
    let body: {
      name?: unknown
      license?: unknown
      phone?: unknown
      pharmacy?: unknown
      consent?: unknown
      answers?: unknown
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
    const license = typeof body.license === 'string' ? body.license.trim() : ''
    const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
    const pharmacy = typeof body.pharmacy === 'string' ? body.pharmacy.trim() : ''
    const consent = body.consent === true
    const answers = Array.isArray(body.answers) ? body.answers : null

    if (!name || !license || !phone || !pharmacy || !consent || !answers) {
      return NextResponse.json(
        { result: 'error', error: '모든 항목을 입력하고 동의해 주세요.' },
        { status: 400 }
      )
    }

    if (
      name.length > MAX_LEN.name ||
      license.length > MAX_LEN.license ||
      phone.length > MAX_LEN.phone ||
      pharmacy.length > MAX_LEN.pharmacy
    ) {
      return NextResponse.json(
        { result: 'error', error: '입력값이 너무 깁니다.' },
        { status: 400 }
      )
    }

    // 면허번호·연락처: 숫자/하이픈만 허용
    if (!/^[\d-]+$/.test(license)) {
      return NextResponse.json(
        { result: 'error', error: '약사면허번호는 숫자만 입력해 주세요.' },
        { status: 400 }
      )
    }
    if (!/^[\d-]+$/.test(phone)) {
      return NextResponse.json(
        { result: 'error', error: '연락처는 숫자만 입력해 주세요.' },
        { status: 400 }
      )
    }

    // --- 3. 퀴즈 정답 검증 (서버 강제: 5문항 전 문항 정답) ---
    const allCorrect =
      answers.length === CORRECT_ANSWERS.length &&
      CORRECT_ANSWERS.every((c, i) => answers[i] === c)

    if (!allCorrect) {
      return NextResponse.json({ result: 'wrong' }, { status: 422 })
    }

    // --- 4. 저장 (중복은 unique 제약으로 감지) ---
    const supabase = createAdminClient()

    const { error: insertError } = await supabase.from('event_entries').insert({
      event_slug: EVENT_SLUG,
      event_title: EVENT_TITLE,
      name,
      license_number: license.replace(/-/g, ''),
      // 하이픈을 입력해도 숫자만 저장
      phone: phone.replace(/-/g, ''),
      pharmacy_name: pharmacy,
      consent: true,
    })

    if (insertError) {
      // 23505: unique_violation → 이미 참여한 면허번호
      if (insertError.code === '23505') {
        return NextResponse.json({ result: 'duplicate' }, { status: 409 })
      }
      console.error('[events/otc-quiz] insert error:', insertError)
      return NextResponse.json({ result: 'error' }, { status: 500 })
    }

    return NextResponse.json({ result: 'success' }, { status: 201 })
  } catch (err) {
    console.error('[events/otc-quiz] Unexpected error:', err)
    return NextResponse.json({ result: 'error' }, { status: 500 })
  }
}
