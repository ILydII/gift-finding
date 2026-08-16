-- DropIndex
DROP INDEX "User_guestToken_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "guestToken",
DROP COLUMN "isGuest";

