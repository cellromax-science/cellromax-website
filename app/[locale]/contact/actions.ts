"use server";

import { Resend } from "resend";

import { INQUIRY_TYPE_LABEL } from "@/lib/contact/config";
import { getResolvedRecipientEmailMap } from "@/lib/contact/recipient-settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  contactFormSchema,
  type ContactFormInput,
} from "@/lib/validations/contact";

import type { EmailStatus } from "@/types/contact";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY ?? "";
const CONTACT_FROM_EMAIL =
  process.env.CONTACT_FROM_EMAIL ?? "noreply@cellromax.kr";
const CONTACT_FROM_NAME =
  process.env.CONTACT_FROM_NAME ?? "셀로맥스사이언스";

interface ActionResult {
  success: boolean;
  error?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildEmailHtml(data: ContactFormInput): string {
  const rows: string[] = [];

  rows.push(
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;vertical-align:top;white-space:nowrap;color:#666;"><strong>문의 유형</strong></td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${INQUIRY_TYPE_LABEL[data.inquiryType]}</td></tr>`,
  );
  rows.push(
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;vertical-align:top;white-space:nowrap;color:#666;"><strong>이름</strong></td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(data.name)}</td></tr>`,
  );

  if (data.inquiryType === "consumer") {
    rows.push(
      `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;vertical-align:top;white-space:nowrap;color:#666;"><strong>이메일</strong></td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(data.email)}</td></tr>`,
    );
    rows.push(
      `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;vertical-align:top;white-space:nowrap;color:#666;"><strong>연락처</strong></td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(data.phone)}</td></tr>`,
    );
  }

  if (data.inquiryType === "pharmacist") {
    rows.push(
      `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;vertical-align:top;white-space:nowrap;color:#666;"><strong>약국명</strong></td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(data.pharmacyName)}</td></tr>`,
    );
    rows.push(
      `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;vertical-align:top;white-space:nowrap;color:#666;"><strong>약국 주소</strong></td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(data.pharmacyAddress)}</td></tr>`,
    );
    if (data.email) {
      rows.push(
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;vertical-align:top;white-space:nowrap;color:#666;"><strong>이메일</strong></td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(data.email)}</td></tr>`,
      );
    }
    rows.push(
      `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;vertical-align:top;white-space:nowrap;color:#666;"><strong>연락처</strong></td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(data.phone)}</td></tr>`,
    );
  }

  if (data.inquiryType === "business") {
    rows.push(
      `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;vertical-align:top;white-space:nowrap;color:#666;"><strong>회사명</strong></td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(data.company)}</td></tr>`,
    );
    rows.push(
      `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;vertical-align:top;white-space:nowrap;color:#666;"><strong>국가</strong></td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(data.country)}</td></tr>`,
    );
    rows.push(
      `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;vertical-align:top;white-space:nowrap;color:#666;"><strong>부서 / 직책</strong></td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(data.departmentPosition)}</td></tr>`,
    );
    rows.push(
      `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;vertical-align:top;white-space:nowrap;color:#666;"><strong>이메일</strong></td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(data.email)}</td></tr>`,
    );
    rows.push(
      `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;vertical-align:top;white-space:nowrap;color:#666;"><strong>연락처</strong></td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(data.phone)}</td></tr>`,
    );
  }

  rows.push(
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;vertical-align:top;white-space:nowrap;color:#666;"><strong>제목</strong></td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(data.subject)}</td></tr>`,
  );
  rows.push(
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;vertical-align:top;white-space:nowrap;color:#666;"><strong>내용</strong></td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(data.message).replace(/\n/g, "<br>")}</td></tr>`,
  );

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#0a1628;">[${INQUIRY_TYPE_LABEL[data.inquiryType]}] 새 문의가 접수되었습니다.</h2>
      <table style="width:100%;border-collapse:collapse;">
        ${rows.join("")}
      </table>
    </div>
  `;
}

async function verifyRecaptcha(
  token: string,
): Promise<{ success: boolean; score: number }> {
  if (!RECAPTCHA_SECRET_KEY) {
    return { success: true, score: 1 };
  }

  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: RECAPTCHA_SECRET_KEY,
        response: token,
      }),
    });

    const data = await res.json();
    return { success: data.success === true, score: data.score ?? 0 };
  } catch (error) {
    console.error("[contact] reCAPTCHA verification failed:", error);
    return { success: false, score: 0 };
  }
}

function getReplyTo(data: ContactFormInput): string | undefined {
  if (data.inquiryType === "consumer") {
    return data.email;
  }

  if (data.inquiryType === "business") {
    return data.email;
  }

  if (data.inquiryType === "pharmacist") {
    return data.email || undefined;
  }

  return undefined;
}

async function updateInquiryEmailStatus(
  inquiryId: string,
  status: EmailStatus,
  emailSentAt: string | null,
): Promise<void> {
  try {
    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from("inquiries")
      .update({
        email_status: status,
        email_sent_at: emailSentAt,
      })
      .eq("id", inquiryId);

    if (error) {
      console.error("[contact] Failed to update inquiry email status:", error);
    }
  } catch (error) {
    console.error(
      "[contact] Unexpected error while updating inquiry email status:",
      error,
    );
  }
}

export async function submitInquiry(
  data: ContactFormInput,
  recaptchaToken?: string,
): Promise<ActionResult> {
  const parsed = contactFormSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "입력값이 올바르지 않습니다." };
  }

  let recaptchaScore: number | null = null;

  if (recaptchaToken) {
    const recaptchaResult = await verifyRecaptcha(recaptchaToken);
    recaptchaScore = recaptchaResult.score;

    if (!recaptchaResult.success || recaptchaResult.score < 0.3) {
      return {
        success: false,
        error: "스팸으로 감지되었습니다. 다시 시도해주세요.",
      };
    }
  }

  const validated = parsed.data;
  const recipientEmailMap = await getResolvedRecipientEmailMap();
  const recipientEmail = recipientEmailMap[validated.inquiryType];

  const insertData: Record<string, unknown> = {
    inquiry_type: validated.inquiryType,
    name: validated.name,
    subject: validated.subject,
    message: validated.message,
    recipient_email: recipientEmail,
    recaptcha_score: recaptchaScore,
    email_status: "pending",
  };

  if (validated.inquiryType === "consumer") {
    insertData.email = validated.email;
    insertData.phone = validated.phone;
  }

  if (validated.inquiryType === "pharmacist") {
    insertData.pharmacy_name = validated.pharmacyName;
    insertData.pharmacy_address = validated.pharmacyAddress;
    insertData.phone = validated.phone;
    if (validated.email) {
      insertData.email = validated.email;
    }
  }

  if (validated.inquiryType === "business") {
    insertData.company = validated.company;
    insertData.country = validated.country;
    insertData.department_position = validated.departmentPosition;
    insertData.email = validated.email;
    insertData.phone = validated.phone;
  }

  let inquiryId: string;

  try {
    const adminSupabase = createAdminClient();
    const { data: insertedInquiry, error: insertError } = await adminSupabase
      .from("inquiries")
      .insert(insertData)
      .select("id")
      .single();

    if (insertError || !insertedInquiry) {
      console.error("[contact] Inquiry insert error:", insertError);
      return { success: false, error: "문의 저장에 실패했습니다." };
    }

    inquiryId = insertedInquiry.id;
  } catch (error) {
    console.error("[contact] Inquiry insert failed:", error);

    try {
      const supabase = await createClient();
      const { data: insertedInquiry, error: insertError } = await supabase
        .from("inquiries")
        .insert(insertData)
        .select("id")
        .single();

      if (insertError || !insertedInquiry) {
        console.error("[contact] Fallback inquiry insert error:", insertError);
        return { success: false, error: "문의 저장에 실패했습니다." };
      }

      inquiryId = insertedInquiry.id;
    } catch (fallbackError) {
      console.error("[contact] Fallback inquiry insert failed:", fallbackError);
      return { success: false, error: "문의 저장에 실패했습니다." };
    }
  }

  try {
    if (!resend) {
      throw new Error("RESEND_API_KEY is not configured.");
    }

    const typeLabel = INQUIRY_TYPE_LABEL[validated.inquiryType];
    const sentAt = new Date().toISOString();

    await resend.emails.send({
      from: `${CONTACT_FROM_NAME} <${CONTACT_FROM_EMAIL}>`,
      to: recipientEmail,
      replyTo: getReplyTo(validated),
      subject: `[${typeLabel}] ${validated.subject}`,
      html: buildEmailHtml(validated),
    });

    await updateInquiryEmailStatus(inquiryId, "sent", sentAt);
  } catch (emailError) {
    console.error("[contact] Email send error:", emailError);
    await updateInquiryEmailStatus(inquiryId, "failed", null);
  }

  return { success: true };
}
