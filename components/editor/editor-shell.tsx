"use client"

import { useState, type ReactNode } from "react"
import { AiSidebar } from "@/components/editor/ai-sidebar"
import { CreateProjectDialog } from "@/components/editor/dialogs/create-project-dialog"
import { DeleteProjectDialog } from "@/components/editor/dialogs/delete-project-dialog"
import { RenameProjectDialog } from "@/components/editor/dialogs/rename-project-dialog"
import { EditorHomeContent } from "@/components/editor/editor-home-content"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { useProjectDialogs } from "@/hooks/use-project-dialogs"

const mockProjects = [
  { id: "systema-platform", name: "Systema Platform", isOwner: true },
  { id: "event-pipeline", name: "Event Pipeline", isOwner: true },
  { id: "team-workspace", name: "Team Workspace", isOwner: false },
]

type EditorShellProps = {
  children?: ReactNode
  onCreate?: () => void
}

export function EditorShell({ children, onCreate }: EditorShellProps) {
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const [isAiSidebarOpen, setAiSidebarOpen] = useState(false)
  const dialogs = useProjectDialogs()
  const createHandler = onCreate ?? dialogs.openCreate
  const content = children ?? <EditorHomeContent onCreate={createHandler} />

  function handleCreate(name: string) {
    console.info("Mock project created:", name)
    dialogs.close()
  }

  function handleRename(name: string) {
    console.info("Mock project renamed:", name)
    dialogs.close()
  }

  function handleDelete() {
    console.info("Mock project deleted:", dialogs.targetProject?.name)
    dialogs.close()
  }

  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setSidebarOpen((value) => !value)}
        isAiSidebarOpen={isAiSidebarOpen}
        onToggleAiSidebar={() => setAiSidebarOpen((value) => !value)}
      />
      <ProjectSidebar
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
        projects={mockProjects}
        onCreate={createHandler}
        onRename={dialogs.openRename}
        onDelete={dialogs.openDelete}
      />
      <AiSidebar
        isOpen={isAiSidebarOpen}
        onClose={() => setAiSidebarOpen(false)}
      />
      <main className="pt-14 min-h-screen bg-bg-canvas">
        <div className="h-[calc(100vh-3.5rem)]">{content}</div>
      </main>
      <CreateProjectDialog
        open={dialogs.activeDialog === "create"}
        onOpenChange={(open) => {
          if (!open) dialogs.close()
        }}
        onSubmit={handleCreate}
      />
      <RenameProjectDialog
        open={dialogs.activeDialog === "rename"}
        onOpenChange={(open) => {
          if (!open) dialogs.close()
        }}
        currentName={dialogs.targetProject?.name ?? ""}
        onSubmit={handleRename}
      />
      <DeleteProjectDialog
        open={dialogs.activeDialog === "delete"}
        onOpenChange={(open) => {
          if (!open) dialogs.close()
        }}
        projectName={dialogs.targetProject?.name ?? ""}
        onConfirm={handleDelete}
      />
    </div>
  )
}
