/*
  Warnings:

  - You are about to drop the column `imagesGenerated` on the `Limits` table. All the data in the column will be lost.
  - You are about to drop the column `textTokensUsed` on the `Limits` table. All the data in the column will be lost.
  - You are about to drop the column `voiceMinutesUsed` on the `Limits` table. All the data in the column will be lost.
  - You are about to drop the column `imagesGenerated` on the `UsageLog` table. All the data in the column will be lost.
  - You are about to drop the column `textTokensUsed` on the `UsageLog` table. All the data in the column will be lost.
  - You are about to drop the column `voiceMinutesUsed` on the `UsageLog` table. All the data in the column will be lost.
  - Added the required column `imageGeneration` to the `Limits` table without a default value. This is not possible if the table is not empty.
  - Added the required column `outputTokens` to the `Limits` table without a default value. This is not possible if the table is not empty.
  - Added the required column `voiceMinutes` to the `Limits` table without a default value. This is not possible if the table is not empty.
  - Added the required column `imageGeneration` to the `UsageLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `outputTokens` to the `UsageLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `voiceMinutes` to the `UsageLog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Limits" DROP COLUMN "imagesGenerated",
DROP COLUMN "textTokensUsed",
DROP COLUMN "voiceMinutesUsed",
ADD COLUMN     "imageGeneration" INTEGER NOT NULL,
ADD COLUMN     "outputTokens" INTEGER NOT NULL,
ADD COLUMN     "voiceMinutes" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "UsageLog" DROP COLUMN "imagesGenerated",
DROP COLUMN "textTokensUsed",
DROP COLUMN "voiceMinutesUsed",
ADD COLUMN     "imageGeneration" INTEGER NOT NULL,
ADD COLUMN     "outputTokens" INTEGER NOT NULL,
ADD COLUMN     "voiceMinutes" INTEGER NOT NULL;
