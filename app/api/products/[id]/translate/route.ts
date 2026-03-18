import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/auth'
import { getAdminProfile } from '@/lib/supabase/admin'

const LOCALES = ['en', 'zh', 'vi'] as const
type Locale = (typeof LOCALES)[number]

const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  zh: 'Chinese (Simplified)',
  vi: 'Vietnamese',
}

/** 텍스트 필드 번역 대상 */
const TEXT_FIELDS = ['name', 'ingredients', 'functionality', 'how_to_use', 'other_info'] as const
type TextField = (typeof TEXT_FIELDS)[number]

/**
 * 제품 자동 번역 API (관리자용)
 *
 * POST /api/products/:id/translate
 *
 * 1. 텍스트 필드 (name, ingredients, functionality, how_to_use, other_info)
 *    - _ko 값이 있는 필드만 JSON으로 묶어 로케일당 1회 API 호출
 * 2. HTML 상세페이지 (detail_html_ko)
 *    - HTML 구조 보존이 필요하므로 별도 API 호출
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // --- 1. 인증 확인 ---
    const user = await getUser()
    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const adminProfile = await getAdminProfile(user.id)
    if (!adminProfile) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    // --- 2. 파라미터 추출 ---
    const { id } = await params

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: '유효하지 않은 제품 ID입니다.' },
        { status: 400 }
      )
    }

    // --- 3. 제품의 한국어 데이터 조회 ---
    const supabase = await createClient()

    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('id, name_ko, ingredients_ko, functionality_ko, how_to_use_ko, other_info_ko, detail_html_ko')
      .eq('id', id)
      .single()

    if (fetchError || !product) {
      return NextResponse.json(
        { error: '해당 제품을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 번역할 텍스트 필드 수집 (값이 있는 것만)
    const textFieldsToTranslate: Record<string, string> = {}
    for (const field of TEXT_FIELDS) {
      const value = product[`${field}_ko` as keyof typeof product] as string | null
      if (value) textFieldsToTranslate[field] = value
    }

    const hasTextFields = Object.keys(textFieldsToTranslate).length > 0
    const hasHtml = !!product.detail_html_ko

    if (!hasTextFields && !hasHtml) {
      return NextResponse.json(
        { error: '번역할 한국어 데이터가 없습니다.' },
        { status: 400 }
      )
    }

    // --- 4. API 키 확인 ---
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey || apiKey === 'your-anthropic-api-key') {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    // --- 5. 병렬 번역 실행 (텍스트 필드 + HTML) ---
    const anthropic = new Anthropic({ apiKey })

    const updateData: Record<string, string> = {}
    const results: Record<string, { success: boolean; error?: string; details?: string }> = {}

    // 모든 번역 작업을 병렬로 실행
    const allTasks: Promise<void>[] = []

    for (const locale of LOCALES) {
      // 텍스트 필드 번역
      if (hasTextFields) {
        allTasks.push(
          translateTextFields(anthropic, textFieldsToTranslate, locale)
            .then((translated) => {
              for (const [field, value] of Object.entries(translated)) {
                updateData[`${field}_${locale}`] = value
              }
              results[`${locale}_text`] = { success: true }
            })
            .catch((err) => {
              console.error(`[translate] ${locale} text fields failed:`, err)
              results[`${locale}_text`] = { success: false, error: err?.message ?? '텍스트 번역 실패' }
            })
        )
      }

      // HTML 번역
      if (hasHtml) {
        allTasks.push(
          translateHtml(anthropic, product.detail_html_ko!, locale)
            .then((translated) => {
              updateData[`detail_html_${locale}`] = translated
              results[`${locale}_html`] = { success: true }
            })
            .catch((err) => {
              console.error(`[translate] ${locale} HTML failed:`, err)
              results[`${locale}_html`] = { success: false, error: err?.message ?? 'HTML 번역 실패' }
            })
        )
      }
    }

    await Promise.allSettled(allTasks)

    // --- 6. 번역 결과 DB 저장 ---
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)

      if (updateError) {
        console.error('[translate] DB update error:', updateError)
        return NextResponse.json(
          { error: '번역 결과 저장 중 오류가 발생했습니다.' },
          { status: 500 }
        )
      }
    }

    const successCount = Object.values(results).filter((r) => r.success).length
    const totalCount = Object.keys(results).length

    return NextResponse.json({
      message: `${successCount}/${totalCount}개 번역 작업 완료`,
      results,
    })
  } catch (err) {
    console.error('[translate] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * 텍스트 필드들을 JSON으로 묶어 한번에 번역한다.
 * 입력: { name: "베베락스액", ingredients: "유산균 배양 건조물...", ... }
 * 출력: 동일 키 구조의 번역된 JSON
 */
async function translateTextFields(
  anthropic: Anthropic,
  fields: Record<string, string>,
  targetLocale: Locale
): Promise<Record<string, string>> {
  const targetLang = LOCALE_LABELS[targetLocale]
  const fieldsJson = JSON.stringify(fields, null, 2)

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: `Translate the following Korean product information JSON into ${targetLang}.

RULES:
1. Translate the VALUES only. Keep all JSON keys exactly as-is.
2. Translate naturally for native speakers of ${targetLang}.
3. Keep brand names and product names in their original form (e.g., "베베락스" stays as "베베락스").
4. For medical/pharmaceutical terms, use the standard ${targetLang} terminology.
5. Output ONLY valid JSON. No explanations, no markdown code blocks.

Korean JSON:
${fieldsJson}`,
      },
    ],
  })

  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error(`No text response for ${targetLocale}`)
  }

  // JSON 파싱 (마크다운 코드블록 감싸진 경우 제거)
  let jsonStr = textBlock.text.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  return JSON.parse(jsonStr)
}

/**
 * Claude API를 사용해 HTML의 텍스트만 번역한다.
 * HTML 구조, CSS, JavaScript는 그대로 유지.
 */
async function translateHtml(
  anthropic: Anthropic,
  koHtml: string,
  targetLocale: Locale
): Promise<string> {
  const targetLang = LOCALE_LABELS[targetLocale]

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    messages: [
      {
        role: 'user',
        content: `You are translating a Korean product detail page HTML into ${targetLang}.

RULES:
1. Translate ONLY the visible text content and accessibility attributes (alt, aria-label, title, placeholder).
2. DO NOT modify any HTML tags, CSS styles, class names, IDs, JavaScript code, or data attributes.
3. DO NOT add, remove, or reorder any HTML elements.
4. DO NOT translate URLs, image src attributes, or script sources.
5. Preserve the exact same HTML structure — the output must be a complete, valid HTML document.
6. Translate naturally for native speakers of ${targetLang}. Do not translate literally.
7. For numbers, percentages, and units, follow the conventions of ${targetLang}.
8. CTA button text should be localized (e.g., "자세히 보기" → "Learn More" for English).
9. Keep brand names and product names in their original form.
10. Output ONLY the translated HTML. No explanations, no markdown code blocks.

Korean HTML:
${koHtml}`,
      },
    ],
  })

  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error(`No text response for ${targetLocale}`)
  }

  return textBlock.text
}
