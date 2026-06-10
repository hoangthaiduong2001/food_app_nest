-- CreateEnum
CREATE TYPE "WalletRequestType" AS ENUM ('DEPOSIT', 'WITHDRAW');

-- AlterTable
ALTER TABLE "DepositRequest" ADD COLUMN     "type" "WalletRequestType" NOT NULL DEFAULT 'DEPOSIT';
