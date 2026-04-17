ALTER TABLE products
ADD COLUMN IF NOT EXISTS search_tags TEXT;

COMMENT ON COLUMN products.search_tags IS 'Comma-separated manual search tags for product discovery';

CREATE INDEX IF NOT EXISTS idx_products_search_tags_trgm
  ON products USING gin(search_tags gin_trgm_ops);
