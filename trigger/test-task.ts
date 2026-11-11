import { PrismaPg } from "@prisma/adapter-pg"
import { logger, task } from "@trigger.dev/sdk"
import { PrismaClient } from "@/lib/generated/prisma/client"

export const testTask = task({
  id: "test-task",
  run: async (payload: { message: string }) => {
    logger.info("Trigger.dev task started", { message: payload.message })

    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error("DATABASE_URL must be configured in the Trigger.dev environment")
    }

    const prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl, max: 1 }),
    })

    try {
      const projectCount = await prisma.project.count()
      logger.info("Database connection successful", { projectCount })
      return { success: true, projectCount }
    } catch (error) {
      logger.error("Database connection failed", { error })
      throw error
    } finally {
      await prisma.$disconnect()
    }
  },
})
