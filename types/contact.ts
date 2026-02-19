export type InquiryType = 'product' | 'buyer' | 'partnership' | 'other';

export type InquiryStatus = 'pending' | 'reviewing' | 'replied' | 'closed';

export type EmailStatus = 'pending' | 'sent' | 'failed';

export interface ContactForm {
  name: string;
  company: string;
  country: string;
  email: string;
  type: InquiryType;
  message: string;
}

export interface Inquiry {
  id: string;
  name: string;
  company: string | null;
  country: string;
  email: string;
  inquiry_type: InquiryType;
  message: string;
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
  company?: string | null;
  country: string;
  email: string;
  inquiry_type: InquiryType;
  message: string;
  recaptcha_score?: number | null;
  ip_address?: string | null;
}
