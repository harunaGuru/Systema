import { EditorShell } from "@/components/editor/editor-shell"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { listOwnedProjects, listSharedProjects } from "@/lib/server/projects"

export default async function EditorPage() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const [ownedProjects, sharedProjects] = await Promise.all([
    listOwnedProjects(userId),
    listSharedProjects(userId),
  ])

  return <EditorShell ownedProjects={ownedProjects} sharedProjects={sharedProjects} />
}
