"use client"

import "@liveblocks/react-ui/styles.css"
import "@liveblocks/react-ui/styles/dark/attributes.css"
import { Thread, Composer } from "@liveblocks/react-ui"
import { LiveObject, stringifyCommentBody } from "@liveblocks/client"
import { ClientSideSuspense, useSelf, useThreads } from "@liveblocks/react/suspense"
import { shallow, useMutation, useOthers, useUpdateMyPresence } from "@liveblocks/react"
import { useLiveblocksFlow } from "@liveblocks/react-flow"
import { AlertCircle, CheckCircle2, Download, FileText, Loader2, Sparkles, X } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import { z } from "zod"
import { useRealtimeRun } from "@trigger.dev/react-hooks"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { SystemaGraphSchema, type SystemaGraph } from "@/lib/ai/schema"
import type { generateGraphTask } from "@/trigger/generate-graph"
import type { generateSpecTask } from "@/trigger/generate-spec"
import type { Edge, Node } from "@xyflow/react"
import type { SystemaEdgeData } from "@/components/editor/canvas/edge"
import type { ShapeType, SystemaNodeData } from "@/components/editor/canvas/shapes"

const GenerateResponseSchema = z.object({
  success: z.literal(true),
  runId: z.string().min(1),
  accessToken: z.string().min(1),
})
const LatestSpecResponseSchema = z.object({ artifactId: z.string().min(1).nullable() })

