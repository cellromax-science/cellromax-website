export const PRODUCT_CARD_SELECT =
  "id, slug, name_ko, name_en, name_zh, name_vi, category, subcategory_id, thumbnail_url, is_new, product_subcategories(id, slug, name_ko, name_en, name_zh, name_vi)";

export const PRODUCT_SUBCATEGORY_FILTER_SELECT =
  "id, slug, name_ko, name_en, name_zh, name_vi, parent_category, sort_order, is_active";

export const ADMIN_PRODUCT_LIST_SELECT =
  "id, slug, name_ko, category, category_sort_order, subcategory_id, thumbnail_url, is_active, is_new, created_at, product_subcategories(name_ko)";

/**
 * 엑셀 복사·붙여넣기로 섞여 들어오는 CR 이스케이프(_x000D_)를 정규화합니다.
 * 문자열은 "_x000D_\n" → "\n", 남은 "_x000D_" → "\n" 으로 치환하고,
 * 배열·객체는 내부 문자열까지 재귀적으로 처리합니다.
 */
export function stripExcelCrArtifacts<T>(value: T): T {
  if (typeof value === "string") {
    return value
      .split("_x000D_\n")
      .join("\n")
      .split("_x000D_")
      .join("\n") as T;
  }
  if (Array.isArray(value)) {
    return value.map(stripExcelCrArtifacts) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, stripExcelCrArtifacts(v)])
    ) as T;
  }
  return value;
}
