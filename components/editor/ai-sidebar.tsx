"use client"

import "@liveblocks/react-ui/styles.css"
import "@liveblocks/react-ui/styles/dark/attributes.css"
import { Thread, Composer } from "@liveblocks/react-ui"
import { LiveObject } from "@liveblocks/client"
import { ClientSideSuspense, useSelf, useThreads } from "@liveblocks/react/suspense"
import { shallow, useMutation, useOthers, useUpdateMyPresence } from "@liveblocks/react"
import { useLiveblocksFlow } from "@liveblocks/react-flow"
import { AlertCircle, CheckCircle2, Loader2, Sparkles, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import { z } from "zod"
import type { RealtimeRun } from "@trigger.dev/core/v3"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { SystemaGraphSchema, type SystemaGraph } from "@/lib/ai/schema"
import type { generateGraphTask } from "@/trigger/generate-graph"
import { useRealtimeRun } from "@trigger.dev/react-hooks"
import type { Edge, Node } from "@xyflow/react"
import type { SystemaEdgeData } from "@/components/editor/canvas/edge"
import type { ShapeType, SystemaNodeData } from "@/components/editor/canvas/shapes"

const GenerateResponseSchema = z.object({
  success: z.literal(true),
  runId: z.string().min(1),
  accessToken: z.string().min(1),
})

type SystemaFlowNode = Node<SystemaNodeData, ShapeType>
type SystemaFlowEdge = Edge<SystemaEdgeData>
const failedRunStatuses = ["CANCELED", "CRASHED", "EXPIRED", "FAILED", "SYSTEM_FAILURE", "TIMED_OUT"]

function PromptTab({ projectId }: { projectId: string }) {
  const [prompt, setPrompt] = useState("")
  const [runId, setRunId] = useState<string>()
  const [accessToken, setAccessToken] = useState<string>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>()
  const appliedRunId = useRef<string | undefined>(undefined)
  const clearedPresenceRunId = useRef<string | undefined>(undefined)
  const updateMyPresence = useUpdateMyPresence()
  const userName = useSelf((user) => user.info.name)
  const otherGeneratorNames = useOthers(
    (others) => others
      .filter((other) => other.presence.aiJobRunning)
      .map((other) => other.presence.aiJobUser ?? other.info.name)
      .filter(Boolean)
      .join(", "),
    shallow,
  )
  const isOtherGenerating = otherGeneratorNames.length > 0
  const clearAiJobPresence = useCallback(() => {
    updateMyPresence({ aiJobRunning: false, aiJobUser: null })
  }, [updateMyPresence])
  const { nodes, edges } = useLiveblocksFlow<SystemaFlowNode, SystemaFlowEdge>({ suspense: true })
  const applyGraph = useMutation(({ storage }, graph: SystemaGraph) => {
    const flow = storage.get("flow")
    if (!flow) throw new Error("Canvas storage is not ready")

    const liveNodes = flow.get("nodes")
    const liveEdges = flow.get("edges")
    const availableNodeIds = new Set([...liveNodes.keys(), ...graph.nodes.map((node) => node.id)])

    for (const node of graph.nodes) {
      if (liveNodes.has(node.id)) throw new Error("A generated node ID already exists on the canvas")
    }
    for (const edge of graph.edges) {
      if (liveEdges.has(edge.id)) throw new Error("A generated edge ID already exists on the canvas")
      if (!availableNodeIds.has(edge.source) || !availableNodeIds.has(edge.target)) {
        throw new Error("A generated edge references a node that is no longer on the canvas")
      }
    }

    for (const node of graph.nodes) {
      liveNodes.set(node.id, new LiveObject({
        ...node,
        width: 180,
        height: 100,
        data: new LiveObject(node.data),
      }))
    }
    for (const edge of graph.edges) {
      liveEdges.set(edge.id, new LiveObject({
        ...edge,
        type: "default",
        data: new LiveObject(edge.data),
      }))
    }
  }, [])

  const handleRunComplete = useCallback((completedRun: RealtimeRun<typeof generateGraphTask>, error?: Error) => {
    if (!runId || appliedRunId.current === runId) return
    if (error) {
      setErrorMessage(error.message)
      if (failedRunStatuses.includes(completedRun.status)) {
        appliedRunId.current = runId
      }
      return
    }
    if (completedRun.status !== "COMPLETED") {
      if (failedRunStatuses.includes(completedRun.status)) {
        appliedRunId.current = runId
        setErrorMessage(completedRun.error?.message ?? "Graph generation did not complete.")
      }
      return
    }

    appliedRunId.current = runId
    setErrorMessage(undefined)
    const result = z.object({ graph: SystemaGraphSchema }).safeParse(completedRun.output)
    if (!result.success) {
      setErrorMessage("The generation run completed without a valid graph.")
      return
    }

    try {
      applyGraph(result.data.graph)
    } catch (applyError) {
      setErrorMessage(applyError instanceof Error ? applyError.message : "Unable to apply the generated graph.")
    }
  }, [applyGraph, runId])

  const { run, error: realtimeError } = useRealtimeRun<typeof generateGraphTask>(runId, {
    accessToken,
    enabled: Boolean(runId && accessToken),
    onComplete: handleRunComplete,
  })

  useEffect(() => {
    if (!runId || !run || clearedPresenceRunId.current === runId) return
    if (run.status === "COMPLETED" || failedRunStatuses.includes(run.status)) {
      clearedPresenceRunId.current = runId
      clearAiJobPresence()
    }
  }, [clearAiJobPresence, run, runId])

  const isCompleted = run?.status === "COMPLETED"
  const isFailed = Boolean(realtimeError) || (run ? failedRunStatuses.includes(run.status) : false)
  const isRunning = Boolean(runId && !isCompleted && (!run || !failedRunStatuses.includes(run.status)))
  const isGenerating = isSubmitting || isRunning
  const isPromptDisabled = isGenerating || isOtherGenerating
  const statusMessage = isGenerating
    ? `${userName || "You"} is generating a graph...`
    : isOtherGenerating
      ? `${otherGeneratorNames} ${otherGeneratorNames.includes(",") ? "are" : "is"} generating a graph...`
      : typeof run?.metadata?.status === "string"
        ? run.metadata.status
        : null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedPrompt = prompt.trim()
    if (!trimmedPrompt || isPromptDisabled) return

    setIsSubmitting(true)
    setErrorMessage(undefined)
    setRunId(undefined)
    setAccessToken(undefined)
    appliedRunId.current = undefined
    updateMyPresence({ aiJobRunning: true, aiJobUser: userName || "Collaborator" })

    try {
      const currentGraph = SystemaGraphSchema.parse({ nodes, edges })
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, prompt: trimmedPrompt, currentGraph }),
      })
      const responseBody: unknown = await response.json()
      if (!response.ok) {
        const errorResult = z.object({ error: z.string() }).safeParse(responseBody)
        throw new Error(errorResult.success ? errorResult.data.error : "Unable to start graph generation.")
      }

      const result = GenerateResponseSchema.safeParse(responseBody)
      if (!result.success) throw new Error("The generation service returned an invalid response.")
      setRunId(result.data.runId)
      setAccessToken(result.data.accessToken)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to start graph generation.")
      clearAiJobPresence()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 rounded-md bg-bg-surface p-4">
      <form className="flex min-h-0 flex-1 flex-col gap-3" onSubmit={handleSubmit}>
        <label htmlFor="ai-graph-prompt" className="text-sm font-medium text-text-primary">
          Describe the architecture you want to add
        </label>
        <Textarea
          id="ai-graph-prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="For example: Add a notification service that consumes order events..."
          className="min-h-36 flex-1 resize-y rounded-md border-border-default bg-bg-base text-text-primary placeholder:text-text-muted focus-visible:ring-accent-primary"
          disabled={isPromptDisabled}
        />
        <Button
          type="submit"
          disabled={!prompt.trim() || isPromptDisabled}
          className="w-full bg-accent-primary text-text-primary hover:bg-accent-primary/90"
        >
          {isGenerating || isOtherGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate
        </Button>
      </form>
      {statusMessage && (
        <div role="status" className="flex items-center gap-2 rounded-md border border-border-subtle bg-bg-base p-3 text-sm text-text-muted">
          {isCompleted ? <CheckCircle2 className="h-4 w-4 text-accent-ai" /> : <Loader2 className="h-4 w-4 animate-spin text-accent-ai" />}
          <span>{statusMessage}</span>
        </div>
      )}
      {isFailed && (
        <p role="alert" className="flex items-start gap-2 rounded-md border border-border-subtle bg-bg-base p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{realtimeError?.message ?? run?.error?.message ?? "Graph generation failed."}</span>
        </p>
      )}
      {errorMessage && (
        <p role="alert" className="flex items-start gap-2 rounded-md border border-border-subtle bg-bg-base p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </p>
      )}
    </div>
  )
}

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
        <TabsContent
          value="prompt"
          forceMount
          className="flex-1 data-[state=inactive]:hidden"
        >
          {currentProjectId ? (
            <ClientSideSuspense
              fallback={
                <div className="flex h-full items-center justify-center rounded-md bg-bg-surface text-sm text-text-muted">
                  Loading canvas...
                </div>
              }
            >
              <PromptTab projectId={currentProjectId} />
            </ClientSideSuspense>
          ) : (
            <div className="flex h-full items-center justify-center rounded-md bg-bg-surface p-4 text-center text-sm text-text-muted">
              Graph generation is available inside a project.
            </div>
          )}
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
