import 'server-only'

import { prisma } from '@/lib/db'

export async function listOwnedProjects(userId: string) {
  const projects = await prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true },
  })

  return projects.map((project) => ({ ...project, isOwner: true }))
}

export async function listSharedProjects(userId: string) {
  const projects = await prisma.project.findMany({
    where: { collaborators: { some: { userId } } },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true },
  })

  return projects.map((project) => ({ ...project, isOwner: false }))
}
