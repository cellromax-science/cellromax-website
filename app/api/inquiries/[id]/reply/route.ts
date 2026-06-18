import { NextRequest, NextResponse } from "next/server";

import { Resend } from "resend";

import {
  REPLY_FROM_EMAIL,
  REPLY_FROM_NAME,
  buildReplyEmailHtml,
} from "@/lib/contact/reply";
import { assertSameOrigin } from "@/lib/security/csrf";
import { exceedsLmsLimit, sendSms } from "@/lib/sms/bizm";
import { createAdminClient, getAdminProfile } from "@/lib/supabase/admin";
import { getUser } from "@/lib/supabase/auth";

import type { ReplyChannel } from "@/types/contact";

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EMAIL_BODY_MAX = 5000;
const SUBJECT_MAX = 300;

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

function canReply(role: string | undefined): boolean {
  return role === "super_admin" || role === "inquiry";
}

interface ChannelResult {
  channel: ReplyChannel;
  status: "sent" | "failed";
  error?: string;
}

/**
 * 문의 답장 이력 조회 (관리자용)
 *
 * GET /api/inquiries/:id/reply
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;
  if (!uuidRegex.test(id)) {
    return NextResponse.json(
      { error: "유효하지 않은 문의 ID입니다." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("inquiry_replies")
    .select("*")
    .eq("inquiry_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[inquiries/reply/GET] query error:", error);
    return NextResponse.json(
      { error: "답장 이력 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({ replies: data ?? [] });
}

/**
 * 문의 답장 발송 (관리자용)
 *
 * POST /api/inquiries/:id/reply
 * Body: { channels: ('email'|'sms')[], subject?, body }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  if (!canReply(adminProfile.role)) {
    return NextResponse.json(
      { error: "문의 담당자 또는 슈퍼어드민만 답장할 수 있습니다." },
      { status: 403 },
    );
  }

  const { id } = await params;
  if (!uuidRegex.test(id)) {
    return NextResponse.json(
      { error: "유효하지 않은 문의 ID입니다." },
      { status: 400 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    channels?: unknown;
    subject?: unknown;
    body?: unknown;
  } | null;

  if (!body) {
    return NextResponse.json(
      { error: "요청 본문이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const channels = Array.isArray(body.channels)
    ? (body.channels.filter(
        (c): c is ReplyChannel => c === "email" || c === "sms",
      ) as ReplyChannel[])
    : [];

  if (channels.length === 0) {
    return NextResponse.json(
      { error: "발송할 채널을 선택해주세요." },
      { status: 400 },
    );
  }

  const replyBody = typeof body.body === "string" ? body.body.trim() : "";
  const subject =
    typeof body.subject === "string" ? body.subject.trim() : "";

  if (!replyBody) {
    return NextResponse.json(
      { error: "답변 내용을 입력해주세요." },
      { status: 400 },
    );
  }

  if (replyBody.length > EMAIL_BODY_MAX) {
    return NextResponse.json(
      { error: `답변 내용은 최대 ${EMAIL_BODY_MAX}자까지 입력할 수 있습니다.` },
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

  const { data: inquiry, error: inquiryError } = await supabase
    .from("inquiries")
    .select("id, email, phone")
    .eq("id", id)
    .single();

  if (inquiryError || !inquiry) {
    return NextResponse.json(
      { error: "해당 문의를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const nowIso = new Date().toISOString();
  const results: ChannelResult[] = [];

  for (const channel of channels) {
    if (channel === "email") {
      if (!inquiry.email) {
        results.push({
          channel,
          status: "failed",
          error: "문의자의 이메일 주소가 없습니다.",
        });
        await supabase.from("inquiry_replies").insert({
          inquiry_id: id,
          channel,
          to_address: "",
          subject: subject || null,
          body: replyBody,
          status: "failed",
          error_message: "문의자의 이메일 주소가 없습니다.",
          sent_by: user.id,
        });
        continue;
      }

      try {
        if (!resend) {
          throw new Error("RESEND_API_KEY가 설정되지 않았습니다.");
        }

        const sendResult = await resend.emails.send({
          from: `${REPLY_FROM_NAME} <${REPLY_FROM_EMAIL}>`,
          to: inquiry.email,
          subject: subject || "문의에 대한 답변입니다",
          html: buildReplyEmailHtml(replyBody),
        });

        if (sendResult.error) {
          throw new Error(sendResult.error.message);
        }

        results.push({ channel, status: "sent" });
        await supabase.from("inquiry_replies").insert({
          inquiry_id: id,
          channel,
          to_address: inquiry.email,
          subject: subject || null,
          body: replyBody,
          status: "sent",
          provider_id: sendResult.data?.id ?? null,
          sent_by: user.id,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "메일 발송에 실패했습니다.";
        console.error("[inquiries/reply/POST] email send error:", error);
        results.push({ channel, status: "failed", error: message });
        await supabase.from("inquiry_replies").insert({
          inquiry_id: id,
          channel,
          to_address: inquiry.email,
          subject: subject || null,
          body: replyBody,
          status: "failed",
          error_message: message,
          sent_by: user.id,
        });
      }

      continue;
    }

    // channel === "sms" — BizM 문자(SMS/LMS) 발송
    if (!inquiry.phone) {
      results.push({
        channel,
        status: "failed",
        error: "문의자의 전화번호가 없습니다.",
      });
      await supabase.from("inquiry_replies").insert({
        inquiry_id: id,
        channel,
        to_address: "",
        body: replyBody,
        status: "failed",
        error_message: "문의자의 전화번호가 없습니다.",
        sent_by: user.id,
      });
      continue;
    }

    // 문자는 제목/안내 문구 없이 답변 본문만 발송한다.
    const smsBody = replyBody.trim();

    if (exceedsLmsLimit(smsBody)) {
      const msg = "문자 본문이 너무 깁니다. (LMS 최대 약 1,000자)";
      results.push({ channel, status: "failed", error: msg });
      await supabase.from("inquiry_replies").insert({
        inquiry_id: id,
        channel,
        to_address: inquiry.phone,
        body: smsBody,
        status: "failed",
        error_message: msg,
        sent_by: user.id,
      });
      continue;
    }

    const smsResult = await sendSms({
      to: inquiry.phone,
      text: smsBody,
    });

    results.push({
      channel,
      status: smsResult.ok ? "sent" : "failed",
      error: smsResult.ok ? undefined : smsResult.message,
    });
    await supabase.from("inquiry_replies").insert({
      inquiry_id: id,
      channel,
      to_address: inquiry.phone,
      body: smsBody,
      status: smsResult.ok ? "sent" : "failed",
      provider_id: smsResult.msgid,
      error_message: smsResult.ok ? null : smsResult.message,
      sent_by: user.id,
    });
  }

  const hasSuccess = results.some((r) => r.status === "sent");

  if (hasSuccess) {
    const lastSentChannel = results
      .filter((r) => r.status === "sent")
      .at(-1)?.channel;

    await supabase
      .from("inquiries")
      .update({
        status: "replied",
        replied_at: nowIso,
        replied_by: user.id,
        last_replied_channel: lastSentChannel,
      })
      .eq("id", id);
  }

  return NextResponse.json({
    results,
    repliedAt: hasSuccess ? nowIso : null,
  });
}
