import { EditorShell } from "@/components/editor/editor-shell"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { listOwnedProjects, listSharedProjects } from "@/lib/server/projects"
import { DashboardRefresh } from "@/components/editor/dashboard-refresh"

export default async function EditorPage() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const [ownedProjects, sharedProjects] = await Promise.all([
    listOwnedProjects(userId),
    listSharedProjects(userId),
  ])

  return (
    <>
      <DashboardRefresh />
      <EditorShell ownedProjects={ownedProjects} sharedProjects={sharedProjects} />
    </>
  )
}
