-- Recriada para alinhar estado local com o banco
ALTER TABLE "public"."categories" ADD COLUMN IF NOT EXISTS "slug" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "categories_slug_type_key" ON "public"."categories"("slug", "type") WHERE "slug" IS NOT NULL;