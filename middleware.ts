import { NextResponse, type NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './lib/i18n/routing'
import { createSupabaseMiddlewareClient } from './lib/supabase/middleware'

// next-intl 미들웨어 핸들러 (재사용을 위해 모듈 레벨에서 한 번만 생성)
const intlMiddleware = createIntlMiddleware(routing)

// 지원되는 로케일 목록 (routing에서 가져옴)
const locales = routing.locales

/**
 * 주어진 pathname이 admin 관련 경로인지 확인합니다.
 * /[locale]/admin 또는 /[locale]/admin/* 경로에 해당하면 true.
 */
function isAdminPath(pathname: string): boolean {
  return locales.some(
    (locale) =>
      pathname === `/${locale}/admin` ||
      pathname.startsWith(`/${locale}/admin/`)
  )
}

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
  // API / ttsyrup 경로 조기 반환
  // ─────────────────────────────────────────────────────────────────────────
  if (pathname.startsWith('/api/') || pathname === '/ttsyrup' || pathname.startsWith('/ttsyrup/')) {
    return NextResponse.next({ request })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 공개 페이지 (비-admin) 경로 → 인증 불필요, intl만 실행
  //   getUser() 호출을 건너뛰어 Supabase Auth 네트워크 왕복(100~400ms)을 절감
  // ─────────────────────────────────────────────────────────────────────────
  if (!isAdminPath(pathname)) {
    const intlResponse = intlMiddleware(request)
    intlResponse.headers.set('x-pathname', pathname)
    return intlResponse
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Admin 경로 → Supabase 세션 갱신 + 인증 보호
  // ─────────────────────────────────────────────────────────────────────────
  const { supabase, supabaseResponse } = createSupabaseMiddlewareClient(request)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const locale = extractLocale(pathname)

  // 보호 대상 admin 경로에 세션 없이 접근 -> 로그인 페이지로 리다이렉트
  if (isProtectedAdminPath(pathname) && !user) {
    const loginUrl = new URL(`/${locale}/admin/login`, request.url)
    const redirectResponse = NextResponse.redirect(loginUrl)

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

  // Admin intl 처리 + Supabase 쿠키 병합
  const intlResponse = intlMiddleware(request)

  supabaseResponse().cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value)
  })

  intlResponse.headers.set('x-pathname', pathname)

  return intlResponse
}

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)',],
}
