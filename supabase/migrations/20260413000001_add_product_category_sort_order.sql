-- Add per-category product ordering while preserving existing sort values.
ALTER TABLE products
ADD COLUMN IF NOT EXISTS category_sort_order INTEGER NOT NULL DEFAULT 0;

UPDATE products
SET category_sort_order = COALESCE(sort_order, 0)
WHERE category_sort_order = 0;

COMMENT ON COLUMN products.category_sort_order IS 'Display order within the same category';

CREATE INDEX IF NOT EXISTS idx_products_category_sort_order
  ON products(category, category_sort_order);
