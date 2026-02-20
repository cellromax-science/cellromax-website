# 온라인 문의 페이지 - 탭 기반 3분류 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 온라인 문의 페이지를 소비자/약사/비즈니스 3개 탭으로 분리하여 각 유형별 다른 폼 필드와 수신 이메일을 갖는 문의 시스템 구축

**Architecture:** 기존 `inquiries` DB 테이블을 마이그레이션으로 확장하고, `Tabs` UI 컴포넌트를 활용한 탭 전환 폼 페이지를 구현. Server Action으로 Zod 검증 → Supabase INSERT → Resend 이메일 전송 파이프라인 구축.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (PostgreSQL + RLS), Resend, Zod v4, next-intl v4, Tailwind CSS v4

---

### Task 1: DB 마이그레이션 — inquiries 테이블 확장

**Files:**
- Create: `supabase/migrations/20260221000001_inquiries_tab_schema.sql`

**Step 1: 마이그레이션 SQL 작성**

```sql
-- 온라인 문의 탭 기반 3분류 스키마 변경
-- inquiry_type: product/buyer/partnership/other → consumer/pharmacist/business

-- 1. 기존 CHECK 제약조건 제거
ALTER TABLE inquiries DROP CONSTRAINT IF EXISTS inquiries_inquiry_type_check;

-- 2. 새 CHECK 제약조건 추가
ALTER TABLE inquiries ADD CONSTRAINT inquiries_inquiry_type_check
  CHECK (inquiry_type IN ('consumer', 'pharmacist', 'business'));

-- 3. 새 컬럼 추가
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS subject VARCHAR(300);
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS pharmacy_name VARCHAR(200);
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS pharmacy_address TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS department_position VARCHAR(200);
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS recipient_email VARCHAR(200);

-- 4. country를 NULL 허용으로 변경 (비즈니스만 사용)
ALTER TABLE inquiries ALTER COLUMN country DROP NOT NULL;

-- 5. inquiry_type 인덱스
CREATE INDEX IF NOT EXISTS idx_inquiries_type ON inquiries(inquiry_type);
```

**Step 2: 커밋**

```bash
git add supabase/migrations/20260221000001_inquiries_tab_schema.sql
git commit -m "feat(db): inquiries 테이블 탭 기반 3분류 스키마 확장"
```

---

### Task 2: TypeScript 타입 업데이트

**Files:**
- Modify: `types/contact.ts`

**Step 1: 타입 정의 업데이트**

`types/contact.ts` 전체를 다음으로 교체:

```typescript
// ---------------------------------------------------------------------------
// Inquiry Types — 탭 기반 3분류
// ---------------------------------------------------------------------------

export type InquiryType = 'consumer' | 'pharmacist' | 'business';
export type InquiryStatus = 'pending' | 'reviewing' | 'replied' | 'closed';
export type EmailStatus = 'pending' | 'sent' | 'failed';

// ---------------------------------------------------------------------------
// 탭별 폼 데이터
// ---------------------------------------------------------------------------

/** 소비자 문의 폼 */
export interface ConsumerFormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  privacy: boolean;
}

/** 약사 문의 폼 */
export interface PharmacistFormData {
  name: string;
  pharmacyName: string;
  pharmacyAddress: string;
  subject: string;
  message: string;
  privacy: boolean;
}

/** 비즈니스 문의 폼 */
export interface BusinessFormData {
  company: string;
  country: string;
  departmentPosition: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  privacy: boolean;
}

// ---------------------------------------------------------------------------
// DB 모델
// ---------------------------------------------------------------------------

export interface Inquiry {
  id: string;
  name: string;
  company: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  subject: string | null;
  inquiry_type: InquiryType;
  message: string;
  pharmacy_name: string | null;
  pharmacy_address: string | null;
  department_position: string | null;
  recipient_email: string | null;
  status: InquiryStatus;
  admin_memo: string | null;
  replied_at: string | null;
  replied_by: string | null;
  recaptcha_score: number | null;
  ip_address: string | null;
  email_sent_at: string | null;
  email_status: EmailStatus;
  created_at: string;
  updated_at: string;
}

export interface InquiryInsert {
  name: string;
  inquiry_type: InquiryType;
  message: string;
  subject: string;
  company?: string | null;
  country?: string | null;
  email?: string | null;
  phone?: string | null;
  pharmacy_name?: string | null;
  pharmacy_address?: string | null;
  department_position?: string | null;
  recipient_email?: string | null;
  recaptcha_score?: number | null;
  ip_address?: string | null;
}
```

**Step 2: 커밋**

