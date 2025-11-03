-- CreateEnum
CREATE TYPE "public"."content_status" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "public"."access_level" AS ENUM ('public', 'restricted', 'private');

-- CreateEnum
CREATE TYPE "public"."action_plan_status" AS ENUM ('pending', 'in_progress', 'completed');

-- CreateEnum
CREATE TYPE "public"."category_type" AS ENUM ('content', 'action_plan', 'achievement', 'other');

-- CreateTable
CREATE TABLE "public"."categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "public"."category_type" NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT NOT NULL,
    "parent_id" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."contents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "metadata" JSONB,
    "status" "public"."content_status" NOT NULL DEFAULT 'draft',
    "access_level" "public"."access_level" NOT NULL DEFAULT 'restricted',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."action_plan_contents" (
    "id" TEXT NOT NULL,
    "action_plan_id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "status" "public"."action_plan_status" NOT NULL DEFAULT 'pending',
    "completed_at" TIMESTAMP(3),
    "feedback" TEXT,
    "rating" INTEGER,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "action_plan_contents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_type_key" ON "public"."categories"("name", "type");

-- CreateIndex
CREATE UNIQUE INDEX "action_plan_contents_action_plan_id_content_id_key" ON "public"."action_plan_contents"("action_plan_id", "content_id");

-- AddForeignKey
ALTER TABLE "public"."categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."contents" ADD CONSTRAINT "contents_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."action_plan_contents" ADD CONSTRAINT "action_plan_contents_action_plan_id_fkey" FOREIGN KEY ("action_plan_id") REFERENCES "public"."action_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."action_plan_contents" ADD CONSTRAINT "action_plan_contents_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
