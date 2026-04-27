/*
  Warnings:

  - A unique constraint covering the columns `[guest_id]` on the table `carts` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "carts" ADD COLUMN     "guest_id" TEXT,
ALTER COLUMN "user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "guest_id" TEXT,
ALTER COLUMN "user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "description" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderAccessToken" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderAccessToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderAccessToken_token_key" ON "OrderAccessToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "carts_guest_id_key" ON "carts"("guest_id");

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
