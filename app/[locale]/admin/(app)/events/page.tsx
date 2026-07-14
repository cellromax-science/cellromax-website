import type { Metadata } from "next";

import { EventEntryListClient } from "@/components/admin/EventEntryListClient";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Events Admin",
};

/**
 * 이벤트 참여자 관리 페이지
 *
 * 모든 이벤트의 참여자를 최신순으로 조회한다 (행마다 event_title 표기).
 * event_entries 조회는 RLS 정책(마케팅/슈퍼어드민 SELECT)으로 보호된다.
 * 이벤트 규모(수백 건)가 작아 전체를 한 번에 조회하고,
 * 검색·CSV 다운로드는 클라이언트에서 처리한다.
 */
export default async function EventsAdminPage() {
  const supabase = await createClient();

  const { data: entries, count } = await supabase
    .from("event_entries")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(5000);

  return (
    <EventEntryListClient initialItems={entries ?? []} total={count ?? 0} />
  );
}
