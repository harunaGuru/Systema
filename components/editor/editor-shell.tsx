"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { deleteProject } from "@/actions/delete-project"
import { createProject } from "@/actions/projects"
import { renameProject } from "@/actions/rename-project"
import { AiSidebar } from "@/components/editor/ai-sidebar"
import { CreateProjectDialog } from "@/components/editor/dialogs/create-project-dialog"
import { DeleteProjectDialog } from "@/components/editor/dialogs/delete-project-dialog"
import { RenameProjectDialog } from "@/components/editor/dialogs/rename-project-dialog"
import { EditorHomeContent } from "@/components/editor/editor-home-content"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { TemplateImportProvider } from "@/components/editor/template-import-context"
import { TemplateSidebar } from "@/components/editor/template-sidebar"
import { useProjectDialogs } from "@/hooks/use-project-dialogs"
import { useAutosave, useRehydrate } from "@/hooks/use-autosave"

type AutosaveState = { save: () => Promise<void>; isSaving: boolean }

function AutosaveBridge({
  projectId,
  onStateChange,
}: {
  projectId: string
  onStateChange: (state: AutosaveState) => void
}) {
  const state = useAutosave(projectId)
  useRehydrate(projectId)
  const { save, isSaving } = state
  useEffect(() => onStateChange({ save, isSaving }), [onStateChange, isSaving, save])
  return null
}

type EditorShellProps = {
  children?: ReactNode
  onCreate?: () => void
  ownedProjects?: Array<{ id: string; name: string }>
  sharedProjects?: Array<{ id: string; name: string }>
  currentProjectId?: string
  currentProjectName?: string
  isOwner?: boolean
}

export function EditorShell({
  children,
  onCreate,
  ownedProjects = [],
  sharedProjects = [],
  currentProjectId,
  currentProjectName: initialProjectName,
  isOwner = false,
}: EditorShellProps) {
  const router = useRouter()
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const [activeRightSidebar, setActiveRightSidebar] = useState<"ai" | "templates" | null>(null)
  const [unreadCommentsCount, setUnreadCommentsCount] = useState(0)
  const [autosaveState, setAutosaveState] = useState<AutosaveState | null>(null)
  const isRightSidebarOpen = activeRightSidebar === "ai"
  const isAiSidebarOpen = isRightSidebarOpen
  const isTemplateSidebarOpen = activeRightSidebar === "templates"
  const [projectNameOverrides, setProjectNameOverrides] = useState<Record<string, string>>({})
  const [deletedProjectIds, setDeletedProjectIds] = useState<string[]>([])
  const visibleOwnedProjects = ownedProjects
    .filter((project) => !deletedProjectIds.includes(project.id))
    .map((project) => ({
      ...project,
      name: projectNameOverrides[project.id] ?? project.name,
    }))
  const visibleSharedProjects = sharedProjects
    .filter((project) => !deletedProjectIds.includes(project.id))
    .map((project) => ({
      ...project,
      name: projectNameOverrides[project.id] ?? project.name,
    }))
  const currentProjectName = currentProjectId
    ? projectNameOverrides[currentProjectId] ?? initialProjectName
    : initialProjectName
  const [renamePending, setRenamePending] = useState(false)
  const [renameError, setRenameError] = useState<string | null>(null)
  const renamePendingRef = useRef(false)
  const dialogs = useProjectDialogs()
  const createHandler = onCreate ?? dialogs.openCreate
  const content = children ?? <EditorHomeContent onCreate={createHandler} />

  async function handleRename(name: string) {
    const targetProject = dialogs.targetProject
    if (!targetProject || renamePendingRef.current) return

    renamePendingRef.current = true
    setRenamePending(true)
    setRenameError(null)
    try {
      const result = await renameProject(targetProject.id, name)
      if (!result.ok) {
        console.error(result.error)
        setRenameError(result.error)
        return
      }
      setProjectNameOverrides((projects) => ({
        ...projects,
        [targetProject.id]: name.trim(),
      }))
      dialogs.close()
    } catch (error) {
      console.error(error)
      setRenameError("Failed to rename project. Try again.")
    } finally {
      renamePendingRef.current = false
      setRenamePending(false)
    }
  }

  async function handleDelete(): Promise<boolean> {
    const targetProject = dialogs.targetProject
    if (!targetProject) return false

    try {
      const result = await deleteProject(targetProject.id)
      if (!result.ok) {
        console.error(result.error)
        return false
      }

      setDeletedProjectIds((projectIds) =>
        projectIds.includes(targetProject.id)
          ? projectIds
          : [...projectIds, targetProject.id],
      )
      dialogs.close()
      if (targetProject.id === currentProjectId) router.replace("/editor")
      return true
    } catch (error) {
      console.error(error)
      return false
    }
  }

  return (
    <TemplateImportProvider onImported={() => setActiveRightSidebar(null)}>
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-bg-base text-text-primary">
        <EditorNavbar
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setSidebarOpen((value) => !value)}
          isAiSidebarOpen={isAiSidebarOpen}
          onToggleAiSidebar={() =>
            setActiveRightSidebar((current) => current === "ai" ? null : "ai")
          }
          isTemplateSidebarOpen={isTemplateSidebarOpen}
          onToggleTemplateSidebar={() =>
            setActiveRightSidebar((current) => current === "templates" ? null : "templates")
          }
          projectName={currentProjectName}
          isProjectPage={Boolean(currentProjectId)}
          projectId={currentProjectId}
          isOwner={isOwner}
          unreadCommentsCount={unreadCommentsCount}
          save={autosaveState?.save}
          isSaving={autosaveState?.isSaving}
        />
        {currentProjectId && (
          <AutosaveBridge key={currentProjectId} projectId={currentProjectId} onStateChange={setAutosaveState} />
        )}
        <ProjectSidebar
          isOpen={isSidebarOpen}
          onClose={() => setSidebarOpen(false)}
          ownedProjects={visibleOwnedProjects}
          sharedProjects={visibleSharedProjects}
          currentProjectId={currentProjectId}
          onCreate={createHandler}
          onRename={dialogs.openRename}
          onDelete={dialogs.openDelete}
        />
        <AiSidebar
          isOpen={isAiSidebarOpen}
          onClose={() => setActiveRightSidebar(null)}
          currentProjectId={currentProjectId}
          onUnreadCommentsChange={setUnreadCommentsCount}
        />
        {currentProjectId && (
          <TemplateSidebar
            isOpen={isTemplateSidebarOpen}
            onClose={() => setActiveRightSidebar(null)}
          />
        )}
        <main className="min-h-0 min-w-0 flex-1 overflow-hidden bg-bg-canvas">
          <div className="h-full min-h-0 min-w-0">{content}</div>
        </main>
        <CreateProjectDialog
          open={dialogs.activeDialog === "create"}
          onOpenChange={(open) => {
            if (!open) dialogs.close()
          }}
          onSubmit={createProject}
        />
        <RenameProjectDialog
          open={dialogs.activeDialog === "rename"}
          onOpenChange={(open) => {
            if (!open && !renamePending) dialogs.close()
          }}
          currentName={dialogs.targetProject?.name ?? ""}
          pending={renamePending}
          error={renameError}
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
    </TemplateImportProvider>
  )
}