type SpecStatus = "loading" | "idle" | "generating" | "success" | "error"

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

  const handleRunComplete = useCallback((completedRun: {
    status: string
    error?: { message?: string }
    output?: unknown
  }, error?: Error) => {
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

function SpecTab({ projectId }: { projectId: string }) {
  const threadState = useThreads()
  const { threads, hasFetchedAll, fetchMore, isFetchingMore, fetchMoreError } = threadState
  const threadStateRef = useRef({ threads, hasFetchedAll, fetchMore, isFetchingMore, fetchMoreError })
  const threadLoadWaitersRef = useRef<Array<() => void>>([])
  const [specStatus, setSpecStatus] = useState<SpecStatus>("loading")
  const [markdown, setMarkdown] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [runId, setRunId] = useState<string>()
  const [accessToken, setAccessToken] = useState<string>()
  const [artifactId, setArtifactId] = useState<string>()
  const [previewOpen, setPreviewOpen] = useState(false)
  const activePollRef = useRef(false)
  const { run, error: realtimeError } = useRealtimeRun<typeof generateSpecTask>(runId, {
    accessToken,
    enabled: Boolean(runId && accessToken),
    skipColumns: ["payload", "output"],
  })

  useEffect(() => {
    threadStateRef.current = { threads, hasFetchedAll, fetchMore, isFetchingMore, fetchMoreError }
    const waiters = threadLoadWaitersRef.current
    threadLoadWaitersRef.current = []
    waiters.forEach((resolve) => resolve())
  }, [fetchMore, fetchMoreError, hasFetchedAll, isFetchingMore, threads])

  async function loadAllThreads() {
    while (true) {
      const current = threadStateRef.current
      if (current.fetchMoreError) {
        throw new Error("Unable to load all comments for specification generation.", {
          cause: current.fetchMoreError,
        })
      }
      if (current.hasFetchedAll) return current.threads

      await new Promise<void>((resolve) => {
        threadLoadWaitersRef.current.push(resolve)
        if (!current.isFetchingMore) current.fetchMore()
      })
    }
  }

  useEffect(() => {
    let disposed = false

    async function loadLatestSpec() {
      try {
        const lookupResponse = await fetch(
          `/api/projects/${encodeURIComponent(projectId)}/specs/latest`,
        )
        const lookupBody: unknown = await lookupResponse.json()
        if (!lookupResponse.ok) {
          const parsedError = z.object({ error: z.string() }).safeParse(lookupBody)
          throw new Error(parsedError.success ? parsedError.data.error : "Unable to check saved specification.")
        }

        const lookup = LatestSpecResponseSchema.safeParse(lookupBody)
        if (!lookup.success) throw new Error("The specification lookup returned an invalid response.")
        if (disposed) return
        if (!lookup.data.artifactId) {
          setSpecStatus("idle")
          return
        }

        const readResponse = await fetch(
          `/api/projects/${encodeURIComponent(projectId)}/specs/${encodeURIComponent(lookup.data.artifactId)}`,
        )
        if (!readResponse.ok) throw new Error("Unable to load the saved specification.")
        const content = await readResponse.text()
        if (disposed) return
        setArtifactId(lookup.data.artifactId)
        setMarkdown(content)
        setSpecStatus("success")
      } catch (error) {
        if (!disposed) {
          setErrorMsg(error instanceof Error ? error.message : "Unable to load the saved specification.")
          setSpecStatus("error")
        }
      }
    }

    void loadLatestSpec()
    return () => {
      disposed = true
    }
  }, [projectId])

  async function handleGenerate() {
    setSpecStatus("generating")
    setErrorMsg("")
    setMarkdown("")
    setArtifactId(undefined)
    setRunId(undefined)
    setAccessToken(undefined)

    try {
      const threads = await loadAllThreads()
      const comments = await Promise.all(
        threads.flatMap((thread) =>
          thread.comments
            .filter((comment) => !comment.deletedAt)
            .map((comment) => stringifyCommentBody(comment.body, { format: "plain" })),
        ),
      )
      const response = await fetch("/api/ai/spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, comments: comments.map((comment) => comment.trim()).filter(Boolean) }),
      })
      const responseBody: unknown = await response.json()
      if (!response.ok) {
        const parsedError = z.object({ error: z.string() }).safeParse(responseBody)
        throw new Error(parsedError.success ? parsedError.data.error : "Unable to start specification generation.")
      }

      const result = GenerateResponseSchema.safeParse(responseBody)
      if (!result.success) throw new Error("The specification service returned an invalid response.")
      setRunId(result.data.runId)
      setAccessToken(result.data.accessToken)
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Unable to start specification generation.")
      setSpecStatus("error")
    }
  }

  useEffect(() => {
    if (!runId || specStatus !== "generating") return

    const currentRunId = runId
    let disposed = false
    async function pollForArtifact() {
      if (disposed || activePollRef.current) return
      if (realtimeError) {
        setErrorMsg(realtimeError.message)
        setSpecStatus("error")
        return
      }
      if (run && failedRunStatuses.includes(run.status)) {
        setErrorMsg(run.error?.message ?? "Specification generation failed.")
        setSpecStatus("error")
        return
      }

      activePollRef.current = true
      try {
        const lookupResponse = await fetch(
          `/api/projects/${encodeURIComponent(projectId)}/specs/latest?runId=${encodeURIComponent(currentRunId)}`,
        )
        const lookupBody: unknown = await lookupResponse.json()
        if (!lookupResponse.ok) {
          const parsedError = z.object({ error: z.string() }).safeParse(lookupBody)
          throw new Error(parsedError.success ? parsedError.data.error : "Unable to check specification status.")
        }

        const lookup = LatestSpecResponseSchema.safeParse(lookupBody)
        if (!lookup.success) throw new Error("The specification lookup returned an invalid response.")
        if (disposed) return

        if (!lookup.data.artifactId) {
          if (run?.status === "COMPLETED") {
            setErrorMsg("The run completed without creating a specification artifact.")
            setSpecStatus("error")
          }
          return
        }

        const readResponse = await fetch(
          `/api/projects/${encodeURIComponent(projectId)}/specs/${encodeURIComponent(lookup.data.artifactId)}`,
        )
        if (!readResponse.ok) throw new Error("Unable to load the generated specification.")
        const content = await readResponse.text()
        if (disposed) return
        setArtifactId(lookup.data.artifactId)
        setMarkdown(content)
        setSpecStatus("success")
      } catch (error) {
        if (!disposed) {
          setErrorMsg(error instanceof Error ? error.message : "Unable to load the generated specification.")
          setSpecStatus("error")
        }
      } finally {
        activePollRef.current = false
      }
    }

    void pollForArtifact()
    const intervalId = window.setInterval(() => void pollForArtifact(), 3000)
    return () => {
      disposed = true
      window.clearInterval(intervalId)
    }
  }, [projectId, realtimeError, run, runId, specStatus])

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 rounded-md bg-bg-surface p-4">
      {specStatus === "loading" && (
        <div role="status" className="flex items-center gap-2 rounded-md border border-border-subtle bg-bg-base p-3 text-sm text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin text-accent-ai" />
          <span>Loading saved specification...</span>
        </div>
      )}
      {specStatus === "idle" && (
        <Button
          type="button"
          onClick={handleGenerate}
          className="w-full bg-accent-primary text-text-primary hover:bg-accent-primary/90"
        >
          Generate Specification
        </Button>
      )}
      {specStatus === "generating" && (
        <div role="status" className="flex items-center gap-2 rounded-md border border-border-subtle bg-bg-base p-3 text-sm text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin text-accent-ai" />
          <span>Analyzing canvas and comments...</span>
        </div>
      )}
      {specStatus === "error" && (
        <div className="flex flex-col gap-3">
          <p role="alert" className="flex items-start gap-2 rounded-md border border-border-subtle bg-bg-base p-3 text-sm text-state-error">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </p>
          <Button
            type="button"
            onClick={handleGenerate}
            className="w-full bg-accent-primary text-text-primary hover:bg-accent-primary/90"
          >
            Try Again
          </Button>
        </div>
      )}
      {specStatus === "success" && artifactId && (
        <>
          <div className="relative flex items-center gap-3 rounded-md border border-border-default bg-bg-base p-3 transition-colors hover:bg-bg-elevated">
            <button
              type="button"
              aria-label="Preview Technical Specification.md"
              onClick={() => setPreviewOpen(true)}
              className="absolute inset-0 z-0 cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            />
            <div className="pointer-events-none relative z-10 flex min-w-0 flex-1 items-center gap-3">
              <FileText className="h-5 w-5 shrink-0 text-accent-ai" />
              <span className="truncate text-sm font-medium text-text-primary">Technical Specification.md</span>
            </div>
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="relative z-20 shrink-0 text-text-muted hover:text-text-primary"
            >
              <a
                href={`/api/projects/${encodeURIComponent(projectId)}/specs/${encodeURIComponent(artifactId)}?download=true`}
                aria-label="Download Technical Specification.md"
              >
                <Download className="h-4 w-4" />
              </a>
            </Button>
          </div>
          <Button
            type="button"
            onClick={handleGenerate}
            className="w-full bg-accent-primary text-text-primary hover:bg-accent-primary/90"
          >
            Generate Again
          </Button>
          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogContent className="flex h-5/6 w-full max-w-4xl flex-col gap-4 overflow-hidden sm:max-w-4xl">
              <DialogHeader className="shrink-0">
                <DialogTitle>Technical Specification.md</DialogTitle>
                <DialogDescription>Preview the generated technical specification.</DialogDescription>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-y-auto rounded-md bg-bg-base p-4">
                <div className="prose prose-invert prose-sm max-w-none text-text-primary">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
                </div>
              </div>
              <DialogFooter className="shrink-0">
                <Button type="button" variant="outline" onClick={() => setPreviewOpen(false)}>
                  Close
                </Button>
                <Button asChild className="bg-accent-primary text-text-primary hover:bg-accent-primary/90">
                  <a href={`/api/projects/${encodeURIComponent(projectId)}/specs/${encodeURIComponent(artifactId)}?download=true`}>
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
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
        <TabsContent value="spec" forceMount className="flex-1 data-[state=inactive]:hidden">
          {currentProjectId ? (
            <ClientSideSuspense
              fallback={
                <div className="flex h-full items-center justify-center rounded-md bg-bg-surface text-sm text-text-muted">
                  Loading comments...
                </div>
              }
            >
              <SpecTab projectId={currentProjectId} />
            </ClientSideSuspense>
          ) : (
            <div className="flex h-full items-center justify-center rounded-md bg-bg-surface p-4 text-center text-sm text-text-muted">
              Specification generation is available inside a project.
            </div>
          )}
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
