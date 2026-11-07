# PROJ-004 — Editor Route Access Check

## A. Identity and Objective

- **Feature ID:** PROJ-004
- **Title:** Editor Route Access Check
- **Primary objective:** Create `app/editor/[projectid]/page.tsx` as a Server Component that awaits the route params, verifies the signed-in user is the project owner or a collaborator via `requireProjectAccess`, and renders the editor shell. Unauthorized or missing projects return a 404.
- **Expected outcome:** Clicking a project from the sidebar navigates to `/editor/[projectid]` and renders the editor shell with the navbar and sidebar. A user who is neither owner nor collaborator gets a 404. A signed-out user is redirected to sign-in by `proxy.ts`.
- **References:** `planning/feature-map.md` PROJ-004; `context/architecture.md` Auth and Access Model, Invariant #1; `context/code-standards.md` Next.js; `AGENTS.md`.

## B. Execution Contract

The agent must do all of the following without asking the user for confirmation, in this order:

1. Read `AGENTS.md`, `context/architecture.md` (Auth and Access Model, Invariant #1), `context/code-standards.md` (Next.js).
2. Confirm PROJ-003 is in place: `lib/server/projects.ts` exists, the sidebar links to `/editor/[id]`, and `EditorShell` accepts `ownedProjects` and `sharedProjects`.
3. Create `app/editor/[projectid]/page.tsx` per D.1.
4. Run the **Checks** block in Section I top to bottom.
5. Fix any in-scope failure and re-run the failing check.
6. Report PASS or FAIL per Section J. On PASS, state the agent has stopped and is awaiting the next feature. On FAIL, state the exact blocker and stop.

Do not modify `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/db.ts`, `lib/server/auth.ts`, `lib/server/projects.ts`, `actions/*`, or `components/editor/*`.

## C. Context and Dependencies

- **Prerequisites:** PROJ-003 complete and verified.
- **Contract consumed:** `requireProjectAccess(projectId)` from `lib/server/auth.ts`. Returns `{ role, userId, projectId }` or throws `Error('Unauthorized' | 'Not found' | 'Forbidden')`.
- **Approved decisions:**
  - `params` is a Promise in Next.js 16 and must be awaited .
  - `noUncheckedIndexedAccess` is enabled, so `projectid` is `string | undefined` after awaiting. The page must guard against `undefined` before calling `requireProjectAccess`.
  - Access failure returns 404 via `notFound()`, not a redirect. This avoids leaking whether a project exists to a user who cannot see it.
  - The page is a Server Component. It does not use `'use client'`. The editor shell it renders is a client component, which is correct.
  - Subsequent units expanded the authorized project route: CANVAS-001 mounted the canvas, and the route integration loads owned/shared projects and the current project name for the editor shell.

## D. Implementation Requirements

### 1. `app/editor/[projectid]/page.tsx`

Create a Server Component with:

- Imports: `notFound` from `next/navigation`, `requireProjectAccess` from `@/lib/server/auth`, `EditorShell` from `@/components/editor/editor-shell`.
- `export default async function EditorProjectPage({ params }: { params: Promise<{ projectid: string }> })`:
  - `const { projectid } = await params`.
  - If `!projectid`, call `notFound()`.
  - `try { await requireProjectAccess(projectid) } catch { notFound() }`.
  - After the access check, require the signed-in user, load their owned and shared projects, and find the current project in those lists. Call `notFound()` if the project is not present.
  - Render `<EditorShell>` with the project lists, current project ID, and name; render `<Canvas />` as its child. The shell's navbar shows the project name and a "Back to projects" link to `/editor`.
  - Do not render the home content from UI-005 here; this route is a different screen.

### 2. Do not change the editor home

`app/editor/page.tsx` from UI-005 and PROJ-003 stays as-is. The new route is a sibling: `/editor` is the home, `/editor/[projectid]` is a specific project. They render different content.

### 3. Canvas integration added by a follow-up unit

CANVAS-001 replaced the placeholder with the React Flow canvas. The route composes `<Canvas />` inside `<EditorShell>` after its project access and list queries.

### 4. Loading and error handling

The route wraps its asynchronous work in a Suspense boundary with a "Loading project..." fallback. Retain that fallback; no route-specific error boundary is required.

## E. Integration Contracts

- **Contract consumed:** `requireProjectAccess`, `listOwnedProjects`, `listSharedProjects`, `EditorShell`, and `Canvas`.
- **Contract noted:** the route `/editor/[projectid]` composes `Canvas` inside `EditorShell`; the canvas includes the toolbar and the shell includes the AI sidebar. Later units may extend those surfaces without changing the route's auth gate.

## F. Scope Limits

Do not:

- Modify `lib/server/auth.ts`, `lib/server/projects.ts`, `actions/*`, `components/editor/*`, `components/ui/*`, `app/globals.css`, `context/*`, `planning/*`, or `AGENTS.md`.
- Create `app/loading.tsx` or `app/error.tsx`. They are handled elsewhere.

## G. Protected Behavior and Compatibility

- AUTH-001 through AUTH-004, PROJ-001 through PROJ-003 gates still pass.
- Clicking a project link from the sidebar now navigates to a real page instead of 404ing.
- The editor home at `/editor` still renders the home content.
- `components/ui/*` unchanged.

## H. Acceptance Criteria

1. `app/editor/[projectid]/page.tsx` exists and is a Server Component (no `'use client'`).
2. It awaits `params` before using `projectid`.
3. It guards against `undefined` `projectid` with `notFound()`.
4. It calls `requireProjectAccess(projectid)` and calls `notFound()` on failure.
5. After authorization, it loads the owned/shared project lists and current project name, then renders `<EditorShell>` with `<Canvas />`.
6. On a project page, the editor navbar links back to `/editor`.
7. An owner or editor who navigates to `/editor/[their-project]` sees the shell.
8. A user who is not the owner or a collaborator gets a 404.
9. A signed-out user is redirected to `/sign-in` by `proxy.ts` before the page runs.
10. All Checks pass.
11. Agent reports PASS and stops.

## I. Checks

Check 1 — File exists. Run `ls app/editor/\[projectid\]/page.tsx`. Pass if listed.

Check 2 — Awaits params. Run `grep -c "await params" app/editor/\[projectid\]/page.tsx`. Pass if count is 1.

Check 3 — Guards undefined. Run `grep -c "!projectid" app/editor/\[projectid\]/page.tsx`. Pass if count is at least 1.

Check 4 — Access check present. Run `grep -c "requireProjectAccess" app/editor/\[projectid\]/page.tsx` and `grep -c "notFound" app/editor/\[projectid\]/page.tsx`. Each count must be at least 1.

Check 5 — Server Component. Run `grep -c "'use client'" app/editor/\[projectid\]/page.tsx`. Pass if count is 0.

Check 6 — Renders the shell. Run `grep -c "EditorShell" app/editor/\[projectid\]/page.tsx`. Pass if count is at least 1.

Check 7 — No hardcoded hex. Run `grep -cE "#[0-9a-fA-F]{3,8}" app/editor/\[projectid\]/page.tsx`. Pass if count is 0.

Check 8 — Build, typecheck, lint. Run `npm run build`, `npx tsc --noEmit`, `npm run lint`. If build fails with the Turbopack nvm shim issue, run `npx next build --webpack` and note the workaround.

Check 9 — Behavior test. If a signed-in session is available, navigate to `/editor/[a project you own]` and confirm the shell renders; navigate to `/editor/[a project you do not own or collaborate on]` and confirm 404; navigate to `/editor/[nonexistent]` and confirm 404. If a browser session is unavailable, use a temporary `tsx` script that imports `requireProjectAccess` with fixed user IDs against seeded rows and reports the three outcomes. Delete the script and seeded rows after. The report states which path was used.

Check 10 — Cleanup. Remove any seeded rows and temporary scripts. Confirm no test rows remain.

Check 11 — No out-of-scope packages. Run `npm ls @trigger.dev/sdk @liveblocks/client @vercel/blob reactflow`. Pass if all are absent or empty. `reactflow` is installed in CANVAS-001, not here.

## J. Report

Status: `PASS` or `FAIL`.

If PASS, report:

- One-line result per check.
- Which behavior test path was used (browser or `tsx` script).
- Confirmation that `/editor/[projectid]` renders the shell for owner/editor and 404s for others.
- Confirmation that `lib/db.ts`, `lib/server/auth.ts`, `lib/server/projects.ts`, `actions/*`, `components/editor/*`, `components/ui/*`, `app/globals.css`, `context/*`, `planning/*`, and `AGENTS.md` are unchanged.
- Note that the route renders the canvas and loads the user's projects and current project name before composing the editor shell.
- Closing line: "PROJ-004 complete. Awaiting the next feature specification."

If FAIL, report which check failed, the exact error, and whether the cause is in scope (fixed) or out of scope (reported). Closing line: "Blocked, awaiting user direction."
