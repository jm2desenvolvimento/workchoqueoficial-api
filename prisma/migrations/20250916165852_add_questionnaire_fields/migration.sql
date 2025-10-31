-- AlterTable
ALTER TABLE "public"."questionnaire_options" ADD COLUMN     "score" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "public"."questionnaire_questions" ADD COLUMN     "required" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "public"."questionnaires" ADD COLUMN     "estimated_time" INTEGER NOT NULL DEFAULT 15;
