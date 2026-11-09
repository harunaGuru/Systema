# COLLAB-002 — Presence (Cursors and Avatars)

## A. Identity and Objective

- **Feature ID:** COLLAB-002
- **Title:** Presence (Cursors and Avatars)
- **Primary objective:** Show live cursors of other collaborators on the canvas and a stack of their avatars in the top navbar.
- **Expected outcome:** When two users are in the same project, moving the mouse on the canvas in one session shows a colored cursor with the user's name in the other session. The navbar shows a list of avatars for everyone currently in the room.
- **References:** `planning/feature-map.md` COLLAB-002; `context/ui-context.md` Layout Patterns, Interaction States; `context/architecture.md` Auth and Access Model; `context/code-standards.md` Next.js; `AGENTS.md`.

## B. Execution Contract

The agent must do all of the following without asking the user for confirmation, in this order:

1. Read `AGENTS.md`, `context/ui-context.md` (Layout Patterns, Interaction States), `context/architecture.md` (Auth and Access Model), `context/code-standards.md` (Next.js).
2. Confirm COLLAB-001 is in place: `components/editor/canvas/liveblocks-room.tsx` exists, `liveblocks.config.ts` defines `UserMeta`, and `canvas.tsx` uses `useLiveblocksFlow`.
3. Update `liveblocks.config.ts` per D.1 to ensure the presence type supports the required fields.
4. Update `app/api/liveblocks-auth/route.ts` per D.2 to pass real user information (name) to Liveblocks.
5. Create `components/editor/canvas/live-cursors.tsx` per D.3.
6. Create `components/editor/navbar-presence.tsx` per D.4.
7. Update `components/editor/canvas/canvas.tsx` to render `<LiveCursors />` per D.5.
8. Update `components/editor/editor-navbar.tsx` to render `<NavbarPresence />` per D.6.
9. Run the **Checks** block in Section I top to bottom.
10. Fix any in-scope failure and re-run the failing check.
11. Report PASS or FAIL per Section J. On PASS, state the agent has stopped and is awaiting the next feature. On FAIL, state the exact blocker and stop.

Do not modify `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/db.ts`, `lib/server/auth.ts`, `actions/*`, `components/editor/project-sidebar.tsx`, `components/editor/canvas/shape-toolbar.tsx`, `components/editor/canvas/color-palette.tsx`, or `components/editor/canvas/edge.tsx`.

## C. Context and Dependencies

- **Prerequisites:** COLLAB-001 complete and verified.
- **Contract introduced:** `LiveCursors` and `NavbarPresence` components.
- **Contract consumed:** Liveblocks presence state, the AUTH-003 endpoint (now passing user info).
- **Approved decisions:**
  - The Liveblocks auth endpoint (AUTH-003) currently passes only the Clerk user ID as `userInfo`. It must be updated to pass the user's name so cursors and avatars can display something human-readable.
  - Use a custom cursor component based on `useOthers` and `useReactFlow`. The `LiveblocksProvider` in COLLAB-001 does not configure `resolveUsers`, so do not use the official `Cursors` component or rely on `useUser`.
  - Avatars use the shadcn `Avatar` primitive (which the agent must install if not present) or a simple circular `div` with initials.
  - The free plan allows up to 10 simultaneous connections, so the avatar stack will never exceed 10 items .

## D. Implementation Requirements

### 1. Update `liveblocks.config.ts`

The `UserMeta` type should already be defined from COLLAB-001. Ensure it includes `info: { name: string }`.

The `Presence` type should include `cursor: { x: number; y: number } | null`.

### 2. Update `app/api/liveblocks-auth/route.ts`

The endpoint currently creates a session using the Clerk `userId`. Change it to fetch the user's full name from Clerk and pass it in `userInfo`:

- Import `clerkClient` from `@clerk/nextjs/server`.
- After `const { userId } = await auth()`, obtain the Clerk client and fetch the user: `const clerk = await clerkClient(); const user = await clerk.users.getUser(userId)`.
- Use `user.firstName` and `user.lastName` to build a display name (fallback to `userId` if both are null).
- Pass `userInfo: { name: displayName }` to `liveblocks.prepareSession(userId, { userInfo: { name: displayName } })`.

Do not change the access control logic. Only add the user info.

### 3. `components/editor/canvas/live-cursors.tsx`

A client component (`"use client"`).

Implement a custom cursor overlay using `useOthers` from `@liveblocks/react` and `useReactFlow` from `@xyflow/react`. For each other connection, read its cursor from `other.presence.cursor` and its label from `other.info.name`; COLLAB-002's auth endpoint supplies that name through `prepareSession(..., { userInfo })`. Convert the cursor's flow coordinates to screen coordinates with `flowToScreenPosition`.

Use a simple SVG cursor icon and a name label. Do not call `useUser` or depend on `resolveUsers`: the existing `LiveblocksProvider` configures only `authEndpoint`, while authenticated connection info is available on each `other.info`.

### 4. `components/editor/navbar-presence.tsx`

A client component.

Imports: `"use client"`, `useOthers` from `@liveblocks/react`.

Render a horizontal stack of circular avatars:

- `const others = useOthers()`.
- If `others.length === 0`, render nothing.
- Render `<div className="flex -space-x-2">` containing up to 5 avatars.
- Each avatar is a `<div>` with `className="h-8 w-8 rounded-full bg-bg-elevated border-2 border-bg-base flex items-center justify-center text-xs text-text-primary uppercase"`. Inside, show the first letter of the user's name (`other.info.name?.charAt(0) ?? '?'`).
- If there are more than 5 users, show a "+N" badge at the end.

The avatars do not need to be clickable in this unit.

