-- Listing and search indexes for the public products page and admin product table.
CREATE INDEX IF NOT EXISTS idx_products_active_category_price_created_at
  ON products(is_active, category, price DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_active_subcategory_price_created_at
  ON products(is_active, subcategory_id, price DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_price_created_at
  ON products(price DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_ingredients_ko_trgm
  ON products USING gin(ingredients_ko gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_functionality_ko_trgm
  ON products USING gin(functionality_ko gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_product_subcategories_name_ko_trgm
  ON product_subcategories USING gin(name_ko gin_trgm_ops);
