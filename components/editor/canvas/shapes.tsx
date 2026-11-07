"use client"

import type { MouseEvent, ReactNode, Ref } from "react"
import { useCallback, useLayoutEffect, useRef, useState } from "react"
import {
  NodeResizer,
  Handle,
  Position,
  useOnViewportChange,
  useReactFlow,
  useStore,
  type Node,
  type NodeProps,
} from "@xyflow/react"
import { Info } from "lucide-react"
import { ColorPalette } from "./color-palette"

export type ShapeType =
  | "rectangle"
  | "diamond"
  | "circle"
  | "pill"
  | "cylinder"
  | "hexagon"

export type NodeColor = "slate" | "blue" | "violet" | "green" | "amber" | "rose"

export type SystemaNodeData = {
  name: string
  description: string
  color: NodeColor
}

type SystemaFlowNode = Node<SystemaNodeData, ShapeType>
type SystemaNodeProps = NodeProps<SystemaFlowNode>
type SystemaShapeProps = SystemaNodeProps & { shape: ShapeType }

const nodeColorClasses: Record<
  NodeColor,
  { fill: string; border: string; text: string }
> = {
  slate: {
    fill: "text-node-slate",
    border: "stroke-node-slate-border",
    text: "text-text-primary",
  },
  blue: {
    fill: "text-node-blue",
    border: "stroke-node-blue-border",
    text: "text-node-blue-text",
  },
  violet: {
    fill: "text-node-violet",
    border: "stroke-node-violet-border",
    text: "text-node-violet-text",
  },
  green: {
    fill: "text-node-green",
    border: "stroke-node-green-border",
    text: "text-node-green-text",
  },
  amber: {
    fill: "text-node-amber",
    border: "stroke-node-amber-border",
    text: "text-node-amber-text",
  },
  rose: {
    fill: "text-node-rose",
    border: "stroke-node-rose-border",
    text: "text-node-rose-text",
  },
}

type ShapeWrapperProps = {
  shape: ShapeType
  color: NodeColor
  width: number
  height: number
  selected: boolean
  rootRef: Ref<HTMLDivElement>
  palette?: ReactNode
  children: ReactNode
}

