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
import { useRecaptcha } from "@/hooks/useRecaptcha";
import type { BusinessFormInput } from "@/lib/validations/contact";

const COUNTRY_CODES = ["KR", "US", "CN", "JP", "VN", "TH", "RU", "KZ", "OTHER"] as const;

export function BusinessForm() {
  const t = useTranslations("contact");
  const tv = useTranslations("contact.validation");
  const { executeRecaptcha } = useRecaptcha();
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

    const company = (formData.get("company") as string).trim();
    const country = (formData.get("country") as string).trim();
    const departmentPosition = (formData.get("departmentPosition") as string).trim();
    const name = (formData.get("name") as string).trim();
    const email = (formData.get("email") as string).trim();
    const subject = (formData.get("subject") as string).trim();
    const message = (formData.get("message") as string).trim();
    const privacyChecked = formData.get("privacy") === "on";

    const newErrors: Record<string, string> = {};
    if (!company) newErrors.company = tv("required");
    if (!country) newErrors.country = tv("required");
    if (!departmentPosition) newErrors.departmentPosition = tv("required");
    if (!name) newErrors.name = tv("required");
    if (!email) newErrors.email = tv("required");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = tv("invalidEmail");
    if (!subject) newErrors.subject = tv("required");
    if (!message) newErrors.message = tv("required");
    if (!privacyChecked) newErrors.privacy = tv("privacyRequired");

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const data: BusinessFormInput = {
      inquiryType: "business",
      company, country, departmentPosition, name, email, subject, message,
      privacy: true,
    };

    setLoading(true);
    try {
      const recaptchaToken = await executeRecaptcha("contact_business");
      const result = await submitInquiry(data, recaptchaToken ?? undefined);
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
  }, [t, tv, executeRecaptcha]);

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
      <div className="flex flex-col items-center gap-4 mt-2">
        <Checkbox
          name="privacy"
          label={t("form.privacy")}
          required
          error={errors.privacy}
        />
        <Button type="submit" loading={loading} className="w-full max-w-xs">
          {loading ? t("form.submitting") : t("form.submit")}
        </Button>
      </div>
    </form>
  );
}
