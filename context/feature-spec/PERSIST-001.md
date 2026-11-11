# PERSIST-001 — Autosave and Manual Save

## A. Identity and Objective

- **Feature ID:** PERSIST-001
- **Title:** Autosave and Manual Save
- **Primary objective:** Persist the collaborative canvas state to the database and Vercel Blob so users can close their browsers and return later. Implement debounced autosave (3 seconds after changes stop, forced every 60 seconds if dirty) and a manual save button.
- **Expected outcome:** When a user modifies the canvas, an autosave is triggered. The canvas JSON is uploaded to Vercel Blob, a `CanvasSnapshot` row is created in Postgres, and a manual "Save" button in the navbar triggers the same logic immediately. Only the 5 most recent snapshots are kept per project.
- **References:** `planning/feature-map.md` PERSIST-001; `context/architecture.md` Storage Model, Invariant #4, Invariant #6; `context/code-standards.md` Data and Storage, API Routes; `AGENTS.md`.

## B. Execution Contract

The agent must do all of the following without asking the user for confirmation, in this order:

1. Read `AGENTS.md`, `context/architecture.md` (Storage Model, Invariants #4 and #6), `context/code-standards.md` (Data and Storage, API Routes).
2. Confirm AI-003 is in place: the canvas works, AI generation works, and `CanvasSnapshot` exists in Prisma.
3. **Stop and ask the user to verify that `BLOB_READ_WRITE_TOKEN` is set in `.env.local`, the Trigger.dev dashboard, and the Next.js deployment environment(s) that run the save route.** Wait for confirmation. Never ask the user to share the token value in chat.
4. Create the API Route `app/api/projects/[projectId]/save/route.ts` per D.1.
5. Create `hooks/use-autosave.ts` per D.2 to handle the debounce and forced-save logic.
6. Create `components/editor/save-button.tsx` per D.3 to handle the manual save UI.
7. Update `components/editor/editor-shell.tsx` and `components/editor/editor-navbar.tsx` to integrate the autosave hook and the save button per D.4.
8. Run the **Checks** block in Section I top to bottom.
9. Fix any in-scope failure and re-run the failing check.
10. Report PASS or FAIL per Section J. On PASS, state the agent has stopped and is awaiting the next feature. On FAIL, state the exact blocker and stop.

Do not modify `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/db.ts`, `lib/server/auth.ts`, `actions/*`, or the canvas node/edge shapes.

## C. Context and Dependencies

- **Prerequisites:** AI-003 complete and verified.
- **Contract introduced:** The `/api/projects/[projectId]/save` endpoint and the `useAutosave` hook.
- **Contract consumed:** `useMutation` / Liveblocks Storage (to get the current canvas state), `requireProjectAccess` (for authorization), `@vercel/blob` (for uploading).
- **Approved decisions:**
  - **Invariant #6:** Liveblocks Storage is the live source. We are saving a _snapshot_ of it to Blob/Postgres. We are not modifying the Liveblocks storage directly from Postgres.
  - **Save Logic:** The client sends the current `nodes` and `edges` to the API route. The route uploads this JSON to Vercel Blob under `canvas-json/{projectId}/{uuid}.json`, then inserts a `CanvasSnapshot` row with the `blobPath`.
  - **Unique Blob paths:** Generate each filename with `crypto.randomUUID()` (or an equivalent cryptographically random suffix) and keep `addRandomSuffix: false`, so the SDK does not alter the selected unique path.
  - **Project-scoped save coordination and deduplication:** Add a monotonically incremented `snapshotSequence` to `Project`, plus `sequence` and a SHA-256 `contentHash` to `CanvasSnapshot`. Use unique constraints on `(projectId, sequence)` and `(projectId, contentHash)`. Within a database transaction, acquire a lock on the project row before checking the hash or assigning a sequence; serialize the canonical JSON payload consistently before hashing. If that project already has the hash, return the existing snapshot instead of uploading or creating another history entry. Otherwise increment the sequence, upload the Blob, and create its row while holding the lock. This coordinates all clients and server instances, not just one hook's local ref. Order snapshots by `sequence`, not upload completion time.
  - **Pruning:** After inserting a new snapshot, find rows older than the 5 most recent by `sequence`. Delete their Blob objects first, then delete their rows. If Blob deletion fails, retain the rows and paths so a later save can retry cleanup.
  - **Autosave Timing:** Debounce 3000ms after the last change. A forced save triggers every 60,000ms if changes occurred since the last save.
  - **Manual Save:** The button in the navbar triggers the save immediately, bypassing the debounce timer.

## D. Implementation Requirements

### 1. Create `app/api/projects/[projectId]/save/route.ts`

Create a Route Handler that validates the payload, uploads to Blob, and manages the Postgres rows.

START OF route.ts snippet

    import { NextResponse } from "next/server";
    import { put, del } from "@vercel/blob";
    import { prisma } from "@/lib/db";
    import { requireProjectAccess } from "@/lib/server/auth";
    import { z } from "zod";

    const SaveSchema = z.object({
      nodes: z.array(z.any()), // Relaxed for performance, canvas shapes are validated on insert
      edges: z.array(z.any()),
    });

    export async function POST(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
      try {
        const { projectId } = await params;
        await requireProjectAccess(projectId);

        const body = await req.json();
        const parsed = SaveSchema.safeParse(body);
        if (!parsed.success) return NextResponse.json({ error: "Invalid canvas data" }, { status: 400 });

        // 1. Upload to Vercel Blob
        const filename = `canvas-json/${projectId}/${crypto.randomUUID()}.json`;
        const blob = await put(filename, JSON.stringify(parsed.data), {
          access: "private",
          addRandomSuffix: false,
        });

        // 2. Insert Snapshot record
        const snapshot = await prisma.canvasSnapshot.create({
          data: { projectId, blobPath: blob.url },
        });

        // 3. Prune old snapshots (keep 5 most recent)
        const oldSnapshots = await prisma.canvasSnapshot.findMany({
          where: { projectId },
          orderBy: { sequence: "desc" },
          skip: 5,
        });

        if (oldSnapshots.length > 0) {
          await del(oldSnapshots.map(s => s.blobPath));
          await prisma.canvasSnapshot.deleteMany({
            where: { id: { in: oldSnapshots.map(s => s.id) } },
          });
        }

        return NextResponse.json({ success: true, snapshotId: snapshot.id });
      } catch (error: any) {
        console.error("Save error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

END OF route.ts snippet

Before implementation, add these fields and constraints to Prisma and create a migration: `Project.snapshotSequence Int @default(0)`; `CanvasSnapshot.sequence Int`; `CanvasSnapshot.contentHash String?`; unique constraints on `(projectId, sequence)` and `(projectId, contentHash)`. Backfill existing snapshot sequences deterministically per project (by `createdAt`, then `id`) and initialize each project's counter to its maximum sequence. Existing rows may retain a null hash; all new rows must store the canonical payload's SHA-256 hash.

The save handler must acquire the project-scoped database lock before deduplication, sequence assignment, upload, snapshot insertion, and pruning. Hold the lock through completion so two saves for one project cannot finish out of order. Check for an existing content hash while holding the lock; if found, return its existing snapshot and create no duplicate. Otherwise allocate the next sequence, upload to the UUID path, and create the row. When pruning, call `del` for the old Blob paths before `prisma.canvasSnapshot.deleteMany`; only remove their database rows after Blob deletion succeeds. If deletion fails, log/report the failure and retain those rows and paths so a later save can retry cleanup. Do not silently drop cleanup records.

### 2. Create `hooks/use-autosave.ts`

Create a client-side hook that watches the Liveblocks state and triggers the API route.

- It should use `useStorage` (from `@liveblocks/react`) to watch the `nodes` and `edges`.
- Use a `useRef` to track the previous stringified state to prevent unnecessary saves.
- Treat the local ref as an optimization only. The save route must enforce project-scoped content-hash deduplication under the project lock, so separate collaborators saving identical canvas state do not create duplicate snapshot history entries.
- Use `setTimeout` for the 3000ms debounce. Clear the timeout on every new change.
- Use a `setInterval` for the 60000ms forced save. Check a `isDirty` ref before saving.
- Return a `save` function that the manual button can call.

### 3. Create `components/editor/save-button.tsx`

Create a button component for the navbar.

- It takes a `save` function and an `isSaving` boolean.
- It renders a `<Button variant="ghost">` with a `Save` icon from Lucide.
- When clicked, it calls `save()`.
- While saving, show a spinner or "Saving..." text.

### 4. Integrate into `editor-shell.tsx` and `editor-navbar.tsx`

- In `EditorShell`, call `useAutosave(projectId)`.
- Pass the `save` function and `isSaving` state to `EditorNavbar`.
- In `EditorNavbar`, render the `<SaveButton>` in the right section, near the user avatar.

## E. Integration Contracts

- **Contract introduced:** The `/api/projects/[projectId]/save` endpoint, the `useAutosave` hook, and the `SaveButton`.
- **Contract consumed:** Liveblocks Storage, Vercel Blob, Prisma `CanvasSnapshot`.

## F. Scope Limits

Do not:

- Implement the snapshot restore feature (PERSIST-002).
- Load the snapshot into Liveblocks on page load. (This is a complex rehydration issue that we will handle in PERSIST-002 or a future unit, since currently Liveblocks starts empty for a new session).
- Add a toast notification library. Just use the button state.

## G. Protected Behavior and Compatibility

- AI-003 gate still passes.
- The canvas layout and drag-and-drop logic must not be altered.
- `components/ui/*` unchanged.

## H. Acceptance Criteria

1. `/api/projects/[projectId]/save` exists and correctly uploads to Blob and Prisma.
2. Pruning logic keeps exactly 5 snapshots.
3. `useAutosave` debounces at 3 seconds and forces at 60 seconds.
4. The navbar Save button triggers an immediate save.
5. All Checks pass.

## I. Checks

Check 1 — Route exists. Run `ls app/api/projects/\[projectId\]/save/route.ts`. Pass if listed. Run `grep -c "@vercel/blob" app/api/projects/\[projectId\]/save/route.ts`. Pass if count > 0.

Check 2 — Hook exists. Run `ls hooks/use-autosave.ts`. Pass if listed. Run `grep -c "setTimeout" hooks/use-autosave.ts`. Pass if count > 0.

Check 3 — Save button wired. Run `grep -c "SaveButton" components/editor/editor-navbar.tsx`. Pass if count > 0.

Check 4 — Build, typecheck, lint. Run `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack`.

## J. Report

Status: `PASS` or `FAIL`.

If PASS, report:

- Confirmation that the blob token was present.
- One-line result per check.
- Note that manual browser verification (moving a node, waiting 3 seconds, then checking the Vercel Blob dashboard and Neon `CanvasSnapshot` table) is required by the user.
- Closing line: "PERSIST-001 complete. Awaiting the next feature specification."
