"use client"

import { Sparkles, X } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type AiSidebarProps = {
  isOpen: boolean
  onClose: () => void
}

const tabTriggerClassName =
  "rounded-sm text-text-muted data-[state=active]:bg-bg-elevated data-[state=active]:text-text-primary"

export function AiSidebar({ isOpen, onClose }: AiSidebarProps) {
  return (
    <aside
      id="ai-sidebar"
      aria-label="AI sidebar"
      aria-hidden={!isOpen}
      inert={!isOpen}
      className={`fixed right-0 top-14 bottom-0 z-40 m-2 flex w-80 flex-col rounded-md floating-panel transition-all duration-300 ease-out motion-reduce:transition-none ${
        isOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex shrink-0 items-center justify-between p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Sparkles className="h-4 w-4 text-accent-ai" />
          AI Workspace
        </h2>
        <button
          type="button"
          className="p-2 rounded-md hover:bg-bg-elevated text-text-primary focus-visible:outline-2 focus-visible:outline-accent-primary focus-visible:outline-offset-2"
          onClick={onClose}
          aria-label="Close AI sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <Tabs defaultValue="prompt" className="min-h-0 flex-1 flex-col px-4 pb-4">
        <TabsList className="grid w-full grid-cols-3 rounded-md border border-border-subtle bg-bg-base p-1">
          <TabsTrigger value="prompt" className={tabTriggerClassName}>
            Prompt
          </TabsTrigger>
          <TabsTrigger value="spec" className={tabTriggerClassName}>
            Spec
          </TabsTrigger>
          <TabsTrigger value="comments" className={tabTriggerClassName}>
            Comments
          </TabsTrigger>
        </TabsList>
        <TabsContent value="prompt" className="flex-1" />
        <TabsContent value="spec" className="flex-1" />
        <TabsContent value="comments" className="flex-1" />
      </Tabs>
    </aside>
  )
}
