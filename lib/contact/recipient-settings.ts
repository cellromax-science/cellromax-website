import "server-only";

import { INQUIRY_EMAIL_MAP } from "@/lib/contact/config";
import { createAdminClient } from "@/lib/supabase/admin";

import type {
  ContactRecipientEmailMap,
  ContactRecipientSetting,
  InquiryType,
} from "@/types/contact";

export const MANAGED_INQUIRY_TYPES: InquiryType[] = [
  "consumer",
  "pharmacist",
  "business",
];

function normalizeEmail(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function getEnvRecipientEmail(type: InquiryType): string | null {
  switch (type) {
    case "consumer":
      return normalizeEmail(process.env.CONTACT_EMAIL_CONSUMER);
    case "pharmacist":
      return normalizeEmail(process.env.CONTACT_EMAIL_PHARMACIST);
    case "business":
      return normalizeEmail(process.env.CONTACT_EMAIL_BUSINESS);
    default:
      return null;
  }
}

export function buildFallbackRecipientEmailMap(): ContactRecipientEmailMap {
  const sharedFallback = normalizeEmail(process.env.CONTACT_EMAIL);

  return {
    consumer:
      getEnvRecipientEmail("consumer") ??
      sharedFallback ??
      INQUIRY_EMAIL_MAP.consumer,
    pharmacist:
      getEnvRecipientEmail("pharmacist") ??
      sharedFallback ??
      INQUIRY_EMAIL_MAP.pharmacist,
    business:
      getEnvRecipientEmail("business") ??
      sharedFallback ??
      INQUIRY_EMAIL_MAP.business,
  };
}

export async function listContactRecipientSettings(): Promise<
  ContactRecipientSetting[]
> {
  const fallbackMap = buildFallbackRecipientEmailMap();

  const fallbackSettings = MANAGED_INQUIRY_TYPES.map((type) => ({
    inquiry_type: type,
    recipient_email: fallbackMap[type],
    updated_at: null,
    updated_by: null,
  }));

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("contact_recipient_settings")
      .select("inquiry_type, recipient_email, updated_at, updated_by");

    if (error) {
      console.error(
        "[contact-recipient-settings] Failed to load saved settings:",
        error,
      );
      return fallbackSettings;
    }

    const rowMap = new Map<
      InquiryType,
      {
        inquiry_type: InquiryType;
        recipient_email: string | null;
        updated_at: string | null;
        updated_by: string | null;
      }
    >(
      (data ?? []).map((row) => [
        row.inquiry_type as InquiryType,
        {
          inquiry_type: row.inquiry_type as InquiryType,
          recipient_email: row.recipient_email,
          updated_at: row.updated_at,
          updated_by: row.updated_by,
        },
      ]),
    );

    return MANAGED_INQUIRY_TYPES.map((type) => {
      const row = rowMap.get(type);

      return {
        inquiry_type: type,
        recipient_email:
          normalizeEmail(row?.recipient_email) ?? fallbackMap[type],
        updated_at: row?.updated_at ?? null,
        updated_by: row?.updated_by ?? null,
      };
    });
  } catch (error) {
    console.error(
      "[contact-recipient-settings] Unexpected error while loading settings:",
      error,
    );
    return fallbackSettings;
  }
}

export async function getResolvedRecipientEmailMap(): Promise<ContactRecipientEmailMap> {
  const settings = await listContactRecipientSettings();

  return settings.reduce<ContactRecipientEmailMap>(
    (acc, setting) => {
      acc[setting.inquiry_type] = setting.recipient_email;
      return acc;
    },
    {
      consumer: "",
      pharmacist: "",
      business: "",
    },
  );
}