```bash
git add types/contact.ts
git commit -m "feat(types): inquiries 타입을 탭 기반 3분류로 업데이트"
```

---

### Task 3: i18n 메시지 업데이트 — 4개 언어

**Files:**
- Modify: `messages/ko.json` — `contact` 네임스페이스 교체
- Modify: `messages/en.json` — `contact` 네임스페이스 교체
- Modify: `messages/zh.json` — `contact` 네임스페이스 교체
- Modify: `messages/vi.json` — `contact` 네임스페이스 교체

**Step 1: ko.json contact 섹션 교체**

기존 `"contact": { ... }` 블록을 다음으로 교체:

```json
"contact": {
  "title": "온라인 문의",
  "subtitle": "궁금하신 사항을 문의해 주세요.",
  "tabs": {
    "consumer": "소비자 문의",
    "pharmacist": "약사 문의",
    "business": "비즈니스 문의"
  },
  "form": {
    "name": "성함",
    "namePlaceholder": "성함을 입력해 주세요",
    "email": "이메일",
    "emailPlaceholder": "이메일을 입력해 주세요",
    "phone": "연락처",
    "phonePlaceholder": "연락처를 입력해 주세요",
    "subject": "제목",
    "subjectPlaceholder": "제목을 입력해 주세요",
    "message": "내용",
    "messagePlaceholder": "문의 내용을 입력해 주세요",
    "company": "회사명",
    "companyPlaceholder": "회사명을 입력해 주세요",
    "country": "국가",
    "countryPlaceholder": "국가를 선택해 주세요",
    "departmentPosition": "부서 및 직급",
    "departmentPositionPlaceholder": "부서 및 직급을 입력해 주세요",
    "pharmacyName": "약국명",
    "pharmacyNamePlaceholder": "약국명을 입력해 주세요",
    "pharmacyAddress": "약국 주소",
    "pharmacyAddressPlaceholder": "약국 주소를 입력해 주세요",
    "privacy": "개인정보 수집 및 이용에 동의합니다.",
    "submit": "문의 보내기",
    "submitting": "전송 중..."
  },
  "countries": {
    "KR": "대한민국",
    "US": "미국",
    "CN": "중국",
    "JP": "일본",
    "VN": "베트남",
    "TH": "태국",
    "RU": "러시아",
    "KZ": "카자흐스탄",
    "OTHER": "기타"
  },
  "success": {
    "title": "문의가 접수되었습니다.",
    "message": "빠른 시일 내에 답변 드리겠습니다."
  },
  "error": {
    "title": "전송에 실패했습니다.",
    "message": "잠시 후 다시 시도해 주세요."
  },
  "validation": {
    "required": "필수 입력 항목입니다.",
    "invalidEmail": "올바른 이메일 형식을 입력해 주세요.",
    "privacyRequired": "개인정보 수집 및 이용에 동의해 주세요.",
    "tooLong": "입력 가능한 글자 수를 초과했습니다."
  }
}
```

**Step 2: en.json contact 섹션 교체**

```json
"contact": {
  "title": "Contact Us",
  "subtitle": "Feel free to ask us anything.",
  "tabs": {
    "consumer": "Consumer Inquiry",
    "pharmacist": "Pharmacist Inquiry",
    "business": "Business Inquiry"
  },
  "form": {
    "name": "Name",
    "namePlaceholder": "Enter your name",
    "email": "Email",
    "emailPlaceholder": "Enter your email",
    "phone": "Phone",
    "phonePlaceholder": "Enter your phone number",
    "subject": "Subject",
    "subjectPlaceholder": "Enter subject",
    "message": "Message",
    "messagePlaceholder": "Enter your message",
    "company": "Company",
    "companyPlaceholder": "Enter your company name",
    "country": "Country",
    "countryPlaceholder": "Select your country",
    "departmentPosition": "Department & Position",
    "departmentPositionPlaceholder": "Enter your department and position",
    "pharmacyName": "Pharmacy Name",
    "pharmacyNamePlaceholder": "Enter pharmacy name",
    "pharmacyAddress": "Pharmacy Address",
    "pharmacyAddressPlaceholder": "Enter pharmacy address",
    "privacy": "I agree to the collection and use of personal information.",
    "submit": "Send Message",
    "submitting": "Sending..."
  },
  "countries": {
    "KR": "South Korea",
    "US": "United States",
    "CN": "China",
    "JP": "Japan",
    "VN": "Vietnam",
    "TH": "Thailand",
    "RU": "Russia",
    "KZ": "Kazakhstan",
    "OTHER": "Other"
  },
  "success": {
    "title": "Your inquiry has been received.",
    "message": "We will get back to you as soon as possible."
  },
  "error": {
    "title": "Failed to send.",
    "message": "Please try again later."
  },
  "validation": {
    "required": "This field is required.",
    "invalidEmail": "Please enter a valid email address.",
    "privacyRequired": "You must agree to the privacy policy.",
    "tooLong": "Exceeds maximum character limit."
  }
}
```

