# PROJ-003 — Project List (Owned / Shared)

## A. Identity and Objective

- **Feature ID:** PROJ-003
- **Title:** Project List (Owned / Shared)
- **Primary objective:** Replace the mock project data in the sidebar with real queries from Postgres. The "My Projects" tab lists projects the signed-in user owns; the "Shared" tab lists projects where they are a collaborator. Each item links to `/editor/[projectid]`.
- **Expected outcome:** A signed-in user sees their owned projects under "My Projects" and their collaborator projects under "Shared". Empty states show when a tab has no projects. Clicking a project navigates to its editor route.
- **References:** `planning/feature-map.md` PROJ-003; `context/architecture.md` Storage Model, Auth and Access Model; `context/code-standards.md` Data and Storage, Next.js; `context/ui-context.md` Layout Patterns; `AGENTS.md`.

## B. Execution Contract

The agent must do all of the following without asking the user for confirmation, in this order:

1. Read `AGENTS.md`, `context/architecture.md` (Storage Model, Auth and Access Model), `context/code-standards.md` (Data and Storage, Next.js), `context/ui-context.md` (Layout Patterns).
2. Confirm PROJ-002 is in place: `actions/projects.ts` exports `createProject`, `lib/db.ts` exports `prisma`, and the Create dialog is wired to the action.
3. Create `lib/server/projects.ts` per D.1 with the two query functions.
4. Update `components/editor/project-sidebar.tsx` per D.2 to render real project data and link each item.
5. Update `components/editor/editor-shell.tsx` per D.3 to fetch the project lists server-side and pass them to the sidebar.
6. Update `app/editor/page.tsx` per D.4 so the home screen fetches the lists and passes them down, or confirm the shell handles it.
7. Run the **Checks** block in Section I top to bottom.
8. Fix any in-scope failure and re-run the failing check.
9. Report PASS or FAIL per Section J. On PASS, state the agent has stopped and is awaiting the next feature. On FAIL, state the exact blocker and stop.

Do not modify `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/db.ts`, `lib/server/auth.ts`, `actions/projects.ts`, or `actions/collaborators.ts`.

## C. Context and Dependencies

- **Prerequisites:** PROJ-002 complete and verified.
- **Contract introduced:** `listOwnedProjects(userId)` and `listSharedProjects(userId)` in `lib/server/projects.ts`. Both return `Array<{ id: string; name: string; isOwner: boolean }>`. The `isOwner` field is `true` for owned and `false` for shared, matching the shape `ProjectSidebar` already accepts from UI-006.
- **Contract consumed:** `prisma` from `lib/db.ts`, `auth()` from `@clerk/nextjs/server`.
- **Approved decisions:**
  - Owned projects are `Project.ownerId === userId`.
  - Shared projects are projects where the user has a `Collaborator` row. The owner is never in the `Collaborator` table, so there is no overlap between the two lists.
  - The sidebar's `projects` prop shape from UI-006 (`{ id, name, isOwner }`) is preserved. This unit does not change the prop shape; it changes where the data comes from.
  - `ProjectSidebar` remains a client component. The data fetching happens in a Server Component (the editor page) and is passed down as props. This matches `code-standards.md`: Server Components fetch, Client Components receive.

## D. Implementation Requirements

### 1. `lib/server/projects.ts`

Add `import 'server-only'` at the top.

Import `prisma` from `@/lib/db`.

Export `async function listOwnedProjects(userId: string)`:

- `return prisma.project.findMany({ where: { ownerId: userId }, orderBy: { updatedAt: 'desc' }, select: { id: true, name: true } })`.
- Map each row to `{ id, name, isOwner: true }`.

Export `async function listSharedProjects(userId: string)`:

- `return prisma.project.findMany({ where: { collaborators: { some: { userId } } }, orderBy: { updatedAt: 'desc' }, select: { id: true, name: true } })`.
- Map each row to `{ id, name, isOwner: false }`.

Both functions return `Array<{ id: string; name: string; isOwner: boolean }>`. They do not throw on empty results; they return `[]`.

### 2. Update `components/editor/project-sidebar.tsx`

