"use client"

import { Folder, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type ProjectSidebarProps = {
  isOpen: boolean
  onClose: () => void
}

export function ProjectSidebar({ isOpen, onClose }: ProjectSidebarProps) {
  return (
    <aside
      id="projects-sidebar"
      aria-hidden={!isOpen}
      inert={!isOpen}
      className={`fixed left-0 top-14 bottom-0 z-40 m-2 flex w-72 flex-col rounded-md floating-panel transition-all duration-300 ease-out motion-reduce:transition-none ${
        isOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex shrink-0 items-center justify-between p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-widest text-accent-ai">
          <Folder className="h-4 w-4" />
          PROJECTS
        </h2>
        <button
          type="button"
          className="p-2 rounded-md hover:bg-bg-elevated text-text-primary focus-visible:outline-2 focus-visible:outline-accent-primary focus-visible:outline-offset-2"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
        <Tabs defaultValue="owner" className="min-h-0 flex-1 flex-col">
          <TabsList className="w-full rounded-md border border-border-subtle bg-bg-base p-1">
            <TabsTrigger
              value="owner"
              className="rounded-sm text-text-muted data-[state=active]:bg-bg-elevated data-[state=active]:text-text-primary"
            >
              My Projects
            </TabsTrigger>
            <TabsTrigger
              value="shared"
              className="rounded-sm text-text-muted data-[state=active]:bg-bg-elevated data-[state=active]:text-text-primary"
            >
              Shared
            </TabsTrigger>
          </TabsList>
          <TabsContent value="owner" className="flex-1">
            <div className="flex h-full min-h-48 flex-col items-center justify-center py-8 text-sm text-text-muted">
              No projects yet.
            </div>
          </TabsContent>
          <TabsContent value="shared" className="flex-1">
            <div className="flex h-full min-h-48 flex-col items-center justify-center py-8 text-sm text-text-muted">
              No projects yet.
            </div>
          </TabsContent>
        </Tabs>
        <Button className="mt-4 w-full rounded-md bg-accent-ai text-bg-base hover:bg-accent-ai/90 focus-visible:outline-2 focus-visible:outline-accent-primary focus-visible:outline-offset-2">
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>
    </aside>
  )
}
