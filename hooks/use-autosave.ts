"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { LiveMap, LiveObject } from "@liveblocks/client"
import { useMutation, useStorage } from "@liveblocks/react"
import type { Edge, Node } from "@xyflow/react"
import type { LiveblocksEdge, LiveblocksFlow, LiveblocksNode } from "@liveblocks/react-flow"
import { z } from "zod"
import {
  CanvasSnapshotPayloadSchema,
  SnapshotListSchema,
  type CanvasSnapshotPayload,
} from "@/types/canvas-snapshot"
import type { ShapeType, SystemaNodeData } from "@/components/editor/canvas/shapes"
import type { SystemaEdgeData } from "@/components/editor/canvas/edge"

type CanvasPayload = { nodes: unknown[]; edges: unknown[] }
type SystemaFlowNode = Node<SystemaNodeData, ShapeType>
type SystemaFlowEdge = Edge<SystemaEdgeData>
type EmptyState = { nodes: unknown[]; edges: unknown[] }

const ErrorResponseSchema = z.object({ error: z.string() }).partial()
const EmptyStateSchema = z.object({ nodes: z.array(z.unknown()), edges: z.array(z.unknown()) })

export function useAutosave(projectId: string) {
  const serialized = useStorage((root) => {
    const nodes = root.flow?.nodes ?? {}
    const edges = root.flow?.edges ?? {}

    return JSON.stringify({
      nodes: Array.isArray(nodes) ? nodes : Object.values(nodes),
      edges: Array.isArray(edges) ? edges : Object.values(edges),
    })
  })
  const latestSerialized = useRef<string | null>(serialized)
  const previousSerialized = useRef<string | null>(null)
  const isDirty = useRef(false)
  const pendingSave = useRef<{ serialized: string; promise: Promise<void> } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    latestSerialized.current = serialized
  }, [serialized])

  const save = useCallback(async (): Promise<void> => {
    const waitForSave = async (
      activeSave: NonNullable<typeof pendingSave.current>,
    ): Promise<string | null> => {
      let failed = false
      let failure: unknown
      try {
        await activeSave.promise
      } catch (error) {
        failed = true
        failure = error
      }

      const latest = latestSerialized.current
      if (latest === activeSave.serialized) {
        if (failed) throw failure
        return null
      }
      return latest
    }

    let current = latestSerialized.current
    while (current !== null) {
      const latest = latestSerialized.current
      if (latest === null) return
      if (latest !== current) current = latest

      const activeSave = pendingSave.current
      if (activeSave) {
        const next = await waitForSave(activeSave)
        if (next === null) return
        current = next
        continue
      }

      const payload = JSON.parse(current) as CanvasPayload
      setIsSaving(true)
      const newSave = { serialized: current, promise: Promise.resolve() }
      pendingSave.current = newSave
      newSave.promise = (async () => {
        try {
          const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/save`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          })
          const responseBody: unknown = await response.json().catch(() => null)
          if (!response.ok) {
            const parsed = ErrorResponseSchema.safeParse(responseBody)
            throw new Error(parsed.success ? parsed.data.error ?? "Unable to save canvas" : "Unable to save canvas")
          }
          if (latestSerialized.current === current) isDirty.current = false
        } finally {
          if (pendingSave.current === newSave) {
            pendingSave.current = null
            if (latestSerialized.current === newSave.serialized) setIsSaving(false)
          }
        }
      })()

      const next = await waitForSave(newSave)
      if (next === null) return
      current = next
    }
  }, [projectId])

  useEffect(() => {
    if (serialized === null) return
    if (previousSerialized.current === null) {
      previousSerialized.current = serialized
      return
    }
    if (previousSerialized.current === serialized) return

    previousSerialized.current = serialized
    isDirty.current = true
    const timeout = window.setTimeout(() => {
      void save().catch((error: unknown) => console.error("Autosave failed:", error))
    }, 3000)
    return () => window.clearTimeout(timeout)
  }, [save, serialized])

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (isDirty.current) {
        void save().catch((error: unknown) => console.error("Autosave failed:", error))
      }
    }, 60_000)
    return () => window.clearInterval(interval)
  }, [save])

  return { save, isSaving }
}

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

export function useRehydrate(projectId: string): void {
  const serialized = useStorage((root) => {
    const nodes = root.flow?.nodes ?? {}
    const edges = root.flow?.edges ?? {}

    return JSON.stringify({
      nodes: Array.isArray(nodes) ? nodes : Object.values(nodes),
      edges: Array.isArray(edges) ? edges : Object.values(edges),
    })
  })
  const hasAttemptedRehydration = useRef(false)
  const previousSerialized = useRef<string | null>(null)
  const latestSerialized = useRef<string | null>(serialized)
  const changeVersion = useRef(0)
  const isMounted = useRef(false)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  useEffect(() => {
    latestSerialized.current = serialized
    if (previousSerialized.current !== null && previousSerialized.current !== serialized) {
      changeVersion.current += 1
    }
    previousSerialized.current = serialized
  }, [serialized])

  const rehydrateIfEmpty = useMutation(({ storage }, graph: CanvasSnapshotPayload) => {
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
    if (nodes.size > 0 || edges.size > 0) return false

    for (const node of graph.nodes) nodes.set(node.id, toLiveblocksNode(node))
    for (const edge of graph.edges) edges.set(edge.id, toLiveblocksEdge(edge))
    return true
  }, [])

  useEffect(() => {
    if (serialized === null || hasAttemptedRehydration.current) return
    hasAttemptedRehydration.current = true

    let currentState: unknown
    try {
      currentState = JSON.parse(serialized)
    } catch {
      console.error("Unable to inspect Liveblocks canvas before rehydration")
      return
    }

    const emptyState = EmptyStateSchema.safeParse(currentState)
    if (!emptyState.success) {
      console.error("Liveblocks canvas state is invalid; skipping rehydration")
      return
    }
    const state: EmptyState = emptyState.data
    if (state.nodes.length > 0 || state.edges.length > 0) return

    const startingVersion = changeVersion.current
    const startingState = serialized
    void (async () => {
      try {
        const listResponse = await fetch(`/api/projects/${encodeURIComponent(projectId)}/snapshots`, {
          cache: "no-store",
        })
        if (!listResponse.ok) throw new Error("Unable to load snapshot history")
        const snapshotList = SnapshotListSchema.safeParse(await listResponse.json())
        if (!snapshotList.success) throw new Error("Snapshot history response is invalid")
        const latestSnapshot = snapshotList.data.snapshots[0]
        if (!latestSnapshot) return

        const snapshotResponse = await fetch(
          `/api/projects/${encodeURIComponent(projectId)}/snapshots/${encodeURIComponent(latestSnapshot.id)}`,
          { cache: "no-store" },
        )
        if (!snapshotResponse.ok) throw new Error("Unable to load the latest snapshot")
        const parsedGraph = CanvasSnapshotPayloadSchema.safeParse(await snapshotResponse.json())
        if (!parsedGraph.success) throw new Error("Latest snapshot data is invalid")

        if (
          !isMounted.current ||
          latestSerialized.current !== startingState ||
          changeVersion.current !== startingVersion
        ) return

        rehydrateIfEmpty(parsedGraph.data)
      } catch (error) {
        console.error("Canvas rehydration failed:", error)
      }
    })()
  }, [projectId, rehydrateIfEmpty, serialized])
}
