import { get } from "@vercel/blob"
import { NextResponse } from "next/server"
import { CanvasSnapshotPayloadSchema } from "@/types/canvas-snapshot"
import { prisma } from "@/lib/db"
import { AccessError, requireProjectAccess } from "@/lib/server/auth"

function getAccessErrorResponse(error: AccessError) {
  const status = error.code === "UNAUTHORIZED" ? 401 : error.code === "FORBIDDEN" ? 403 : 404
  return NextResponse.json({ error: error.message }, { status })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; snapshotId: string }> },
) {
  try {
    const { projectId, snapshotId } = await params
    await requireProjectAccess(projectId)

    const snapshot = await prisma.canvasSnapshot.findUnique({
      where: { id: snapshotId },
      select: { projectId: true, blobPath: true },
    })
    if (!snapshot || snapshot.projectId !== projectId) {
      return NextResponse.json({ error: "Snapshot not found" }, { status: 404 })
    }

    const blob = await get(snapshot.blobPath, { access: "private" })
    if (!blob || blob.statusCode !== 200) {
      return NextResponse.json({ error: "Snapshot content not found" }, { status: 404 })
    }

    const blobContent: unknown = await new Response(blob.stream).json()
    const parsed = CanvasSnapshotPayloadSchema.safeParse(blobContent)
    if (!parsed.success) {
      return NextResponse.json({ error: "Snapshot content is invalid" }, { status: 502 })
    }

    return NextResponse.json(parsed.data)
  } catch (error) {
    if (error instanceof AccessError) return getAccessErrorResponse(error)
    console.error("Snapshot read error:", error)
    return NextResponse.json({ error: "Unable to load snapshot" }, { status: 500 })
  }
}