**Step 3: zh.json contact 섹션 교체**

```json
"contact": {
  "title": "在线咨询",
  "subtitle": "欢迎随时向我们咨询。",
  "tabs": {
    "consumer": "消费者咨询",
    "pharmacist": "药师咨询",
    "business": "商务咨询"
  },
  "form": {
    "name": "姓名",
    "namePlaceholder": "请输入姓名",
    "email": "邮箱",
    "emailPlaceholder": "请输入邮箱",
    "phone": "联系方式",
    "phonePlaceholder": "请输入联系方式",
    "subject": "标题",
    "subjectPlaceholder": "请输入标题",
    "message": "内容",
    "messagePlaceholder": "请输入咨询内容",
    "company": "公司名称",
    "companyPlaceholder": "请输入公司名称",
    "country": "国家",
    "countryPlaceholder": "请选择国家",
    "departmentPosition": "部门及职位",
    "departmentPositionPlaceholder": "请输入部门及职位",
    "pharmacyName": "药店名称",
    "pharmacyNamePlaceholder": "请输入药店名称",
    "pharmacyAddress": "药店地址",
    "pharmacyAddressPlaceholder": "请输入药店地址",
    "privacy": "我同意收集和使用个人信息。",
    "submit": "发送咨询",
    "submitting": "发送中..."
  },
  "countries": {
    "KR": "韩国",
    "US": "美国",
    "CN": "中国",
    "JP": "日本",
    "VN": "越南",
    "TH": "泰国",
    "RU": "俄罗斯",
    "KZ": "哈萨克斯坦",
    "OTHER": "其他"
  },
  "success": {
    "title": "咨询已受理。",
    "message": "我们将尽快回复您。"
  },
  "error": {
    "title": "发送失败。",
    "message": "请稍后再试。"
  },
  "validation": {
    "required": "此为必填项。",
    "invalidEmail": "请输入有效的邮箱地址。",
    "privacyRequired": "请同意个人信息收集和使用。",
    "tooLong": "超过最大字符限制。"
  }
}
```

**Step 4: vi.json contact 섹션 교체**

```json
"contact": {
  "title": "Liên hệ trực tuyến",
  "subtitle": "Hãy liên hệ với chúng tôi nếu bạn có thắc mắc.",
  "tabs": {
    "consumer": "Yêu cầu người tiêu dùng",
    "pharmacist": "Yêu cầu dược sĩ",
    "business": "Yêu cầu kinh doanh"
  },
  "form": {
    "name": "Họ tên",
    "namePlaceholder": "Nhập họ tên",
    "email": "Email",
    "emailPlaceholder": "Nhập địa chỉ email",
    "phone": "Số điện thoại",
    "phonePlaceholder": "Nhập số điện thoại",
    "subject": "Tiêu đề",
    "subjectPlaceholder": "Nhập tiêu đề",
    "message": "Nội dung",
    "messagePlaceholder": "Nhập nội dung liên hệ",
    "company": "Tên công ty",
    "companyPlaceholder": "Nhập tên công ty",
    "country": "Quốc gia",
    "countryPlaceholder": "Chọn quốc gia",
    "departmentPosition": "Phòng ban & chức vụ",
    "departmentPositionPlaceholder": "Nhập phòng ban và chức vụ",
    "pharmacyName": "Tên nhà thuốc",
    "pharmacyNamePlaceholder": "Nhập tên nhà thuốc",
    "pharmacyAddress": "Địa chỉ nhà thuốc",
    "pharmacyAddressPlaceholder": "Nhập địa chỉ nhà thuốc",
    "privacy": "Tôi đồng ý với việc thu thập và sử dụng thông tin cá nhân.",
    "submit": "Gửi liên hệ",
    "submitting": "Đang gửi..."
  },
  "countries": {
    "KR": "Hàn Quốc",
    "US": "Hoa Kỳ",
    "CN": "Trung Quốc",
    "JP": "Nhật Bản",
    "VN": "Việt Nam",
    "TH": "Thái Lan",
    "RU": "Nga",
    "KZ": "Kazakhstan",
    "OTHER": "Khác"
  },
  "success": {
    "title": "Yêu cầu của bạn đã được tiếp nhận.",
    "message": "Chúng tôi sẽ phản hồi trong thời gian sớm nhất."
  },
  "error": {
    "title": "Gửi thất bại.",
    "message": "Vui lòng thử lại sau."
  },
  "validation": {
    "required": "Trường này là bắt buộc.",
    "invalidEmail": "Vui lòng nhập địa chỉ email hợp lệ.",
    "privacyRequired": "Bạn phải đồng ý với chính sách bảo mật.",
    "tooLong": "Vượt quá giới hạn ký tự tối đa."
  }
}
```

