"use client";

import {
  ArrowLeft,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Upload,
} from "lucide-react";
import { Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NavbarPresence } from "@/components/editor/navbar-presence";
import { CollaboratorDialog } from "@/components/editor/collaborator-dialog";
import { SaveButton } from "@/components/editor/save-button";
import { SnapshotHistory } from "@/components/editor/snapshot-history";

type EditorNavbarProps = {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  isAiSidebarOpen: boolean;
  onToggleAiSidebar: () => void;
  isTemplateSidebarOpen: boolean;
  onToggleTemplateSidebar: () => void;
  projectName?: string;
  isProjectPage?: boolean;
  projectId?: string;
  isOwner?: boolean;
  unreadCommentsCount?: number;
  save?: () => Promise<void>;
  isSaving?: boolean;
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
  projectId,
  isOwner = false,
  unreadCommentsCount = 0,
  save,
  isSaving = false,
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
        {isProjectPage && <NavbarPresence />}
      </div>
      <div className="flex min-w-0 items-center justify-center gap-3 px-3 text-center">
        {projectName && (
          <span className="block truncate text-sm font-medium text-text-primary">
            {projectName}
          </span>
        )}
      </div>
      <div className="flex items-center justify-self-end gap-2">
        {isProjectPage && save && <SaveButton save={save} isSaving={isSaving} />}
        {isProjectPage && projectId && <SnapshotHistory projectId={projectId} />}
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
        {isProjectPage && projectId && isOwner && (
          <CollaboratorDialog projectId={projectId} isOwner={isOwner} />
        )}
        <Button
          type="button"
          size="icon"
          aria-label="Toggle AI sidebar"
          title="Toggle AI sidebar"
          aria-expanded={isAiSidebarOpen}
          aria-controls="ai-sidebar"
          onClick={onToggleAiSidebar}
          className="relative h-10 w-10 rounded-md bg-node-violet text-node-violet-text transition-all hover:-translate-y-0.5 hover:bg-node-violet/90 hover:shadow-md focus-visible:outline-2 focus-visible:outline-accent-primary focus-visible:outline-offset-2"
        >
          <Sparkles className="h-5 w-5" />
          {unreadCommentsCount > 0 && (
            <span
              aria-label={`${unreadCommentsCount} unread comments`}
              className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-bg-base bg-state-error px-1 text-[10px] font-semibold leading-none text-text-primary"
            >
              {unreadCommentsCount > 99 ? "99+" : unreadCommentsCount}
            </span>
          )}
        </Button>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </div>
    </header>
  );
}
