"use client"

import { Layers, X } from "lucide-react"
import { starterTemplates } from "@/lib/templates"
import { useTemplateImport } from "@/components/editor/template-import-context"

export function TemplateSidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const { importTemplate } = useTemplateImport()

  return (
    <aside
      id="template-sidebar"
      aria-label="Template sidebar"
      aria-hidden={!isOpen}
      inert={!isOpen}
      className={`fixed right-0 top-14 bottom-0 z-40 m-2 flex w-80 flex-col rounded-md floating-panel transition-all duration-300 ease-out motion-reduce:transition-none ${
        isOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex shrink-0 items-center justify-between p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Layers className="h-4 w-4 text-accent-primary" />
          Starter Templates
        </h2>
        <button
          type="button"
          className="cursor-pointer rounded-md p-2 text-text-primary transition-colors hover:bg-bg-elevated focus-visible:outline-2 focus-visible:outline-accent-primary focus-visible:outline-offset-2"
          onClick={onClose}
          aria-label="Close template sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4">
        {starterTemplates.map((template) => (
          <button
            key={template.id}
            type="button"
            className="w-full rounded-md border border-border-default bg-bg-base p-4 text-left transition-colors hover:border-accent-primary hover:bg-bg-elevated focus-visible:outline-2 focus-visible:outline-accent-primary focus-visible:outline-offset-2"
            onClick={() => importTemplate(template.id)}
          >
            <span className="block text-sm font-semibold text-text-primary">
              {template.name}
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-text-muted">
              {template.description}
            </span>
          </button>
        ))}
      </div>
    </aside>
  )
}
