# PROJ-005 — Delete Project + Blobs

## A. Identity and Objective

- **Feature ID:** PROJ-005
- **Title:** Delete Project + Blobs
- **Primary objective:** Create the `deleteProject` Server Action that removes a project's metadata from Postgres and its associated artifacts from Vercel Blob, restricted to the project owner.
- **Expected outcome:** The owner deletes a project; the `Project` row and all related `Collaborator`, `CanvasSnapshot`, and `Artifact` rows are removed; every Blob object referenced by the project is deleted; a non-owner cannot delete. The action returns `{ ok: true }` on success or `{ ok: false, error }` on failure.
- **References:** `planning/feature-map.md` PROJ-005; `context/architecture.md` Storage Model, Invariant #4; `context/code-standards.md` API Routes, Data and Storage; `AGENTS.md`.

## B. Execution Contract

The agent must do all of the following without asking the user for confirmation, in this order:

1. Read `AGENTS.md`, `context/architecture.md` (Storage Model, Invariant #4), `context/code-standards.md` (API Routes, Data and Storage).
2. Confirm PROJ-004 is in place: `app/editor/[projectid]/page.tsx` exists and uses `requireProjectAccess`.
3. **Stop and ask the user for the Vercel Blob token before proceeding.** Request `BLOB_READ_WRITE_TOKEN`. Tell the user where to find it: Vercel Dashboard → Project → Storage → Blob → `.env.local` tab. Add it to `.env.local` (not committed). Wait for confirmation.
4. Install the Vercel Blob SDK: run `npm install @vercel/blob`.
5. Create `actions/delete-project.ts` per D.1.
6. Wire the Delete dialog in `components/editor/editor-shell.tsx` to call the action per D.2.
7. Create a temporary test script `scripts/verify-delete.ts` per D.3.
8. Run the **Checks** block in Section I top to bottom.
9. Delete the temporary script and seeded test data after checks pass.
10. Fix any in-scope failure and re-run the failing check.
11. Report PASS or FAIL per Section J. On PASS, state the agent has stopped and is awaiting the next feature. On FAIL, state the exact blocker and stop.

Do not modify `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/db.ts`, `lib/server/auth.ts`, `lib/server/projects.ts`, `actions/projects.ts`, `actions/collaborators.ts`, or `components/editor/project-sidebar.tsx`.

## C. Context and Dependencies

- **Prerequisites:** PROJ-004 complete and verified.
- **Contract introduced:** `deleteProject(projectId: string)` Server Action returning `{ ok: true } | { ok: false, error: string }`. The Delete dialog consumes it.
- **Contract consumed:** `requireProjectAccess` from `lib/server/auth.ts`; `prisma` from `lib/db.ts`; `del` from `@vercel/blob`.
- **Approved decisions:**
  - Only the owner can delete. `requireProjectAccess` returns `role: 'owner'` or `'editor'`. Reject if `role !== 'owner'`.
  - Deletion order: collect all `blobPath` values from `CanvasSnapshot` and `Artifact` for the project, delete the Blob objects, then delete the Postgres rows. If Blob deletion fails partway, the action returns an error and does **not** proceed to Postgres deletion. The user can retry. This is safer than deleting metadata first and orphaning blobs.
  - Blob deletion uses the `del` function from `@vercel/blob`, which accepts an array of URLs or pathnames and deletes up to 1,000 objects per request.
  - Postgres deletion uses a `$transaction` with three `deleteMany` calls (Collaborator, CanvasSnapshot, Artifact) followed by a `delete` on Project. The schema already has `onDelete: Cascade` on the relations, so a single `prisma.project.delete` would cascade. However, the spec uses explicit `deleteMany` calls inside a transaction so the order is visible and the transaction can be retried or inspected if it fails.
  - If the project has zero Blob objects, the Blob deletion step is skipped and Postgres deletion proceeds.

## D. Implementation Requirements

### 1. `actions/delete-project.ts`

A Server Actions file (`"use server"` at the top).

Imports: `"use server"`, `z` from `zod`, `del` from `@vercel/blob`, `prisma` from `@/lib/db`, `requireProjectAccess` from `@/lib/server/auth`.

Export `async function deleteProject(projectId: string)`:

1. Validate with Zod: `projectId` is a non-empty string. On failure, return `{ ok: false, error: 'Invalid project' }`.
2. Call `requireProjectAccess(projectId)` inside a try/catch. On `Error('Unauthorized')` return `{ ok: false, error: 'Unauthorized' }`; on `Error('Not found')` return `{ ok: false, error: 'Not found' }`; on `Error('Forbidden')` return `{ ok: false, error: 'Forbidden' }`.
3. Check `access.role === 'owner'`. If not, return `{ ok: false, error: 'Only the owner can delete this project' }`.
4. Collect blob paths:
   - `const snapshots = await prisma.canvasSnapshot.findMany({ where: { projectId }, select: { blobPath: true } })`
   - `const artifacts = await prisma.artifact.findMany({ where: { projectId }, select: { blobPath: true } })`
   - `const blobPaths = [...snapshots.map(s => s.blobPath), ...artifacts.map(a => a.blobPath)]`
5. If `blobPaths.length > 0`, call `await del(blobPaths)`. Wrap in try/catch. On error, return `{ ok: false, error: 'Failed to delete project files. Try again.' }`. Do not proceed to Postgres deletion.
6. Delete Postgres rows in a transaction:
   - `await prisma.$transaction([ prisma.collaborator.deleteMany({ where: { projectId } }), prisma.canvasSnapshot.deleteMany({ where: { projectId } }), prisma.artifact.deleteMany({ where: { projectId } }), prisma.project.delete({ where: { id: projectId } }) ])`
   - Wrap in try/catch. On error, return `{ ok: false, error: 'Failed to delete project. Try again.' }`.
7. Return `{ ok: true }`.

### 2. Wire the Delete Dialog in `components/editor/editor-shell.tsx`

The Delete dialog currently calls a console-log placeholder on confirm. Change it to call `deleteProject`:

- Import `deleteProject` from `@/actions/delete-project`.
- The Delete dialog's `onConfirm` handler must be async: `async () => { const result = await deleteProject(targetProject.id); if (!result.ok) { console.error(result.error); return; } dialogs.close(); }`.
- The dialog remains a presentational component. `EditorShell` owns the async call.
- On success, the project disappears from the sidebar on next render. A later unit can add a toast; this unit logs the error to console.
- Do not change the dialog component itself.

### 3. Temporary test script `scripts/verify-delete.ts`

Create a script that:

- Seeds a project with `id = 'delete-test'`, `ownerId = 'user_owner_test'`, one `Collaborator`, one `CanvasSnapshot` with a real Blob path (upload a small test file first using `put` from `@vercel/blob`), and one `Artifact`.
- Calls `deleteProject('delete-test')` with a `// TEST ONLY` mock of `requireProjectAccess` returning `{ role: 'owner', userId: 'user_owner_test', projectId: 'delete-test' }`.
- Verifies the `Project` row is gone and the Blob object is gone (using `head` from `@vercel/blob` and expecting it to throw or return null).
- Tests the non-owner case: seed another project, mock `requireProjectAccess` as `role: 'editor'`, call `deleteProject`, expect `{ ok: false, error: 'Only the owner can delete this project' }`.
- Cleans up any remaining rows and blobs.
- Exits 0 on all pass, 1 on any fail.

The script is deleted after Checks pass.

## E. Integration Contracts

- **Contract introduced:** `deleteProject(projectId)` returns `{ ok: true } | { ok: false, error }`. The Delete dialog's `onConfirm` in `EditorShell` consumes it.
- **Contract consumed:** `requireProjectAccess`, `prisma`, `del` from `@vercel/blob`.

## F. Scope Limits

Do not:

- Delete a project from any UI other than the Delete dialog.
- Add a toast, modal, or redirect on success. The sidebar updates on next render; the console logs errors.
- Delete Clerk users, Liveblocks rooms, or Trigger.dev runs. Only Postgres rows and Vercel Blob objects are in scope.
- Modify `lib/db.ts`, `lib/server/auth.ts`, `lib/server/projects.ts`, `actions/projects.ts`, `actions/collaborators.ts`, `components/editor/project-sidebar.tsx`, `components/ui/*`, `app/globals.css`, `context/*`, `planning/*`, or `AGENTS.md`.
- Leave the test script or seeded data after Checks pass.

## G. Protected Behavior and Compatibility

- AUTH-001 through AUTH-004, PROJ-001 through PROJ-004 gates still pass.
- Creating a project (PROJ-002) and listing projects (PROJ-003) still work.
- The editor route access check (PROJ-004) still works.
- `components/ui/*` unchanged.

## H. Acceptance Criteria

1. `@vercel/blob` is installed.
2. `actions/delete-project.ts` exists with `"use server"` and exports `deleteProject`.
3. The action checks `role === 'owner'` and rejects non-owners.
4. The action collects all `blobPath` values and calls `del` before deleting Postgres rows.
5. Blob deletion failure returns an error and skips Postgres deletion.
6. Postgres deletion uses a `$transaction` with three `deleteMany` and one `delete`.
7. The Delete dialog in `EditorShell` calls the action and closes on success.
8. All Checks pass; test script and data removed.
9. Agent reports PASS and stops.

## I. Checks

Check 1 — Blob SDK installed. Run `npm ls @vercel/blob`. Pass if a version is reported.

Check 2 — Action exists. Run `ls actions/delete-project.ts`. Pass if listed.

Check 3 — Action shape. Run `grep -c "use server" actions/delete-project.ts`, `grep -c "deleteProject" actions/delete-project.ts`, `grep -c "role === 'owner'" actions/delete-project.ts`, `grep -c "del(" actions/delete-project.ts`, `grep -c "$transaction" actions/delete-project.ts`. Each count must be at least 1.

Check 4 — Shell wires the action. Run `grep -c "deleteProject" components/editor/editor-shell.tsx`. Pass if count is at least 1.

Check 5 — No hardcoded hex. Run `grep -cE "#[0-9a-fA-F]{3,8}" actions/delete-project.ts components/editor/editor-shell.tsx`. Pass if each reports 0.

Check 6 — Build, typecheck, lint. Run `npm run build`, `npx tsc --noEmit`, `npm run lint`. If build fails with the Turbopack nvm shim issue, run `npx next build --webpack` and note the workaround.

Check 7 — Behavior test. Run `npx tsx scripts/verify-delete.ts`. Pass if exit code 0 and output confirms: project deleted, blob deleted, non-owner rejected.

Check 8 — Cleanup. Delete `scripts/verify-delete.ts` and any seeded rows/blobs. Confirm no `delete-test` project remains and the script is gone.

Check 9 — No out-of-scope packages. Run `npm ls @trigger.dev/sdk @liveblocks/client reactflow`. Pass if absent/empty.

## J. Report

Status: `PASS` or `FAIL`.

If PASS, report:

- Confirmation that `BLOB_READ_WRITE_TOKEN` was set by the user before proceeding.
- `@vercel/blob` version installed.
- One-line result per check.
- The exact deletion order implemented (Blob first, then Postgres transaction).
- Confirmation that the test script and seeded data were removed.
- Confirmation that `lib/db.ts`, `lib/server/auth.ts`, `lib/server/projects.ts`, `actions/projects.ts`, `actions/collaborators.ts`, `components/editor/project-sidebar.tsx`, `components/ui/*`, `app/globals.css`, `context/*`, `planning/*`, and `AGENTS.md` are unchanged.
- Note: the Delete dialog closes on success; the sidebar updates on next render. No toast or redirect is added in this unit.
- Closing line: "PROJ-005 complete. Awaiting the next feature specification."

If FAIL, report which check failed, the exact error, and whether the cause is in scope (fixed) or out of scope (reported). Closing line: "Blocked, awaiting user direction."
