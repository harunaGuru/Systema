import { z } from "zod"

export const SystemaNodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["rectangle", "diamond", "circle", "pill", "cylinder", "hexagon"]),
  position: z.object({
    x: z.number().finite(),
    y: z.number().finite(),
  }),
  data: z.object({
    name: z.string(),
    description: z.string().default(""),
    color: z.enum(["slate", "blue", "violet", "green", "amber", "rose"]).default("slate"),
  }),
})

export const SystemaEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  data: z.object({
    name: z.string().default(""),
    description: z.string().default(""),
  }).default({ name: "", description: "" }),
})

export const SystemaGraphSchema = z.object({
  nodes: z.array(SystemaNodeSchema),
  edges: z.array(SystemaEdgeSchema),
})

export type SystemaGraph = z.infer<typeof SystemaGraphSchema>

export const GenerateGraphPayloadSchema = z.object({
  projectId: z.string().min(1),
  prompt: z.string().trim().min(1),
  currentGraph: SystemaGraphSchema.optional(),
})

export type GenerateGraphPayload = z.infer<typeof GenerateGraphPayloadSchema>

export function validateGraphAdditions(
  candidate: unknown,
  currentGraph?: SystemaGraph,
): SystemaGraph {
  const graph = SystemaGraphSchema.parse(candidate)
  const existingNodeIds = new Set(currentGraph?.nodes.map((node) => node.id) ?? [])
  const existingEdgeIds = new Set(currentGraph?.edges.map((edge) => edge.id) ?? [])
  const addedNodeIds = new Set<string>()
  const addedEdgeIds = new Set<string>()

  for (const node of graph.nodes) {
    if (existingNodeIds.has(node.id) || addedNodeIds.has(node.id)) {
      throw new Error(`Generated node ID is duplicated or already exists: ${node.id}`)
    }
    addedNodeIds.add(node.id)
  }

  for (const edge of graph.edges) {
    if (existingEdgeIds.has(edge.id) || addedEdgeIds.has(edge.id)) {
      throw new Error(`Generated edge ID is duplicated or already exists: ${edge.id}`)
    }
    addedEdgeIds.add(edge.id)
  }

  const availableNodeIds = new Set([...existingNodeIds, ...addedNodeIds])
  for (const edge of graph.edges) {
    if (!availableNodeIds.has(edge.source) || !availableNodeIds.has(edge.target)) {
      throw new Error(`Generated edge references an unknown endpoint: ${edge.id}`)
    }
  }

  return graph
}
