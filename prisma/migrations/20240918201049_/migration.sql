/*
  Warnings:

  - You are about to drop the `Limits` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Limits" DROP CONSTRAINT "Limits_subscriptionId_fkey";

-- DropTable
DROP TABLE "Limits";
