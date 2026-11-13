"use client"

import { useCallback, useState } from "react"
import { LiveMap, LiveObject } from "@liveblocks/client"
import { useMutation } from "@liveblocks/react"
import { History } from "lucide-react"
import type { Edge, Node } from "@xyflow/react"
import type { LiveblocksEdge, LiveblocksFlow, LiveblocksNode } from "@liveblocks/react-flow"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  CanvasSnapshotPayloadSchema,
  SnapshotListSchema,
  type CanvasSnapshotPayload,
  type SnapshotList,
} from "@/types/canvas-snapshot"
import type { ShapeType, SystemaNodeData } from "@/components/editor/canvas/shapes"
import type { SystemaEdgeData } from "@/components/editor/canvas/edge"

type SystemaFlowNode = Node<SystemaNodeData, ShapeType>
type SystemaFlowEdge = Edge<SystemaEdgeData>
type SnapshotSummary = SnapshotList["snapshots"][number]

const ErrorResponseSchema = z.object({ error: z.string() }).partial()

function toLiveblocksNode(node: CanvasSnapshotPayload["nodes"][number]): LiveblocksNode<SystemaFlowNode> {
  return new LiveObject({
    id: node.id,
    type: node.type,
    position: node.position,
    width: node.width,
    height: node.height,
    data: new LiveObject(node.data),
  })
}

function toLiveblocksEdge(edge: CanvasSnapshotPayload["edges"][number]): LiveblocksEdge<SystemaFlowEdge> {
  return new LiveObject({
    id: edge.id,
    type: edge.type ?? "default",
    source: edge.source,
    target: edge.target,
    ...(edge.sourceHandle !== undefined && { sourceHandle: edge.sourceHandle }),
    ...(edge.targetHandle !== undefined && { targetHandle: edge.targetHandle }),
    ...(edge.markerStart !== undefined && { markerStart: edge.markerStart }),
    ...(edge.markerEnd !== undefined && { markerEnd: edge.markerEnd }),
    data: new LiveObject(edge.data),
  })
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to restore snapshot"
}

export function SnapshotHistory({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false)
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [pendingSnapshotId, setPendingSnapshotId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const replaceGraph = useMutation(({ storage }, graph: CanvasSnapshotPayload) => {
    let flow = storage.get("flow")
    if (!flow) {
      flow = new LiveObject({
        nodes: new LiveMap<string, LiveblocksNode<SystemaFlowNode>>(),
        edges: new LiveMap<string, LiveblocksEdge<SystemaFlowEdge>>(),
      }) satisfies LiveblocksFlow<SystemaFlowNode, SystemaFlowEdge>
      storage.set("flow", flow)
    }

    const nodes = flow.get("nodes")
    const edges = flow.get("edges")
    for (const id of [...nodes.keys()]) nodes.delete(id)
    for (const id of [...edges.keys()]) edges.delete(id)
    for (const node of graph.nodes) nodes.set(node.id, toLiveblocksNode(node))
    for (const edge of graph.edges) edges.set(edge.id, toLiveblocksEdge(edge))
    return true
  }, [])

  const loadSnapshots = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/snapshots`, {
        cache: "no-store",
      })
      if (!response.ok) throw new Error("Unable to load snapshot history")
      const parsed = SnapshotListSchema.safeParse(await response.json())
      if (!parsed.success) throw new Error("Snapshot history response is invalid")
      setSnapshots(parsed.data.snapshots)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  async function restoreSnapshot(snapshot: SnapshotSummary) {
    setPendingSnapshotId(snapshot.id)
    setErrorMessage(null)
    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/snapshots/${encodeURIComponent(snapshot.id)}`,
        { cache: "no-store" },
      )
      const responseBody: unknown = await response.json()
      if (!response.ok) {
        const parsedError = ErrorResponseSchema.safeParse(responseBody)
        throw new Error(parsedError.success ? parsedError.data.error ?? "Unable to load snapshot" : "Unable to load snapshot")
      }
      const parsedGraph = CanvasSnapshotPayloadSchema.safeParse(responseBody)
      if (!parsedGraph.success) throw new Error("Snapshot data is invalid")
      if (!replaceGraph(parsedGraph.data)) throw new Error("Canvas storage is unavailable")
      setOpen(false)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setPendingSnapshotId(null)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) void loadSnapshots()
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Snapshot history"
          title="Snapshot history"
        >
          <History className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="border border-border-default bg-bg-surface text-text-primary">
        <DialogHeader>
          <DialogTitle>Snapshot history</DialogTitle>
          <DialogDescription className="text-text-muted">
            Restoring a snapshot replaces the current shared canvas for everyone in this project.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-text-muted">Loading snapshots...</p>
        ) : snapshots.length === 0 ? (
          <p className="text-sm text-text-muted">No saved snapshots yet.</p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {snapshots.map((snapshot) => (
              <li
                key={snapshot.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-bg-base p-3"
              >
                <time dateTime={snapshot.createdAt} className="text-sm text-text-primary">
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(snapshot.createdAt))}
                </time>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pendingSnapshotId !== null}
                  onClick={() => void restoreSnapshot(snapshot)}
                >
                  {pendingSnapshotId === snapshot.id ? "Restoring..." : "Restore"}
                </Button>
              </li>
            ))}
          </ul>
        )}
        {errorMessage && (
          <p role="alert" className="text-sm text-state-error">{errorMessage}</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
