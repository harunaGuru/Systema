# SPEC-002 — Spec Preview + Download

## A. Identity and Objective

- **Feature ID:** SPEC-002
- **Title:** Spec Preview + Download
- **Primary objective:** Connect the frontend to the `generateSpecTask` (from SPEC-001), fetch the current Liveblocks comments, render the generated Markdown in the "Spec" tab of the right sidebar, and provide a secure download button for the user.
- **Expected outcome:** A user clicks "Generate Spec". The UI shows a loading state, sends the canvas state and comments to the task, polls for completion, fetches the Markdown from the server, renders it, and provides a "Download" button.
- **References:** `planning/feature-map.md` SPEC-002; `context/ui-context.md` Layout Patterns; `context/architecture.md` Invariants #1, #2; `context/code-standards.md` API Routes; `AGENTS.md`.

## B. Execution Contract

The agent must do all of the following without asking you for confirmation, in this order:

1. Read `AGENTS.md`, `context/ui-context.md` (Layout Patterns), `context/architecture.md` (Invariants #1, #2), `context/code-standards.md` (API Routes).
2. Confirm SPEC-001 is in place: `trigger/generate-spec.ts` exists, and the `generateSpecTask` works.
3. Install the Markdown renderer: run `npm install react-markdown remark-gfm`.
4. Create the API route to trigger the task and list artifacts: `app/api/ai/spec/route.ts` per D.1.
5. Create the API route to fetch the generated Markdown: `app/api/projects/[projectId]/specs/[artifactId]/route.ts` per D.2.
6. Create an API route to get the artifact for a specific run: `app/api/projects/[projectId]/specs/latest/route.ts` per D.3.
7. Update `components/editor/ai-sidebar.tsx` per D.4 to implement the Spec tab UI, fetch comments, use the `react-markdown` renderer, and track the submitted Trigger.dev run.
8. Run the **Checks** block in Section I top to bottom.
9. Fix any in-scope failure and re-run the failing check.
10. Report PASS or FAIL per Section J.

Do not modify `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/db.ts`, `lib/server/auth.ts`, `actions/*`, or `components/editor/canvas/*`.

## C. Context and Dependencies

- **Prerequisites:** SPEC-001 complete and verified.
- **Contract introduced:** The `/api/ai/spec` trigger route, the `/api/projects/[projectId]/specs/[artifactId]` read route, the `/api/projects/[projectId]/specs/latest` run-scoped lookup route, and the Markdown renderer.
- **Contract consumed:** `generateSpecTask`, `requireProjectAccess`, `useThreads` (Liveblocks).
- **Approved decisions:**
  - **Comments:** The client must fetch comments using Liveblocks `useThreads`, extract the text from each comment, and pass them as a string array to the `/api/ai/spec` route.
  - **Run tracking:** The trigger route returns the Trigger.dev `runId` and public access token. The client tracks that exact run with the existing `useRealtimeRun` hook and failed-status handling used by graph generation. The task stores its run ID on the created `Artifact`; the latest lookup route requires the submitted `runId` and returns only its artifact, never an unrelated latest artifact.
  - **Markdown Rendering:** Use `react-markdown` with `remark-gfm`. Wrap it in a Tailwind-styled `div`.
  - **Download:** The download button points to the read route with `?download=true`, which sets the `Content-Disposition` header.

## D. Implementation Requirements

### 1. Create `app/api/ai/spec/route.ts` (Trigger)

START OF route.ts snippet
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { tasks } from "@trigger.dev/sdk";
import { generateSpecTask } from "@/trigger/generate-spec";
import { requireProjectAccess } from "@/lib/server/auth";

    export async function POST(req: Request) {
      try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { projectId, comments } = await req.json();
        await requireProjectAccess(projectId);

        const handle = await tasks.trigger<typeof generateSpecTask>("generate-spec", {
          projectId,
          comments,
        });

        return NextResponse.json({
          success: true,
          runId: handle.id,
          accessToken: handle.publicAccessToken,
        });
      } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

END OF route.ts snippet

### 2. Create `app/api/projects/[projectId]/specs/[artifactId]/route.ts` (Read/Download)

START OF route.ts snippet
import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { AccessError, requireProjectAccess } from "@/lib/server/auth";

    export async function GET(req: Request, { params }: { params: Promise<{ projectId: string; artifactId: string }> }) {
      try {
        const { projectId, artifactId } = await params;
        await requireProjectAccess(projectId);

        const artifact = await prisma.artifact.findUnique({
          where: { id: artifactId },
        });

        if (!artifact || artifact.projectId !== projectId || artifact.type !== "SPEC") {
          return NextResponse.json({ error: "Spec not found" }, { status: 404 });
        }

        const blob = await get(artifact.blobPath, { access: "private" });
        if (!blob || blob.statusCode !== 200) {
          return NextResponse.json({ error: "Failed to fetch blob" }, { status: 500 });
        }

        const markdown = await new Response(blob.stream).text();
        const { searchParams } = new URL(req.url);
        const isDownload = searchParams.get("download") === "true";

        return new Response(markdown, {
          headers: {
            "Content-Type": "text/markdown",
            ...(isDownload ? { "Content-Disposition": `attachment; filename="spec-${projectId}.md"` } : {}),
          },
        });
      } catch (error) {
        if (error instanceof AccessError) {
          const status = error.code === "UNAUTHORIZED" ? 401 : error.code === "FORBIDDEN" ? 403 : 404;
          return NextResponse.json({ error: error.message }, { status });
        }
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Unable to load spec" },
          { status: 500 },
        );
      }
    }

