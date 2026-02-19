import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * 미들웨어 전용 Supabase 클라이언트를 생성합니다.
 *
 * - request/response 기반 쿠키 처리 (미들웨어에서는 next/headers 사용 불가)
 * - Supabase Auth 세션 갱신 (토큰 refresh) 자동 처리
 * - 반환된 supabaseResponse를 반드시 최종 응답으로 사용해야 쿠키가 브라우저에 전달됩니다
 */
export function createSupabaseMiddlewareClient(request: NextRequest) {
  // 초기 응답 객체 생성 (이후 쿠키가 설정되면 교체됨)
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // 1) request 쿠키에 반영 (후속 미들웨어/서버 컴포넌트에서 읽을 수 있도록)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )

          // 2) 새로운 응답 객체를 생성하여 쿠키를 설정
          //    (업데이트된 request를 전달해야 Server Components에서도 갱신된 쿠키를 읽음)
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  return { supabase, supabaseResponse: () => supabaseResponse }
}
