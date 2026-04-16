-- CreateEnum
CREATE TYPE "SubscriptionCycle" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'SEMIANNUALLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "BillingType" AS ENUM ('BOLETO', 'CREDIT_CARD', 'PIX', 'UNDEFINED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'OVERDUE', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "asaasId" TEXT NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "cycle" "SubscriptionCycle" NOT NULL,
    "billingType" "BillingType" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "nextDueDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "checkoutUrl" TEXT,
    "sellerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_asaasId_key" ON "subscriptions"("asaasId");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
