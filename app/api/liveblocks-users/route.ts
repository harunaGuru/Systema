import { clerkClient } from '@clerk/nextjs/server'
import { z } from 'zod'
import { AccessError, requireProjectAccess } from '@/lib/server/auth'
import { prisma } from '@/lib/db'
import { liveblocksUserColor } from '@/lib/liveblocks-user-color'

const requestSchema = z.object({
  roomId: z.string().min(1).max(255),
  userIds: z.array(z.string().min(1).max(255)).max(10),
}).strict()

export async function POST(request: Request): Promise<Response> {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { roomId, userIds } = parsed.data

  try {
    await requireProjectAccess(roomId)

    const project = await prisma.project.findUnique({
      where: { id: roomId },
      select: {
        ownerId: true,
        collaborators: { select: { userId: true } },
      },
    })
    if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

    const projectUserIds = new Set([
      project.ownerId,
      ...project.collaborators.map((collaborator) => collaborator.userId),
    ])
    const clerk = await clerkClient()
    const users = await Promise.all(userIds.map(async (userId) => {
      const color = liveblocksUserColor(userId)
      if (!projectUserIds.has(userId)) {
        return { name: 'Collaborator', color }
      }

      const user = await clerk.users.getUser(userId)
      return { name: user.firstName?.trim() || 'Collaborator', color }
    }))

    return Response.json(users)
  } catch (error) {
    if (error instanceof AccessError) {
      switch (error.code) {
        case 'UNAUTHORIZED':
          return Response.json({ error: error.message }, { status: 401 })
        case 'NOT_FOUND':
          return Response.json({ error: error.message }, { status: 404 })
        case 'FORBIDDEN':
          return Response.json({ error: error.message }, { status: 403 })
      }
    }

    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
