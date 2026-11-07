'use server'

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { Prisma } from '@/lib/generated/prisma/client'
import { prisma } from '@/lib/db'
import { slugify } from '@/lib/slug'

const createProjectSchema = z.string().trim().min(1).max(80)
const projectIdSuffixSchema = z.string().regex(/^[a-f0-9]{12}$/)

export async function createProject(
  name: string,
  idSuffix: string,
): Promise<{ ok: false; error: string }> {
  const parsedName = createProjectSchema.safeParse(name)
  if (!parsedName.success) return { ok: false as const, error: 'Invalid name' }
  const parsedSuffix = projectIdSuffixSchema.safeParse(idSuffix)
  if (!parsedSuffix.success) return { ok: false as const, error: 'Invalid name' }

  const { userId } = await auth()
  if (!userId) return { ok: false as const, error: 'Unauthorized' }

  const trimmedName = parsedName.data
  const slug = slugify(trimmedName)
  if (!slug) return { ok: false as const, error: 'Invalid name' }
  const id = `${slug}-${parsedSuffix.data}`

  const existingProject = await prisma.project.findUnique({ where: { id } })
  if (existingProject) {
    return { ok: false as const, error: 'A project with a similar name or URL already exists' }
  }

  try {
    await prisma.project.create({ data: { id, name: trimmedName, ownerId: userId } })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return { ok: false as const, error: 'A project with a similar name or URL already exists' }
    }
    throw error
  }

  redirect('/editor/' + id)
}
