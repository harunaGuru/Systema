# SPEC-001 — Spec Generation Task

## A. Identity and Objective

- **Feature ID:** SPEC-001
- **Title:** Spec Generation Task
- **Primary objective:** Create a Trigger.dev background task that takes the latest canvas snapshot and comments, generates a comprehensive Markdown technical specification using the AI, and stores the Markdown file in Vercel Blob.
- **Expected outcome:** The task queries the database for the latest `CanvasSnapshot` and comments, builds a prompt, calls Gemini (Groq fallback), uploads the resulting Markdown to Vercel Blob, and creates an `Artifact` record in Postgres.
- **References:** `planning/feature-map.md` SPEC-001; `context/architecture.md` Invariants #2 and #4; `context/code-standards.md` Data and Storage; `AGENTS.md`.

## B. Execution Contract

The agent must do all of the following without asking the user for confirmation, in this order:

1. Read `AGENTS.md`, `context/architecture.md` (Invariants #2 and #4), `context/code-standards.md` (Data and Storage).
2. Confirm AI-002, PERSIST-001, and COLLAB-003 are in place.
3. **Stop and ask the user to verify that `BLOB_READ_WRITE_TOKEN`, `GEMINI_API_KEY`, and `GROQ_API_KEY` are set in the Trigger.dev Development environment dashboard.** Wait for confirmation.
4. Create the AI prompt logic in `lib/ai/spec-prompt.ts` per D.1.
5. Create the Trigger.dev task in `trigger/generate-spec.ts` per D.2.
6. Run the **Checks** block in Section I top to bottom.
7. Fix any in-scope failure and re-run the failing check.
8. Report PASS or FAIL per Section J. On PASS, state the agent has stopped and is awaiting the next feature. On FAIL, state the exact blocker and stop.

Do not modify `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/db.ts`, `lib/server/auth.ts`, `actions/*`, or `components/editor/*`.

## C. Context and Dependencies

- **Prerequisites:** AI-001 (Trigger.dev setup), AI-002 (AI logic), PERSIST-001 (snapshots exist), COLLAB-003 (comments exist).
- **Contract introduced:** The `generateSpecTask` and the `/api/ai/spec` endpoint (which will be consumed in SPEC-002).
- **Contract consumed:** `prisma`, `@vercel/blob`, and the dedicated text-mode `generateMarkdown` function from `lib/ai/client.ts`.
- **Approved decisions:**
  - **Spec Input:** The task must fetch the latest `CanvasSnapshot` from the database, fetch all `Thread` comments from Liveblocks (or Postgres, depending on how Liveblocks stores them—if using Liveblocks API, we need the Liveblocks Node client), and combine them into a prompt.
  - **Spec Output:** The AI generates Markdown. The task uploads this Markdown to Vercel Blob (private) and creates an `Artifact` row with `type: SPEC`. Store the current Trigger.dev run ID in a nullable, unique `Artifact.runId` field so SPEC-002 can associate the artifact with the submitted run; legacy artifacts may keep a null run ID.
  - **Invariant #4:** If the Blob upload succeeds but the Postgres insert fails, we must delete the Blob to avoid orphaned files.
  - **Prisma Pooling:** Use `PrismaPg` with `max: 1` for the Trigger.dev task, just like AI-002.

## D. Implementation Requirements

### 1. `lib/ai/spec-prompt.ts`

Create a utility that constructs the system prompt from the canvas graph and comments.

START OF spec-prompt.ts snippet

    export function buildSpecPrompt(graph: any, comments: string[]): string {
      return `You are a senior software architect. Generate a comprehensive technical specification in Markdown format based on the following system design graph and team comments.

      System Graph:
      ${JSON.stringify(graph, null, 2)}

      Team Comments:
      ${comments.length > 0 ? comments.join("\n- ") : "No comments provided."}

      Requirements for the Markdown output:
      1. Include a high-level overview.
      2. Detail the components (nodes) and their responsibilities.
      3. Explain the data flow and connections (edges).
      4. Incorporate any relevant insights from the team comments.
      5. Output valid Markdown only. Do not wrap the entire output in a code block.
      `;
    }

END OF spec-prompt.ts snippet

### 2. `trigger/generate-spec.ts`

Create the Trigger.dev task using the `@trigger.dev/sdk` v4 syntax.

START OF generate-spec.ts snippet

    import { task } from "@trigger.dev/sdk";
    import { PrismaClient } from "@prisma/client";
    import { PrismaPg } from "@prisma/adapter-pg";
    import { get, put, del } from "@vercel/blob";
    import { buildSpecPrompt } from "@/lib/ai/spec-prompt";
    import { generateMarkdown } from "@/lib/ai/client";

    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL, max: 1 });
    const prisma = new PrismaClient({ adapter });

    export const generateSpecTask = task({
      id: "generate-spec",
      run: async (payload: { projectId: string; comments?: string[] }) => {
        console.log(`Generating spec for project ${payload.projectId}`);

        try {
          // 1. Fetch the latest snapshot
          const latestSnapshot = await prisma.canvasSnapshot.findFirst({
            where: { projectId: payload.projectId },
            orderBy: { sequence: "desc" },
          });

          if (!latestSnapshot) {
            throw new Error("No canvas snapshot found for this project.");
          }

          // Fetch the actual JSON from Blob
          const snapshotBlob = await get(latestSnapshot.blobPath, { access: "private" });
          if (!snapshotBlob || snapshotBlob.statusCode !== 200) {
            throw new Error("Unable to read the latest canvas snapshot.");
          }
          const graph: unknown = await new Response(snapshotBlob.stream).json();

          // 2. Build the prompt (assume comments are passed in the payload for simplicity in this unit)
          const prompt = buildSpecPrompt(graph, payload.comments || []);

          // 3. Generate Markdown using the text-mode AI fallback client.
          const markdown: unknown = await generateMarkdown(prompt);
          if (typeof markdown !== "string") {
            throw new Error("Markdown generation returned a non-string result");
          }

          // 4. Upload Markdown to Vercel Blob
          const filename = `specs/${payload.projectId}/${Date.now()}.md`;
          const blob = await put(filename, markdown, {
            access: "private",
            contentType: "text/markdown",
          });

          // 5. Create the Artifact record
          try {
            const artifact = await prisma.artifact.create({
              data: {
                projectId: payload.projectId,
                type: "SPEC",
                blobPath: blob.url,
              },
              select: { id: true },
            });
            return { success: true, artifactId: artifact.id };
          } catch (dbError) {
            // Invariant #4: Clean up Blob if DB insert fails
            await del(blob.url);
            throw new Error("Database insert failed, blob deleted.");
          }
        } catch (error) {
          console.error("Spec generation failed:", error);
          throw error;
        } finally {
          await prisma.$disconnect();
        }
      },
    });