function ShapeWrapper({
  shape,
  color,
  width,
  height,
  selected,
  rootRef,
  palette,
  children,
}: ShapeWrapperProps) {
  const classes = nodeColorClasses[color]
  const stroke = selected ? "stroke-accent-primary" : classes.border
  const strokeWidth = selected ? 2 : 1
  const inset = strokeWidth / 2
  const innerWidth = Math.max(0, width - strokeWidth)
  const innerHeight = Math.max(0, height - strokeWidth)

  let shapeElement: ReactNode

  switch (shape) {
    case "rectangle":
      shapeElement = (
        <rect
          x={inset}
          y={inset}
          width={innerWidth}
          height={innerHeight}
          rx={8}
        />
      )
      break
    case "diamond":
      shapeElement = (
        <polygon
          points={`${width / 2},${inset} ${width - inset},${height / 2} ${width / 2},${height - inset} ${inset},${height / 2}`}
        />
      )
      break
    case "circle":
      shapeElement = (
        <ellipse
          cx={width / 2}
          cy={height / 2}
          rx={innerWidth / 2}
          ry={innerHeight / 2}
        />
      )
      break
    case "pill":
      shapeElement = (
        <rect
          x={inset}
          y={inset}
          width={innerWidth}
          height={innerHeight}
          rx={height / 2}
        />
      )
      break
    case "cylinder": {
      const radiusX = innerWidth / 2
      const radiusY = Math.min(height * 0.16, innerHeight / 2)
      shapeElement = (
        <>
          <path
            d={`M ${inset} ${radiusY} A ${radiusX} ${radiusY} 0 0 0 ${width - inset} ${radiusY} L ${width - inset} ${height - radiusY} A ${radiusX} ${radiusY} 0 0 1 ${inset} ${height - radiusY} Z`}
          />
          <ellipse
            cx={width / 2}
            cy={radiusY}
            rx={radiusX}
            ry={radiusY}
            fill="none"
          />
        </>
      )
      break
    }
    case "hexagon":
      shapeElement = (
        <polygon
          points={`${width * 0.25},${inset} ${width * 0.75},${inset} ${width - inset},${height / 2} ${width * 0.75},${height - inset} ${width * 0.25},${height - inset} ${inset},${height / 2}`}
        />
      )
      break
  }

  return (
    <div
      ref={rootRef}
      className={`relative h-full w-full ${classes.fill}`}
      style={{ width: "100%", height: "100%" }}
    >
      {palette}
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        <g
          fill="currentColor"
          className={stroke}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        >
          {shapeElement}
        </g>
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center p-2 text-center font-mono text-xs ${classes.text}`}>
        {children}
      </div>
    </div>
  )
}

function SystemaShapeNode({
  shape,
  id,
  data,
  selected,
  width = 180,
  height = 100,
}: SystemaShapeProps) {
  const { updateNodeData } = useReactFlow<SystemaFlowNode>()
  const nodePosition = useStore(
    (state) => state.nodeLookup.get(id)?.internals.positionAbsolute,
  )
  const shapeRef = useRef<HTMLDivElement>(null)
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(data.name)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [descriptionDraft, setDescriptionDraft] = useState(data.description)
  const cancelNameEdit = useRef(false)
  const [palettePlacement, setPalettePlacement] = useState<"above" | "below">("above")
  const [paletteAlignment, setPaletteAlignment] = useState<"center" | "left" | "right">("center")
  const colorTextClass = nodeColorClasses[data.color].text

  const updatePalettePlacement = useCallback(() => {
    if (!selected) return

    const shapeElement = shapeRef.current
    const flowElement = shapeElement?.closest(".react-flow")
    if (!shapeElement || !flowElement) return

    const shapeBounds = shapeElement.getBoundingClientRect()
    const flowBounds = flowElement.getBoundingClientRect()
    setPalettePlacement(shapeBounds.top - flowBounds.top < 52 ? "below" : "above")
    const spaceToLeft = shapeBounds.left + shapeBounds.width / 2 - flowBounds.left
    const spaceToRight = flowBounds.right - (shapeBounds.left + shapeBounds.width / 2)
    setPaletteAlignment(
      spaceToLeft < 101 ? "left" : spaceToRight < 101 ? "right" : "center",
    )
  }, [selected])

  useOnViewportChange({ onChange: updatePalettePlacement })

  useLayoutEffect(() => {
    if (!selected) return

    updatePalettePlacement()
    window.addEventListener("resize", updatePalettePlacement)
    return () => window.removeEventListener("resize", updatePalettePlacement)
  }, [nodePosition?.x, nodePosition?.y, selected, updatePalettePlacement])

  function startNameEdit(event: MouseEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    cancelNameEdit.current = false
    setNameDraft(data.name)
    setIsEditingName(true)
  }

  function saveName() {
    if (cancelNameEdit.current) {
      cancelNameEdit.current = false
      setNameDraft(data.name)
    } else {
      updateNodeData(id, { name: nameDraft })
    }
    setIsEditingName(false)
  }

  function saveDescription() {
    updateNodeData(id, { description: descriptionDraft })
    setIsEditingDescription(false)
  }

  return (
    <>
      <NodeResizer
        minWidth={80}
        minHeight={60}
        maxWidth={600}
        maxHeight={400}
        isVisible={selected}
        handleClassName="!h-3 !w-3 !border-2 !border-accent-primary !bg-bg-elevated"
        lineClassName="!border-accent-primary"
      />
      {/* These source handles can receive connections because Canvas uses ConnectionMode.Loose. Strict mode would prevent it. */}
      <Handle
        id="top"
        type="source"
        position={Position.Top}
        className="z-10 !h-2 !w-2 !border-2 !border-accent-primary !bg-bg-elevated"
      />
      <Handle
        id="right"
        type="source"
        position={Position.Right}
        className="z-10 !h-2 !w-2 !border-2 !border-accent-primary !bg-bg-elevated"
      />
      <Handle
        id="bottom"
        type="source"
        position={Position.Bottom}
        className="z-10 !h-2 !w-2 !border-2 !border-accent-primary !bg-bg-elevated"
      />
      <Handle
        id="left"
        type="source"
        position={Position.Left}
        className="z-10 !h-2 !w-2 !border-2 !border-accent-primary !bg-bg-elevated"
      />
      <ShapeWrapper
        shape={shape}
        color={data.color}
        width={width}
        height={height}
        selected={selected}
        rootRef={shapeRef}
        palette={
          selected && (
            <ColorPalette
              currentColor={data.color}
              placement={palettePlacement}
              alignment={paletteAlignment}
              onChange={(newColor) => updateNodeData(id, { color: newColor })}
            />
          )
        }
      >
        <div
          className="absolute inset-0 flex items-center justify-center p-2 text-center font-mono text-xs"
          onDoubleClick={startNameEdit}
        >
          {isEditingName ? (
            <input
              autoFocus
              aria-label="Node name"
              className={`nodrag nopan w-full bg-transparent text-center font-mono text-xs outline-none ${colorTextClass}`}
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              onBlur={saveName}
              onClick={(event) => event.stopPropagation()}
              onDoubleClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  event.currentTarget.blur()
                }
                if (event.key === "Escape") {
                  cancelNameEdit.current = true
                  event.currentTarget.blur()
                }
              }}
            />
          ) : (
            data.name && (
              <span className="line-clamp-3 break-words">{data.name}</span>
            )
          )}
        </div>
        <button
          type="button"
          aria-label="Edit node description"
          title="Edit description"
          className="nodrag nopan absolute right-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-sm text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary focus-visible:outline-2 focus-visible:outline-accent-primary focus-visible:outline-offset-2"
          onClick={(event) => {
            event.stopPropagation()
            setDescriptionDraft(data.description)
            setIsEditingDescription((editing) => !editing)
          }}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
        {isEditingDescription && (
          <textarea
            autoFocus
            aria-label="Node description"
            className="nodrag nopan absolute right-0 top-full z-20 min-h-16 w-40 rounded-sm border border-border-default bg-bg-elevated p-2 font-mono text-xs text-text-primary outline-none focus-visible:border-accent-primary"
            value={descriptionDraft}
            onChange={(event) => setDescriptionDraft(event.target.value)}
            onBlur={saveDescription}
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape") event.currentTarget.blur()
            }}
          />
        )}
      </ShapeWrapper>
    </>
  )
}

export function RectangleNode(props: SystemaNodeProps) {
  return <SystemaShapeNode {...props} shape="rectangle" />
}

export function DiamondNode(props: SystemaNodeProps) {
  return <SystemaShapeNode {...props} shape="diamond" />
}

export function CircleNode(props: SystemaNodeProps) {
  return <SystemaShapeNode {...props} shape="circle" />
}

export function PillNode(props: SystemaNodeProps) {
  return <SystemaShapeNode {...props} shape="pill" />
}

export function CylinderNode(props: SystemaNodeProps) {
  return <SystemaShapeNode {...props} shape="cylinder" />
}

export function HexagonNode(props: SystemaNodeProps) {
  return <SystemaShapeNode {...props} shape="hexagon" />
}
