"use client"

import { Link2, PanelLeftClose, PanelLeftOpen, Save, Sparkles, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"

type EditorNavbarProps = {
  isSidebarOpen: boolean
  onToggleSidebar: () => void
  isAiSidebarOpen: boolean
  onToggleAiSidebar: () => void
}

const outlineActionClassName =
  "h-10 rounded-md border border-border-default bg-bg-base px-4 text-text-primary hover:bg-bg-elevated focus-visible:outline-2 focus-visible:outline-accent-primary focus-visible:outline-offset-2 disabled:opacity-100"

export function EditorNavbar({
  isSidebarOpen,
  onToggleSidebar,
  isAiSidebarOpen,
  onToggleAiSidebar,
}: EditorNavbarProps) {
  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-border-default bg-bg-base/80 backdrop-blur-md">
      <div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-md border border-border-default bg-bg-base text-text-primary hover:bg-bg-elevated focus-visible:outline-2 focus-visible:outline-accent-primary focus-visible:outline-offset-2"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          {isSidebarOpen ? (
            <PanelLeftClose className="h-5 w-5" />
          ) : (
            <PanelLeftOpen className="h-5 w-5" />
          )}
        </Button>
      </div>
      <div />
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" className={outlineActionClassName} disabled aria-label="Save">
          <Save className="h-4 w-4" />
          Save
        </Button>
        <Button type="button" variant="outline" className={outlineActionClassName} disabled aria-label="Import">
          <Upload className="h-4 w-4" />
          Import
        </Button>
        <Button
          type="button"
          className="h-10 rounded-md border-0 bg-accent-ai px-4 text-bg-base hover:bg-accent-ai/90 focus-visible:outline-2 focus-visible:outline-accent-primary focus-visible:outline-offset-2 disabled:opacity-100"
          disabled
          aria-label="Share"
        >
          <Link2 className="h-4 w-4" />
          Share
        </Button>
        <Button
          type="button"
          size="icon"
          aria-label="Toggle AI sidebar"
          title="Toggle AI sidebar"
          aria-expanded={isAiSidebarOpen}
          aria-controls="ai-sidebar"
          onClick={onToggleAiSidebar}
          className="h-10 w-10 rounded-md bg-node-violet text-node-violet-text hover:bg-node-violet/90 focus-visible:outline-2 focus-visible:outline-accent-primary focus-visible:outline-offset-2"
        >
          <Sparkles className="h-5 w-5" />
        </Button>
      </div>
    </header>
  )
}
