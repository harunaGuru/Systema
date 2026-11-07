'use server'

import { del } from '@vercel/blob'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireProjectAccess } from '@/lib/server/auth'

const projectIdSchema = z.string().min(1)

type DeleteProjectResult =
  | { ok: true }
  | { ok: false; error: string }

export async function deleteProject(
  projectId: string,
): Promise<DeleteProjectResult> {
  const parsedProjectId = projectIdSchema.safeParse(projectId)
  if (!parsedProjectId.success) return { ok: false, error: 'Invalid project' }

  try {
    const access = await requireProjectAccess(parsedProjectId.data)
    const isOwner = access.role === 'owner'
    if (!isOwner) {
      return { ok: false, error: 'Only the owner can delete this project' }
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return { ok: false, error: 'Unauthorized' }
      }
      if (error.message === 'Not found') {
        return { ok: false, error: 'Not found' }
      }
      if (error.message === 'Forbidden') {
        return { ok: false, error: 'Forbidden' }
      }
    }
    throw error
  }

  const snapshots = await prisma.canvasSnapshot.findMany({
    where: { projectId: parsedProjectId.data },
    select: { blobPath: true },
  })
  const artifacts = await prisma.artifact.findMany({
    where: { projectId: parsedProjectId.data },
    select: { blobPath: true },
  })
  const blobPaths = [
    ...snapshots.map((snapshot) => snapshot.blobPath),
    ...artifacts.map((artifact) => artifact.blobPath),
  ]

  if (blobPaths.length > 0) {
    try {
      await del(blobPaths)
    } catch {
      return {
        ok: false,
        error: 'Failed to delete project files. Try again.',
      }
    }
  }

  try {
    await prisma.$transaction([
      prisma.collaborator.deleteMany({
        where: { projectId: parsedProjectId.data },
      }),
      prisma.canvasSnapshot.deleteMany({
        where: { projectId: parsedProjectId.data },
      }),
      prisma.artifact.deleteMany({
        where: { projectId: parsedProjectId.data },
      }),
      prisma.project.delete({ where: { id: parsedProjectId.data } }),
    ])
  } catch {
    return { ok: false, error: 'Failed to delete project. Try again.' }
  }

  return { ok: true }
}
