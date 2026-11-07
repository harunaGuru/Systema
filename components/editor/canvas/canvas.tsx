"use client"

import {
  useCallback,
  useEffect,
  useRef,
  type DragEvent,
} from "react"
import {
  addEdge,
  Background,
  ConnectionMode,
  Controls,
  MarkerType,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type EdgeMarker,
  type Node,
  type ReactFlowInstance,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { SystemaEdge, type SystemaEdgeData } from "./edge"
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

export function Canvas() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const reactFlowRef = useRef<ReactFlowInstance<SystemaFlowNode, SystemaFlowEdge> | null>(null)
  const { registerTemplateImporter } = useTemplateImport()
  const [nodes, setNodes, onNodesChange] = useNodesState<SystemaFlowNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<SystemaFlowEdge>([])
  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((currentEdges) =>
        addEdge(
          {
            ...params,
            type: "default",
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: "var(--color-border-default)",
            } satisfies EdgeMarker,
            data: { name: "", description: "" },
          },
          currentEdges,
        ),
      ),
    [setEdges],
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

    setNodes((currentNodes) => [...currentNodes, ...importedNodes])
    setEdges((currentEdges) => [...currentEdges, ...importedEdges])
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        void reactFlowRef.current?.fitView({ padding: 0.2, duration: 300 })
      })
    })
  }, [nodes, setEdges, setNodes])

  useEffect(
    () => registerTemplateImporter(handleImportTemplate),
    [handleImportTemplate, registerTemplateImporter],
  )

  function addNodeAtPosition(type: ShapeType, position: { x: number; y: number }) {
    setNodes((currentNodes) =>
      currentNodes.concat({
        id: crypto.randomUUID(),
        type,
        position,
        width: 180,
        height: 100,
        data: { name: "", description: "", color: "slate" },
      }),
    )
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
        onConnect={onConnect}
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
      </ReactFlow>
      <ShapeToolbar onAddShape={addShapeAtViewportCenter} />
    </div>
  )
}
