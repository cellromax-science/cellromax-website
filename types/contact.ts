export type InquiryType = "consumer" | "pharmacist" | "business";
export type InquiryStatus = "pending" | "reviewing" | "replied" | "closed";
export type EmailStatus = "pending" | "sent" | "failed";

export interface ConsumerFormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  privacy: boolean;
}

export interface PharmacistFormData {
  name: string;
  pharmacyName: string;
  pharmacyAddress: string;
  phone: string;
  subject: string;
  message: string;
  privacy: boolean;
}

export interface BusinessFormData {
  company: string;
  country: string;
  departmentPosition: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  privacy: boolean;
}

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
  last_replied_channel: ReplyChannel | null;
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
  email_status?: EmailStatus;
  email_sent_at?: string | null;
}

export type ReplyChannel = "email" | "sms";
export type ReplyStatus = "sent" | "failed";

export interface InquiryReply {
  id: string;
  inquiry_id: string;
  channel: ReplyChannel;
  to_address: string;
  subject: string | null;
  body: string;
  status: ReplyStatus;
  provider_id: string | null;
  error_message: string | null;
  sent_by: string | null;
  created_at: string;
}

export interface InquiryReplyTemplate {
  id: string;
  title: string;
  channel: ReplyChannel | null;
  subject: string | null;
  body: string;
  inquiry_type: InquiryType | null;
  created_by: string | null;
  updated_at: string;
  created_at: string;
}

export type ContactRecipientEmailMap = Record<InquiryType, string>;

export interface ContactRecipientSetting {
  inquiry_type: InquiryType;
  recipient_email: string;
  updated_at: string | null;
  updated_by: string | null;
}
