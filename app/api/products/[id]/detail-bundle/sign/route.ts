import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getUser } from '@/lib/supabase/auth'
import { createAdminClient, getAdminProfile } from '@/lib/supabase/admin'
import { BUNDLE_BUCKET, buildBundleUploadKey } from '@/lib/detail-html/bundle-storage'

export const runtime = 'nodejs'

/**
 * 상세페이지 ZIP 번들 — 서명 업로드 URL 발급 (관리자용)
 *
 * POST /api/products/:id/detail-bundle/sign
 *
 * service-role 로 1회용 서명 업로드 URL 을 발급한다. 응답이 작아 Vercel 본문
 * 한계와 무관하며, 브라우저는 받은 token 으로 ZIP 을 Storage 에 직접 올린다.
 * (id 는 스토리지 네임스페이스로만 쓰이며 products 테이블을 조회하지 않으므로,
 *  신규 등록 모드에서 생성한 임시 UUID 도 그대로 사용 가능하다.)
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // --- 1. 인증 확인 ---
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const adminProfile = await getAdminProfile(user.id)
    if (!adminProfile) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    // --- 2. 업로드 키 생성 ---
    const { id: productId } = await params

    let key: string
    let bundleId: string
    try {
      bundleId = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`
      key = buildBundleUploadKey(productId, bundleId)
    } catch (err) {
      const message = err instanceof Error ? err.message : '잘못된 요청입니다.'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    // --- 3. 서명 URL 발급 ---
    const service = createAdminClient()
    const { data, error } = await service.storage
      .from(BUNDLE_BUCKET)
      .createSignedUploadUrl(key)

    if (error || !data) {
      return NextResponse.json(
        { error: `업로드 URL 발급 실패: ${error?.message ?? 'unknown'}` },
        { status: 500 }
      )
    }

    // data: { signedUrl, token, path }
    return NextResponse.json({
      bucket: BUNDLE_BUCKET,
      path: data.path,
      token: data.token,
      bundleId,
    })
  } catch (err) {
    console.error('[detail-bundle/sign] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
