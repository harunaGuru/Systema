# PERSIST-002 — Recovery Snapshot Restore

## A. Identity and Objective

- **Feature ID:** PERSIST-002
- **Title:** Recovery Snapshot Restore
- **Primary objective:** Add a UI to list the most recent saved snapshots and allow a user to restore the canvas to a previous state. Also, implement the initial rehydration logic so that when a user enters a project for the first time, the canvas loads the latest saved snapshot instead of starting empty.
- **Expected outcome:** When a user opens a project with no active Liveblocks session, the canvas loads the latest saved snapshot. A "History" icon in the navbar opens a dropdown/modal showing up to 5 recent snapshots. Clicking one replaces the Liveblocks canvas state with the snapshot data.
- **References:** `planning/feature-map.md` PERSIST-002; `context/architecture.md` Storage Model, Invariant #6; `context/code-standards.md` API Routes, Data and Storage; `AGENTS.md`.

## B. Execution Contract

The agent must do all of the following without asking the user for confirmation, in this order:

1. Read `AGENTS.md`, `context/architecture.md` (Storage Model), `context/code-standards.md`.
2. Confirm PERSIST-001 is in place: `/api/projects/[projectId]/save` exists, and `CanvasSnapshot` is being written to.
3. Create `app/api/projects/[projectId]/snapshots/route.ts` per D.1 to fetch the snapshot list.
4. Create `app/api/projects/[projectId]/snapshots/[snapshotId]/route.ts` per D.2 to fetch a specific snapshot's JSON.
5. Update `hooks/use-autosave.ts` (or create `hooks/use-rehydrate.ts`) per D.3 to load the latest snapshot into Liveblocks if the room is empty on load.
6. Create `components/editor/snapshot-history.tsx` per D.4 to list and restore snapshots.
7. Update `components/editor/editor-navbar.tsx` to wire the History button to the new component per D.5.
8. Run the **Checks** block in Section I top to bottom.
9. Fix any in-scope failure and re-run the failing check.
10. Report PASS or FAIL per Section J.

Do not modify `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/db.ts`, `lib/server/auth.ts`, `actions/*`, or `components/editor/canvas/*`.

## C. Context and Dependencies

- **Prerequisites:** PERSIST-001 complete and verified.
- **Contract introduced:** Snapshot list/read endpoints and the restore UI.
- **Contract consumed:** `prisma`, `requireProjectAccess`, `@vercel/blob`, Liveblocks `useMutation`.
- **Approved decisions:**
  - **Rehydration (Invariant #6):** When a room is loaded and its storage is empty (e.g., `nodes` array is empty), we must fetch the latest `CanvasSnapshot` from the API and populate the Liveblocks `nodes` and `edges` arrays. This ensures users see their work when they return.
  - **Restore:** Restoring replaces the current Liveblocks `nodes` and `edges` with the snapshot's data. This is a destructive action (undoable only by restoring an older snapshot), so the UI should warn the user.
  - **Blob Access:** Vercel Blob is private. The client cannot fetch the JSON directly from the Blob URL. The API route must proxy the fetch, read the Blob contents, and return the JSON to the client.

## D. Implementation Requirements

### 1. Create `app/api/projects/[projectId]/snapshots/route.ts`

A `GET` handler that returns the list of snapshots (id and createdAt) for the project.

- Call `requireProjectAccess(projectId)`.
- Query `prisma.canvasSnapshot.findMany({ where: { projectId }, orderBy: { createdAt: 'desc' }, take: 5 })`.
- Return `{ snapshots: [{ id, createdAt }] }`. Do not return the blobPath to the client for security.

### 2. Create `app/api/projects/[projectId]/snapshots/[snapshotId]/route.ts`

A `GET` handler that fetches the actual JSON for a specific snapshot.

- Call `requireProjectAccess(projectId)`.
- Find the snapshot: `prisma.canvasSnapshot.findUnique({ where: { id: snapshotId } })`.
- Ensure `snapshot.projectId === projectId` (prevent cross-project access).
- Fetch the Blob: `const response = await fetch(snapshot.blobPath)`.
- Return the JSON from the Blob: `return NextResponse.json(await response.json())`.

### 3. Rehydration Logic (`hooks/use-autosave.ts` or new hook)

We need to load the latest snapshot when a user enters a room and it is empty.

- Use `useStorage` from `@liveblocks/react` to get the current `nodes` and `edges`.
- Use a `useEffect` that runs once when the room loads. If `nodes.length === 0` and `edges.length === 0`, fetch `/api/projects/[projectId]/snapshots`.
- If snapshots exist, take the first one (the most recent), fetch its JSON from `/api/projects/[projectId]/snapshots/[snapshotId]`, and use a Liveblocks `useMutation` to push the nodes and edges into the live storage.
- Use a `useRef` (e.g., `hasAttemptedRehydration`) to ensure this only runs once per session, preventing it from overwriting a user who quickly clears the canvas.

### 4. Create `components/editor/snapshot-history.tsx`

Create a UI component (likely a popover or modal) triggered by the History icon in the navbar.

- On open, fetch the list of snapshots from `/api/projects/[projectId]/snapshots`.
- Display a list of timestamps (e.g., "Oct 24, 10:30 AM").
- Include a "Restore" button for each.
- When "Restore" is clicked:
  - Fetch the snapshot JSON from the API.
  - Use `useMutation` to clear the current `nodes` and `edges` in Liveblocks, and replace them with the snapshot data.
  - Close the UI.

### 5. Update `components/editor/editor-navbar.tsx`

- Replace the disabled History icon with a button that opens the `<SnapshotHistory>` component.
- Ensure the `<SnapshotHistory>` component is rendered inside the `LiveblocksRoom` provider context.

## E. Integration Contracts

- **Contract introduced:** The snapshot list/read endpoints, the rehydration hook, and the `SnapshotHistory` component.
- **Contract consumed:** Liveblocks `useMutation`, Vercel Blob, Prisma.

## F. Scope Limits

Do not:

- Allow deleting snapshots manually (pruning is handled by PERSIST-001).
- Create a full version history page; keep it to a simple popover list.
- Modify `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/db.ts`, `lib/server/auth.ts`, `actions/*`, or `components/editor/canvas/*`.

## G. Protected Behavior and Compatibility

- PERSIST-001 autosave logic must still function. Rehydration should only trigger on an empty room, preventing it from fighting with the autosave hook.

## H. Acceptance Criteria

1. Snapshot list and read endpoints exist and require authorization.
2. The read endpoint correctly proxies the private Vercel Blob JSON.
3. Entering an empty room rehydrates the latest snapshot.
4. The History UI displays the 5 most recent snapshots.
5. Clicking restore overwrites the live canvas with the snapshot.
6. All Checks pass.

## I. Checks

Check 1 — Endpoints exist. Run `ls app/api/projects/\[projectId\]/snapshots/route.ts app/api/projects/\[projectId\]/snapshots/\[snapshotId\]/route.ts`. Pass if both exist.

Check 2 — Rehydration logic. Run `grep -c "hasAttemptedRehydration" hooks/use-autosave.ts`. Pass if count > 0.

Check 3 — History component. Run `ls components/editor/snapshot-history.tsx`. Pass if exists.

Check 4 — Build, typecheck, lint. Run `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack`.

## J. Report

Status: `PASS` or `FAIL`.

If PASS, report:

- One-line result per check.
- Confirmation that the rehydration logic guards against overwriting active sessions.
- Note that manual browser verification (clearing storage, reloading, checking the History menu, and restoring) is required by the user.
- Closing line: "PERSIST-002 complete. Awaiting the next feature specification."
