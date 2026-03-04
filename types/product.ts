export type ProductCategory =
  | 'health_functional'
  | 'general_food'
  | 'cosmetic'
  | 'medicine'
  | 'nutra_pet'
  | 'other';

export interface ProductSubcategory {
  id: string;
  parent_category: ProductCategory;
  slug: string;
  name_ko: string;
  name_en: string | null;
  name_zh: string | null;
  name_vi: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  slug: string;
  name_ko: string;
  name_en: string | null;
  name_zh: string | null;
  name_vi: string | null;
  category: ProductCategory;
  subcategory_id: string | null;
  thumbnail_url: string | null;
  images: string[];
  detail_image_url: string | null;
  nutrition_image_url: string | null;
  detail_html: string | null;
  ingredients_ko: string | null;
  ingredients_en: string | null;
  ingredients_zh: string | null;
  ingredients_vi: string | null;
  functionality_ko: string | null;
  functionality_en: string | null;
  functionality_zh: string | null;
  functionality_vi: string | null;
  how_to_use_ko: string | null;
  how_to_use_en: string | null;
  how_to_use_zh: string | null;
  how_to_use_vi: string | null;
  other_info_ko: string | null;
  other_info_en: string | null;
  other_info_zh: string | null;
  other_info_vi: string | null;
  price: number;
  is_active: boolean;
  is_new: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // JOIN으로 가져올 때 포함되는 서브카테고리 정보
  product_subcategories?: ProductSubcategory | null;
}

export interface ProductInsert {
  slug: string;
  name_ko: string;
  name_en?: string | null;
  name_zh?: string | null;
  name_vi?: string | null;
  category: ProductCategory;
  subcategory_id?: string | null;
  thumbnail_url?: string | null;
  images?: string[];
  detail_image_url?: string | null;
  nutrition_image_url?: string | null;
  detail_html?: string | null;
  ingredients_ko?: string | null;
  ingredients_en?: string | null;
  ingredients_zh?: string | null;
  ingredients_vi?: string | null;
  functionality_ko?: string | null;
  functionality_en?: string | null;
  functionality_zh?: string | null;
  functionality_vi?: string | null;
  how_to_use_ko?: string | null;
  how_to_use_en?: string | null;
  how_to_use_zh?: string | null;
  how_to_use_vi?: string | null;
  other_info_ko?: string | null;
  other_info_en?: string | null;
  other_info_zh?: string | null;
  other_info_vi?: string | null;
  price?: number;
  is_active?: boolean;
  is_new?: boolean;
  sort_order?: number;
}

export interface SubcategoryWithCount extends ProductSubcategory {
  product_count: number;
}

export interface CategoryOption {
  id: string;
  label: string;
  count?: number;
}
