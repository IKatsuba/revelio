/*
  Warnings:

  - The primary key for the `GroupMember` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `GroupMember` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "GroupMember" DROP CONSTRAINT "GroupMember_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("userId", "groupId");
