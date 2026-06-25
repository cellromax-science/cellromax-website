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
  // 이메일은 선택 입력. 빈 문자열은 허용하고, 값이 있으면 형식 검사.
  email: z.union([z.literal(""), z.string().email().max(200)]).optional(),
  phone: z.string().min(1).max(30),
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
  phone: z.string().min(1).max(30),
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
