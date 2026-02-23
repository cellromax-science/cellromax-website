import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/auth'
import { getAdminProfile } from '@/lib/supabase/admin'

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * 약국 삭제 API (관리자용)
 *
 * DELETE /api/pharmacies/:id
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
        { error: '유효하지 않은 약국 ID입니다.' },
        { status: 400 }
      )
    }

    // --- 3. 약국 삭제 ---
    const supabase = await createClient()

    const { error } = await supabase
      .from('pharmacies')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[pharmacies/DELETE] Supabase delete error:', error)
      return NextResponse.json(
        { error: '약국 삭제 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: '약국이 삭제되었습니다.' })
  } catch (err) {
    console.error('[pharmacies/DELETE] Unexpected error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