The sidebar currently accepts `projects?: Array<{ id: string; name: string; isOwner: boolean }>`. Split it into two optional props:

- `ownedProjects?: Array<{ id: string; name: string }>`
- `sharedProjects?: Array<{ id: string; name: string }>`

Keep the existing `onRename`, `onDelete`, and `onCreate` props. For rename and delete, wrap each item in `{ id, name, isOwner: true }` before calling the handler, since those handlers still expect the `isOwner` field.

Render each project as a `Link` from `next/link` pointing to `/editor/${project.id}`:

- The link wraps the project name and, for owned projects, the rename and delete icon buttons.
- The icon buttons call `e.preventDefault()` and `e.stopPropagation()` before invoking `onRename` or `onDelete`, so clicking an icon does not navigate.
- The "My Projects" tab renders `ownedProjects`; the "Shared" tab renders `sharedProjects`.
- Empty states remain as UI-006 left them: "No projects yet." in `text-sm text-text-muted`.
- Show rename and delete actions only on owned projects. Shared projects show the name only.

The `onCreate` prop on the New Project button is unchanged.

### 3. Update `components/editor/editor-shell.tsx`

Remove the mock project constant. Accept two new optional props:

- `ownedProjects?: Array<{ id: string; name: string }>`
- `sharedProjects?: Array<{ id: string; name: string }>`

Pass them to `ProjectSidebar`. Default both to `[]` so the shell still renders if a caller does not supply them.

Keep the dialogs, the `useProjectDialogs` hook, and the `onCreate` wiring from PROJ-002 unchanged.

### 4. Update `app/editor/page.tsx`

This page is currently a Server Component that renders the home content. It must now fetch the project lists:

- Import `auth` from `@clerk/nextjs/server`.
- Import `listOwnedProjects` and `listSharedProjects` from `@/lib/server/projects`.
- `const { userId } = await auth()`. If `!userId`, `redirect('/sign-in')`. This is a defensive check; `proxy.ts` already protects the route, but the page needs `userId` to query.
- `const [ownedProjects, sharedProjects] = await Promise.all([listOwnedProjects(userId), listSharedProjects(userId)])`.
- Pass both to `<EditorShell ownedProjects={ownedProjects} sharedProjects={sharedProjects}>`.
- Keep the home content (heading, description, New Project button) as UI-005 left it.

If `app/page.tsx` duplicates the home content rather than importing it, update both files identically. The report states which approach was taken.

### 5. Do not change the editor route page

`app/editor/[projectid]/page.tsx` does not exist yet. PROJ-004 creates it. Do not create it in this unit. Clicking a project link will 404 until PROJ-004 runs. This is expected and acceptable; the report notes it.

## E. Integration Contracts

- **Contract introduced:** `listOwnedProjects(userId)` and `listSharedProjects(userId)` in `lib/server/projects.ts`. Both return `Array<{ id, name, isOwner }>`.
- **Contract changed:** `ProjectSidebar` and `EditorShell` now accept `ownedProjects` and `sharedProjects` separately instead of a single `projects` array. The item action handlers still receive `{ id, name, isOwner: true }`.

## F. Scope Limits

Do not:

- Create the editor route `app/editor/[projectid]/page.tsx` (PROJ-004).
- Add pagination, search, or filtering. The list is small for personal use.
- Add real rename or delete actions. The dialogs still use console-log placeholders from UI-006. PROJ-005 wires delete.
- Modify `lib/db.ts`, `lib/server/auth.ts`, `actions/projects.ts`, `actions/collaborators.ts`, `components/ui/*`, `app/globals.css`, `context/*`, `planning/*`, or `AGENTS.md`.
- Change the Create dialog behavior from PROJ-002.

## G. Protected Behavior and Compatibility

- AUTH-001 through AUTH-004, PROJ-001, PROJ-002 gates still pass.
- Create Project still works from PROJ-002.
- The sidebar toggle, tabs, and New Project button still work.
- `components/ui/*` unchanged.

## H. Acceptance Criteria

