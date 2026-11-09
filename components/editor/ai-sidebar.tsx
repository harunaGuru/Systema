"use client"

import "@liveblocks/react-ui/styles.css"
import "@liveblocks/react-ui/styles/dark/attributes.css"
import { Thread, Composer } from "@liveblocks/react-ui"
import { ClientSideSuspense, useSelf, useThreads } from "@liveblocks/react/suspense"
import { Sparkles, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type AiSidebarProps = {
  isOpen: boolean
  onClose: () => void
  currentProjectId?: string
  onUnreadCommentsChange: (count: number) => void
}

type AiTab = "prompt" | "spec" | "comments"

const tabTriggerClassName =
  "rounded-sm text-text-muted data-[state=active]:bg-bg-elevated data-[state=active]:text-text-primary"

function RoomComments() {
  const { threads } = useThreads()

  return (
    <div className="dark flex h-full min-h-0 flex-col overflow-hidden rounded-md bg-bg-surface">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {threads.length === 0 ? (
          <p className="text-sm text-text-muted">No comments yet. Start a discussion below.</p>
        ) : (
          threads.map((thread) => <Thread key={thread.id} thread={thread} />)
        )}
      </div>
      <div className="shrink-0 border-t border-border-default p-4">
        <Composer />
      </div>
    </div>
  )
}

function CommentUnreadTracker({
  projectId,
  isOpen,
  isCommentsTab,
  onUnreadCommentsChange,
}: {
  projectId: string
  isOpen: boolean
  isCommentsTab: boolean
  onUnreadCommentsChange: (count: number) => void
}) {
  const { threads } = useThreads()
  const userId = useSelf((user) => user.id)
  const storageKey = `systema:comments:last-read:${projectId}:${userId}`
  const [lastReadAt, setLastReadAt] = useState<number | null>(() => {
    if (typeof window === "undefined") return null

    const stored = Number(window.localStorage.getItem(storageKey))
    return Number.isFinite(stored) && stored > 0 ? stored : Date.now()
  })
  const wasReadingComments = useRef(false)

  useEffect(() => {
    if (lastReadAt === null) return

    const isReadingComments = isOpen && isCommentsTab
    if (isReadingComments !== wasReadingComments.current) {
      wasReadingComments.current = isReadingComments
      const timestamp = Date.now()
      window.localStorage.setItem(storageKey, String(timestamp))
      setLastReadAt(timestamp)
      onUnreadCommentsChange(0)
      return
    }
    if (isReadingComments) {
      onUnreadCommentsChange(0)
      return
    }

    const unreadCount = threads.reduce(
      (count, thread) =>
        count +
        thread.comments.filter(
          (comment) =>
            !comment.deletedAt &&
            comment.userId !== userId &&
            comment.createdAt.getTime() > lastReadAt,
        ).length,
      0,
    )
    onUnreadCommentsChange(unreadCount)
  }, [
    isCommentsTab,
    isOpen,
    lastReadAt,
    onUnreadCommentsChange,
    storageKey,
    threads,
    userId,
  ])

  return null
}

export function AiSidebar({
  isOpen,
  onClose,
  currentProjectId,
  onUnreadCommentsChange,
}: AiSidebarProps) {
  const [activeTab, setActiveTab] = useState<AiTab>("prompt")

  return (
    <aside
      id="ai-sidebar"
      aria-label="AI sidebar"
      aria-hidden={!isOpen}
      inert={!isOpen}
      className={`fixed right-0 top-14 bottom-0 z-50 m-2 flex w-80 flex-col rounded-md floating-panel transition-all duration-300 ease-out motion-reduce:transition-none ${
        isOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
      }`}
    >
      {currentProjectId && (
        <ClientSideSuspense fallback={null}>
          <CommentUnreadTracker
            projectId={currentProjectId}
            isOpen={isOpen}
            isCommentsTab={activeTab === "comments"}
            onUnreadCommentsChange={onUnreadCommentsChange}
          />
        </ClientSideSuspense>
      )}
      <div className="flex shrink-0 items-center justify-between p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Sparkles className="h-4 w-4 text-accent-ai" />
          AI Workspace
        </h2>
        <button
          type="button"
          className="cursor-pointer rounded-md p-2 text-text-primary transition-colors hover:bg-bg-elevated focus-visible:outline-2 focus-visible:outline-accent-primary focus-visible:outline-offset-2"
          onClick={onClose}
          aria-label="Close AI sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (value === "prompt" || value === "spec" || value === "comments") {
            setActiveTab(value)
          }
        }}
        className="min-h-0 flex-1 flex-col px-4 pb-4"
      >
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
        <TabsContent value="prompt" className="flex-1">
          <div className="text-sm text-text-muted">Coming soon.</div>
        </TabsContent>
        <TabsContent value="spec" className="flex-1">
          <div className="text-sm text-text-muted">Coming soon.</div>
        </TabsContent>
        <TabsContent value="comments" className="min-h-0 flex-1 overflow-hidden">
          {currentProjectId ? (
            <ClientSideSuspense
              fallback={
                <div className="dark flex h-full items-center justify-center rounded-md bg-bg-surface text-sm text-text-muted">
                  Loading comments...
                </div>
              }
            >
              <RoomComments />
            </ClientSideSuspense>
          ) : (
            <div className="flex h-full items-center justify-center rounded-md bg-bg-surface p-4 text-center text-sm text-text-muted">
              Comments are available inside a project room.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </aside>
  )
}
