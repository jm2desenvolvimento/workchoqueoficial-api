-- Adiciona a coluna slug à tabela categories
ALTER TABLE "categories" ADD COLUMN "slug" TEXT;

-- Cria um índice único para garantir que slugs sejam únicos por tipo
CREATE UNIQUE INDEX "categories_slug_type_key" ON "categories"("slug", "type") WHERE "slug" IS NOT NULL;
