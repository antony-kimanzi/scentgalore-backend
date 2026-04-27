/*
  Warnings:

  - You are about to drop the column `apartment` on the `billing_details` table. All the data in the column will be lost.
  - You are about to drop the column `postal_code` on the `billing_details` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."billing_details" DROP CONSTRAINT "billing_details_order_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."shipping_details" DROP CONSTRAINT "shipping_details_order_id_fkey";

-- AlterTable
ALTER TABLE "public"."billing_details" DROP COLUMN "apartment",
DROP COLUMN "postal_code";

-- AddForeignKey
ALTER TABLE "public"."billing_details" ADD CONSTRAINT "billing_details_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shipping_details" ADD CONSTRAINT "shipping_details_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
