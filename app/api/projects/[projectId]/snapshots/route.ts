import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { AccessError, requireProjectAccess } from "@/lib/server/auth"

function getAccessErrorResponse(error: AccessError) {
  const status = error.code === "UNAUTHORIZED" ? 401 : error.code === "FORBIDDEN" ? 403 : 404
  return NextResponse.json({ error: error.message }, { status })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params
    await requireProjectAccess(projectId)

    const snapshots = await prisma.canvasSnapshot.findMany({
      where: { projectId },
      orderBy: { sequence: "desc" },
      take: 5,
      select: { id: true, createdAt: true },
    })

    return NextResponse.json({ snapshots })
  } catch (error) {
    if (error instanceof AccessError) return getAccessErrorResponse(error)
    console.error("Snapshot list error:", error)
    return NextResponse.json({ error: "Unable to load snapshots" }, { status: 500 })
  }
}
