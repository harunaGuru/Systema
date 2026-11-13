import { get } from "@vercel/blob"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { AccessError, requireProjectAccess } from "@/lib/server/auth"

function accessErrorStatus(error: AccessError): number {
  return error.code === "UNAUTHORIZED" ? 401 : error.code === "FORBIDDEN" ? 403 : 404
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; artifactId: string }> },
) {
  try {
    const { projectId, artifactId } = await params
    await requireProjectAccess(projectId)

    const artifact = await prisma.artifact.findUnique({
      where: { id: artifactId },
      select: { projectId: true, type: true, blobPath: true },
    })
    if (!artifact || artifact.projectId !== projectId || artifact.type !== "SPEC") {
      return NextResponse.json({ error: "Spec not found" }, { status: 404 })
    }

    const blob = await get(artifact.blobPath, { access: "private" })
    if (!blob || blob.statusCode !== 200) {
      return NextResponse.json({ error: "Failed to fetch spec Blob" }, { status: 500 })
    }

    const markdown = await new Response(blob.stream).text()
    const isDownload = new URL(request.url).searchParams.get("download") === "true"
    const safeProjectId = projectId.replace(/[^a-zA-Z0-9_-]/g, "_")

    return new Response(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "private, no-store",
        ...(isDownload
          ? { "Content-Disposition": `attachment; filename="spec-${safeProjectId}.md"` }
          : {}),
      },
    })
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: accessErrorStatus(error) })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load spec" },
      { status: 500 },
    )
  }
}
