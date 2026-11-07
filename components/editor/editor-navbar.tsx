"use client";

import {
  ArrowLeft,
  Link2,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  Save,
  Sparkles,
  Upload,
} from "lucide-react";
import { Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type EditorNavbarProps = {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  isAiSidebarOpen: boolean;
  onToggleAiSidebar: () => void;
  isTemplateSidebarOpen: boolean;
  onToggleTemplateSidebar: () => void;
  projectName?: string;
  isProjectPage?: boolean;
};

const outlineActionClassName =
  "h-10 rounded-md border border-border-default bg-bg-base px-4 text-text-primary transition-all enabled:hover:-translate-y-0.5 enabled:hover:border-accent-primary enabled:hover:bg-bg-elevated enabled:hover:shadow-md focus-visible:outline-2 focus-visible:outline-accent-primary focus-visible:outline-offset-2 disabled:!pointer-events-auto disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-bg-base disabled:hover:text-text-primary";

export function EditorNavbar({
  isSidebarOpen,
  onToggleSidebar,
  isAiSidebarOpen,
  onToggleAiSidebar,
  isTemplateSidebarOpen,
  onToggleTemplateSidebar,
  projectName,
  isProjectPage = false,
}: EditorNavbarProps) {
  return (
    <header className="grid h-14 shrink-0 grid-cols-3 items-center border-b border-border-default bg-bg-base/80 px-4 backdrop-blur-md">
      <div className="flex items-center gap-2">
        {isProjectPage && (
          <Button
            asChild
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-md border border-border-default bg-bg-base text-text-primary transition-all hover:-translate-y-0.5 hover:border-accent-primary hover:bg-bg-elevated hover:shadow-md focus-visible:outline-2 focus-visible:outline-accent-primary focus-visible:outline-offset-2"
          >
            <Link href="/editor" aria-label="Back to projects" title="Back to projects">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-md border border-border-default bg-bg-base text-text-primary transition-all hover:-translate-y-0.5 hover:border-accent-primary hover:bg-bg-elevated hover:shadow-md focus-visible:outline-2 focus-visible:outline-accent-primary focus-visible:outline-offset-2"
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
      <div className="min-w-0 px-3 text-center">
        {projectName && (
          <span className="block truncate text-sm font-medium text-text-primary">
            {projectName}
          </span>
        )}
      </div>
      <div className="flex items-center justify-self-end gap-2">
        <Button
          type="button"
          variant="outline"
          className={outlineActionClassName}
          disabled
          aria-label="Save"
        >
          <Save className="h-4 w-4" />
          Save
        </Button>
        <Button
          type="button"
          variant="outline"
          className={outlineActionClassName}
          disabled
          aria-label="Import"
        >
          <Upload className="h-4 w-4" />
          Import
        </Button>
        {isProjectPage && (
          <Button
            type="button"
            aria-label="Load Template"
            aria-expanded={isTemplateSidebarOpen}
            aria-controls="template-sidebar"
            onClick={onToggleTemplateSidebar}
            className="h-10 rounded-md bg-accent-primary px-4 text-bg-base transition-all hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-md focus-visible:outline-2 focus-visible:outline-accent-primary focus-visible:outline-offset-2"
          >
            <Layers className="h-4 w-4" />
            Load Template
          </Button>
        )}
        <Button
          type="button"
          className="h-10 rounded-md border-0 bg-accent-ai px-4 text-bg-base transition-all enabled:hover:-translate-y-0.5 enabled:hover:bg-accent-ai/90 enabled:hover:shadow-md focus-visible:outline-2 focus-visible:outline-accent-primary focus-visible:outline-offset-2 disabled:pointer-events-auto! disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-accent-ai disabled:hover:text-bg-base"
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
          className="h-10 w-10 rounded-md bg-node-violet text-node-violet-text transition-all hover:-translate-y-0.5 hover:bg-node-violet/90 hover:shadow-md focus-visible:outline-2 focus-visible:outline-accent-primary focus-visible:outline-offset-2"
        >
          <Sparkles className="h-5 w-5" />
        </Button>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </div>
    </header>
  );
}
