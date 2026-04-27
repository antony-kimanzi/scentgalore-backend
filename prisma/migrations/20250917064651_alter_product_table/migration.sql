/*
  Warnings:

  - You are about to drop the column `iamge_url` on the `products` table. All the data in the column will be lost.
  - Added the required column `image_url` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."products" DROP COLUMN "iamge_url",
ADD COLUMN     "image_url" VARCHAR(500) NOT NULL;
