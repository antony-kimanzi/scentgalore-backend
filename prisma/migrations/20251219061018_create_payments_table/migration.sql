/*
  Warnings:

  - You are about to drop the column `checkout_request_id` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `mpesa_receipt` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `payment_amount` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `payment_date` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `payment_error` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `payment_phone` on the `orders` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "orders_checkout_request_id_key";

-- DropIndex
DROP INDEX "orders_mpesa_receipt_key";

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "checkout_request_id",
DROP COLUMN "mpesa_receipt",
DROP COLUMN "payment_amount",
DROP COLUMN "payment_date",
DROP COLUMN "payment_error",
DROP COLUMN "payment_phone";

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "checkout_request_id" VARCHAR(100),
    "mpesa_receipt" VARCHAR(50),
    "payment_phone" VARCHAR(20),
    "payment_amount" DECIMAL(10,2),
    "payment_date" TIMESTAMP(6),
    "payment_error" TEXT,
    "paymentStatus" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "transaction_type" VARCHAR(50),
    "merchant_request_id" VARCHAR(100),
    "result_code" VARCHAR(10),
    "result_desc" VARCHAR(255),
    "processed_by" INTEGER,
    "processed_at" TIMESTAMP(6),
    "notes" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_order_id_key" ON "payments"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_checkout_request_id_key" ON "payments"("checkout_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_mpesa_receipt_key" ON "payments"("mpesa_receipt");

-- CreateIndex
CREATE UNIQUE INDEX "payments_merchant_request_id_key" ON "payments"("merchant_request_id");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
