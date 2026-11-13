import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { AccessError, requireProjectAccess } from "@/lib/server/auth"

const RunIdSchema = z.string().trim().min(1)

function accessErrorStatus(error: AccessError): number {
  return error.code === "UNAUTHORIZED" ? 401 : error.code === "FORBIDDEN" ? 403 : 404
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params
  const runId = new URL(request.url).searchParams.get("runId")
  const parsedRunId = runId === null ? undefined : RunIdSchema.safeParse(runId)
  if (parsedRunId && !parsedRunId.success) {
    return NextResponse.json({ error: "runId must not be empty" }, { status: 400 })
  }

  try {
    await requireProjectAccess(projectId)
    const artifact = await prisma.artifact.findFirst({
      where: { projectId, type: "SPEC", ...(parsedRunId ? { runId: parsedRunId.data } : {}) },
      orderBy: parsedRunId ? undefined : { createdAt: "desc" },
      select: { id: true },
    })
    return NextResponse.json({ artifactId: artifact?.id ?? null })
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: accessErrorStatus(error) })
    }
    return NextResponse.json({ error: "Unable to look up specification" }, { status: 500 })
  }
}
