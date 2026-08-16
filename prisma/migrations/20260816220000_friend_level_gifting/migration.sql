-- Move gifting style to per-friend, add gift history, retire the global profile.

-- DropForeignKey
ALTER TABLE "GiftingStyleProfile" DROP CONSTRAINT "GiftingStyleProfile_userId_fkey";

-- AlterTable
ALTER TABLE "RelationshipContext" ADD COLUMN     "favoriteBrands" TEXT,
ADD COLUMN     "philosophyTags" TEXT,
ADD COLUMN     "riskTolerance" TEXT,
ADD COLUMN     "sizes" TEXT;

-- DropTable
DROP TABLE "GiftingStyleProfile";

-- CreateTable
CREATE TABLE "GiftGiven" (
    "id" TEXT NOT NULL,
    "giverId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "occasion" TEXT,
    "yearGiven" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftGiven_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GiftGiven_giverId_receiverId_idx" ON "GiftGiven"("giverId", "receiverId");

-- AddForeignKey
ALTER TABLE "GiftGiven" ADD CONSTRAINT "GiftGiven_giverId_fkey" FOREIGN KEY ("giverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftGiven" ADD CONSTRAINT "GiftGiven_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
