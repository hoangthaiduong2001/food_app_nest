-- AlterTable: thêm cột tsvector cho full-text search
ALTER TABLE "Product" ADD COLUMN "searchVector" tsvector;

-- GIN index để query @@ nhanh
CREATE INDEX "Product_searchVector_idx" ON "Product" USING GIN ("searchVector");

-- Hàm build vector từ name (weight A — quan trọng hơn) + slug (weight B)
-- Dùng config 'simple' vì Postgres không có dictionary tiếng Việt mặc định.
CREATE OR REPLACE FUNCTION product_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('simple', coalesce(NEW."name", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW."slug", '')), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Trigger: tự cập nhật searchVector mỗi khi INSERT/UPDATE name hoặc slug
CREATE TRIGGER product_search_vector_trigger
BEFORE INSERT OR UPDATE OF "name", "slug"
ON "Product"
FOR EACH ROW
EXECUTE FUNCTION product_search_vector_update();

-- Backfill: build vector cho các product đã tồn tại
UPDATE "Product"
SET "searchVector" =
  setweight(to_tsvector('simple', coalesce("name", '')), 'A') ||
  setweight(to_tsvector('simple', coalesce("slug", '')), 'B');
