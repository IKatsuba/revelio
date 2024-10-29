/*
  Warnings:

  - You are about to drop the `SubscriptionOnPrice` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `priceId` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "SubscriptionOnPrice" DROP CONSTRAINT "SubscriptionOnPrice_priceId_fkey";

-- DropForeignKey
ALTER TABLE "SubscriptionOnPrice" DROP CONSTRAINT "SubscriptionOnPrice_subscriptionId_fkey";

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "priceId" TEXT NOT NULL;

-- DropTable
DROP TABLE "SubscriptionOnPrice";

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_priceId_fkey" FOREIGN KEY ("priceId") REFERENCES "Price"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
