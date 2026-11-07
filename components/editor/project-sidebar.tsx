"use client"

import { useState } from "react"
import Link from "next/link"
import { Folder, Pencil, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export type ProjectSidebarProject = {
  id: string
  name: string
  isOwner: boolean
}

type ProjectSidebarProps = {
  isOpen: boolean
  onClose: () => void
  ownedProjects?: Array<{ id: string; name: string }>
  sharedProjects?: Array<{ id: string; name: string }>
  currentProjectId?: string
  onRename?: (project: ProjectSidebarProject) => void
  onDelete?: (project: ProjectSidebarProject) => void
  onCreate?: () => void
}

export function ProjectSidebar({
  isOpen,
  onClose,
  ownedProjects = [],
  sharedProjects = [],
  currentProjectId,
  onRename,
  onDelete,
  onCreate,
}: ProjectSidebarProps) {
  const [activeTab, setActiveTab] = useState("owner")

  function handleTabChange(value: string) {
    setActiveTab(value)
  }

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
          className="cursor-pointer rounded-md p-2 text-text-primary transition-colors hover:bg-bg-elevated focus-visible:outline-2 focus-visible:outline-accent-primary focus-visible:outline-offset-2"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
        <p className="mb-4 text-sm leading-6 text-text-muted">
          Create a project or jump into an existing room
        </p>
        <Button
          className="mb-4 w-full rounded-md bg-accent-ai text-bg-base hover:bg-accent-ai/90 focus-visible:outline-2 focus-visible:outline-accent-primary focus-visible:outline-offset-2"
          onClick={onCreate}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create project
        </Button>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="min-h-0 flex-1 flex-col">
          <TabsList className="relative w-full overflow-hidden rounded-md border border-border-subtle bg-bg-base p-1">
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-sm bg-bg-elevated transition-transform duration-300 ease-in-out motion-reduce:transition-none ${
                activeTab === "shared" ? "translate-x-full" : "translate-x-0"
              }`}
            />
            <TabsTrigger
              value="owner"
              className="relative z-10 cursor-pointer rounded-sm text-text-muted transition-colors hover:bg-bg-elevated/60 data-[state=active]:bg-transparent data-[state=active]:text-text-primary"
            >
              My Projects
            </TabsTrigger>
            <TabsTrigger
              value="shared"
              className="relative z-10 cursor-pointer rounded-sm text-text-muted transition-colors hover:bg-bg-elevated/60 data-[state=active]:bg-transparent data-[state=active]:text-text-primary"
            >
              Shared
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="owner"
            className="flex min-h-48 flex-1 flex-col gap-2 overflow-y-auto py-4"
          >
            {ownedProjects.length === 0 ? (
              <p className="flex flex-1 items-center justify-center py-8 text-sm text-text-muted">
                No projects yet.
              </p>
            ) : (
              <ul className="space-y-1">
                {ownedProjects.map((project) => (
                  <li
                    key={project.id}
                    className="group flex items-center justify-between gap-1 rounded-md hover:bg-bg-elevated"
                  >
                    <Link
                      href={`/editor/${project.id}`}
                      aria-current={project.id === currentProjectId ? "page" : undefined}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-3 py-2"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {project.id === currentProjectId && (
                          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-accent-primary" />
                        )}
                        <span className="truncate text-sm text-text-primary">{project.name}</span>
                      </span>
                    </Link>
                    <span className="flex shrink-0 items-center gap-1 pr-2">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        type="button"
                        aria-label={`Rename ${project.name}`}
                        title={`Rename ${project.name}`}
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          onRename?.({ ...project, isOwner: true })
                        }}
                        className="text-text-muted opacity-0 transition-opacity hover:bg-bg-base hover:text-text-primary group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        type="button"
                        aria-label={`Delete ${project.name}`}
                        title={`Delete ${project.name}`}
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          onDelete?.({ ...project, isOwner: true })
                        }}
                        className="text-text-muted opacity-0 transition-opacity hover:bg-bg-base hover:text-text-primary group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
          <TabsContent
            value="shared"
            className="flex min-h-48 flex-1 flex-col gap-2 overflow-y-auto py-4"
          >
            {sharedProjects.length === 0 ? (
              <p className="flex flex-1 items-center justify-center py-8 text-sm text-text-muted">
                No projects yet.
              </p>
            ) : (
              <ul className="space-y-1">
                {sharedProjects.map((project) => (
                  <li
                    key={project.id}
                    className="rounded-md hover:bg-bg-elevated"
                  >
                    <Link
                      href={`/editor/${project.id}`}
                      aria-current={project.id === currentProjectId ? "page" : undefined}
                      className="flex items-center justify-between gap-2 rounded-md px-3 py-2"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {project.id === currentProjectId && (
                          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-accent-primary" />
                        )}
                        <span className="truncate text-sm text-text-primary">{project.name}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </aside>
  )
}
