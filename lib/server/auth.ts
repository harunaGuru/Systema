import 'server-only'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

export type AccessErrorCode = 'UNAUTHORIZED' | 'NOT_FOUND' | 'FORBIDDEN'

const accessErrorMessages: Record<AccessErrorCode, string> = {
  UNAUTHORIZED: 'Unauthorized',
  NOT_FOUND: 'Not found',
  FORBIDDEN: 'Forbidden',
}

export class AccessError extends Error {
  constructor(readonly code: AccessErrorCode) {
    super(accessErrorMessages[code])
    this.name = 'AccessError'
  }
}

export type ProjectAccess =
  | { role: 'owner'; userId: string; projectId: string }
  | { role: 'editor'; userId: string; projectId: string }

async function projectAccessForUser(
  projectId: string,
  userId: string,
): Promise<ProjectAccess> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { collaborators: { where: { userId } } },
  })

  if (!project) throw new AccessError('NOT_FOUND')
  if (project.ownerId === userId) {
    return { role: 'owner', userId, projectId }
  }
  if (project.collaborators.length > 0) {
    return { role: 'editor', userId, projectId }
  }
  throw new AccessError('FORBIDDEN')
}

export async function requireProjectAccess(
  projectId: string,
): Promise<ProjectAccess> {
  const { userId } = await auth()
  if (!userId) throw new AccessError('UNAUTHORIZED')

  return projectAccessForUser(projectId, userId)
}
