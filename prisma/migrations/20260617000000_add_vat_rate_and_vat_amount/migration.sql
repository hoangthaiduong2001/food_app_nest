-- This migration is a no-op on fresh databases (all fields are already in the init migration).
-- On existing databases (Neon production), it adds the missing columns safely.

ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 10;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "vatAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "sellerAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "settledAt" TIMESTAMP(3);
