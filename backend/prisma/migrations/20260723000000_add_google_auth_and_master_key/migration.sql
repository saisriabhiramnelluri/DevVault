-- AlterTable
ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP NOT NULL,
ADD COLUMN     "authProvider" TEXT NOT NULL DEFAULT 'local',
ADD COLUMN     "encryptedMasterKey" TEXT,
ADD COLUMN     "googleId" TEXT,
ADD COLUMN     "masterKeyIv" TEXT,
ADD COLUMN     "recoveryEncryptedMasterKey" TEXT,
ADD COLUMN     "recoveryMasterKeyIv" TEXT,
ADD COLUMN     "recoverySalt" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");
