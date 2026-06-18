import { NextRequest, NextResponse } from "next/server";

import { assertSameOrigin } from "@/lib/security/csrf";
import { createAdminClient, getAdminProfile } from "@/lib/supabase/admin";
import { getUser } from "@/lib/supabase/auth";

import type { InquiryType, ReplyChannel } from "@/types/contact";

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

async function authorize() {
  const user = await getUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 }),
    };
  }

  const adminProfile = await getAdminProfile(user.id);
  if (!adminProfile) {
    return {
      error: NextResponse.json(
        { error: "관리자 권한이 필요합니다." },
        { status: 403 },
      ),
    };
  }

  if (!canManage(adminProfile.role)) {
    return {
      error: NextResponse.json(
        { error: "문의 담당자 또는 슈퍼어드민만 템플릿을 관리할 수 있습니다." },
        { status: 403 },
      ),
    };
  }

  return { user };
}

/**
 * 답장 템플릿 수정
 *
 * PUT /api/inquiry-reply-templates/:id
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  const auth = await authorize();
  if (auth.error) return auth.error;

  const { id } = await params;
  if (!uuidRegex.test(id)) {
    return NextResponse.json(
      { error: "유효하지 않은 템플릿 ID입니다." },
      { status: 400 },
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

  const updateData: Record<string, unknown> = {};

  if (body.title !== undefined) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title || title.length > TITLE_MAX) {
      return NextResponse.json(
        { error: "템플릿 제목을 1~100자로 입력해주세요." },
        { status: 400 },
      );
    }
    updateData.title = title;
  }

  if (body.body !== undefined) {
    const templateBody =
      typeof body.body === "string" ? body.body.trim() : "";
    if (!templateBody || templateBody.length > BODY_MAX) {
      return NextResponse.json(
        { error: `템플릿 내용을 1~${BODY_MAX}자로 입력해주세요.` },
        { status: 400 },
      );
    }
    updateData.body = templateBody;
  }

  if (body.subject !== undefined) {
    const subject =
      typeof body.subject === "string" ? body.subject.trim() : "";
    if (subject.length > SUBJECT_MAX) {
      return NextResponse.json(
        { error: `제목은 최대 ${SUBJECT_MAX}자까지 입력할 수 있습니다.` },
        { status: 400 },
      );
    }
    updateData.subject = subject || null;
  }

  if (body.channel !== undefined) {
    updateData.channel = normalizeChannel(body.channel);
  }

  if (body.inquiry_type !== undefined) {
    updateData.inquiry_type = normalizeInquiryType(body.inquiry_type);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "수정할 데이터가 없습니다." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("inquiry_reply_templates")
    .update(updateData)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("[inquiry-reply-templates/PUT] update error:", error);
    return NextResponse.json(
      { error: "템플릿 수정에 실패했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({ template: data });
}

/**
 * 답장 템플릿 삭제
 *
 * DELETE /api/inquiry-reply-templates/:id
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  const auth = await authorize();
  if (auth.error) return auth.error;

  const { id } = await params;
  if (!uuidRegex.test(id)) {
    return NextResponse.json(
      { error: "유효하지 않은 템플릿 ID입니다." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("inquiry_reply_templates")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[inquiry-reply-templates/DELETE] delete error:", error);
    return NextResponse.json(
      { error: "템플릿 삭제에 실패했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
