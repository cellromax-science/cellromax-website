import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * POST /api/auth/logout
 *
 * 관리자 로그아웃 API 라우트.
 * 서버 액션의 쿠키 삭제 한계를 우회하기 위해 Route Handler로 구현.
 * - Supabase signOut 호출 (서버 세션 무효화)
 * - 응답 헤더에서 직접 auth 쿠키 삭제
 * - 로그인 페이지로 리다이렉트
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(
    new URL('/ko/admin/login', request.url),
    { status: 302 }
  )

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  await supabase.auth.signOut()

  // 안전장치: Supabase auth 관련 쿠키를 명시적으로 삭제
  request.cookies.getAll().forEach((cookie) => {
    if (
      cookie.name.startsWith('sb-') ||
      cookie.name.includes('supabase')
    ) {
      response.cookies.delete(cookie.name)
    }
  })

  return response
}
