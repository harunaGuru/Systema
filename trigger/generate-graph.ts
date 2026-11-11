import { PrismaPg } from "@prisma/adapter-pg"
import { logger, metadata, task } from "@trigger.dev/sdk"
import { PrismaClient } from "@/lib/generated/prisma/client"
import { generateGraph as generateGraphWithAI } from "@/lib/ai/client"
import {
  GenerateGraphPayloadSchema,
  SystemaGraphSchema,
  type GenerateGraphPayload,
} from "@/lib/ai/schema"

function buildSystemPrompt(payload: GenerateGraphPayload): string {
  const currentGraphContext = payload.currentGraph
    ? `Current graph context (do not repeat or change its existing nodes or edges): ${JSON.stringify(payload.currentGraph)}`
    : "There is no existing graph."

  return [
    "You are a system architecture assistant. Generate only new additions for the user's request.",
    `User request: ${payload.prompt}`,
    currentGraphContext,
    "Return only a JSON object with nodes and edges arrays. Do not include markdown or explanatory text.",
    "Nodes require id, type, position { x, y }, and data { name, description, color }.",
    "Use only these node types: rectangle, diamond, circle, pill, cylinder, hexagon.",
    "Use only these node colors: slate, blue, violet, green, amber, rose.",
    "Edges require id, source, target, and data { name, description }.",
    "Use unique IDs that do not collide with the current graph. Edges may connect new nodes to each other or to node IDs in the current graph.",
    "Arrange new nodes clearly with no overlaps, extending the existing layout when one is provided.",
  ].join("\n")
}

export const generateGraphTask = task({
  id: "generate-graph",
  run: async (payload: GenerateGraphPayload) => {
    const validatedPayload = GenerateGraphPayloadSchema.parse(payload)
    let prisma: PrismaClient | undefined

    try {
      metadata.set("status", "Analyzing prompt...")
      const databaseUrl = process.env.DATABASE_URL
      if (!databaseUrl) {
        throw new Error("DATABASE_URL must be configured in the Trigger.dev environment")
      }

      prisma = new PrismaClient({
        adapter: new PrismaPg({ connectionString: databaseUrl, max: 1 }),
      })

      logger.info("Generating graph additions", { projectId: validatedPayload.projectId })
      metadata.set("status", "Calling AI model...")
      const graph = await generateGraphWithAI(
        buildSystemPrompt(validatedPayload),
        validatedPayload.currentGraph,
      )
      metadata.set("status", "Validating graph structure...")
      const validatedGraph = SystemaGraphSchema.parse(graph)
      metadata.set("status", "Generation complete!")
      return { success: true, graph: validatedGraph }
    } catch (error) {
      metadata.set("status", "Generation failed.")
      logger.error("Graph generation failed", {
        projectId: validatedPayload.projectId,
        message: error instanceof Error ? error.message : "Unknown graph generation error",
      })
      throw error
    } finally {
      await prisma?.$disconnect()
    }
  },
})
