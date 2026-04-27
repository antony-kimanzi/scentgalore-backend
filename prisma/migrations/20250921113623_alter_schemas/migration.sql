/*
  Warnings:

  - You are about to alter the column `image_url` on the `products` table. The data in that column could be lost. The data in that column will be cast from `VarChar(500)` to `VarChar(255)`.
  - Added the required column `shipping_method` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."orders" ADD COLUMN     "shipping_method" VARCHAR(100) NOT NULL;

-- AlterTable
ALTER TABLE "public"."products" ALTER COLUMN "image_url" SET DATA TYPE VARCHAR(255);
