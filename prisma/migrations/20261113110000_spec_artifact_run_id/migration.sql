-- AlterTable
ALTER TABLE "Artifact" ADD COLUMN     "runId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Artifact_runId_key" ON "Artifact"("runId");
