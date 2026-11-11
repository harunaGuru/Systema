import { clerkClient } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { AccessError, requireProjectAccess } from "@/lib/server/auth"

type CollaboratorsRouteContext = {
  params: Promise<{ projectId: string }>
}

export async function GET(
  _request: Request,
  { params }: CollaboratorsRouteContext,
) {
  const { projectId } = await params

  try {
    const access = await requireProjectAccess(projectId)
    if (access.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const collaborators = await prisma.collaborator.findMany({
      where: { projectId },
      select: { id: true, userId: true },
    })
    if (collaborators.length === 0) {
      return NextResponse.json({ collaborators: [] })
    }

    const client = await clerkClient()
    const { data: users } = await client.users.getUserList({
      userId: collaborators.map((collaborator) => collaborator.userId),
      limit: collaborators.length,
    })
    const usersById = new Map(users.map((user) => [user.id, user]))

    return NextResponse.json({
      collaborators: collaborators.map((collaborator) => {
        const user = usersById.get(collaborator.userId)
        return {
          ...collaborator,
          name: user?.firstName ?? user?.username ?? "Collaborator",
          email: user?.primaryEmailAddress?.emailAddress ?? "",
        }
      }),
    })
  } catch (error) {
    if (error instanceof AccessError) {
      const status = {
        UNAUTHORIZED: 401,
        NOT_FOUND: 404,
        FORBIDDEN: 403,
      }[error.code]
      return NextResponse.json({ error: error.message }, { status })
    }

    return NextResponse.json(
      { error: "Unable to load project collaborators" },
      { status: 500 },
    )
  }
}
