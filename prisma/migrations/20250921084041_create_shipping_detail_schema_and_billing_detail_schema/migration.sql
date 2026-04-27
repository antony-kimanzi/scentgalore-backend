/*
  Warnings:

  - You are about to drop the column `shipping_address` on the `orders` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."orders" DROP COLUMN "shipping_address";

-- CreateTable
CREATE TABLE "public"."billing_details" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "first_name" VARCHAR(50) NOT NULL,
    "last_name" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "city" VARCHAR(50) NOT NULL,
    "phone_number" INTEGER NOT NULL,
    "apartment" VARCHAR(255),
    "postal_code" VARCHAR(50),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shipping_details" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "first_name" VARCHAR(50) NOT NULL,
    "last_name" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "city" VARCHAR(50) NOT NULL,
    "phone_number" INTEGER NOT NULL,
    "apartment" VARCHAR(255),
    "postal_code" VARCHAR(50),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipping_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_details_email_key" ON "public"."billing_details"("email");

-- CreateIndex
CREATE UNIQUE INDEX "billing_details_order_id_key" ON "public"."billing_details"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "shipping_details_email_key" ON "public"."shipping_details"("email");

-- CreateIndex
CREATE UNIQUE INDEX "shipping_details_order_id_key" ON "public"."shipping_details"("order_id");

-- AddForeignKey
ALTER TABLE "public"."billing_details" ADD CONSTRAINT "billing_details_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shipping_details" ADD CONSTRAINT "shipping_details_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
