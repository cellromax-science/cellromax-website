import { NextRequest, NextResponse } from "next/server";

import { MANAGED_INQUIRY_TYPES, listContactRecipientSettings } from "@/lib/contact/recipient-settings";
import { assertSameOrigin } from "@/lib/security/csrf";
import { createAdminClient, getAdminProfile } from "@/lib/supabase/admin";
import { getUser } from "@/lib/supabase/auth";

import type { InquiryType } from "@/types/contact";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function canManageRecipientSettings(role: string | undefined): boolean {
  return role === "super_admin" || role === "inquiry";
}

function normalizeRecipientEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function readRecipientEmail(
  payload: Record<string, unknown>,
  type: InquiryType,
): string | null {
  const nestedSettings = payload.settings;

  if (
    nestedSettings &&
    typeof nestedSettings === "object" &&
    !Array.isArray(nestedSettings)
  ) {
    return normalizeRecipientEmail(
      (nestedSettings as Record<string, unknown>)[type],
    );
  }

  return normalizeRecipientEmail(payload[type]);
}

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const adminProfile = await getAdminProfile(user.id);
  if (!adminProfile) {
    return NextResponse.json(
      { error: "관리자 권한이 필요합니다." },
      { status: 403 },
    );
  }

  const settings = await listContactRecipientSettings();

  return NextResponse.json({
    settings,
    canEdit: canManageRecipientSettings(adminProfile.role),
  });
}

export async function PUT(request: NextRequest) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const adminProfile = await getAdminProfile(user.id);
  if (!adminProfile) {
    return NextResponse.json(
      { error: "관리자 권한이 필요합니다." },
      { status: 403 },
    );
  }

  if (!canManageRecipientSettings(adminProfile.role)) {
    return NextResponse.json(
      { error: "문의 담당자 또는 슈퍼어드민만 수정할 수 있습니다." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  if (!body) {
    return NextResponse.json(
      { error: "저장할 설정값이 없습니다." },
      { status: 400 },
    );
  }

  const updates = MANAGED_INQUIRY_TYPES.map((type) => {
    const recipientEmail = readRecipientEmail(body, type);

    if (!recipientEmail) {
      throw new Error(`${type}:missing`);
    }

    if (!EMAIL_REGEX.test(recipientEmail)) {
      throw new Error(`${type}:invalid`);
    }

    return {
      inquiry_type: type,
      recipient_email: recipientEmail,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };
  });

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("contact_recipient_settings")
      .upsert(updates, { onConflict: "inquiry_type" });

    if (error) {
      console.error("[contact-recipient-settings] Save error:", error);
      return NextResponse.json(
        { error: "담당자 메일 설정 저장에 실패했습니다." },
        { status: 500 },
      );
    }

    const settings = await listContactRecipientSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof Error && error.message.includes(":missing")) {
      return NextResponse.json(
        { error: "모든 문의 유형의 담당자 메일을 입력해주세요." },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message.includes(":invalid")) {
      return NextResponse.json(
        { error: "유효한 이메일 주소만 저장할 수 있습니다." },
        { status: 400 },
      );
    }

    console.error("[contact-recipient-settings] Unexpected error:", error);
    return NextResponse.json(
      { error: "담당자 메일 설정 저장에 실패했습니다." },
      { status: 500 },
    );
  }
}
