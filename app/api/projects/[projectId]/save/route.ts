import { createHash } from "node:crypto"
import { del, put } from "@vercel/blob"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { AccessError, requireProjectAccess } from "@/lib/server/auth"
import { CanvasSnapshotPayloadSchema } from "@/types/canvas-snapshot"

const SaveSchema = CanvasSnapshotPayloadSchema

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }
type CleanupSnapshot = { id: string; blobPath: string }
type SaveResult = { snapshotId: string; cleanupSnapshots: CleanupSnapshot[] }

function canonicalize(value: unknown): JsonValue {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0).map(
        ([key, item]) => [key, canonicalize(item)],
      ),
    )
  }
  return value as JsonValue
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to save canvas"
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params
    await requireProjectAccess(projectId)

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid canvas data" }, { status: 400 })
    }
    const parsed = SaveSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid canvas data" }, { status: 400 })
    }

    const canonicalPayload = canonicalize(parsed.data)
    const payload = JSON.stringify(canonicalPayload)
    const contentHash = createHash("sha256").update(payload).digest("hex")

    let uploadedBlobPath: string | null = null
    let result: SaveResult
    try {
      result = await prisma.$transaction(async (transaction) => {
        const lockedProjects = await transaction.$queryRaw<Array<{ id: string }>>`
          SELECT "id" FROM "Project" WHERE "id" = ${projectId} FOR UPDATE
        `
        if (lockedProjects.length === 0) throw new AccessError("NOT_FOUND")

        const latestSnapshot = await transaction.canvasSnapshot.findFirst({
          where: { projectId },
          orderBy: { sequence: "desc" },
          select: { id: true, contentHash: true },
        })
        let snapshotId = latestSnapshot?.id

        if (latestSnapshot?.contentHash !== contentHash) {
          const project = await transaction.project.update({
            where: { id: projectId },
            data: { snapshotSequence: { increment: 1 } },
            select: { snapshotSequence: true },
          })
          const blobPath = `canvas-json/${projectId}/${crypto.randomUUID()}.json`
          const blob = await put(blobPath, payload, {
            access: "private",
            addRandomSuffix: false,
            contentType: "application/json",
          })
          uploadedBlobPath = blob.url
          const snapshot = await transaction.canvasSnapshot.create({
            data: {
              projectId,
              blobPath: blob.url,
              sequence: project.snapshotSequence,
              contentHash,
            },
            select: { id: true },
          })
          snapshotId = snapshot.id
        }

        const oldSnapshots = await transaction.canvasSnapshot.findMany({
          where: { projectId },
          orderBy: { sequence: "desc" },
          skip: 5,
          select: { id: true },
        })
        if (oldSnapshots.length > 0) {
          await transaction.canvasSnapshot.updateMany({
            where: { id: { in: oldSnapshots.map((snapshot) => snapshot.id) } },
            data: { prunePending: true },
          })
        }

        const cleanupSnapshots = await transaction.canvasSnapshot.findMany({
          where: { projectId, prunePending: true },
          select: { id: true, blobPath: true },
        })

        if (!snapshotId) throw new Error("Unable to resolve the saved snapshot")
        return { snapshotId, cleanupSnapshots }
      }, { maxWait: 10_000, timeout: 60_000 })
    } catch (error) {
      if (uploadedBlobPath) {
        try {
          await del(uploadedBlobPath)
        } catch (cleanupError) {
          console.error("Unable to remove Blob after save transaction failure:", cleanupError)
        }
      }
      throw error
    }

    let cleanupPending = false
    for (const snapshot of result.cleanupSnapshots) {
      try {
        await del(snapshot.blobPath)
        await prisma.canvasSnapshot.deleteMany({
          where: { id: snapshot.id, prunePending: true },
        })
      } catch (error) {
        cleanupPending = true
        console.error("Snapshot pruning failed; retaining cleanup record:", error)
      }
    }

    return NextResponse.json({
      success: true,
      snapshotId: result.snapshotId,
      cleanupPending,
    })
  } catch (error) {
    if (error instanceof AccessError) {
      const status = error.code === "UNAUTHORIZED" ? 401 : error.code === "FORBIDDEN" ? 403 : 404
      return NextResponse.json({ error: error.message }, { status })
    }
    console.error("Save error:", error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
