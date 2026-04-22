import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { IrFileListClient } from "@/components/admin/IrFileListClient";

export const metadata: Metadata = {
  title: "IR Files Admin",
};

export default async function IrFilesPage() {
  const supabase = await createClient();

  const { data: irFiles } = await supabase
    .from("ir_files")
    .select("*")
    .order("published_at", { ascending: false })
    .range(0, 20);

  const initialIrFiles = (irFiles ?? []).slice(0, 20);
  const initialTotal = initialIrFiles.length + ((irFiles?.length ?? 0) > 20 ? 1 : 0);

  return <IrFileListClient initialItems={initialIrFiles} initialTotal={initialTotal} />;
}
