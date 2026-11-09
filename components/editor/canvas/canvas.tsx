"use client"

import {
  useCallback,
  useEffect,
  useRef,
  type DragEvent,
} from "react"
import { LiveObject } from "@liveblocks/client"
import { useMutation } from "@liveblocks/react"
import {
  Cursors,
  useLiveblocksFlow,
  type LiveblocksEdge,
  type LiveblocksNode,
} from "@liveblocks/react-flow"
import {
  Background,
  ConnectionMode,
  Controls,
  MarkerType,
  ReactFlow,
  type Connection,
  type Edge,
  type EdgeMarker,
  type Node,
  type OnConnectEnd,
  type OnConnectStart,
  type OnNodeDrag,
  type OnSelectionChangeFunc,
  type ReactFlowInstance,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { SystemaEdge, type SystemaEdgeData } from "./edge"
import { PresenceCursor } from "./presence-cursor"
import { ShapeToolbar } from "./shape-toolbar"
import { starterTemplates } from "@/lib/templates"
import { useTemplateImport } from "@/components/editor/template-import-context"
import {
  CircleNode,
  CylinderNode,
  DiamondNode,
  HexagonNode,
  PillNode,
  RectangleNode,
  type ShapeType,
  type SystemaNodeData,
} from "./shapes"
import { useThrottledPresence } from "@/hooks/use-throttled-presence"

type SystemaFlowNode = Node<SystemaNodeData, ShapeType>
type SystemaFlowEdge = Edge<SystemaEdgeData>
const shapeTypes: ShapeType[] = [
  "rectangle",
  "diamond",
  "circle",
  "pill",
  "cylinder",
  "hexagon",
]

function isShapeType(value: string): value is ShapeType {
  return shapeTypes.includes(value as ShapeType)
}

export const nodeTypes = {
  rectangle: RectangleNode,
  diamond: DiamondNode,
  circle: CircleNode,
  pill: PillNode,
  cylinder: CylinderNode,
  hexagon: HexagonNode,
}

export const edgeTypes = { default: SystemaEdge }

function getClientPosition(event: MouseEvent | TouchEvent) {
  if ("touches" in event) {
    const touch = event.touches[0] ?? event.changedTouches[0]
    return touch ? { x: touch.clientX, y: touch.clientY } : null
  }

  return { x: event.clientX, y: event.clientY }
}

function toLiveblocksNode(node: SystemaFlowNode): LiveblocksNode<SystemaFlowNode> {
  return new LiveObject({
    id: node.id,
    type: node.type,
    position: node.position,
    width: node.width,
    height: node.height,
    data: new LiveObject(node.data),
  })
}

function toLiveblocksEdge(edge: SystemaFlowEdge): LiveblocksEdge<SystemaFlowEdge> {
  return new LiveObject({
    id: edge.id,
    type: edge.type,
    source: edge.source,
    target: edge.target,
    ...(edge.sourceHandle !== undefined && { sourceHandle: edge.sourceHandle }),
    ...(edge.targetHandle !== undefined && { targetHandle: edge.targetHandle }),
    ...(edge.markerStart !== undefined && { markerStart: edge.markerStart }),
    ...(edge.markerEnd !== undefined && { markerEnd: edge.markerEnd }),
    data: new LiveObject(edge.data ?? { name: "", description: "" }),
  })
}

export function Canvas({ projectId }: { projectId: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const reactFlowRef = useRef<ReactFlowInstance<SystemaFlowNode, SystemaFlowEdge> | null>(null)
  const lastCursorPosition = useRef<{ x: number; y: number } | null>(null)
  const updatePresence = useThrottledPresence()
  const { registerTemplateImporter } = useTemplateImport()
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onDelete,
  } = useLiveblocksFlow<SystemaFlowNode, SystemaFlowEdge>({ suspense: true })
  const broadcastCursor = useCallback((event: MouseEvent | TouchEvent) => {
    const clientPosition = getClientPosition(event)
    const cursor = clientPosition && reactFlowRef.current?.screenToFlowPosition(clientPosition)
    if (!cursor) return

    lastCursorPosition.current = cursor
    updatePresence({ cursor })
  }, [updatePresence])
  const handleNodeDrag: OnNodeDrag<SystemaFlowNode> = useCallback((event, node) => {
    broadcastCursor(event)
    updatePresence({ selection: { nodeIds: [node.id], edgeIds: [] } })
  }, [broadcastCursor, updatePresence])
  const handleConnectStart: OnConnectStart = useCallback((event) => {
    broadcastCursor(event)
    updatePresence({ action: "connecting" })
  }, [broadcastCursor, updatePresence])
  const handleConnectEnd: OnConnectEnd = useCallback((event) => {
    broadcastCursor(event)
    updatePresence({ action: null })
  }, [broadcastCursor, updatePresence])
  const handleSelectionChange: OnSelectionChangeFunc<SystemaFlowNode, SystemaFlowEdge> = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }) => {
      updatePresence({
        selection: {
          nodeIds: selectedNodes.map((node) => node.id),
          edgeIds: selectedEdges.map((edge) => edge.id),
        },
      })
    },
    [updatePresence],
  )
  const handleConnect = useCallback(
    (connection: Connection) => {
      const connectedEdge = {
        ...connection,
        type: "default",
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "var(--color-border-default)",
        } satisfies EdgeMarker,
        data: { name: "", description: "" },
      }
      onConnect(connectedEdge)
      updatePresence({
        ...(lastCursorPosition.current && { cursor: lastCursorPosition.current }),
        action: null,
      })
    },
    [onConnect, updatePresence],
  )
  const addFlowElements = useMutation(
    ({ storage }, elements: { nodes: SystemaFlowNode[]; edges: SystemaFlowEdge[] }) => {
      const flow = storage.get("flow")
      if (!flow) return

      const nodeMap = flow.get("nodes")
      const edgeMap = flow.get("edges")
      for (const node of elements.nodes) {
        nodeMap.set(node.id, toLiveblocksNode(node))
      }
      for (const edge of elements.edges) {
        edgeMap.set(edge.id, toLiveblocksEdge(edge))
      }
    },
    [],
  )

  const handleImportTemplate = useCallback((templateId: string) => {
    const template = starterTemplates.find((item) => item.id === templateId)
    if (!template) return

    const templateLeft = Math.min(
      ...template.data.nodes.map((node) => node.position.x),
    )
    const templateTop = Math.min(
      ...template.data.nodes.map((node) => node.position.y),
    )
    const offsetX = nodes.length
      ? Math.max(
          ...nodes.map((node) => node.position.x + (node.width ?? 180)),
        ) + 100 - templateLeft
      : 50
    const offsetY = nodes.length
      ? Math.min(...nodes.map((node) => node.position.y)) - templateTop
      : 50
    const nodeIds = new Map<string, string>()
    const importedNodes = template.data.nodes.map((node) => {
      const id = `tmpl-${template.id}-${crypto.randomUUID()}`
      nodeIds.set(node.id, id)

      return {
        ...node,
        id,
        position: { x: node.position.x + offsetX, y: node.position.y + offsetY },
        width: 180,
        height: 100,
      }
    })
    const getImportedNodeId = (id: string) => {
      const importedId = nodeIds.get(id)
      if (!importedId) {
        throw new Error(`Template "${template.id}" has an edge to an unknown node.`)
      }
      return importedId
    }
    const importedEdges = template.data.edges.map((edge) => ({
      ...edge,
      id: `tmpl-${template.id}-${crypto.randomUUID()}`,
      type: "default",
      source: getImportedNodeId(edge.source),
      target: getImportedNodeId(edge.target),
      data: {
        name: edge.data?.name ?? "",
        description: edge.data?.description ?? "",
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "var(--color-border-default)",
      } satisfies EdgeMarker,
    }))

    addFlowElements({ nodes: importedNodes, edges: importedEdges })
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        void reactFlowRef.current?.fitView({ padding: 0.2, duration: 300 })
      })
    })
  }, [addFlowElements, nodes])

  useEffect(
    () => registerTemplateImporter(handleImportTemplate),
    [handleImportTemplate, registerTemplateImporter],
  )

  function addNodeAtPosition(type: ShapeType, position: { x: number; y: number }) {
    addFlowElements({
      nodes: [{
        id: crypto.randomUUID(),
        type,
        position,
        width: 180,
        height: 100,
        data: { name: "", description: "", color: "slate" },
      }],
      edges: [],
    })
  }

  function addShapeAtViewportCenter(type: ShapeType) {
    const flowElement = wrapperRef.current?.querySelector(".react-flow")
    const bounds = flowElement?.getBoundingClientRect()
    if (!bounds) return

    const position = reactFlowRef.current?.screenToFlowPosition({
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
    })
    if (!position) return

    addNodeAtPosition(type, position)
  }

  const screenToFlowPosition = useCallback((position: { x: number; y: number }) => {
    return reactFlowRef.current?.screenToFlowPosition(position) ?? null
  }, [])

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    const value = event.dataTransfer.getData("application/reactflow")
    if (!isShapeType(value)) return
    const position = reactFlowRef.current?.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    })
    if (!position) return

    addNodeAtPosition(value, position)
  }

  function focusCanvas() {
    wrapperRef.current?.focus({ preventScroll: true })
  }

  return (
    <div
      ref={wrapperRef}
      data-project-id={projectId}
      className="relative h-full min-h-0 min-w-0 w-full bg-bg-canvas"
      onDragOver={onDragOver}
      onDrop={onDrop}
      tabIndex={0}
    >
      <ReactFlow<SystemaFlowNode, SystemaFlowEdge>
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onConnectStart={handleConnectStart}
        onConnectEnd={handleConnectEnd}
        onNodeDrag={handleNodeDrag}
        onSelectionChange={handleSelectionChange}
        onDelete={onDelete}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        elementsSelectable
        edgesFocusable
        deleteKeyCode={["Backspace", "Delete"]}
        fitView
        onNodeClick={focusCanvas}
        onEdgeClick={focusCanvas}
        onPaneClick={focusCanvas}
        onInit={(instance) => {
          reactFlowRef.current = instance
        }}
        className="bg-bg-canvas"
        style={{ height: "100%", width: "100%" }}
      >
        <Background gap={16} size={1} color="var(--color-border-subtle)" />
        <Controls />
        <Cursors components={{ Cursor: PresenceCursor }} />
      </ReactFlow>
      <ShapeToolbar
        onAddShape={addShapeAtViewportCenter}
        screenToFlowPosition={screenToFlowPosition}
      />
    </div>
  )
}