**Step 5: 커밋**

```bash
git add messages/ko.json messages/en.json messages/zh.json messages/vi.json
git commit -m "feat(i18n): contact 메시지를 탭 기반 3분류 구조로 업데이트 (4개 언어)"
```

---

### Task 4: Zod 검증 스키마 및 Server Action

**Files:**
- Create: `lib/validations/contact.ts` — Zod 스키마
- Create: `lib/contact/config.ts` — 이메일 매핑 config
- Create: `app/[locale]/contact/actions.ts` — Server Action

**Step 1: Zod 검증 스키마 작성**

`lib/validations/contact.ts`:

```typescript
import { z } from "zod";

export const consumerFormSchema = z.object({
  inquiryType: z.literal("consumer"),
  name: z.string().min(1).max(100),
  email: z.string().email().max(200),
  phone: z.string().min(1).max(30),
  subject: z.string().min(1).max(300),
  message: z.string().min(1).max(5000),
  privacy: z.literal(true),
});

export const pharmacistFormSchema = z.object({
  inquiryType: z.literal("pharmacist"),
  name: z.string().min(1).max(100),
  pharmacyName: z.string().min(1).max(200),
  pharmacyAddress: z.string().min(1).max(500),
  subject: z.string().min(1).max(300),
  message: z.string().min(1).max(5000),
  privacy: z.literal(true),
});

export const businessFormSchema = z.object({
  inquiryType: z.literal("business"),
  company: z.string().min(1).max(200),
  country: z.string().min(1).max(100),
  departmentPosition: z.string().min(1).max(200),
  name: z.string().min(1).max(100),
  email: z.string().email().max(200),
  subject: z.string().min(1).max(300),
  message: z.string().min(1).max(5000),
  privacy: z.literal(true),
});

export const contactFormSchema = z.discriminatedUnion("inquiryType", [
  consumerFormSchema,
  pharmacistFormSchema,
  businessFormSchema,
]);

export type ConsumerFormInput = z.infer<typeof consumerFormSchema>;
export type PharmacistFormInput = z.infer<typeof pharmacistFormSchema>;
export type BusinessFormInput = z.infer<typeof businessFormSchema>;
export type ContactFormInput = z.infer<typeof contactFormSchema>;
```

**Step 2: 이메일 매핑 config 작성**

`lib/contact/config.ts`:

```typescript
import type { InquiryType } from "@/types/contact";

/**
 * 문의 유형별 수신 이메일 매핑
 * 추후 각 담당자 이메일로 변경 예정
 */
export const INQUIRY_EMAIL_MAP: Record<InquiryType, string> = {
  consumer: "yanggoon@cellromax.com",
  pharmacist: "yanggoon@cellromax.com",
  business: "yanggoon@cellromax.com",
};

/**
 * 문의 유형별 한국어 라벨 (이메일 제목용)
 */
export const INQUIRY_TYPE_LABEL: Record<InquiryType, string> = {
  consumer: "소비자 문의",
  pharmacist: "약사 문의",
  business: "비즈니스 문의",
};
```

**Step 3: Server Action 작성**

`app/[locale]/contact/actions.ts`:

