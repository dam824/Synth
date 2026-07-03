-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPPORT');

-- CreateEnum
CREATE TYPE "AdminAuditAction" AS ENUM ('VIEW_METADATA', 'BREAK_GLASS_VIEW_CONTENT', 'EXPORT_USER_DATA', 'DELETE_CONVERSATION', 'SUSPEND_USER', 'SAFETY_OVERRIDE');

-- CreateEnum
CREATE TYPE "SafetyDecision" AS ENUM ('ALLOW', 'WARN', 'BLOCK', 'ESCALATE');

-- AlterTable
ALTER TABLE "FinalAnswer" ADD COLUMN     "contentEncrypted" TEXT,
ADD COLUMN     "contentKeyVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "contentNonce" TEXT,
ALTER COLUMN "content" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ModelResponse" ADD COLUMN     "contentEncrypted" TEXT,
ADD COLUMN     "contentKeyVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "contentNonce" TEXT;

-- AlterTable
ALTER TABLE "Prompt" ADD COLUMN     "contentEncrypted" TEXT,
ADD COLUMN     "contentKeyVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "contentNonce" TEXT,
ALTER COLUMN "content" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER',
ADD COLUMN     "suspended" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "adminEmail" TEXT,
    "targetUserId" TEXT,
    "conversationId" TEXT,
    "action" "AdminAuditAction" NOT NULL,
    "reason" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "promptId" TEXT,
    "stage" TEXT NOT NULL,
    "decision" "SafetyDecision" NOT NULL,
    "category" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafetyLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminAuditLog_adminId_idx" ON "AdminAuditLog"("adminId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_targetUserId_idx" ON "AdminAuditLog"("targetUserId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_conversationId_idx" ON "AdminAuditLog"("conversationId");

-- CreateIndex
CREATE INDEX "SafetyLog_userId_idx" ON "SafetyLog"("userId");

-- CreateIndex
CREATE INDEX "SafetyLog_promptId_idx" ON "SafetyLog"("promptId");

-- AddForeignKey
ALTER TABLE "SafetyLog" ADD CONSTRAINT "SafetyLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
