/*
  Warnings:

  - You are about to drop the `Usage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Usage" DROP CONSTRAINT "Usage_subscriptionId_fkey";

-- DropTable
DROP TABLE "Usage";

-- CreateTable
CREATE TABLE "Limits" (
    "id" SERIAL NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "textTokensUsed" INTEGER NOT NULL DEFAULT 0,
    "voiceMinutesUsed" INTEGER NOT NULL DEFAULT 0,
    "imagesGenerated" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Limits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Limits_subscriptionId_key" ON "Limits"("subscriptionId");

-- AddForeignKey
ALTER TABLE "Limits" ADD CONSTRAINT "Limits_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
