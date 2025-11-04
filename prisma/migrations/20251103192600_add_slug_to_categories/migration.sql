-- Adiciona a coluna slug à tabela categories
ALTER TABLE "public"."categories" ADD COLUMN "slug" TEXT;

-- Cria um índice único para garantir que slugs sejam únicos por tipo
CREATE UNIQUE INDEX "categories_slug_type_key" ON "public"."categories"("slug", "type") WHERE "slug" IS NOT NULL;
