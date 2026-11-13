import { get } from "@vercel/blob"
import { NextResponse } from "next/server"
import { CanvasSnapshotPayloadSchema } from "@/types/canvas-snapshot"
import { prisma } from "@/lib/db"
import { AccessError, requireProjectAccess } from "@/lib/server/auth"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params
    await requireProjectAccess(projectId)

    const latestSnapshot = await prisma.canvasSnapshot.findFirst({
      where: { projectId },
      orderBy: { sequence: "desc" },
      select: { blobPath: true },
    })
    if (!latestSnapshot) {
      return NextResponse.json({ error: "No snapshots found for this project." }, { status: 404 })
    }

    const blob = await get(latestSnapshot.blobPath, { access: "private" })
    if (!blob || blob.statusCode !== 200) {
      return NextResponse.json({ error: "Failed to fetch snapshot Blob" }, { status: 500 })
    }

    let blobContent: unknown
    try {
      blobContent = await new Response(blob.stream).json()
    } catch {
      return NextResponse.json({ error: "Snapshot content is invalid" }, { status: 502 })
    }

    const parsedSnapshot = CanvasSnapshotPayloadSchema.safeParse(blobContent)
    if (!parsedSnapshot.success) {
      return NextResponse.json({ error: "Snapshot content is invalid" }, { status: 502 })
    }

    const safeProjectId = projectId.replace(/[^a-zA-Z0-9_-]/g, "_")
    return new Response(JSON.stringify(parsedSnapshot.data), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="canvas-${safeProjectId}.json"`,
      },
    })
  } catch (error) {
    if (error instanceof AccessError) {
      const status = error.code === "UNAUTHORIZED" ? 401 : error.code === "FORBIDDEN" ? 403 : 404
      return NextResponse.json({ error: error.message }, { status })
    }
    console.error("Snapshot download error:", error)
    return NextResponse.json({ error: "Unable to download snapshot" }, { status: 500 })
  }
}
