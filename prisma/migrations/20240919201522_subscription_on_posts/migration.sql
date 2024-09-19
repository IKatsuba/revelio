/*
  Warnings:

  - You are about to drop the column `priceId` on the `Subscription` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_priceId_fkey";

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "priceId";

-- CreateTable
CREATE TABLE "SubscriptionOnPrice" (
    "id" SERIAL NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "priceId" TEXT NOT NULL,

    CONSTRAINT "SubscriptionOnPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionOnPrice_subscriptionId_priceId_key" ON "SubscriptionOnPrice"("subscriptionId", "priceId");

-- AddForeignKey
ALTER TABLE "SubscriptionOnPrice" ADD CONSTRAINT "SubscriptionOnPrice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionOnPrice" ADD CONSTRAINT "SubscriptionOnPrice_priceId_fkey" FOREIGN KEY ("priceId") REFERENCES "Price"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
