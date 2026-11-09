import { Liveblocks } from '@liveblocks/node'
import { clerkClient } from '@clerk/nextjs/server'
import { AccessError, requireProjectAccess } from '@/lib/server/auth'
import { liveblocksUserColor } from '@/lib/liveblocks-user-color'

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
})

export async function POST(request: Request): Promise<Response> {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Missing room' }, { status: 400 })
  }

  const room =
    typeof body === 'object' && body !== null && 'room' in body
      ? body.room
      : undefined

  if (typeof room !== 'string' || room.trim().length === 0) {
    return Response.json({ error: 'Missing room' }, { status: 400 })
  }

  try {
    const { userId } = await requireProjectAccess(room)
    const clerk = await clerkClient()
    const user = await clerk.users.getUser(userId)
    const displayName = user.firstName?.trim() || 'Collaborator'
    const session = liveblocks.prepareSession(userId, {
      userInfo: { name: displayName, color: liveblocksUserColor(userId) },
    })

    session.allow(room, session.FULL_ACCESS)
    const { status, body: responseBody } = await session.authorize()
    return new Response(responseBody, { status })
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