```typescript
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

  rows.push(`<tr><td><strong>문의유형</strong></td><td>${INQUIRY_TYPE_LABEL[data.inquiryType]}</td></tr>`);
  rows.push(`<tr><td><strong>성함</strong></td><td>${escapeHtml(data.name)}</td></tr>`);

  if (data.inquiryType === "consumer") {
    rows.push(`<tr><td><strong>이메일</strong></td><td>${escapeHtml(data.email)}</td></tr>`);
    rows.push(`<tr><td><strong>연락처</strong></td><td>${escapeHtml(data.phone)}</td></tr>`);
  } else if (data.inquiryType === "pharmacist") {
    rows.push(`<tr><td><strong>약국명</strong></td><td>${escapeHtml(data.pharmacyName)}</td></tr>`);
    rows.push(`<tr><td><strong>약국 주소</strong></td><td>${escapeHtml(data.pharmacyAddress)}</td></tr>`);
  } else if (data.inquiryType === "business") {
    rows.push(`<tr><td><strong>회사명</strong></td><td>${escapeHtml(data.company)}</td></tr>`);
    rows.push(`<tr><td><strong>국가</strong></td><td>${escapeHtml(data.country)}</td></tr>`);
    rows.push(`<tr><td><strong>부서/직급</strong></td><td>${escapeHtml(data.departmentPosition)}</td></tr>`);
    rows.push(`<tr><td><strong>이메일</strong></td><td>${escapeHtml(data.email)}</td></tr>`);
  }

  rows.push(`<tr><td><strong>제목</strong></td><td>${escapeHtml(data.subject)}</td></tr>`);
  rows.push(`<tr><td><strong>내용</strong></td><td>${escapeHtml(data.message).replace(/\n/g, "<br>")}</td></tr>`);

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0a1628;">[${INQUIRY_TYPE_LABEL[data.inquiryType]}] 새 문의가 접수되었습니다</h2>
      <table style="width: 100%; border-collapse: collapse;">
        ${rows.map(r => r).join("")}
      </table>
    </div>
  `.replace(/<tr><td>/g, '<tr><td style="padding: 8px 12px; border-bottom: 1px solid #eee; vertical-align: top; white-space: nowrap; color: #666;">').replace(/<\/td><td>/g, '</td><td style="padding: 8px 12px; border-bottom: 1px solid #eee;">');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
