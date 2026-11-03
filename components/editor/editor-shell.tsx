"use client"

import { useState } from "react"
import { AiSidebar } from "@/components/editor/ai-sidebar"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"

export function EditorShell() {
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const [isAiSidebarOpen, setAiSidebarOpen] = useState(false)

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
      />
      <AiSidebar
        isOpen={isAiSidebarOpen}
        onClose={() => setAiSidebarOpen(false)}
      />
      <main className="pt-14 min-h-screen bg-bg-canvas">
        <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
          <p className="text-text-muted text-sm">Canvas placeholder</p>
        </div>
      </main>
    </div>
  )
}
