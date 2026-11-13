import { z } from "zod"

const NodeColorSchema = z.enum(["slate", "blue", "violet", "green", "amber", "rose"])
const ShapeTypeSchema = z.enum(["rectangle", "diamond", "circle", "pill", "cylinder", "hexagon"])

const NodeDataSchema = z.object({
  name: z.string(),
  description: z.string().default(""),
  color: NodeColorSchema.default("slate"),
})

const EdgeMarkerSchema = z.union([
  z.string(),
  z.object({
    type: z.enum(["arrow", "arrowclosed"]),
    color: z.string().nullable().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    markerUnits: z.string().optional(),
    orient: z.string().optional(),
    strokeWidth: z.number().optional(),
  }),
])

export const CanvasSnapshotPayloadSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    type: ShapeTypeSchema,
    position: z.object({ x: z.number(), y: z.number() }),
    width: z.number().optional(),
    height: z.number().optional(),
    data: NodeDataSchema,
  })),
  edges: z.array(z.object({
    id: z.string(),
    type: z.string().optional(),
    source: z.string(),
    target: z.string(),
    sourceHandle: z.string().nullable().optional(),
    targetHandle: z.string().nullable().optional(),
    markerStart: EdgeMarkerSchema.optional(),
    markerEnd: EdgeMarkerSchema.optional(),
    data: z.object({
      name: z.string().default(""),
      description: z.string().default(""),
    }).default({ name: "", description: "" }),
  })),
})

export const SnapshotListSchema = z.object({
  snapshots: z.array(z.object({
    id: z.string(),
    createdAt: z.string().datetime(),
  })),
})

export type CanvasSnapshotPayload = z.infer<typeof CanvasSnapshotPayloadSchema>
export type SnapshotList = z.infer<typeof SnapshotListSchema>