```

**Step 4: 커밋**

```bash
git add lib/validations/contact.ts lib/contact/config.ts app/[locale]/contact/actions.ts
git commit -m "feat(contact): Zod 스키마, 이메일 config, Server Action 구현"
```

---

### Task 5: Checkbox UI 컴포넌트 생성

**Files:**
- Create: `components/ui/Checkbox.tsx`

**Step 1: Checkbox 컴포넌트 작성**

기존 `Input.tsx` 패턴(forwardRef, useId, label, error, 접근성)을 따르되 체크박스에 맞게 구현.

```typescript
import { forwardRef, useId } from "react";

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, required, disabled, className, id: externalId, ...rest }, ref) => {
    const autoId = useId();
    const inputId = externalId ?? autoId;
    const errorId = error ? `${inputId}-error` : undefined;
    const hasError = Boolean(error);

    return (
      <div className={`flex flex-col ${className ?? ""}`}>
        <label
          htmlFor={inputId}
          className={`flex items-start gap-2.5 cursor-pointer select-none ${
            disabled ? "opacity-60 cursor-not-allowed" : ""
          }`}
        >
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            required={required}
            disabled={disabled}
            aria-invalid={hasError ? true : undefined}
            aria-describedby={errorId}
            className={`mt-0.5 size-4 squircle-xs border ${
              hasError
                ? "border-error accent-error"
                : "border-gray-300 accent-primary"
            }`}
            {...rest}
          />
          {label && (
            <span className={`text-sm ${hasError ? "text-error" : "text-gray-700"}`}>
              {label}
              {required && (
                <span className="ml-0.5 text-error" aria-hidden="true">*</span>
              )}
            </span>
          )}
        </label>
        {error && (
          <p id={errorId} className="mt-1 text-xs text-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
export type { CheckboxProps };
```

**Step 2: 커밋**

```bash
git add components/ui/Checkbox.tsx
git commit -m "feat(ui): Checkbox 컴포넌트 추가"
```

---

### Task 6: ContactPage 클라이언트 컴포넌트 (탭 관리)

**Files:**
- Create: `components/contact/ContactPage.tsx`

**Step 1: ContactPage 컴포넌트 작성**

기존 `Tabs`, `TabList`, `Tab`, `TabPanel` 컴포넌트를 활용.

```typescript
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabList, Tab, TabPanel } from "@/components/ui/Tabs";
import { ConsumerForm } from "./ConsumerForm";
import { PharmacistForm } from "./PharmacistForm";
import { BusinessForm } from "./BusinessForm";
import type { InquiryType } from "@/types/contact";

const INQUIRY_TABS: InquiryType[] = ["consumer", "pharmacist", "business"];

export function ContactPage() {
  const [activeTab, setActiveTab] = useState<string>("consumer");
  const t = useTranslations("contact");

  return (
    <Tabs value={activeTab} onChange={setActiveTab} variant="pill">
      <TabList className="justify-center mb-8">
        {INQUIRY_TABS.map((tab) => (
          <Tab key={tab} value={tab}>
            {t(`tabs.${tab}`)}
          </Tab>
        ))}
      </TabList>

      <TabPanel value="consumer">
        <ConsumerForm />
      </TabPanel>
      <TabPanel value="pharmacist">
        <PharmacistForm />
      </TabPanel>
      <TabPanel value="business">
        <BusinessForm />
      </TabPanel>
    </Tabs>
  );
}
```

**Step 2: 커밋**

```bash
git add components/contact/ContactPage.tsx
git commit -m "feat(contact): ContactPage 탭 관리 컴포넌트 구현"
```

---

### Task 7: ConsumerForm 컴포넌트

**Files:**
- Create: `components/contact/ConsumerForm.tsx`

**Step 1: ConsumerForm 작성**

필드: 성함, 이메일, 연락처, 제목, 내용, 개인정보 동의
Server Action 호출 + Toast 피드백

```typescript
"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { toast } from "@/components/ui/Toast";
import { submitInquiry } from "@/app/[locale]/contact/actions";
import type { ConsumerFormInput } from "@/lib/validations/contact";

export function ConsumerForm() {
  const t = useTranslations("contact");
  const tv = useTranslations("contact.validation");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    const form = e.currentTarget;
    const formData = new FormData(form);

    const data: ConsumerFormInput = {
      inquiryType: "consumer",
      name: (formData.get("name") as string).trim(),
      email: (formData.get("email") as string).trim(),
      phone: (formData.get("phone") as string).trim(),
      subject: (formData.get("subject") as string).trim(),
      message: (formData.get("message") as string).trim(),
      privacy: formData.get("privacy") === "on",
    };

    // 클라이언트 검증
    const newErrors: Record<string, string> = {};
    if (!data.name) newErrors.name = tv("required");
    if (!data.email) newErrors.email = tv("required");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) newErrors.email = tv("invalidEmail");
    if (!data.phone) newErrors.phone = tv("required");
    if (!data.subject) newErrors.subject = tv("required");
    if (!data.message) newErrors.message = tv("required");
    if (!data.privacy) newErrors.privacy = tv("privacyRequired");

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const result = await submitInquiry(data);
      if (result.success) {
        toast.success(t("success.title"));
        form.reset();
      } else {
        toast.error(result.error ?? t("error.title"));
      }
    } catch {
      toast.error(t("error.title"));
    } finally {
      setLoading(false);
    }
  }, [t, tv]);

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-2xl mx-auto space-y-5">
      <Input
        name="name"
        label={t("form.name")}
        placeholder={t("form.namePlaceholder")}
        required
        error={errors.name}
      />
      <Input
        name="email"
        type="email"
        label={t("form.email")}
        placeholder={t("form.emailPlaceholder")}
        required
        error={errors.email}
      />
      <Input
        name="phone"
        type="tel"
        label={t("form.phone")}
        placeholder={t("form.phonePlaceholder")}
        required
        error={errors.phone}
      />
      <Input
        name="subject"
        label={t("form.subject")}
        placeholder={t("form.subjectPlaceholder")}
        required
        error={errors.subject}
      />
      <Textarea
        name="message"
        label={t("form.message")}
        placeholder={t("form.messagePlaceholder")}
        rows={6}
        maxLength={5000}
        required
        error={errors.message}
      />
      <Checkbox
        name="privacy"
        label={t("form.privacy")}
        required
        error={errors.privacy}
      />
      <Button type="submit" loading={loading} className="w-full">
        {loading ? t("form.submitting") : t("form.submit")}
      </Button>
    </form>
  );
}
```

**Step 2: 커밋**

```bash
git add components/contact/ConsumerForm.tsx
git commit -m "feat(contact): ConsumerForm 소비자 문의 폼 구현"
```

---

### Task 8: PharmacistForm 컴포넌트

**Files:**
- Create: `components/contact/PharmacistForm.tsx`

**Step 1: PharmacistForm 작성**

필드: 성함, 약국명, 약국 주소, 제목, 내용, 개인정보 동의.
ConsumerForm과 동일한 패턴 사용.

```typescript
"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { toast } from "@/components/ui/Toast";
import { submitInquiry } from "@/app/[locale]/contact/actions";
import type { PharmacistFormInput } from "@/lib/validations/contact";

