import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/auth'
import { checkAdminRole, createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

/**
 * PDF Signed Upload URL 발급 API (관리자용)
 *
 * POST /api/upload-pdf
 *
 * 기존 방식처럼 파일을 서버로 전송하면 Vercel 4.5MB 요청 제한에 걸립니다.
 * 대신 서버에서 권한 검증 후 Supabase Signed Upload URL을 발급하고,
 * 클라이언트가 Supabase Storage에 직접 업로드합니다.
 *
 * Request: JSON { fileName, fileSize, fileType }
 * Response: { signedUrl, publicUrl, path, originalFileName }
 */

const ALLOWED_MIME_TYPES = ['application/pdf']
const ALLOWED_EXTENSIONS = ['pdf']
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

    const { authorized } = await checkAdminRole(user.id, ['super_admin', 'ir'])
    if (!authorized) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    // --- 2. 파일 메타데이터 파싱 ---
    const body = await request.json()
    const { fileName, fileSize, fileType } = body as {
      fileName?: string
      fileSize?: number
      fileType?: string
    }

    if (!fileName || !fileSize || !fileType) {
      return NextResponse.json(
        { error: '파일 정보가 없습니다.' },
        { status: 400 }
      )
    }

    // --- 3. 파일 형식 검증 ---
    if (!ALLOWED_MIME_TYPES.includes(fileType)) {
      return NextResponse.json(
        { error: 'PDF 형식의 파일만 업로드 가능합니다.' },
        { status: 400 }
      )
    }

    const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: 'pdf 확장자의 파일만 업로드 가능합니다.' },
        { status: 400 }
      )
    }

    // --- 4. 파일 크기 검증 ---
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: '파일 크기는 50MB 이하여야 합니다.' },
        { status: 400 }
      )
    }

    // --- 5. 유니크 파일 경로 생성 ---
    const randomString = crypto.randomBytes(8).toString('hex')
    const generatedName = `${Date.now()}-${randomString}.pdf`
    const filePath = `${user.id}/${generatedName}`

    // --- 6. Signed Upload URL 생성 (admin client, RLS 우회) ---
    const supabase = createAdminClient()

    const { data: signedData, error: signError } = await supabase.storage
      .from('ir-files')
      .createSignedUploadUrl(filePath)

    if (signError || !signedData) {
      console.error('[upload-pdf/POST] Signed URL error:', signError)
      return NextResponse.json(
        { error: '업로드 URL 생성 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // --- 7. Public URL 미리 계산 ---
    const { data: { publicUrl } } = supabase.storage
      .from('ir-files')
      .getPublicUrl(filePath)

    return NextResponse.json(
      {
        signedUrl: signedData.signedUrl,
        publicUrl,
        path: filePath,
        originalFileName: fileName,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('[upload-pdf/POST] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