1. `lib/server/projects.ts` exists with `listOwnedProjects` and `listSharedProjects`, both guarded with `server-only`.
2. `ProjectSidebar` accepts `ownedProjects` and `sharedProjects` and renders each as a `Link` to `/editor/[id]`.
3. Owned projects show rename and delete icon buttons; shared projects do not.
4. Clicking an icon does not navigate; clicking the project name does.
5. `EditorShell` accepts and forwards the two lists.
6. `app/editor/page.tsx` fetches both lists server-side and passes them down.
7. Empty states still render when a tab has no projects.
8. All Checks pass.
9. Agent reports PASS and stops.

## I. Checks

Check 1 — File exists. Run `ls lib/server/projects.ts`. Pass if listed.

Check 2 — Queries present and guarded. Run `grep -c "server-only" lib/server/projects.ts`, `grep -c "listOwnedProjects" lib/server/projects.ts`, `grep -c "listSharedProjects" lib/server/projects.ts`, `grep -c "ownerId" lib/server/projects.ts`, `grep -c "collaborators" lib/server/projects.ts`. Each count must be at least 1.

Check 3 — Sidebar uses links. Run `grep -c "next/link" components/editor/project-sidebar.tsx` and `grep -c "/editor/" components/editor/project-sidebar.tsx`. Each count must be at least 1. Run `grep -c "preventDefault" components/editor/project-sidebar.tsx`. Pass if count is at least 1.

Check 4 — Sidebar props split. Run `grep -c "ownedProjects" components/editor/project-sidebar.tsx` and `grep -c "sharedProjects" components/editor/project-sidebar.tsx`. Each count must be at least 1.

Check 5 — Shell forwards the lists. Run `grep -c "ownedProjects" components/editor/editor-shell.tsx` and `grep -c "sharedProjects" components/editor/editor-shell.tsx`. Each count must be at least 1. Run `grep -c "mock" components/editor/editor-shell.tsx`. Pass if count is 0.

Check 6 — Page fetches server-side. Run `grep -c "listOwnedProjects" app/editor/page.tsx` and `grep -c "listSharedProjects" app/editor/page.tsx`. Each count must be at least 1. Run `grep -c "auth()" app/editor/page.tsx`. Pass if count is at least 1.

Check 7 — No hardcoded hex. Run `grep -cE "#[0-9a-fA-F]{3,8}" lib/server/projects.ts components/editor/project-sidebar.tsx components/editor/editor-shell.tsx app/editor/page.tsx`. Pass if each reports 0.

Check 8 — Build, typecheck, lint. Run `npm run build`, `npx tsc --noEmit`, `npm run lint`. If build fails with the Turbopack nvm shim issue, run `npx next build --webpack` and note the workaround.

Check 9 — Behavior test. If a signed-in session is available, create two projects as one user, add a second user as a collaborator on one (via the AUTH-004 action or direct DB insert), then sign in as each user and confirm the tabs show the correct lists. If a browser session is unavailable, use a temporary `tsx` script that calls both query functions with fixed user IDs against seeded rows. Delete the seeded rows and script after. The report states which path was used.

Check 10 — Cleanup. Remove any seeded rows and temporary scripts. Confirm no `Test Project` rows remain.

Check 11 — No out-of-scope packages. Run `npm ls @trigger.dev/sdk @liveblocks/client @vercel/blob`. Pass if absent/empty.

## J. Report

Status: `PASS` or `FAIL`.

If PASS, report:

- One-line result per check.
- Which behavior test path was used (browser or `tsx` script).
- Confirmation that the `EditorShell` mock constant was removed.
- Confirmation that clicking a project link currently 404s because `app/editor/[projectid]/page.tsx` does not exist yet (PROJ-004).
- Confirmation that `lib/db.ts`, `lib/server/auth.ts`, `actions/projects.ts`, `actions/collaborators.ts`, `components/ui/*`, `app/globals.css`, `context/*`, `planning/*`, and `AGENTS.md` are unchanged.
- Note that rename and delete remain console-log placeholders; delete is wired in PROJ-005.
- Closing line: "PROJ-003 complete. Awaiting the next feature specification."

If FAIL, report which check failed, the exact error, and whether the cause is in scope (fixed) or out of scope (reported). Closing line: "Blocked, awaiting user direction."
