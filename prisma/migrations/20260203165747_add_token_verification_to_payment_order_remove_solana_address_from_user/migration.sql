/*
  Warnings:

  - You are about to drop the column `solanaAddress` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PaymentOrder" ADD COLUMN     "isTokenVerification" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "senderAddress" TEXT,
ADD COLUMN     "tokenVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verificationMemo" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "solanaAddress";
