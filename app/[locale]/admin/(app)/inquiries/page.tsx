import type { Metadata } from "next";

import { InquiryListClient } from "@/components/admin/InquiryListClient";
import { listContactRecipientSettings } from "@/lib/contact/recipient-settings";
import { getAdminProfile } from "@/lib/supabase/admin";
import { getUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Inquiries Admin",
};

export default async function InquiriesPage() {
  const supabase = await createClient();

  const [{ data: inquiries, count }, user, initialRecipientSettings] =
    await Promise.all([
      supabase
        .from("inquiries")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(0, 19),
      getUser(),
      listContactRecipientSettings(),
    ]);

  const adminProfile = user ? await getAdminProfile(user.id) : null;
  const canManageRecipientSettings =
    adminProfile?.role === "super_admin" || adminProfile?.role === "inquiry";

  return (
    <InquiryListClient
      initialItems={inquiries ?? []}
      initialTotal={count ?? 0}
      initialRecipientSettings={initialRecipientSettings}
      canManageRecipientSettings={canManageRecipientSettings}
    />
  );
}
