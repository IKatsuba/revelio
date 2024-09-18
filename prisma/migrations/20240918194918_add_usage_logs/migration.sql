-- CreateTable
CREATE TABLE "UsageLog" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "textTokensUsed" INTEGER NOT NULL,
    "voiceMinutesUsed" INTEGER NOT NULL,
    "imagesGenerated" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UsageLog" ADD CONSTRAINT "UsageLog_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
