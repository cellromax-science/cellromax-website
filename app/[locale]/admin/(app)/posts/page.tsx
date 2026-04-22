import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PostListClient } from "@/components/admin/PostListClient";

export const metadata: Metadata = {
  title: "Posts Admin",
};

export default async function PostsPage() {
  const supabase = await createClient();

  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .order("is_pinned", { ascending: false })
    .order("published_at", { ascending: false })
    .range(0, 20);

  const initialPosts = (posts ?? []).slice(0, 20);
  const initialTotal = initialPosts.length + ((posts?.length ?? 0) > 20 ? 1 : 0);

  return <PostListClient initialPosts={initialPosts} initialTotal={initialTotal} />;
}
