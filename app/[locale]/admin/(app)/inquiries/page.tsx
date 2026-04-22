import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { InquiryListClient } from "@/components/admin/InquiryListClient";

export const metadata: Metadata = {
  title: "Inquiries Admin",
};

export default async function InquiriesPage() {
  const supabase = await createClient();

  const { data: inquiries } = await supabase
    .from("inquiries")
    .select("*")
    .order("created_at", { ascending: false })
    .range(0, 20);

  const initialInquiries = (inquiries ?? []).slice(0, 20);
  const initialTotal = initialInquiries.length + ((inquiries?.length ?? 0) > 20 ? 1 : 0);

  return <InquiryListClient initialItems={initialInquiries} initialTotal={initialTotal} />;
}
