import { PrismaPg } from "@prisma/adapter-pg"
import { del, get, put } from "@vercel/blob"
import { AbortTaskRunError, logger, task } from "@trigger.dev/sdk"
import { PrismaClient } from "@/lib/generated/prisma/client"
import { generateMarkdown } from "@/lib/ai/client"
import { SystemaGraphSchema } from "@/lib/ai/schema"
import { buildSpecPrompt } from "@/lib/ai/spec-prompt"
import { z } from "zod"

const GenerateSpecPayloadSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
  comments: z.array(z.string()).optional().default([]),
})

export const generateSpecTask = task({
  id: "generate-spec",
  maxDuration: 300,
  run: async (payload: unknown, { ctx }) => {
    const validatedPayload = GenerateSpecPayloadSchema.parse(payload)
    const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL must be configured in the Trigger.dev environment")
    }

    const prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl, max: 1 }),
    })
    try {
      logger.info("Generating technical specification", {
        projectId: validatedPayload.projectId,
        runId: ctx.run.id,
      })

      const accessibleProject = await prisma.project.findFirst({
        where: {
          id: validatedPayload.projectId,
          OR: [
            { ownerId: validatedPayload.userId },
            { collaborators: { some: { userId: validatedPayload.userId } } },
          ],
        },
        select: { id: true },
      })
      if (!accessibleProject) {
        throw new AbortTaskRunError("User no longer has access to this project.")
      }

      const existingArtifact = await prisma.artifact.findUnique({
        where: { runId: ctx.run.id },
        select: { id: true, projectId: true, type: true },
      })
      if (existingArtifact) {
        if (existingArtifact.projectId !== validatedPayload.projectId || existingArtifact.type !== "SPEC") {
          throw new AbortTaskRunError("This run is already associated with a different artifact.")
        }
        return { success: true, artifactId: existingArtifact.id }
      }

      const latestSnapshot = await prisma.canvasSnapshot.findFirst({
        where: { projectId: validatedPayload.projectId },
        orderBy: { sequence: "desc" },
        select: { blobPath: true },
      })
      if (!latestSnapshot) {
        throw new Error("No canvas snapshot found for this project.")
      }

      const snapshotBlob = await get(latestSnapshot.blobPath, { access: "private" })
      if (!snapshotBlob || snapshotBlob.statusCode !== 200) {
        throw new Error("Unable to read the latest canvas snapshot.")
      }

      const snapshotData: unknown = await new Response(snapshotBlob.stream).json()
      const graph = SystemaGraphSchema.parse(snapshotData)
      const prompt = buildSpecPrompt(graph, validatedPayload.comments)
      const markdown = await generateMarkdown(prompt)

      const blob = await put(`specs/${validatedPayload.projectId}/${crypto.randomUUID()}.md`, markdown, {
        access: "private",
        addRandomSuffix: false,
        contentType: "text/markdown; charset=utf-8",
      })

      try {
        const artifact = await prisma.artifact.create({
          data: {
            projectId: validatedPayload.projectId,
            type: "SPEC",
            blobPath: blob.url,
            runId: ctx.run.id,
          },
          select: { id: true },
        })
        return { success: true, artifactId: artifact.id }
      } catch (databaseError) {
        let artifactByRun
        let artifactByBlob
        try {
          artifactByRun = await prisma.artifact.findUnique({
            where: { runId: ctx.run.id },
            select: { id: true, projectId: true, type: true, blobPath: true },
          })
          artifactByBlob = await prisma.artifact.findFirst({
            where: { blobPath: blob.url },
            select: { id: true },
          })
        } catch (reconciliationError) {
          logger.error("Unable to reconcile spec Blob after Artifact insert failure; retaining Blob", {
            projectId: validatedPayload.projectId,
            runId: ctx.run.id,
            blobPath: blob.url,
            reconciliationError,
          })
          throw new AggregateError(
            [databaseError, reconciliationError],
            "Artifact insert outcome is unknown; uploaded spec Blob was retained",
          )
        }

        if (artifactByRun) {
          if (artifactByRun.projectId !== validatedPayload.projectId || artifactByRun.type !== "SPEC") {
            throw new AbortTaskRunError("This run is already associated with a different artifact.")
          }
          if (!artifactByBlob) {
            try {
              await del(blob.url)
            } catch (cleanupError) {
              logger.error("Unable to delete unreferenced spec Blob after reconciling existing Artifact", {
                projectId: validatedPayload.projectId,
                runId: ctx.run.id,
                blobPath: blob.url,
                cleanupError,
              })
            }
          }
          return { success: true, artifactId: artifactByRun.id }
        }

        if (!artifactByBlob) {
          try {
            await del(blob.url)
          } catch (cleanupError) {
            logger.error("Unable to delete spec Blob after confirming no Artifact references it", {
              projectId: validatedPayload.projectId,
              runId: ctx.run.id,
              blobPath: blob.url,
              cleanupError,
            })
            throw new AggregateError(
              [databaseError, cleanupError],
              "Artifact insert failed and the unreferenced spec Blob could not be deleted",
            )
          }
        }
        throw databaseError
      }
    } catch (error) {
      logger.error("Spec generation failed", {
        projectId: validatedPayload.projectId,
        runId: ctx.run.id,
        message: error instanceof Error ? error.message : "Unknown spec generation error",
      })
      throw error
    } finally {
      await prisma.$disconnect()
    }
  },
})
