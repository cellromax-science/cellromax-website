import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { getUser } from "@/lib/supabase/auth";
import { getAdminProfile } from "@/lib/supabase/admin";
import { AdminShell } from "@/components/admin/AdminShell";
import { routing } from "@/lib/i18n/routing";

/* ==========================================================================
   Admin (app) Layout — Server Component

   인증된 관리자 전용 레이아웃.
   1. 서버에서 사용자 인증 확인 (getUser)
   2. 관리자 프로필 조회 (getAdminProfile)
   3. 미인증/비활성 → 로그인 페이지로 리다이렉트
   4. 인증 완료 시 AdminShell(사이드바+헤더)로 감싸서 렌더링
   ========================================================================== */

async function getLocale(): Promise<string> {
  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") ?? "";
  const segments = pathname.split("/");
  const maybeLocale = segments[1];

  if (
    routing.locales.includes(maybeLocale as (typeof routing.locales)[number])
  ) {
    return maybeLocale;
  }
  return routing.defaultLocale;
}

export default async function AdminAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  // 1. 사용자 인증 확인
  const user = await getUser();
  if (!user) {
    redirect(`/${locale}/admin/login`);
  }

  // 2. 관리자 프로필 조회
  const profile = await getAdminProfile(user.id);
  if (!profile) {
    redirect(`/${locale}/admin/login`);
  }

  return <AdminShell profile={profile}>{children}</AdminShell>;
}
