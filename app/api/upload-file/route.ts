import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/auth'
import { getAdminProfile, createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

/**
 * 범용 파일 업로드용 서명 URL 발급 API (관리자용, Supabase Storage)
 *
 * POST /api/upload-file
 *
 * 파일 바이트를 이 함수로 직접 전송하면 Vercel 서버리스 함수의
 * 요청 본문 제한(4.5MB)에 걸려 실패한다. 대신 이 엔드포인트는
 * 관리자 권한을 확인한 뒤 짧은 유효시간의 서명 업로드 URL만 발급하고,
 * 실제 파일 전송은 브라우저에서 Supabase Storage로 직접 수행한다.
 *
 * Request JSON:
 *   - fileName    (필수): 원본 파일명 (확장자 추출용)
 *   - contentType (필수): 파일 MIME 타입 (빈 문자열 허용 — 확장자로 판단)
 *   - fileSize    (선택): 파일 크기(bytes) — 사전 크기 검증용
 *   - bucket      (선택): Storage 버킷 이름 (기본값 'newsroom')
 *
 * Response JSON (201):
 *   - bucket    : 업로드 대상 버킷
 *   - path      : 버킷 내 파일 경로
 *   - token     : uploadToSignedUrl 에 전달할 1회용 토큰
 *   - publicUrl : 업로드 완료 후 접근 가능한 공개 URL
 *
 * 지원 파일 형식: PDF, Word, Excel, PowerPoint, HWP, ZIP, 이미지
 */

const ALLOWED_MIME_TYPES = [
  // 이미지
  'image/jpeg', 'image/png', 'image/webp',
  // PDF
  'application/pdf',
  // Word
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Excel
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // PowerPoint
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // ZIP
  'application/zip',
  // HWP
  'application/x-hwp',
  'application/haansofthwp',
  'application/x-hwpml',
]

const ALLOWED_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'webp',
  'pdf',
  'doc', 'docx',
  'xls', 'xlsx',
  'ppt', 'pptx',
  'zip',
  'hwp', 'hwpx',
]

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export async function POST(request: NextRequest) {
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

    // --- 2. 요청 본문 파싱 ---
    let body: {
      fileName?: string
      contentType?: string
      fileSize?: number
      bucket?: string
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: '잘못된 요청 형식입니다.' },
        { status: 400 }
      )
    }

    const fileName = body.fileName
    const contentType = body.contentType ?? ''
    const fileSize = body.fileSize
    const bucket = body.bucket ?? 'newsroom'

    if (!fileName) {
      return NextResponse.json(
        { error: '파일 정보가 없습니다.' },
        { status: 400 }
      )
    }

    // --- 3. 파일 형식 검증 ---
    // MIME 타입이 빈 문자열이거나 octet-stream인 경우 확장자로 판단
    const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `지원하지 않는 파일 형식입니다. (${ext})` },
        { status: 400 }
      )
    }

    if (contentType && contentType !== 'application/octet-stream' && !ALLOWED_MIME_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: `지원하지 않는 파일 형식입니다. (${contentType})` },
        { status: 400 }
      )
    }

    // --- 4. 파일 크기 사전 검증 ---
    // 실제 크기 제한은 버킷 설정(file_size_limit)에서도 강제되지만,
    // 여기서 미리 확인해 사용자에게 명확한 오류 메시지를 제공한다.
    if (typeof fileSize === 'number' && fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: '파일 크기는 50MB 이하여야 합니다.' },
        { status: 400 }
      )
    }

    // --- 5. 유니크 파일 경로 생성 ---
    const randomString = crypto.randomBytes(8).toString('hex')
    const generatedName = `${Date.now()}-${randomString}.${ext}`
    const filePath = `attachments/${user.id}/${generatedName}`

    // --- 6. 서명 업로드 URL 발급 (admin client로 RLS 우회) ---
    const supabase = createAdminClient()

    const { data: signed, error: signError } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(filePath)

    if (signError || !signed) {
      console.error('[upload-file/POST] createSignedUploadUrl error:', signError)
      return NextResponse.json(
        { error: '업로드 URL 생성 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // --- 7. Public URL 생성 ---
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    return NextResponse.json(
      {
        bucket,
        path: signed.path,
        token: signed.token,
        publicUrl,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('[upload-file/POST] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
