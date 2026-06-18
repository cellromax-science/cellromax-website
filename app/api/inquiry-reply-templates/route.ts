import { NextRequest, NextResponse } from "next/server";

import { assertSameOrigin } from "@/lib/security/csrf";
import { createAdminClient, getAdminProfile } from "@/lib/supabase/admin";
import { getUser } from "@/lib/supabase/auth";

import type { InquiryType, ReplyChannel } from "@/types/contact";

const TITLE_MAX = 100;
const SUBJECT_MAX = 300;
const BODY_MAX = 5000;

function canManage(role: string | undefined): boolean {
  return role === "super_admin" || role === "inquiry";
}

function normalizeChannel(value: unknown): ReplyChannel | null {
  return value === "email" || value === "sms" ? value : null;
}

function normalizeInquiryType(value: unknown): InquiryType | null {
  return value === "consumer" || value === "pharmacist" || value === "business"
    ? value
    : null;
}

/**
 * 답장 템플릿 목록 조회
 *
 * GET /api/inquiry-reply-templates
 */
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

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("inquiry_reply_templates")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[inquiry-reply-templates/GET] query error:", error);
    return NextResponse.json(
      { error: "템플릿 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    templates: data ?? [],
    canManage: canManage(adminProfile.role),
  });
}

/**
 * 답장 템플릿 생성
 *
 * POST /api/inquiry-reply-templates
 * Body: { title, channel?, subject?, body, inquiry_type? }
 */
export async function POST(request: NextRequest) {
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

  if (!canManage(adminProfile.role)) {
    return NextResponse.json(
      { error: "문의 담당자 또는 슈퍼어드민만 템플릿을 추가할 수 있습니다." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  if (!body) {
    return NextResponse.json(
      { error: "요청 본문이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const templateBody = typeof body.body === "string" ? body.body.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";

  if (!title || title.length > TITLE_MAX) {
    return NextResponse.json(
      { error: "템플릿 제목을 1~100자로 입력해주세요." },
      { status: 400 },
    );
  }

  if (!templateBody || templateBody.length > BODY_MAX) {
    return NextResponse.json(
      { error: `템플릿 내용을 1~${BODY_MAX}자로 입력해주세요.` },
      { status: 400 },
    );
  }

  if (subject.length > SUBJECT_MAX) {
    return NextResponse.json(
      { error: `제목은 최대 ${SUBJECT_MAX}자까지 입력할 수 있습니다.` },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("inquiry_reply_templates")
    .insert({
      title,
      channel: normalizeChannel(body.channel),
      subject: subject || null,
      body: templateBody,
      inquiry_type: normalizeInquiryType(body.inquiry_type),
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[inquiry-reply-templates/POST] insert error:", error);
    return NextResponse.json(
      { error: "템플릿 저장에 실패했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({ template: data });
}
