import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { getUser } from "@/lib/supabase/auth";
import { getAdminProfile, createAdminClient } from "@/lib/supabase/admin";
import { AccountListClient } from "@/components/admin/AccountListClient";
import { routing } from "@/lib/i18n/routing";

/* ==========================================================================
   Admin Accounts Page — Server Component

   Super Admin 전용 계정 관리 페이지.
   - 인증 + Super Admin 역할 확인
   - Admin Client(RLS 우회)로 전체 계정 목록 패칭
   - 초기 데이터를 AccountListClient에 전달
   - 이후 생성/수정/비활성화는 클라이언트에서 API 호출로 처리
   ========================================================================== */

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "계정 관리",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** 현재 요청의 locale을 추출합니다 (기존 프로젝트 패턴 따름) */
async function getLocale(): Promise<string> {
  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") ?? "";
  const segments = pathname.split("/");
  const maybeLocale = segments[1];

  if (
    routing.locales.includes(
      maybeLocale as (typeof routing.locales)[number],
    )
  ) {
    return maybeLocale;
  }

  return routing.defaultLocale;
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function AccountsPage() {
  // 1. 인증 확인 — 미로그인 시 로그인 페이지로 리다이렉트
  const user = await getUser();

  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/admin/login`);
  }

  // 2. Super Admin 역할 확인 — 권한 없으면 대시보드로 리다이렉트
  const profile = await getAdminProfile(user.id);

  if (!profile || profile.role !== "super_admin") {
    const locale = await getLocale();
    redirect(`/${locale}/admin/dashboard`);
  }

  // 3. Admin Client(RLS 우회)로 전체 계정 목록 조회
  const adminClient = createAdminClient();

  const { data: accounts, count } = await adminClient
    .from("admin_profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  return (
    <AccountListClient
      initialAccounts={accounts ?? []}
      initialTotal={count ?? 0}
    />
  );
}
