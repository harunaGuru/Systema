"use client"

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

export type EditorHomeContentProps = {
  onCreate?: () => void
}

export function EditorHomeContent({ onCreate }: EditorHomeContentProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-2xl font-medium text-text-primary">
        Create a project or open an existing one
      </h1>
      <p className="max-w-md text-sm text-text-muted">
        Start a new architecture workspace, or choose a project from the sidebar.
      </p>
      <Button onClick={onCreate}>
        <Plus className="mr-2 h-4 w-4" />
        New Project
      </Button>
    </div>
  )
}
