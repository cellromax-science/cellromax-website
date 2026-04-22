import type { Metadata } from "next";
import { ADMIN_PRODUCT_LIST_SELECT } from "@/lib/products";
import { createClient } from "@/lib/supabase/server";
import { ProductListClient } from "@/components/admin/ProductListClient";
import type { ProductListItem } from "@/types/product";

export const metadata: Metadata = {
  title: "Products Admin",
};

export default async function ProductsPage() {
  const supabase = await createClient();

  const { data: products } = await supabase
    .from("products")
    .select(ADMIN_PRODUCT_LIST_SELECT)
    .order("created_at", { ascending: false })
    .range(0, 20);

  const initialProducts = (products ?? []).slice(0, 20);
  const initialTotal = initialProducts.length + ((products?.length ?? 0) > 20 ? 1 : 0);

  return (
    <ProductListClient
      initialProducts={initialProducts as unknown as ProductListItem[]}
      initialTotal={initialTotal}
    />
  );
}
