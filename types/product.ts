export type ProductCategory =
  | 'health_functional'
  | 'general_food'
  | 'cosmetic'
  | 'medicine'
  | 'nutra_pet'
  | 'other';

export interface Product {
  id: string;
  slug: string;
  name_ko: string;
  name_en: string | null;
  name_zh: string | null;
  name_vi: string | null;
  category: ProductCategory;
  thumbnail_url: string | null;
  images: string[];
  detail_image_url: string | null;
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
  caution_ko: string | null;
  caution_en: string | null;
  is_active: boolean;
  is_new: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ProductInsert {
  slug: string;
  name_ko: string;
  name_en?: string | null;
  name_zh?: string | null;
  name_vi?: string | null;
  category: ProductCategory;
  thumbnail_url?: string | null;
  images?: string[];
  detail_image_url?: string | null;
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
  caution_ko?: string | null;
  caution_en?: string | null;
  is_active?: boolean;
  is_new?: boolean;
  sort_order?: number;
}

export interface CategoryOption {
  id: string;
  label: string;
  count?: number;
}
