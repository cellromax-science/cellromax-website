"use server";

import { createClient } from "@/lib/supabase/server";
import { contactFormSchema, type ContactFormInput } from "@/lib/validations/contact";
import { INQUIRY_EMAIL_MAP, INQUIRY_TYPE_LABEL } from "@/lib/contact/config";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface ActionResult {
  success: boolean;
  error?: string;
}

export async function submitInquiry(data: ContactFormInput): Promise<ActionResult> {
  // 1. Zod 검증
  const parsed = contactFormSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "입력값이 올바르지 않습니다." };
  }

  const validated = parsed.data;
  const recipientEmail = INQUIRY_EMAIL_MAP[validated.inquiryType];

  // 2. Supabase INSERT
  const supabase = await createClient();

  const insertData: Record<string, unknown> = {
    inquiry_type: validated.inquiryType,
    name: validated.name,
    subject: validated.subject,
    message: validated.message,
    recipient_email: recipientEmail,
  };

  if (validated.inquiryType === "consumer") {
    insertData.email = validated.email;
    insertData.phone = validated.phone;
  } else if (validated.inquiryType === "pharmacist") {
    insertData.pharmacy_name = validated.pharmacyName;
    insertData.pharmacy_address = validated.pharmacyAddress;
  } else if (validated.inquiryType === "business") {
    insertData.company = validated.company;
    insertData.country = validated.country;
    insertData.department_position = validated.departmentPosition;
    insertData.email = validated.email;
  }

  const { error: dbError } = await supabase
    .from("inquiries")
    .insert(insertData);

  if (dbError) {
    console.error("Inquiry insert error:", dbError);
    return { success: false, error: "문의 저장에 실패했습니다." };
  }

  // 3. Resend 이메일 전송
  try {
    const typeLabel = INQUIRY_TYPE_LABEL[validated.inquiryType];

    await resend.emails.send({
      from: "셀로맥스사이언스 <noreply@cellromax.com>",
      to: recipientEmail,
      subject: `[${typeLabel}] ${validated.subject}`,
      html: buildEmailHtml(validated),
    });
  } catch (emailError) {
    // 이메일 전송 실패는 문의 접수 자체를 실패시키지 않음
    console.error("Email send error:", emailError);
  }

  return { success: true };
}

function buildEmailHtml(data: ContactFormInput): string {
  const rows: string[] = [];

  rows.push(`<tr><td style="padding: 8px 12px; border-bottom: 1px solid #eee; vertical-align: top; white-space: nowrap; color: #666;"><strong>문의유형</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${INQUIRY_TYPE_LABEL[data.inquiryType]}</td></tr>`);
  rows.push(`<tr><td style="padding: 8px 12px; border-bottom: 1px solid #eee; vertical-align: top; white-space: nowrap; color: #666;"><strong>성함</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${escapeHtml(data.name)}</td></tr>`);

  if (data.inquiryType === "consumer") {
    rows.push(`<tr><td style="padding: 8px 12px; border-bottom: 1px solid #eee; vertical-align: top; white-space: nowrap; color: #666;"><strong>이메일</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${escapeHtml(data.email)}</td></tr>`);
    rows.push(`<tr><td style="padding: 8px 12px; border-bottom: 1px solid #eee; vertical-align: top; white-space: nowrap; color: #666;"><strong>연락처</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${escapeHtml(data.phone)}</td></tr>`);
  } else if (data.inquiryType === "pharmacist") {
    rows.push(`<tr><td style="padding: 8px 12px; border-bottom: 1px solid #eee; vertical-align: top; white-space: nowrap; color: #666;"><strong>약국명</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${escapeHtml(data.pharmacyName)}</td></tr>`);
    rows.push(`<tr><td style="padding: 8px 12px; border-bottom: 1px solid #eee; vertical-align: top; white-space: nowrap; color: #666;"><strong>약국 주소</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${escapeHtml(data.pharmacyAddress)}</td></tr>`);
  } else if (data.inquiryType === "business") {
    rows.push(`<tr><td style="padding: 8px 12px; border-bottom: 1px solid #eee; vertical-align: top; white-space: nowrap; color: #666;"><strong>회사명</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${escapeHtml(data.company)}</td></tr>`);
    rows.push(`<tr><td style="padding: 8px 12px; border-bottom: 1px solid #eee; vertical-align: top; white-space: nowrap; color: #666;"><strong>국가</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${escapeHtml(data.country)}</td></tr>`);
    rows.push(`<tr><td style="padding: 8px 12px; border-bottom: 1px solid #eee; vertical-align: top; white-space: nowrap; color: #666;"><strong>부서/직급</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${escapeHtml(data.departmentPosition)}</td></tr>`);
    rows.push(`<tr><td style="padding: 8px 12px; border-bottom: 1px solid #eee; vertical-align: top; white-space: nowrap; color: #666;"><strong>이메일</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${escapeHtml(data.email)}</td></tr>`);
  }

  rows.push(`<tr><td style="padding: 8px 12px; border-bottom: 1px solid #eee; vertical-align: top; white-space: nowrap; color: #666;"><strong>제목</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${escapeHtml(data.subject)}</td></tr>`);
  rows.push(`<tr><td style="padding: 8px 12px; border-bottom: 1px solid #eee; vertical-align: top; white-space: nowrap; color: #666;"><strong>내용</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${escapeHtml(data.message).replace(/\n/g, "<br>")}</td></tr>`);

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0a1628;">[${INQUIRY_TYPE_LABEL[data.inquiryType]}] 새 문의가 접수되었습니다</h2>
      <table style="width: 100%; border-collapse: collapse;">
        ${rows.join("")}
      </table>
    </div>
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
