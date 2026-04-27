/*
  Warnings:

  - A unique constraint covering the columns `[checkout_request_id]` on the table `orders` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[mpesa_receipt]` on the table `orders` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "checkout_request_id" VARCHAR(100),
ADD COLUMN     "mpesa_receipt" VARCHAR(50),
ADD COLUMN     "payment_amount" DECIMAL(10,2),
ADD COLUMN     "payment_date" TIMESTAMP(6),
ADD COLUMN     "payment_error" TEXT,
ADD COLUMN     "payment_phone" VARCHAR(20);

-- CreateIndex
CREATE UNIQUE INDEX "orders_checkout_request_id_key" ON "orders"("checkout_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_mpesa_receipt_key" ON "orders"("mpesa_receipt");
