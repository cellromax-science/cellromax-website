import { NextResponse, type NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './lib/i18n/routing'
import { createSupabaseMiddlewareClient } from './lib/supabase/middleware'

// next-intl 미들웨어 핸들러 (재사용을 위해 모듈 레벨에서 한 번만 생성)
const intlMiddleware = createIntlMiddleware(routing)

// 지원되는 로케일 목록 (routing에서 가져옴)
const locales = routing.locales

/**
 * 주어진 pathname이 admin 보호 대상 경로인지 확인합니다.
 * /[locale]/admin/* 경로 중 /[locale]/admin/login은 제외합니다.
 */
function isProtectedAdminPath(pathname: string): boolean {
  return locales.some(
    (locale) =>
      // /ko/admin, /ko/admin/dashboard 등은 보호 대상
      (pathname === `/${locale}/admin` ||
        pathname.startsWith(`/${locale}/admin/`)) &&
      // /ko/admin/login은 제외
      pathname !== `/${locale}/admin/login`
  )
}

/**
 * 주어진 pathname이 admin 로그인 페이지인지 확인합니다.
 */
function isAdminLoginPath(pathname: string): boolean {
  return locales.some((locale) => pathname === `/${locale}/admin/login`)
}

/**
 * pathname에서 로케일을 추출합니다.
 * 예: /ko/admin/dashboard -> ko
 */
function extractLocale(pathname: string): string {
  const segments = pathname.split('/')
  const maybeLocale = segments[1]
  if (locales.includes(maybeLocale as (typeof locales)[number])) {
    return maybeLocale
  }
  return routing.defaultLocale
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ─────────────────────────────────────────────────────────────────────────
  // 1단계: Supabase 세션 갱신
  //   모든 요청에 대해 Supabase 세션을 갱신합니다.
  //   이 단계에서 만료된 JWT 토큰이 자동으로 refresh됩니다.
  // ─────────────────────────────────────────────────────────────────────────
  const { supabase, supabaseResponse } = createSupabaseMiddlewareClient(request)

  // getUser()를 호출하여 서버 측에서 JWT를 검증하고 세션을 갱신합니다.
  // 주의: getSession()은 JWT를 서버 측에서 검증하지 않으므로 사용하지 않습니다.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ─────────────────────────────────────────────────────────────────────────
  // 2단계: Admin 경로 인증 보호
  // ─────────────────────────────────────────────────────────────────────────
  const locale = extractLocale(pathname)

  // 보호 대상 admin 경로에 세션 없이 접근 -> 로그인 페이지로 리다이렉트
  if (isProtectedAdminPath(pathname) && !user) {
    const loginUrl = new URL(`/${locale}/admin/login`, request.url)
    const redirectResponse = NextResponse.redirect(loginUrl)

    // Supabase가 설정한 쿠키를 리다이렉트 응답에도 전달
    supabaseResponse().cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })

    return redirectResponse
  }

  // 이미 로그인한 상태에서 로그인 페이지 접근 -> 대시보드로 리다이렉트
  if (isAdminLoginPath(pathname) && user) {
    const dashboardUrl = new URL(`/${locale}/admin/dashboard`, request.url)
    const redirectResponse = NextResponse.redirect(dashboardUrl)

    supabaseResponse().cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })

    return redirectResponse
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3단계: next-intl 미들웨어 실행
  //   로케일 감지, 리다이렉트, alternate links 헤더 등 i18n 처리
  // ─────────────────────────────────────────────────────────────────────────
  const intlResponse = intlMiddleware(request)

  // ─────────────────────────────────────────────────────────────────────────
  // 4단계: Supabase 쿠키를 intl 응답에 병합
  //   Supabase가 세션 갱신 중 설정한 쿠키를 최종 응답에 포함시킵니다.
  //   이렇게 해야 브라우저에 갱신된 세션 쿠키가 전달됩니다.
  // ─────────────────────────────────────────────────────────────────────────
  supabaseResponse().cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value)
  })

  return intlResponse
}

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)',],
}
