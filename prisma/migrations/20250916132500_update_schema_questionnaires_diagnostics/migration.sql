/*
  Warnings:

  - You are about to drop the column `created_at` on the `diagnostics` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `diagnostics` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `diagnostics` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `diagnostics` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `diagnostics` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `diagnostics` table. All the data in the column will be lost.
  - You are about to drop the `diagnostic_response` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `question_options` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `questions` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `analysis_data` to the `diagnostics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `questionnaire_id` to the `diagnostics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `score_intelligent` to the `diagnostics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `diagnostics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `diagnostics` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."diagnostic_response" DROP CONSTRAINT "diagnostic_response_diagnostic_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."diagnostic_response" DROP CONSTRAINT "diagnostic_response_question_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."diagnostic_response" DROP CONSTRAINT "diagnostic_response_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."question_options" DROP CONSTRAINT "question_options_question_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."questions" DROP CONSTRAINT "questions_diagnostic_id_fkey";

-- AlterTable
ALTER TABLE "public"."diagnostics" DROP COLUMN "created_at",
DROP COLUMN "description",
DROP COLUMN "is_active",
DROP COLUMN "title",
DROP COLUMN "type",
DROP COLUMN "updated_at",
ADD COLUMN     "analysis_data" JSONB NOT NULL,
ADD COLUMN     "areas_focus" TEXT[],
ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "insights" TEXT[],
ADD COLUMN     "questionnaire_id" TEXT NOT NULL,
ADD COLUMN     "recommendations" TEXT[],
ADD COLUMN     "score_intelligent" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."diagnostic_response";

-- DropTable
DROP TABLE "public"."question_options";

-- DropTable
DROP TABLE "public"."questions";

-- CreateTable
CREATE TABLE "public"."questionnaires" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questionnaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."questionnaire_questions" (
    "id" TEXT NOT NULL,
    "questionnaire_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questionnaire_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."questionnaire_options" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questionnaire_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."questionnaire_responses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "questionnaire_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questionnaire_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "questionnaire_responses_user_id_questionnaire_id_question_i_key" ON "public"."questionnaire_responses"("user_id", "questionnaire_id", "question_id");

-- AddForeignKey
ALTER TABLE "public"."questionnaire_questions" ADD CONSTRAINT "questionnaire_questions_questionnaire_id_fkey" FOREIGN KEY ("questionnaire_id") REFERENCES "public"."questionnaires"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."questionnaire_options" ADD CONSTRAINT "questionnaire_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questionnaire_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."questionnaire_responses" ADD CONSTRAINT "questionnaire_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."questionnaire_responses" ADD CONSTRAINT "questionnaire_responses_questionnaire_id_fkey" FOREIGN KEY ("questionnaire_id") REFERENCES "public"."questionnaires"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."questionnaire_responses" ADD CONSTRAINT "questionnaire_responses_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questionnaire_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."diagnostics" ADD CONSTRAINT "diagnostics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."diagnostics" ADD CONSTRAINT "diagnostics_questionnaire_id_fkey" FOREIGN KEY ("questionnaire_id") REFERENCES "public"."questionnaires"("id") ON DELETE CASCADE ON UPDATE CASCADE;
