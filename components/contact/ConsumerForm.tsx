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

    const name = (formData.get("name") as string).trim();
    const email = (formData.get("email") as string).trim();
    const phone = (formData.get("phone") as string).trim();
    const subject = (formData.get("subject") as string).trim();
    const message = (formData.get("message") as string).trim();
    const privacyChecked = formData.get("privacy") === "on";

    // 클라이언트 검증
    const newErrors: Record<string, string> = {};
    if (!name) newErrors.name = tv("required");
    if (!email) newErrors.email = tv("required");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = tv("invalidEmail");
    if (!phone) newErrors.phone = tv("required");
    if (!subject) newErrors.subject = tv("required");
    if (!message) newErrors.message = tv("required");
    if (!privacyChecked) newErrors.privacy = tv("privacyRequired");

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const data: ConsumerFormInput = {
      inquiryType: "consumer",
      name, email, phone, subject, message,
      privacy: true,
    };

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
