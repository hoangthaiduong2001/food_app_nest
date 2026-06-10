-- Bring the wallet schema in line with the current Prisma schema, then widen
-- money fields so currency conversion cannot overflow PostgreSQL INTEGER.
DO $$ BEGIN
  CREATE TYPE "Currency" AS ENUM ('VND', 'USD', 'GBP', 'JPY', 'KRW', 'CNY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "WalletTransactionType" ADD VALUE IF NOT EXISTS 'TRANSFER_IN';
ALTER TYPE "WalletTransactionType" ADD VALUE IF NOT EXISTS 'TRANSFER_OUT';

ALTER TABLE "Wallet"
  ADD COLUMN IF NOT EXISTS "accountNumber" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "currency" "Currency" NOT NULL DEFAULT 'VND',
  ALTER COLUMN "balance" TYPE BIGINT USING "balance"::BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS "Wallet_accountNumber_key" ON "Wallet"("accountNumber");

CREATE TABLE IF NOT EXISTS "ExchangeRate" (
  "id" SERIAL NOT NULL,
  "fromCurrency" "Currency" NOT NULL,
  "toCurrency" "Currency" NOT NULL,
  "rate" DOUBLE PRECISION NOT NULL,
  "updatedById" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ExchangeRate_fromCurrency_toCurrency_key"
  ON "ExchangeRate"("fromCurrency", "toCurrency");

ALTER TABLE "WalletTransaction"
  ADD COLUMN IF NOT EXISTS "originalAmount" BIGINT,
  ADD COLUMN IF NOT EXISTS "originalCurrency" "Currency",
  ADD COLUMN IF NOT EXISTS "exchangeRate" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "counterpartyAccount" VARCHAR(20);

ALTER TABLE "WalletTransaction"
  ALTER COLUMN "amount" TYPE BIGINT USING "amount"::BIGINT,
  ALTER COLUMN "balanceBefore" TYPE BIGINT USING "balanceBefore"::BIGINT,
  ALTER COLUMN "balanceAfter" TYPE BIGINT USING "balanceAfter"::BIGINT,
  ALTER COLUMN "originalAmount" TYPE BIGINT USING "originalAmount"::BIGINT;

ALTER TABLE "DepositRequest"
  ADD COLUMN IF NOT EXISTS "currency" "Currency" NOT NULL DEFAULT 'VND';
