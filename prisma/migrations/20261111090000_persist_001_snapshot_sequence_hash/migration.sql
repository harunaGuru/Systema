-- Add snapshot ordering and deduplication metadata.
ALTER TABLE "Project" ADD COLUMN "snapshotSequence" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CanvasSnapshot" ADD COLUMN "sequence" INTEGER;
ALTER TABLE "CanvasSnapshot" ADD COLUMN "contentHash" TEXT;

-- Give existing snapshots a stable sequence within each project.
WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "projectId"
    ORDER BY "createdAt" ASC, "id" ASC
  )::INTEGER AS sequence
  FROM "CanvasSnapshot"
)
UPDATE "CanvasSnapshot" AS snapshot
SET "sequence" = ranked.sequence
FROM ranked
WHERE snapshot."id" = ranked."id";

UPDATE "Project" AS project
SET "snapshotSequence" = COALESCE((
  SELECT MAX(snapshot."sequence")
  FROM "CanvasSnapshot" AS snapshot
  WHERE snapshot."projectId" = project."id"
), 0);

ALTER TABLE "CanvasSnapshot" ALTER COLUMN "sequence" SET NOT NULL;
CREATE UNIQUE INDEX "CanvasSnapshot_projectId_sequence_key"
  ON "CanvasSnapshot"("projectId", "sequence");
CREATE UNIQUE INDEX "CanvasSnapshot_projectId_contentHash_key"
  ON "CanvasSnapshot"("projectId", "contentHash");
