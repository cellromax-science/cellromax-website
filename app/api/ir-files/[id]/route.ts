import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/auth'
import { getAdminProfile } from '@/lib/supabase/admin'

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * IR 파일 단건 조회 API (관리자용)
 *
 * GET /api/ir-files/:id
 */
export async function GET(
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

    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: '유효하지 않은 IR 파일 ID입니다.' },
        { status: 400 }
      )
    }

    // --- 3. IR 파일 조회 ---
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('ir_files')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('[ir-files/GET:id] Supabase query error:', error)

      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: '해당 IR 파일을 찾을 수 없습니다.' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: 'IR 파일 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ irFile: data })
  } catch (err) {
    console.error('[ir-files/GET:id] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * IR 파일 수정 API (관리자용)
 *
 * PUT /api/ir-files/:id
 */
export async function PUT(
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

    // --- 2. 파라미터 및 바디 추출 ---
    const { id } = await params

    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: '유효하지 않은 IR 파일 ID입니다.' },
        { status: 400 }
      )
    }

    const body = await request.json()

    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: '수정할 데이터가 없습니다.' },
        { status: 400 }
      )
    }

    delete body.id
    delete body.created_by
    delete body.created_at

    // --- 3. IR 파일 수정 ---
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('ir_files')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[ir-files/PUT] Supabase update error:', error)

      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: '해당 IR 파일을 찾을 수 없습니다.' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: 'IR 파일 수정 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ irFile: data })
  } catch (err) {
    console.error('[ir-files/PUT] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * IR 파일 삭제 API (관리자용)
 *
 * DELETE /api/ir-files/:id
 * Storage 파일도 함께 삭제
 */
export async function DELETE(
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

    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: '유효하지 않은 IR 파일 ID입니다.' },
        { status: 400 }
      )
    }

    // --- 3. 기존 레코드 조회 (Storage 경로 추출용) ---
    const supabase = await createClient()

    const { data: existing, error: fetchError } = await supabase
      .from('ir_files')
      .select('file_url')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('[ir-files/DELETE] Supabase fetch error:', fetchError)

      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '해당 IR 파일을 찾을 수 없습니다.' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: 'IR 파일 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // --- 4. Storage 파일 삭제 ---
    if (existing?.file_url) {
      const bucketName = 'ir-files'
      const marker = `/storage/v1/object/public/${bucketName}/`
      const markerIndex = existing.file_url.indexOf(marker)

      if (markerIndex !== -1) {
        const filePath = existing.file_url.substring(markerIndex + marker.length)

        const { error: storageError } = await supabase.storage
          .from(bucketName)
          .remove([filePath])

        if (storageError) {
          console.error('[ir-files/DELETE] Storage delete error:', storageError)
        }
      }
    }

    // --- 5. DB 레코드 삭제 ---
    const { error: deleteError } = await supabase
      .from('ir_files')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('[ir-files/DELETE] Supabase delete error:', deleteError)
      return NextResponse.json(
        { error: 'IR 파일 삭제 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'IR 파일이 삭제되었습니다.' })
  } catch (err) {
    console.error('[ir-files/DELETE] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
