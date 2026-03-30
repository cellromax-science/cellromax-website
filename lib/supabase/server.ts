import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/**
 * 인증이 필요한 페이지용 Supabase 클라이언트.
 * cookies()를 사용하므로 해당 페이지는 dynamic rendering이 된다.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component에서 호출된 경우 쿠키 쓰기가 불가능하므로 무시.
            // 미들웨어에서 세션 갱신이 처리됩니다.
          }
        },
      },
    }
  )
}

/**
 * 공개(비인증) 페이지용 Supabase 클라이언트.
 * cookies()를 사용하지 않으므로 ISR/SSG 정적 캐싱이 가능하다.
 * 제품 목록, 제품 상세 등 공개 데이터 조회 전용.
 */
export function createStaticClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
