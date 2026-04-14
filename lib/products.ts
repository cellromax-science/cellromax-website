export const PRODUCT_CARD_SELECT =
  "id, slug, name_ko, name_en, name_zh, name_vi, category, subcategory_id, thumbnail_url, is_new, product_subcategories(id, slug, name_ko, name_en, name_zh, name_vi)";

export const PRODUCT_SUBCATEGORY_FILTER_SELECT =
  "id, slug, name_ko, name_en, name_zh, name_vi, parent_category, sort_order, is_active";

export const ADMIN_PRODUCT_LIST_SELECT =
  "id, slug, name_ko, category, subcategory_id, thumbnail_url, is_active, is_new, created_at, product_subcategories(name_ko)";
