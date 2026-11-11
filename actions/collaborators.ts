'use server'

import { clerkClient } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { Liveblocks } from '@liveblocks/node'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { AccessError, requireProjectAccess } from '@/lib/server/auth'

const liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY! })

const addCollaboratorSchema = z.object({
  projectId: z.string().min(1),
  email: z.string().email(),
})

const removeCollaboratorSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
})

type CollaboratorActionResult =
  | { ok: true }
  | { ok: false; error: string }

function mapAccessError(error: unknown): string | undefined {
  if (!(error instanceof AccessError)) return undefined

  switch (error.code) {
    case 'UNAUTHORIZED':
      return 'Unauthorized'
    case 'NOT_FOUND':
      return 'Not found'
    case 'FORBIDDEN':
      return 'Forbidden'
  }
}

export async function addCollaborator(
  projectId: string,
  email: string,
): Promise<CollaboratorActionResult> {
  const input = addCollaboratorSchema.safeParse({ projectId, email })
  if (!input.success) return { ok: false, error: 'Invalid input' }

  let access
  try {
    access = await requireProjectAccess(input.data.projectId)
  } catch (error) {
    const message = mapAccessError(error)
    if (message) return { ok: false, error: message }
    throw error
  }

  const isOwner = access.role === 'owner'
  if (!isOwner) {
    return { ok: false, error: 'Only the owner can add collaborators' }
  }

  const client = await clerkClient()
  const { data } = await client.users.getUserList({
    emailAddress: [input.data.email],
  })
  const user = data[0]

  if (!user) {
    return { ok: false, error: 'No user found with that email' }
  }

  const targetUserId = user.id
  const existingCollaborator = await prisma.collaborator.findUnique({
    where: {
      projectId_userId: {
        projectId: input.data.projectId,
        userId: targetUserId,
      },
    },
  })

  if (existingCollaborator) {
    return { ok: false, error: 'User is already a collaborator' }
  }

  await prisma.collaborator.create({
    data: {
      projectId: input.data.projectId,
      userId: targetUserId,
      role: 'EDITOR',
    },
  })

  revalidatePath('/editor')
  return { ok: true }
}

export async function removeCollaborator(
  projectId: string,
  userId: string,
): Promise<CollaboratorActionResult> {
  const input = removeCollaboratorSchema.safeParse({ projectId, userId })
  if (!input.success) return { ok: false, error: 'Invalid input' }

  let access
  try {
    access = await requireProjectAccess(input.data.projectId)
  } catch (error) {
    const message = mapAccessError(error)
    if (message) return { ok: false, error: message }
    throw error
  }

  const isOwner = access.role === 'owner'
  if (!isOwner) {
    return { ok: false, error: 'Only the owner can remove collaborators' }
  }

  try {
    await prisma.collaborator.delete({
      where: {
        projectId_userId: {
          projectId: input.data.projectId,
          userId: input.data.userId,
        },
      },
    })
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2025'
    ) {
      return { ok: false, error: 'Collaborator not found' }
    }
    throw error
  }

  await liveblocks.broadcastEvent(input.data.projectId, {
    type: 'COLLABORATOR_REMOVED',
    userId: input.data.userId,
  })
  revalidatePath('/editor')
  return { ok: true }
}
