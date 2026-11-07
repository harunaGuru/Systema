# COLLAB-001 — Liveblocks Room Integration

## A. Identity and Objective

- **Feature ID:** COLLAB-001
- **Title:** Liveblocks Room Integration
- **Primary objective:** Bind the React Flow canvas state to Liveblocks Storage so multiple authenticated users editing the same project see each other's changes in real time, with conflict handling provided by Liveblocks.
- **Expected outcome:** Two browser sessions signed in as different users on the same `/editor/[projectid]` see the same nodes and edges. Adding, moving, editing, or deleting a node in one session appears in the other within a second. Room ID is the `projectId`.
- **References:** `planning/feature-map.md` COLLAB-001; `context/architecture.md` Auth and Access Model, Invariant #3, Invariant #6; `context/ui-context.md` Interaction States; `context/code-standards.md` Next.js; `AGENTS.md`.

## B. Execution Contract

The agent must do all of the following without asking the user for confirmation, in this order:

1. Read `AGENTS.md`, `context/architecture.md` (Invariants #3 and #6), `context/ui-context.md` (Interaction States), `context/code-standards.md` (Next.js).
2. Confirm CANVAS-005 and AUTH-003 are in place: `components/editor/canvas/canvas.tsx` exists, `app/api/liveblocks-auth/route.ts` exists and uses `requireProjectAccess`.
3. Install Liveblocks packages: run `npm install @liveblocks/client @liveblocks/react @liveblocks/react-flow`.
4. Create `liveblocks.config.ts` at the project root per D.1.
5. Create `components/editor/canvas/liveblocks-room.tsx` per D.2.
6. Update `app/editor/[projectid]/page.tsx` to pass `projectid` to the canvas, and update `components/editor/canvas/canvas.tsx` to accept it and wrap its content in the Liveblocks room per D.3.
7. Run the **Checks** block in Section I top to bottom.
8. Fix any in-scope failure and re-run the failing check.
9. Report PASS or FAIL per Section J. On PASS, state the agent has stopped and is awaiting the next feature. On FAIL, state the exact blocker and stop.

Do not modify `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/db.ts`, `lib/server/auth.ts`, `actions/*`, `components/editor/project-sidebar.tsx`, `components/editor/canvas/shape-toolbar.tsx`, `components/editor/canvas/color-palette.tsx`, or `components/editor/canvas/edge.tsx`.

## C. Context and Dependencies

- **Prerequisites:** CANVAS-005 complete and verified; AUTH-003 complete and verified.
- **Contract introduced:** The `useLiveblocksFlow` hook from `@liveblocks/react-flow` is the bridge between React Flow state and Liveblocks Storage. The canvas stops using local `useNodesState`/`useEdgesState` for the collaborative state and uses the Liveblocks-backed state instead.
- **Contract consumed:** `requireProjectAccess` (via the auth endpoint from AUTH-003), `SystemaNodeData`, `nodeTypes`.
- **Approved decisions:**
  - **Room ID = `projectId`**. One room per project. This was decided in the feature map and is consistent with AUTH-003.
  - **Liveblocks Storage is the live collaborative source.** Persisted snapshots (Vercel Blob) are for recovery and spec generation, not for live sync (Invariant #6). This unit does not write to Vercel Blob; PERSIST-001 adds that.
  - **No initial storage from a persisted snapshot in this unit.** The room starts empty. Rehydrating from the latest snapshot on room load is PERSIST-001's responsibility.
  - **Conflict handling is provided by Liveblocks.** Do not add custom merge logic.
  - **User info is minimal.** `liveblocks.config.ts` types `UserMeta` with `id`, `info: { name: string }`. COLLAB-002 (presence) adds avatars and cursors.
  - **The auth endpoint is already built.** Do not modify `app/api/liveblocks-auth/route.ts`.
  - **Free plan limit:** 10 simultaneous connections per room.

## D. Implementation Requirements

### 1. `liveblocks.config.ts`

Create at the project root. It must:

- Declare the global `Liveblocks` interface with:
  - `Presence: { cursor: { x: number; y: number } | null }`.
  - `Storage: { flow?: LiveObject<{ nodes: LiveMap<string, LiveObject<...>>; edges: LiveMap<string, LiveObject<...>> }> }`. The `flow` key is optional because `useLiveblocksFlow` initializes it when it is absent; the hook stores nodes and edges as maps under this key.
  - `UserMeta: { id: string; info: { name: string } }`.
- Export `{}` at the end (the file is a type declaration).

If the installed `@liveblocks/react-flow` version requires a specific `Storage` shape for React Flow, follow its documentation. The hook `useLiveblocksFlow` handles the mapping.

### 2. `components/editor/canvas/liveblocks-room.tsx`

A client component (`"use client"`).

Exports `LiveblocksRoom({ projectId, children }: { projectId: string; children: React.ReactNode })`.

- Import `LiveblocksProvider` and `RoomProvider` from `@liveblocks/react`.
- Import `ClientSideSuspense` from `@liveblocks/react/suspense`.
- Render the following structure. This replaces what would be a nested code block.

START OF liveblocks-room.tsx JSX

    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider id={projectId} initialPresence={{ cursor: null }}>
        <ClientSideSuspense fallback={<div className="flex items-center justify-center h-full text-sm text-text-muted">Loading room…</div>}>
          {children}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>

END OF liveblocks-room.tsx JSX

The `authEndpoint` points at the AUTH-003 route. The `id` is the `projectId`. No `initialStorage` is passed; the room starts empty and PERSIST-001 adds rehydration later.

### 3. Update `components/editor/canvas/canvas.tsx`

The canvas currently owns `nodes` and `edges` with `useNodesState`/`useEdgesState`. Change it to:

- Accept `projectId: string` as a prop.
- Import `useLiveblocksFlow` from `@liveblocks/react-flow`.
- Call `const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useLiveblocksFlow({ suspense: true })` (or the exact signature the installed package provides; check its types).
- Pass these to `<ReactFlow>` instead of the local state.
- Remove the local `useNodesState` and `useEdgesState` imports and calls.
- Remove the `useCallback` for `onConnect` if `useLiveblocksFlow` provides its own.
- Keep the drag-and-drop `onDrop` handler, but replace `setNodes` with the mutation from `useLiveblocksFlow` (or use `useMutation` from `@liveblocks/react` directly if the hook does not expose a setter). The exact API depends on the package version; the agent must read the installed types before writing this.
- Keep `nodeTypes`, `edgeTypes`, `ShapeToolbar`, and the template import UI unchanged.

### 4. Update `app/editor/[projectid]/page.tsx`

Pass `projectId={projectid}` to `<Canvas>`. The page remains a Server Component; it awaits `params`, calls `requireProjectAccess`, and renders `<EditorShell><LiveblocksRoom projectId={projectid}><Canvas projectId={projectid} /></LiveblocksRoom></EditorShell>`.

Alternatively, put `LiveblocksRoom` inside `Canvas` so the page only passes `projectId` to `Canvas`. Either is acceptable; the report states which was chosen.

## E. Integration Contracts

- **Contract introduced:** `useLiveblocksFlow` binds React Flow to Liveblocks Storage. The canvas no longer owns local node/edge state.
- **Contract consumed:** `app/api/liveblocks-auth/route.ts` (AUTH-003), `projectId` from the route params (PROJ-004).
- **Contract noted:** PERSIST-001 will add snapshot rehydration on room load. COLLAB-002 will add presence (cursors, avatars). COLLAB-003 will add comments.

## F. Scope Limits

Do not:

- Add presence, cursors, or avatars (COLLAB-002).
- Add comments (COLLAB-003).
- Add snapshot rehydration or persistence to Vercel Blob (PERSIST-001).
- Modify `app/api/liveblocks-auth/route.ts`.
- Modify `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/db.ts`, `lib/server/auth.ts`, `actions/*`, `components/editor/project-sidebar.tsx`, `components/editor/canvas/shape-toolbar.tsx`, `components/editor/canvas/color-palette.tsx`, or `components/editor/canvas/edge.tsx`.

## G. Protected Behavior and Compatibility

- CANVAS-001 through CANVAS-005 gates still pass: six shapes, inline editing, palette, toolbar, template import.
- AUTH-001 through AUTH-004, PROJ-001 through PROJ-006 gates still pass.
- The editor route still enforces `requireProjectAccess`.
- `components/ui/*` unchanged.

## H. Acceptance Criteria

1. `@liveblocks/client`, `@liveblocks/react`, and `@liveblocks/react-flow` are installed.
2. `liveblocks.config.ts` exists at the root.
3. `LiveblocksRoom` wraps the canvas with `authEndpoint="/api/liveblocks-auth"` and `id={projectId}`.
4. The canvas uses `useLiveblocksFlow` instead of local state.
5. Two sessions on the same project see each other's node/edge changes.
6. Adding, editing, and deleting nodes works across sessions.
7. The room starts empty (no persisted snapshot rehydration in this unit).
8. All Checks pass.
9. Agent reports PASS and stops.

## I. Checks

Check 1 — Packages installed. Run `npm ls @liveblocks/client @liveblocks/react @liveblocks/react-flow`. Pass if each reports a version.

Check 2 — Config exists. Run `ls liveblocks.config.ts`. Pass if listed.

Check 3 — Room provider wired. Run `grep -c "LiveblocksProvider" components/editor/canvas/liveblocks-room.tsx`, `grep -c "RoomProvider" components/editor/canvas/liveblocks-room.tsx`, `grep -c "api/liveblocks-auth" components/editor/canvas/liveblocks-room.tsx`. Each count must be at least 1.

Check 4 — Canvas uses Liveblocks flow. Run `grep -c "useLiveblocksFlow" components/editor/canvas/canvas.tsx`. Pass if count is at least 1. Run `grep -c "useNodesState" components/editor/canvas/canvas.tsx`. Pass if count is 0 (local state removed).

Check 5 — Project ID passed. Run `grep -c "projectId" components/editor/canvas/canvas.tsx` and `grep -c "projectId" app/editor/\[projectid\]/page.tsx`. Each count must be at least 1.

Check 6 — No hardcoded hex. Run `grep -cE "#[0-9a-fA-F]{3,8}" liveblocks.config.ts components/editor/canvas/liveblocks-room.tsx components/editor/canvas/canvas.tsx`. Pass if each reports 0.

Check 7 — Build, typecheck, lint. Run `npm run build`, `npx tsc --noEmit`, `npm run lint`. If build fails with the Turbopack nvm shim issue, run `npx next build --webpack` and note the workaround.

Check 8 — Behavior test. Open two browser sessions (one normal, one incognito) signed in as two users who both have access to the same project. Open `/editor/[projectid]` in both. Add a node in session A; confirm it appears in session B within two seconds. Edit the node name in B; confirm it updates in A. Delete it in A; confirm it disappears in B. If a second session is unavailable, report the limitation.

Check 9 — No out-of-scope packages. Run `npm ls @trigger.dev/sdk`. Pass if absent/empty.

## J. Report

Status: `PASS` or `FAIL`.

If PASS, report:

- `@liveblocks/client`, `@liveblocks/react`, and `@liveblocks/react-flow` versions installed.
- One-line result per check.
- The exact `useLiveblocksFlow` signature used (the installed version's API).
- How the drag-and-drop `onDrop` was adapted to the Liveblocks-backed state (which mutation or setter).
- Confirmation that the room starts empty (no persisted rehydration).
- Confirmation that `app/api/liveblocks-auth/route.ts` was not modified.
- Confirmation that `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/db.ts`, `lib/server/auth.ts`, `actions/*`, `components/editor/project-sidebar.tsx`, `components/editor/canvas/shape-toolbar.tsx`, `components/editor/canvas/color-palette.tsx`, and `components/editor/canvas/edge.tsx` are unchanged.
- Note that manual two-session verification is required by the user. The agent's runtime check can confirm the page renders and the room connects, but it cannot open two sessions.
- Closing line: "COLLAB-001 complete. Awaiting the next feature specification."

If FAIL, report which check failed, the exact error, and whether the cause is in scope (fixed) or out of scope (reported). Closing line: "Blocked, awaiting user direction."
