"use client"

import { useRef } from "react"
import { useUpdateMyPresence } from "@liveblocks/react"
import {
  Circle,
  Database,
  Diamond,
  Hexagon,
  RectangleHorizontal,
  Square,
} from "lucide-react"
import type { ComponentType } from "react"
import type { ShapeType } from "./shapes"

const shapes: {
  type: ShapeType
  label: string
  icon: ComponentType<{ className?: string }>
}[] = [
  { type: "rectangle", label: "Rectangle", icon: Square },
  { type: "diamond", label: "Diamond", icon: Diamond },
  { type: "circle", label: "Circle", icon: Circle },
  { type: "pill", label: "Pill", icon: RectangleHorizontal },
  { type: "cylinder", label: "Cylinder", icon: Database },
  { type: "hexagon", label: "Hexagon", icon: Hexagon },
]

export function ShapeToolbar({
  onAddShape,
  screenToFlowPosition,
}: {
  onAddShape: (type: ShapeType) => void
  screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number } | null
}) {
  const updateMyPresence = useUpdateMyPresence()
  const lastPresenceUpdate = useRef(0)

  return (
    <div className="fixed bottom-6 left-1/2 z-[1000] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-wrap justify-center gap-2 rounded-md floating-panel px-3 py-3">
      {shapes.map((shape) => {
        const Icon = shape.icon

        return (
          <div
            key={shape.type}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData("application/reactflow", shape.type)
              event.dataTransfer.effectAllowed = "move"
            }}
            onDrag={(event) => {
              const now = Date.now()
              if (lastPresenceUpdate.current !== 0 && now - lastPresenceUpdate.current < 50) return

              const cursor = screenToFlowPosition({ x: event.clientX, y: event.clientY })
              if (!cursor) return

              lastPresenceUpdate.current = now
              updateMyPresence({ cursor })
            }}
            onDragEnd={() => {
              lastPresenceUpdate.current = 0
              updateMyPresence({ cursor: null })
            }}
            role="button"
            tabIndex={0}
            aria-label={`Add ${shape.label}`}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return
              event.preventDefault()
              onAddShape(shape.type)
            }}
            className="cursor-grab select-none rounded-sm p-2 text-text-primary hover:bg-bg-elevated active:bg-bg-elevated focus-visible:outline-2 focus-visible:outline-accent-primary focus-visible:outline-offset-2"
            title={shape.label}
          >
            <Icon className="h-6 w-6" />
          </div>
        )
      })}
    </div>
  )
}
