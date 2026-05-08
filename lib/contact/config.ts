import type { InquiryType } from "@/types/contact";

export const INQUIRY_EMAIL_MAP: Record<InquiryType, string> = {
  consumer: "developer@cellromax.com",
  pharmacist: "developer@cellromax.com",
  business: "developer@cellromax.com",
};

export const INQUIRY_TYPE_LABEL: Record<InquiryType, string> = {
  consumer: "소비자 문의",
  pharmacist: "약사 문의",
  business: "비즈니스 문의",
};