### 5. Update `components/editor/canvas/canvas.tsx`

Import `LiveCursors` and render it inside the React Flow wrapper, typically as an absolute-positioned overlay:

START OF canvas.tsx snippet

    <div className="relative w-full h-full">
      <ReactFlow ...>
        {/* existing children */}
        <LiveCursors />
      </ReactFlow>
    </div>

END OF canvas.tsx snippet

### 6. Update `components/editor/editor-navbar.tsx`

Import `NavbarPresence` and render it in the center section of the navbar (which was previously empty) or next to the user avatar. The `NavbarPresence` component must be wrapped in a component that only renders when inside a Liveblocks room. Since `EditorNavbar` is currently used outside the room (on the home screen), you need to either:

- Only render `NavbarPresence` when the `RoomProvider` context exists (using a try/catch or a custom hook).
- Or, render it conditionally on the editor route. The simplest approach is to use Liveblocks' `<LiveblocksRoom>` context, but the navbar is outside the canvas.
- **Alternative approach:** Move `NavbarPresence` into the `EditorShell` if the shell is rendered inside the room. Currently, `EditorShell` wraps the canvas, so it is outside the room.
- **Recommended fix:** For now, place `NavbarPresence` inside the `Canvas` component's floating UI (top-right corner) instead of the navbar. The spec allows this as a fallback if the navbar is not inside the room context. If the agent can easily move the RoomProvider higher up to wrap the EditorShell, it may do so, but it must not break the home screen.

## E. Integration Contracts

- **Contract introduced:** `LiveCursors` and `NavbarPresence`.
- **Contract consumed:** `UserMeta` (with name), Liveblocks `useOthers`, and React Flow's `flowToScreenPosition`.

## F. Scope Limits

Do not:

- Add comments (COLLAB-003).
- Add snapshot rehydration (PERSIST-001).
- Modify `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/db.ts`, `lib/server/auth.ts`, `actions/*`, `components/editor/project-sidebar.tsx`, `components/editor/canvas/shape-toolbar.tsx`, `components/editor/canvas/color-palette.tsx`, or `components/editor/canvas/edge.tsx`.
- Change the access control logic in `app/api/liveblocks-auth/route.ts`.

## G. Protected Behavior and Compatibility

- COLLAB-001 gate still passes: nodes and edges sync across sessions.
- CANVAS-001 through CANVAS-005 gates still pass.
- `components/ui/*` unchanged.

## H. Acceptance Criteria

1. `app/api/liveblocks-auth/route.ts` passes the user's name to Liveblocks.
2. `LiveCursors` renders cursors for other users when they move their mouse.
3. `NavbarPresence` (or a floating equivalent) shows avatars for other users in the room.
4. The room connection limit (10) is respected.
5. All Checks pass.
6. Agent reports PASS and stops.

## I. Checks

Check 1 — Auth endpoint updated. Run `grep -c "clerkClient" app/api/liveblocks-auth/route.ts` and `grep -c "userInfo" app/api/liveblocks-auth/route.ts`. Each count must be at least 1.

Check 2 — Cursor component exists. Run `ls components/editor/canvas/live-cursors.tsx`. Pass if listed. Run `grep -c "Cursors" components/editor/canvas/live-cursors.tsx` (if the official component is used) or `grep -c "useOthers"` (if custom).

Check 3 — Presence component exists. Run `ls components/editor/navbar-presence.tsx`. Pass if listed. Run `grep -c "useOthers" components/editor/navbar-presence.tsx`. Pass if count is at least 1.

Check 4 — Components are rendered. Run `grep -c "LiveCursors" components/editor/canvas/canvas.tsx`. Pass if count is at least 1. Run `grep -c "NavbarPresence" components/editor/editor-navbar.tsx` or `grep -c "NavbarPresence" components/editor/canvas/canvas.tsx` (depending on placement). Pass if count is at least 1.

Check 5 — No hardcoded hex. Run `grep -cE "#[0-9a-fA-F]{3,8}" components/editor/canvas/live-cursors.tsx components/editor/navbar-presence.tsx app/api/liveblocks-auth/route.ts`. Pass if each reports 0.

Check 6 — Build, typecheck, lint. Run `npm run build`, `npx tsc --noEmit`, `npm run lint`. If build fails with the Turbopack nvm shim issue, run `npx next build --webpack` and note the workaround.

Check 7 — Behavior test. Open two browser sessions with different users in the same project. Move the mouse in session A; confirm a cursor appears in session B. Confirm an avatar appears in the navbar (or floating UI) for the other user. If a second session is unavailable, report the limitation.

Check 8 — No out-of-scope packages. Run `npm ls @trigger.dev/sdk`. Pass if absent/empty.

## J. Report

Status: `PASS` or `FAIL`.

If PASS, report:

- One-line result per check.
- Confirm that the custom cursor reads each collaborator's `other.info.name` from authenticated connection info, without `useUser` or a `resolveUsers` callback.
- Whether `NavbarPresence` was placed in the navbar or as a floating UI in the canvas (and why).
- Confirmation that the auth endpoint was updated to pass the user's name.
- Confirmation that `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/db.ts`, `lib/server/auth.ts`, `actions/*`, `components/editor/project-sidebar.tsx`, `components/editor/canvas/shape-toolbar.tsx`, `components/editor/canvas/color-palette.tsx`, and `components/editor/canvas/edge.tsx` are unchanged (except the auth endpoint).
- Note that manual two-session verification of cursors and avatars is required by the user.
- Closing line: "COLLAB-002 complete. Awaiting the next feature specification."

If FAIL, report which check failed, the exact error, and whether the cause is in scope (fixed) or out of scope (reported). Closing line: "Blocked, awaiting user direction."