END OF generate-spec.ts snippet

`generateMarkdown` must be a dedicated text-mode function in `lib/ai/client.ts`. It must call Gemini and Groq without JSON response formatting or graph validation, return a Markdown string, and throw if both providers fail. Do not use `generateGraph` or serialize a non-string value as a fallback.

## E. Integration Contracts

- **Contract introduced:** The `generateSpecTask`.
- **Contract consumed:** Vercel Blob, Prisma, Gemini/Groq SDKs.

## F. Scope Limits

Do not:

- Build the UI to trigger this task or preview the spec (SPEC-002).
- Create the API route to trigger the task (SPEC-002).
- Modify `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/db.ts`, `lib/server/auth.ts`, `actions/*`, or `components/editor/*`.

## G. Protected Behavior and Compatibility

- AI-001, AI-002, PERSIST-001, and COLLAB-003 gates still pass.
- `components/ui/*` unchanged.

## H. Acceptance Criteria

1. `lib/ai/spec-prompt.ts` exists and exports `buildSpecPrompt`.
2. `trigger/generate-spec.ts` exists and exports `generateSpecTask`.
3. The task fetches the latest snapshot, uploads Markdown to Blob, and creates an `Artifact` row.
4. The task cleans up the Blob if the Postgres insert fails (Invariant #4).
5. All Checks pass.

## I. Checks

Check 1 — Prompt builder exists. Run `ls lib/ai/spec-prompt.ts`. Pass if listed.

Check 2 — Task exists and uses v4 SDK. Run `grep -c "export const generateSpecTask" trigger/generate-spec.ts`. Pass if count is 1. Run `grep -c '"@trigger.dev/sdk"' trigger/generate-spec.ts`. Pass if count is 1.

Check 3 — Blob and cleanup logic. Run `grep -c "put(" trigger/generate-spec.ts` and `grep -c "del(" trigger/generate-spec.ts`. Each count must be at least 1.

Check 4 — Build, typecheck, lint. Run `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack`.

## J. Report

Status: `PASS` or `FAIL`.

If PASS, report:

- Confirmation that `BLOB_READ_WRITE_TOKEN` and AI keys are in Trigger.dev.
- One-line result per check.
- Note whether `lib/ai/client.ts` was modified to support text output, or if a new function was created.
- Note that manual verification (running the task in the Trigger.dev dashboard with a mock payload) is required by the user.
- Closing line: "SPEC-001 complete. Awaiting the next feature specification."