export function PharmacistForm() {
  const t = useTranslations("contact");
  const tv = useTranslations("contact.validation");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    const form = e.currentTarget;
    const formData = new FormData(form);

    const data: PharmacistFormInput = {
      inquiryType: "pharmacist",
      name: (formData.get("name") as string).trim(),
      pharmacyName: (formData.get("pharmacyName") as string).trim(),
      pharmacyAddress: (formData.get("pharmacyAddress") as string).trim(),
      subject: (formData.get("subject") as string).trim(),
      message: (formData.get("message") as string).trim(),
      privacy: formData.get("privacy") === "on",
    };

    const newErrors: Record<string, string> = {};
    if (!data.name) newErrors.name = tv("required");
    if (!data.pharmacyName) newErrors.pharmacyName = tv("required");
    if (!data.pharmacyAddress) newErrors.pharmacyAddress = tv("required");
    if (!data.subject) newErrors.subject = tv("required");
    if (!data.message) newErrors.message = tv("required");
    if (!data.privacy) newErrors.privacy = tv("privacyRequired");

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const result = await submitInquiry(data);
      if (result.success) {
        toast.success(t("success.title"));
        form.reset();
      } else {
        toast.error(result.error ?? t("error.title"));
      }
    } catch {
      toast.error(t("error.title"));
    } finally {
      setLoading(false);
    }
  }, [t, tv]);

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-2xl mx-auto space-y-5">
      <Input
        name="name"
        label={t("form.name")}
        placeholder={t("form.namePlaceholder")}
        required
        error={errors.name}
      />
      <Input
        name="pharmacyName"
        label={t("form.pharmacyName")}
        placeholder={t("form.pharmacyNamePlaceholder")}
        required
        error={errors.pharmacyName}
      />
      <Input
        name="pharmacyAddress"
        label={t("form.pharmacyAddress")}
        placeholder={t("form.pharmacyAddressPlaceholder")}
        required
        error={errors.pharmacyAddress}
      />
      <Input
        name="subject"
        label={t("form.subject")}
        placeholder={t("form.subjectPlaceholder")}
        required
        error={errors.subject}
      />
      <Textarea
        name="message"
        label={t("form.message")}
        placeholder={t("form.messagePlaceholder")}
        rows={6}
        maxLength={5000}
        required
        error={errors.message}
      />
      <Checkbox
        name="privacy"
        label={t("form.privacy")}
        required
        error={errors.privacy}
      />
      <Button type="submit" loading={loading} className="w-full">
        {loading ? t("form.submitting") : t("form.submit")}
      </Button>
    </form>
  );
}
```

**Step 2: 커밋**

```bash
git add components/contact/PharmacistForm.tsx
git commit -m "feat(contact): PharmacistForm 약사 문의 폼 구현"
```

---

### Task 9: BusinessForm 컴포넌트

**Files:**
- Create: `components/contact/BusinessForm.tsx`

**Step 1: BusinessForm 작성**

필드: 회사명, 국가(드롭다운), 부서 및 직급, 성함, 이메일, 제목, 내용, 개인정보 동의.
국가 드롭다운은 i18n `countries` 키에서 옵션 목록을 구성.

```typescript
"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { toast } from "@/components/ui/Toast";
import { submitInquiry } from "@/app/[locale]/contact/actions";
import type { BusinessFormInput } from "@/lib/validations/contact";

const COUNTRY_CODES = ["KR", "US", "CN", "JP", "VN", "TH", "RU", "KZ", "OTHER"] as const;

