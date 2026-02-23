import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/auth'
import { checkAdminRole } from '@/lib/supabase/admin'
import crypto from 'crypto'

/**
 * PDF 업로드 API (관리자용, Supabase Storage)
 *
 * POST /api/upload-pdf
 *
 * FormData:
 *   - file (필수): 업로드할 PDF 파일
 *   - bucket (선택): Storage 버킷 이름 (기본값 'ir-files')
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

    // --- 2. FormData 파싱 ---
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const bucket = (formData.get('bucket') as string) ?? 'ir-files'

    if (!file) {
      return NextResponse.json(
        { error: '파일이 없습니다.' },
        { status: 400 }
      )
    }

    // --- 3. 파일 형식 검증 ---
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'PDF 형식의 파일만 업로드 가능합니다.' },
        { status: 400 }
      )
    }

    const originalName = file.name
    const ext = originalName.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: 'pdf 확장자의 파일만 업로드 가능합니다.' },
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
    const fileName = `${Date.now()}-${randomString}.pdf`
    const filePath = `${user.id}/${fileName}`

    // --- 6. Supabase Storage 업로드 ---
    const supabase = await createClient()

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('[upload-pdf/POST] Supabase Storage upload error:', uploadError)
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
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('[upload-pdf/POST] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
