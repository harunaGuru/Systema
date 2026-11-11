import { NextResponse } from "next/server"
import { tasks } from "@trigger.dev/sdk"
import { generateGraphTask } from "@/trigger/generate-graph"
import { GenerateGraphPayloadSchema } from "@/lib/ai/schema"
import { AccessError, requireProjectAccess } from "@/lib/server/auth"

export async function POST(request: Request) {
  let requestBody: unknown

  try {
    requestBody = await request.json()
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 })
  }

  const payload = GenerateGraphPayloadSchema.safeParse(requestBody)
  if (!payload.success) {
    return NextResponse.json({ error: "Invalid graph generation request" }, { status: 400 })
  }

  try {
    await requireProjectAccess(payload.data.projectId)
    const handle = await tasks.trigger<typeof generateGraphTask>(
      "generate-graph",
      payload.data,
    )

    return NextResponse.json({
      success: true,
      runId: handle.id,
      accessToken: handle.publicAccessToken,
    })
  } catch (error) {
    if (error instanceof AccessError) {
      const status = {
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
      }[error.code]
      return NextResponse.json({ error: error.message }, { status })
    }

    return NextResponse.json({ error: "Unable to start graph generation" }, { status: 500 })
  }
}