END OF route.ts snippet

### 3. Create `app/api/projects/[projectId]/specs/latest/route.ts` (Run-scoped lookup)

The authenticated `GET` handler must require a non-empty `runId` query parameter and query `Artifact` by `{ projectId, type: "SPEC", runId }`. Return `{ artifactId: null }` when that run has not created an artifact yet, otherwise return only that matching artifact's ID. `Artifact.runId` is added by SPEC-001 and is nullable/unique to preserve existing artifacts.

### 4. Update `components/editor/ai-sidebar.tsx` (Spec Tab UI)

Implement the "Spec" tab inside the `<TabsContent value="spec">`.

- **Imports:** `useThreads` from `@liveblocks/react`, `ReactMarkdown` from `react-markdown`, `remarkGfm` from `remark-gfm`.
- **State:** `specStatus` ('idle' | 'generating' | 'success' | 'error'), `markdown` (string), `errorMsg` (string).
- **Generate Function:**
  1. Use `useThreads()` to get current threads. Extract all comments into a flat array of strings.
  2. Set `specStatus` to 'generating'.
  3. POST to `/api/ai/spec` with `{ projectId, comments }`.
  4. Store the returned `runId` and access token, then observe that run with `useRealtimeRun` as in the graph-generation tab.
  5. Poll `/api/projects/[projectId]/specs/latest?runId=[runId]` every 3 seconds. If it returns an `artifactId`, clear the interval, fetch that artifact's Markdown, and set `specStatus` to 'success'.
  6. If no artifact is returned, keep polling while the run is active. If the run reports a failed status or `realtimeError`, show its error and stop polling. Reuse the graph-generation failed statuses (`CANCELED`, `CRASHED`, `EXPIRED`, `FAILED`, `SYSTEM_FAILURE`, `TIMED_OUT`); `TIMED_OUT` is the run timeout signal. Clear the interval on terminal status and component unmount. If a run reports `COMPLETED` without its artifact, show an error instead of polling forever.
- **UI Layout:**
  - **Idle:** Show a "Generate Specification" button.
  - **Generating:** Show a spinner and "Analyzing canvas and comments...".
  - **Success:** Render `<ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>` inside a `div` with `className="prose prose-invert prose-sm max-w-none text-text-primary"`. Add a `Download` button linking to `/api/projects/[projectId]/specs/[artifactId]?download=true`.
  - **Error:** Show a red error message and a "Try Again" button.

## E. Integration Contracts

- **Contract introduced:** The trigger, artifact-read, and run-scoped artifact lookup API routes.
- **Contract consumed:** `useThreads`, `generateSpecTask`.

## F. Scope Limits

Do not modify `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/db.ts`, `lib/server/auth.ts`, `actions/*`, or `components/editor/canvas/*`.

## G. Protected Behavior and Compatibility

- SPEC-001 gate still passes.
- The canvas and layout must remain untouched.

## H. Acceptance Criteria

1. All three API routes exist.
2. The Spec tab fetches comments from Liveblocks and passes them to the task.
3. The Spec tab polls for the submitted run's artifact, handles run failures/timeouts and unmount cleanup, and renders only that run's artifact.
4. The download button works.
5. All Checks pass.

## I. Checks

Check 1 — Routes exist. Run `ls app/api/ai/spec/route.ts app/api/projects/\[projectId\]/specs/\[artifactId\]/route.ts app/api/projects/\[projectId\]/specs/latest/route.ts`. Pass if all three are listed.
Check 2 — UI updated. Run `grep -c "useThreads" components/editor/ai-sidebar.tsx` and `grep -c "ReactMarkdown" components/editor/ai-sidebar.tsx`. Each count must be at least 1.
Check 3 — Packages installed. Run `npm ls react-markdown remark-gfm`. Pass if both are listed.
Check 4 — Build, typecheck, lint. Run `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack`.

## J. Report

Status: `PASS` or `FAIL`.

If PASS, report:

- One-line result per check.
- Confirmation that comments are being extracted and passed to the API.
- Note that manual browser verification (generating a spec, previewing it, downloading it) is required by the user.
- Closing line: "SPEC-002 complete. Awaiting EXPORT-001."
