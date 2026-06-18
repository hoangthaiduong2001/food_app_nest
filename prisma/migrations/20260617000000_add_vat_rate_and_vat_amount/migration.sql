-- AlterTable: thêm vatRate vào Seller (default 10%)
ALTER TABLE "Seller" ADD COLUMN "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 10;

-- AlterTable: thêm vatAmount vào Order (default 0)
ALTER TABLE "Order" ADD COLUMN "vatAmount" INTEGER NOT NULL DEFAULT 0;
