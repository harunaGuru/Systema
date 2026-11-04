import { useState } from "react"

export type ProjectDialogTarget = {
  id: string
  name: string
  isOwner: boolean
}

export type ProjectDialogType = "create" | "rename" | "delete" | null

export function useProjectDialogs() {
  const [activeDialog, setActiveDialog] = useState<ProjectDialogType>(null)
  const [targetProject, setTargetProject] = useState<ProjectDialogTarget | null>(null)

  function openCreate() {
    setActiveDialog("create")
    setTargetProject(null)
  }

  function openRename(project: ProjectDialogTarget) {
    setActiveDialog("rename")
    setTargetProject(project)
  }

  function openDelete(project: ProjectDialogTarget) {
    setActiveDialog("delete")
    setTargetProject(project)
  }

  function close() {
    setActiveDialog(null)
    setTargetProject(null)
  }

  return { activeDialog, targetProject, openCreate, openRename, openDelete, close }
}
