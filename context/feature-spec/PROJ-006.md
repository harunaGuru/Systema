# PROJ-006 — Rename Project

## A. Identity and Objective

- **Feature ID:** PROJ-006
- **Title:** Rename Project
- **Primary objective:** Create the `renameProject` Server Action that updates a project's display name, restricted to the owner, and wire the Rename dialog from UI-006 to call it.
- **Expected outcome:** The owner renames a project from the sidebar; `Project.name` updates in Postgres; the slug (`Project.id`) is unchanged; the dialog closes on success. Non-owners are rejected.
- **References:** `planning/feature-map.md` PROJ-006; `context/architecture.md` Auth and Access Model; `context/code-standards.md` API Routes; `AGENTS.md`.

## B. Execution Contract

The agent must do all of the following without asking the user for confirmation, in this order:

1. Read `AGENTS.md`, `context/architecture.md` (Auth and Access Model), `context/code-standards.md` (API Routes).
2. Confirm PROJ-005 is in place: `actions/delete-project.ts` exists, `@vercel/blob` is installed, and the Delete dialog is wired.
3. Create `actions/rename-project.ts` per D.1.
4. Update `components/editor/editor-shell.tsx` to wire the Rename dialog per D.2.
5. Run the **Checks** block in Section I top to bottom.
6. Fix any in-scope failure and re-run the failing check.
7. Report PASS or FAIL per Section J. On PASS, state the agent has stopped and is awaiting the next feature. On FAIL, state the exact blocker and stop.

Do not modify `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/db.ts`, `lib/server/auth.ts`, `lib/server/projects.ts`, `actions/projects.ts`, `actions/collaborators.ts`, `actions/delete-project.ts`, or `components/editor/project-sidebar.tsx`.

## C. Context and Dependencies

- **Prerequisites:** PROJ-002 (action pattern, `createProject`) and PROJ-003 (project list and dialog wiring) complete and verified.
- **Contract introduced:** `renameProject(projectId, newName)` Server Action returning `{ ok: true } | { ok: false, error: string }`. The Rename dialog's `onSubmit` consumes it.
- **Contract consumed:** `requireProjectAccess` from `lib/server/auth.ts`; `prisma` from `lib/db.ts`.
- **Approved decisions:**
  - Only the owner can rename. `requireProjectAccess` returns `role: 'owner'` or `'editor'`. Reject if `role !== 'owner'`.
  - **The slug does not change on rename.** `Project.id` is the permanent URL and is referenced by Liveblocks room IDs and stored artifact paths. Changing it would break those references. This is the same decision as GitHub repositories: display name changes, identifier does not.
  - Renaming is a single-row update. No transaction is needed.
  - The dialog closes on success. `EditorShell` applies `projectNameOverrides` immediately, so the sidebar and navbar show the new name without navigation or refresh. No toast is shown.

## D. Implementation Requirements

### 1. `actions/rename-project.ts`

A Server Actions file (`"use server"` at the top).

Imports: `"use server"`, `z` from `zod`, `prisma` from `@/lib/db`, `requireProjectAccess` from `@/lib/server/auth`.

Export `async function renameProject(projectId: string, newName: string)`:

1. Validate with Zod: `projectId` is a non-empty string; `newName` is a string, trimmed length 1–80. On failure, return `{ ok: false, error: 'Invalid name' }`.
2. Call `requireProjectAccess(projectId)` inside a try/catch. On `Error('Unauthorized')` return `{ ok: false, error: 'Unauthorized' }`; on `Error('Not found')` return `{ ok: false, error: 'Not found' }`; on `Error('Forbidden')` return `{ ok: false, error: 'Forbidden' }`.
3. Check `access.role === 'owner'`. If not, return `{ ok: false, error: 'Only the owner can rename this project' }`.
4. `await prisma.project.update({ where: { id: projectId }, data: { name: newName.trim() } })`. Wrap in try/catch. On error, return `{ ok: false, error: 'Failed to rename project. Try again.' }`.
5. Return `{ ok: true }`.

Do not update `Project.id`. Do not touch any Blob. Do not touch Liveblocks.

### 2. Wire the Rename Dialog in `components/editor/editor-shell.tsx`

The Rename dialog currently calls a console-log placeholder on submit. Change it to call `renameProject`:

- Import `renameProject` from `@/actions/rename-project`.
- The Rename dialog's `onSubmit` handler must be async: `async (newName) => { const result = await renameProject(targetProject.id, newName); if (!result.ok) { console.error(result.error); return; } dialogs.close(); }`.
- The dialog remains a presentational component. `EditorShell` owns the async call.
- On success, the dialog closes. The sidebar shows the new name on next render.
- Do not change the dialog component itself. It already supports async `onSubmit` returning `{ ok: boolean; error?: string }` from UI-006.

## E. Integration Contracts

