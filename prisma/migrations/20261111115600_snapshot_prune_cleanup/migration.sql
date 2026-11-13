-- DropIndex
DROP INDEX "CanvasSnapshot_projectId_contentHash_key";

-- AlterTable
ALTER TABLE "CanvasSnapshot" ADD COLUMN     "prunePending" BOOLEAN NOT NULL DEFAULT false;
