import { NextRequest, NextResponse } from "next/server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { assertSameOrigin } from "@/lib/security/csrf";
import { getAdminProfile } from "@/lib/supabase/admin";
import { getUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72; // Supabase/bcrypt 한계

/**
 * 본인 비밀번호 변경 API (로그인한 관리자 본인)
 *
 * POST /api/account/password
 * Body: { currentPassword: string, newPassword: string }
 */
export async function POST(request: NextRequest) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  const user = await getUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  // 활성 관리자만 허용
  const adminProfile = await getAdminProfile(user.id);
  if (!adminProfile) {
    return NextResponse.json(
      { error: "관리자 권한이 필요합니다." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    currentPassword?: unknown;
    newPassword?: unknown;
  } | null;

  const currentPassword =
    typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword =
    typeof body?.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "현재 비밀번호와 새 비밀번호를 모두 입력해주세요." },
      { status: 400 },
    );
  }

  if (newPassword.length < PASSWORD_MIN || newPassword.length > PASSWORD_MAX) {
    return NextResponse.json(
      { error: `새 비밀번호는 ${PASSWORD_MIN}자 이상이어야 합니다.` },
      { status: 400 },
    );
  }

  if (newPassword === currentPassword) {
    return NextResponse.json(
      { error: "새 비밀번호가 현재 비밀번호와 동일합니다." },
      { status: 400 },
    );
  }

  // 1. 현재 비밀번호 검증 — 세션을 건드리지 않는 임시 클라이언트로 재인증
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json(
      { error: "서버 설정 오류로 비밀번호를 변경할 수 없습니다." },
      { status: 500 },
    );
  }

  const verifyClient = createSupabaseClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: verifyError } = await verifyClient.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (verifyError) {
    return NextResponse.json(
      { error: "현재 비밀번호가 일치하지 않습니다." },
      { status: 400 },
    );
  }

  // 2. 본인 세션으로 비밀번호 변경
  const supabase = await createClient();
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    console.error("[account/password] update error:", updateError);
    return NextResponse.json(
      { error: `비밀번호 변경에 실패했습니다: ${updateError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