- **Contract introduced:** `renameProject(projectId, newName)` returns `{ ok: true } | { ok: false, error }`. The Rename dialog's `onSubmit` in `EditorShell` consumes it.
- **Contract consumed:** `requireProjectAccess`, `prisma`.

## F. Scope Limits

Do not:

- Change the slug (`Project.id`).
- Rename a project from any UI other than the Rename dialog.
- Add a toast, modal, or redirect on success.
- Touch Blobs, Liveblocks, or Trigger.dev.
- Modify `lib/db.ts`, `lib/server/auth.ts`, `lib/server/projects.ts`, `actions/projects.ts`, `actions/collaborators.ts`, `actions/delete-project.ts`, `components/editor/project-sidebar.tsx`, `components/ui/*`, `app/globals.css`, `context/*`, `planning/*`, or `AGENTS.md`.

## G. Protected Behavior and Compatibility

- AUTH-001 through AUTH-004, PROJ-001 through PROJ-005 gates still pass.
- Creating a project, listing projects, deleting a project, and opening a project all still work.
- The Rename dialog's UI behavior (prefill, autofocus, Enter-to-submit) from UI-006 is unchanged.
- `components/ui/*` unchanged.

## H. Acceptance Criteria

1. `actions/rename-project.ts` exists with `"use server"` and exports `renameProject`.
2. The action checks `role === 'owner'` and rejects non-owners.
3. The action updates `Project.name` and does not change `Project.id`.
4. The Rename dialog in `EditorShell` calls the action and closes on success.
5. Non-owner callers are rejected.
6. The slug in the URL is unchanged after rename.
7. All Checks pass.
8. Agent reports PASS and stops.

## I. Checks

Check 1 — File exists. Run `ls actions/rename-project.ts`. Pass if listed.

Check 2 — Action shape. Run `grep -c "use server" actions/rename-project.ts`, `grep -c "renameProject" actions/rename-project.ts`, `grep -c "role === 'owner'" actions/rename-project.ts`, `grep -c "project.update" actions/rename-project.ts`. Each count must be at least 1.

Check 3 — Slug not changed. Run `grep -c "id:" actions/rename-project.ts`. Pass if count is 0 in the `data` object of the update. If the agent wrote `data: { name, id }`, fail. The simplest check: `grep -c "data:.*id" actions/rename-project.ts` must be 0.

Check 4 — Shell wires the action. Run `grep -c "renameProject" components/editor/editor-shell.tsx`. Pass if count is at least 1. Run `grep -c "console.log" components/editor/editor-shell.tsx` in the rename handler context. Pass if the rename placeholder was removed.

Check 5 — No hardcoded hex. Run `grep -cE "#[0-9a-fA-F]{3,8}" actions/rename-project.ts components/editor/editor-shell.tsx`. Pass if each reports 0.

Check 6 — Build, typecheck, lint. Run `npm run build`, `npx tsc --noEmit`, `npm run lint`. If build fails with the Turbopack nvm shim issue, run `npx next build --webpack` and note the workaround.

Check 7 — Behavior test. Use a temporary `tsx` script that:

- Seeds a project with `id = 'rename-test'`, `name = 'Old Name'`, `ownerId = 'user_owner_test'`.
- Calls `renameProject('rename-test', 'New Name')` with a `// TEST ONLY` mock of `requireProjectAccess` returning `{ role: 'owner', userId: 'user_owner_test', projectId: 'rename-test' }`.
- Verifies the row now has `name = 'New Name'` and `id = 'rename-test'` (slug unchanged).
- Calls `renameProject` with a mock `role: 'editor'`, expects `{ ok: false, error: 'Only the owner can rename this project' }`.
- Deletes the test row.

Pass if all three assertions hold. Delete the script after.

Check 8 — Cleanup. Confirm no `rename-test` row remains and the script is gone.

Check 9 — No out-of-scope packages. Run `npm ls @trigger.dev/sdk @liveblocks/client reactflow`. Pass if absent/empty.

## J. Report

Status: `PASS` or `FAIL`.

If PASS, report:

- One-line result per check.
- The exact `data` object passed to `prisma.project.update` (must contain only `name`).
- Confirmation that the slug was unchanged in the test.
- Confirmation that the test script and seeded row were removed.
- Confirmation that `lib/db.ts`, `lib/server/auth.ts`, `lib/server/projects.ts`, `actions/projects.ts`, `actions/collaborators.ts`, `actions/delete-project.ts`, `components/editor/project-sidebar.tsx`, `components/ui/*`, `app/globals.css`, `context/*`, `planning/*`, and `AGENTS.md` are unchanged.
- Note: the Rename dialog closes on success; the sidebar shows the new name on next render. No toast.
- Closing line: "PROJ-006 complete. Awaiting the next feature specification."

If FAIL, report which check failed, the exact error, and whether the cause is in scope (fixed) or out of scope (reported). Closing line: "Blocked, awaiting user direction."
