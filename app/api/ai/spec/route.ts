import { auth } from "@clerk/nextjs/server"
import { tasks } from "@trigger.dev/sdk"
import { NextResponse } from "next/server"
import { z } from "zod"
import { AccessError, requireProjectAccess } from "@/lib/server/auth"
import type { generateSpecTask } from "@/trigger/generate-spec"

const GenerateSpecRequestSchema = z.object({
  projectId: z.string().min(1),
  comments: z.array(z.string()).optional().default([]),
})

function accessErrorStatus(error: AccessError): number {
  return error.code === "UNAUTHORIZED" ? 401 : error.code === "FORBIDDEN" ? 403 : 404
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let requestBody: unknown
  try {
    requestBody = await request.json()
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 })
  }

  const parsed = GenerateSpecRequestSchema.safeParse(requestBody)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid specification request" }, { status: 400 })
  }

  try {
    await requireProjectAccess(parsed.data.projectId)
    const handle = await tasks.trigger<typeof generateSpecTask>("generate-spec", {
      ...parsed.data,
      userId,
    })

    return NextResponse.json({
      success: true,
      runId: handle.id,
      accessToken: handle.publicAccessToken,
    })
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: accessErrorStatus(error) })
    }
    return NextResponse.json({ error: "Unable to start specification generation" }, { status: 500 })
  }
}