export function BusinessForm() {
  const t = useTranslations("contact");
  const tv = useTranslations("contact.validation");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const countryOptions = useMemo(
    () => COUNTRY_CODES.map((code) => ({
      value: code,
      label: t(`countries.${code}`),
    })),
    [t],
  );

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    const form = e.currentTarget;
    const formData = new FormData(form);

    const data: BusinessFormInput = {
      inquiryType: "business",
      company: (formData.get("company") as string).trim(),
      country: (formData.get("country") as string).trim(),
      departmentPosition: (formData.get("departmentPosition") as string).trim(),
      name: (formData.get("name") as string).trim(),
      email: (formData.get("email") as string).trim(),
      subject: (formData.get("subject") as string).trim(),
      message: (formData.get("message") as string).trim(),
      privacy: formData.get("privacy") === "on",
    };

    const newErrors: Record<string, string> = {};
    if (!data.company) newErrors.company = tv("required");
    if (!data.country) newErrors.country = tv("required");
    if (!data.departmentPosition) newErrors.departmentPosition = tv("required");
    if (!data.name) newErrors.name = tv("required");
    if (!data.email) newErrors.email = tv("required");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) newErrors.email = tv("invalidEmail");
    if (!data.subject) newErrors.subject = tv("required");
    if (!data.message) newErrors.message = tv("required");
    if (!data.privacy) newErrors.privacy = tv("privacyRequired");

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const result = await submitInquiry(data);
      if (result.success) {
        toast.success(t("success.title"));
        form.reset();
      } else {
        toast.error(result.error ?? t("error.title"));
      }
    } catch {
      toast.error(t("error.title"));
    } finally {
      setLoading(false);
    }
  }, [t, tv]);

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-2xl mx-auto space-y-5">
      <Input
        name="company"
        label={t("form.company")}
        placeholder={t("form.companyPlaceholder")}
        required
        error={errors.company}
      />
      <Select
        name="country"
        label={t("form.country")}
        placeholder={t("form.countryPlaceholder")}
        options={countryOptions}
        required
        error={errors.country}
      />
      <Input
        name="departmentPosition"
        label={t("form.departmentPosition")}
        placeholder={t("form.departmentPositionPlaceholder")}
        required
        error={errors.departmentPosition}
      />
      <Input
        name="name"
        label={t("form.name")}
        placeholder={t("form.namePlaceholder")}
        required
        error={errors.name}
      />
      <Input
        name="email"
        type="email"
        label={t("form.email")}
        placeholder={t("form.emailPlaceholder")}
        required
        error={errors.email}
      />
      <Input
        name="subject"
        label={t("form.subject")}
        placeholder={t("form.subjectPlaceholder")}
        required
        error={errors.subject}
      />
      <Textarea
        name="message"
        label={t("form.message")}
        placeholder={t("form.messagePlaceholder")}
        rows={6}
        maxLength={5000}
        required
        error={errors.message}
      />
      <Checkbox
        name="privacy"
        label={t("form.privacy")}
        required
        error={errors.privacy}
      />
      <Button type="submit" loading={loading} className="w-full">
        {loading ? t("form.submitting") : t("form.submit")}
      </Button>
    </form>
  );
}
```

**Step 2: 커밋**

```bash
git add components/contact/BusinessForm.tsx
git commit -m "feat(contact): BusinessForm 비즈니스 문의 폼 구현"
```

---

### Task 10: Contact 페이지 라우트 + ToastContainer + 빌드 검증

**Files:**
- Create: `app/[locale]/contact/page.tsx`
- Modify: `app/[locale]/layout.tsx` — ToastContainer 추가

**Step 1: 페이지 라우트 생성**

`app/[locale]/contact/page.tsx`:

뉴스룸 페이지 패턴(`AnimatedSection`, 메타데이터, 서버 컴포넌트)을 따름.

```typescript
import { getTranslations } from "next-intl/server";
import { AnimatedSection } from "@/components/products/AnimatedSection";
import { ContactPage } from "@/components/contact/ContactPage";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contact");
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default async function Contact() {
  const t = await getTranslations("contact");

  return (
    <section className="section bg-surface">
      <div className="container-site">
        <AnimatedSection>
          <div className="text-center mb-12">
            <h1 className="text-heading text-primary">{t("title")}</h1>
            <div className="divider-gold mx-auto mt-4 mb-4" />
            <p className="text-lead text-gray-600">{t("subtitle")}</p>
          </div>
        </AnimatedSection>

        <AnimatedSection direction="up">
          <ContactPage />
        </AnimatedSection>
      </div>
    </section>
  );
}
```

**Step 2: layout.tsx에 ToastContainer 추가**

`app/[locale]/layout.tsx`의 `<Footer />` 아래에 `<ToastContainer />` 추가:

```diff
 import { Header } from "@/components/layout/Header";
 import { Footer } from "@/components/layout/Footer";
+import { ToastContainer } from "@/components/ui/Toast";
 ...
           <Header />
           <main>{children}</main>
           <Footer />
+          <ToastContainer />
```

**Step 3: 빌드 검증**

Run: `npm run build`
Expected: 빌드 성공

**Step 4: 커밋**

```bash
git add app/[locale]/contact/page.tsx app/[locale]/layout.tsx
git commit -m "feat(contact): 온라인 문의 페이지 라우트 생성 및 ToastContainer 추가"
```

---

### Task 11: 수동 검증 및 정리

**Step 1: 개발 서버 실행**

Run: `npm run dev`

**Step 2: 수동 검증 체크리스트**

- `/ko/contact` 접속 → 3개 탭(소비자/약사/비즈니스) 표시 확인
- 소비자 탭: 성함, 이메일, 연락처, 제목, 내용, 개인정보 동의 필드 확인
- 약사 탭: 성함, 약국명, 약국 주소, 제목, 내용, 개인정보 동의 필드 확인
- 비즈니스 탭: 회사명, 국가(드롭다운), 부서 및 직급, 성함, 이메일, 제목, 내용, 개인정보 동의 필드 확인
- 빈 폼 제출 시 검증 에러 메시지 표시 확인
- `/en/contact`, `/zh/contact`, `/vi/contact` 언어별 표시 확인
- 탭 전환 시 키보드 좌우 화살표 작동 확인

**Step 3: 최종 커밋 (필요 시)**

```bash
git add -A
git commit -m "fix(contact): 수동 검증 후 수정사항 반영"
```
