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
