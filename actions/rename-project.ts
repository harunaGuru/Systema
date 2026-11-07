'use server'

import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireProjectAccess } from '@/lib/server/auth'

const renameProjectSchema = z.object({
  projectId: z.string().min(1),
  newName: z.string().trim().min(1).max(80),
})

type RenameProjectResult =
  | { ok: true }
  | { ok: false; error: string }

export async function renameProject(
  projectId: string,
  newName: string,
): Promise<RenameProjectResult> {
  const parsed = renameProjectSchema.safeParse({ projectId, newName })
  if (!parsed.success) return { ok: false, error: 'Invalid name' }

  let access
  try {
    access = await requireProjectAccess(parsed.data.projectId)
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

  if (access.role !== 'owner') {
    return { ok: false, error: 'Only the owner can rename this project' }
  }

  try {
    await prisma.project.update({
      where: { id: parsed.data.projectId },
      data: { name: parsed.data.newName },
    })
  } catch {
    return { ok: false, error: 'Failed to rename project. Try again.' }
  }

  return { ok: true }
}
