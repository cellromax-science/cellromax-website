import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/auth'
import { getAdminProfile } from '@/lib/supabase/admin'
import crypto from 'crypto'

/**
 * 범용 파일 업로드 API (관리자용, Supabase Storage)
 *
 * POST /api/upload-file
 *
 * FormData:
 *   - file (필수): 업로드할 파일
 *   - bucket (선택): Storage 버킷 이름 (기본값 'newsroom')
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

    // --- 2. FormData 파싱 ---
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const bucket = (formData.get('bucket') as string) ?? 'newsroom'

    if (!file) {
      return NextResponse.json(
        { error: '파일이 없습니다.' },
        { status: 400 }
      )
    }

    // --- 3. 파일 형식 검증 ---
    // MIME 타입이 빈 문자열이거나 octet-stream인 경우 확장자로 판단
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `지원하지 않는 파일 형식입니다. (${ext})` },
        { status: 400 }
      )
    }

    if (file.type && file.type !== 'application/octet-stream' && !ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `지원하지 않는 파일 형식입니다. (${file.type})` },
        { status: 400 }
      )
    }

    // --- 4. 파일 크기 검증 ---
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: '파일 크기는 50MB 이하여야 합니다.' },
        { status: 400 }
      )
    }

    // --- 5. 유니크 파일명 생성 ---
    const randomString = crypto.randomBytes(8).toString('hex')
    const fileName = `${Date.now()}-${randomString}.${ext}`
    const filePath = `attachments/${user.id}/${fileName}`

    // --- 6. Supabase Storage 업로드 ---
    const supabase = await createClient()

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (uploadError) {
      console.error('[upload-file/POST] Supabase Storage upload error:', uploadError)
      return NextResponse.json(
        { error: '파일 업로드 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // --- 7. Public URL 생성 ---
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    return NextResponse.json(
      {
        url: publicUrl,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
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
