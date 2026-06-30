import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/auth'
import { createAdminClient, getAdminProfile } from '@/lib/supabase/admin'
import { processBundle } from '@/lib/detail-html/process-bundle'
import {
  BUNDLE_BUCKET,
  buildBundleUploadKey,
} from '@/lib/detail-html/bundle-storage'

export const runtime = 'nodejs'

/**
 * 상세페이지 ZIP 번들 — 처리 (관리자용)
 *
 * POST /api/products/:id/detail-bundle
 * Body: JSON { bundleId }
 *
 * 브라우저가 /sign 으로 받은 서명 URL 로 이미 Storage 에 올린 ZIP 의 식별자.
 * 여기서는 그 ZIP 을 service-role 로 download 하여 처리한다(요청 본문이 작아
 * Vercel 4.5MB 한계와 무관). HTML 안의 로컬 자산은 Storage 에 업로드되고
 * 절대 URL 로 치환된 HTML 을 돌려준다. 처리 후 임시 ZIP 은 삭제한다.
 */
export async function POST(
  request: NextRequest,
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

    const { id: productId } = await params

    // --- 2. 바디 파싱 ---
    let bundleId: string
    try {
      const body = (await request.json()) as { bundleId?: unknown }
      if (typeof body.bundleId !== 'string') {
        throw new Error('bundleId 누락')
      }
      bundleId = body.bundleId
    } catch {
      return NextResponse.json(
        { error: '요청 형식이 올바르지 않습니다.' },
        { status: 400 }
      )
    }

    // --- 3. 서버에서 키 재구성 (임의 경로 download 방지) + ZIP download ---
    let key: string
    try {
      key = buildBundleUploadKey(productId, bundleId)
    } catch (err) {
      const message = err instanceof Error ? err.message : '잘못된 요청입니다.'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const service = createAdminClient()
    const { data: blob, error: dlError } = await service.storage
      .from(BUNDLE_BUCKET)
      .download(key)

    if (dlError || !blob) {
      return NextResponse.json(
        { error: '업로드된 ZIP 을 찾을 수 없습니다. 다시 시도해 주세요.' },
        { status: 400 }
      )
    }

    const buf = Buffer.from(await blob.arrayBuffer())

    const uploadFn = async (
      assetKey: string,
      data: Buffer,
      contentType: string
    ): Promise<string> => {
      const { error } = await service.storage
        .from(BUNDLE_BUCKET)
        .upload(assetKey, data, { contentType, upsert: true })
      if (error) throw new Error(`Storage 업로드 실패: ${error.message}`)
      return service.storage.from(BUNDLE_BUCKET).getPublicUrl(assetKey).data
        .publicUrl
    }

    // --- 4. 번들 처리 ---
    try {
      const result = await processBundle(buf, productId, bundleId, uploadFn)
      // 임시 ZIP 정리 (실패해도 결과 반환에는 영향 없음)
      await service.storage.from(BUNDLE_BUCKET).remove([key])
      return NextResponse.json(result)
    } catch (err) {
      // 임시 ZIP + 처리 도중 업로드된 자산(고아) 모두 정리 — best effort.
      // 자산 키 구조: process-bundle.ts 의 `${productId}/detail-bundles/${bundleId}/...`
      const assetPrefix = `${productId}/detail-bundles/${bundleId}`
      try {
        const { data: leftover } = await service.storage
          .from(BUNDLE_BUCKET)
          .list(assetPrefix, { limit: 1000 })
        const assetKeys = (leftover ?? []).map((f) => `${assetPrefix}/${f.name}`)
        await service.storage.from(BUNDLE_BUCKET).remove([key, ...assetKeys])
      } catch (cleanupErr) {
        console.warn('[detail-bundle] 고아 자산 정리 실패', cleanupErr)
      }
      const message = err instanceof Error ? err.message : '알 수 없는 오류'
      return NextResponse.json({ error: message }, { status: 400 })
    }
  } catch (err) {
    console.error('[detail-bundle] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
