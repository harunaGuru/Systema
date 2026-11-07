import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import { Canvas } from '@/components/editor/canvas/canvas'
import { EditorShell } from '@/components/editor/editor-shell'
import { AccessError, requireProjectAccess } from '@/lib/server/auth'
import { listOwnedProjects, listSharedProjects } from '@/lib/server/projects'

export default function EditorProjectPage({
  params,
}: {
  params: Promise<{ projectid: string }>
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-bg-canvas text-sm text-text-muted">
          Loading project...
        </div>
      }
    >
      <AuthorizedProject params={params} />
    </Suspense>
  )
}

async function AuthorizedProject({
  params,
}: {
  params: Promise<{ projectid: string }>
}) {
  const { projectid } = await params
  if (!projectid) notFound()

  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  try {
    await requireProjectAccess(projectid)
  } catch (error) {
    if (
      error instanceof AccessError &&
      (error.code === 'UNAUTHORIZED' ||
        error.code === 'NOT_FOUND' ||
        error.code === 'FORBIDDEN')
    ) {
      notFound()
    }
    throw error
  }

  const [ownedProjects, sharedProjects] = await Promise.all([
    listOwnedProjects(userId),
    listSharedProjects(userId),
  ])
  const currentProject = [...ownedProjects, ...sharedProjects].find(
    (project) => project.id === projectid,
  )
  if (!currentProject) notFound()

  return (
    <EditorShell
      ownedProjects={ownedProjects}
      sharedProjects={sharedProjects}
      currentProjectId={projectid}
      currentProjectName={currentProject.name}
    >
      <Canvas />
    </EditorShell>
  )
}
