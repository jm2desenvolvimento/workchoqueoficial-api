/*
  Warnings:

  - The values [MASTER,ADMIN,USER] on the enum `user_role` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."user_role_new" AS ENUM ('master', 'admin', 'user');
ALTER TABLE "public"."users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "public"."users" ALTER COLUMN "role" TYPE "public"."user_role_new" USING ("role"::text::"public"."user_role_new");
ALTER TABLE "public"."role_permission" ALTER COLUMN "role" TYPE "public"."user_role_new" USING ("role"::text::"public"."user_role_new");
ALTER TYPE "public"."user_role" RENAME TO "user_role_old";
ALTER TYPE "public"."user_role_new" RENAME TO "user_role";
DROP TYPE "public"."user_role_old";
ALTER TABLE "public"."users" ALTER COLUMN "role" SET DEFAULT 'user';
COMMIT;

-- AlterTable
ALTER TABLE "public"."users" ALTER COLUMN "role" SET DEFAULT 'user';
