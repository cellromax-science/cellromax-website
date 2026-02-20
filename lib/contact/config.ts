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
