# AUTH-004 — Collaborator Management Actions

## A. Identity and Objective

- **Feature ID:** AUTH-004
- **Title:** Collaborator Management Actions
- **Primary objective:** Create Server Actions to add and remove collaborators by email, restricted to the project owner. The target user must already have a Clerk account.
- **Expected outcome:** `actions/collaborators.ts` exports `addCollaborator` and `removeCollaborator`. `addCollaborator` looks up the Clerk user by email, verifies the caller is the project owner, and creates a `Collaborator` row. `removeCollaborator` deletes the row after the same ownership check. Both return typed results and validate input with Zod.
- **References:** `planning/feature-map.md` AUTH-004; `context/architecture.md` Auth and Access Model; `context/code-standards.md` API Routes, Data and Storage; `AGENTS.md`.

## B. Execution Contract

The agent must do all of the following without asking the user for confirmation, in this order:

1. Read `AGENTS.md`, `context/architecture.md` (Auth and Access Model), `context/code-standards.md` (API Routes, Data and Storage).
2. Confirm AUTH-002 is in place: `lib/server/auth.ts` exports `requireProjectAccess`, `lib/db.ts` exports `prisma`, and `@clerk/nextjs` is installed.
3. Install Zod if it is not already present: run `npm install zod`.
4. Create `actions/collaborators.ts` per D.1.
5. Create a temporary test route `app/api/_test/collaborators/route.ts` per D.2 for verification only.
6. Seed the required test rows per D.3.
7. Run the **Checks** block in Section I top to bottom.
8. Delete the temporary test route and test rows after checks pass.
9. Fix any in-scope failure and re-run the failing check.
10. Report PASS or FAIL per Section J. On PASS, state the agent has stopped and is awaiting the next feature. On FAIL, state the exact blocker and stop.

Do not modify `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/server/auth.ts`, or `lib/db.ts`.

## C. Context and Dependencies

- **Prerequisites:** AUTH-002 complete and verified.
- **Contract introduced:** `addCollaborator(projectId, email)` and `removeCollaborator(projectId, userId)` Server Actions. Both return `{ ok: true }` or `{ ok: false, error: string }`. Later units (PROJ-003, or a dedicated collaborator UI unit) consume these.
- **Contract consumed:** `requireProjectAccess(projectId)` from `lib/server/auth.ts`; `prisma` from `lib/db.ts`.
- **Approved decisions:**
  - Only the owner can add or remove collaborators (`architecture.md`).
  - The target user must already have a Clerk account. This unit does **not** send Clerk Organization invitations. Invitations are a B2B feature that requires Email sign-up and a Clerk Organization; Systema uses Consumer mode and manages collaborators in Postgres, not Clerk Organizations [citation:1][citation:13].
  - To find the user by email, use `clerkClient.users.getUserList({ emailAddress: [email] })`. This is the official Clerk Backend SDK method for looking up users by email [citation:8].
  - `addCollaborator` must check that the project owner is the caller. `requireProjectAccess` returns `role: 'owner'` for the owner and `role: 'editor'` for collaborators. Reject if `role !== 'owner'`.
  - Removing a collaborator deletes the `Collaborator` row. It does not revoke the user's Clerk account.

## D. Implementation Requirements

### 1. `actions/collaborators.ts`

A Server Actions file (`"use server"` at the top).

Imports:

- `"use server"`.
- `z` from `zod`.
- `clerkClient` from `@clerk/nextjs/server`.
- `prisma` from `@/lib/db`.
- `AccessError` and `requireProjectAccess` from `@/lib/server/auth`.

Export `async function addCollaborator(projectId: string, email: string)`:

1. Validate input with Zod: `projectId` is a non-empty string; `email` is a valid email string. On failure, return `{ ok: false, error: 'Invalid input' }`.
2. Call `requireProjectAccess(projectId)` inside a try/catch. For `AccessError`, inspect `code` and return `{ ok: false, error: 'Unauthorized' }`, `{ ok: false, error: 'Not found' }`, or `{ ok: false, error: 'Forbidden' }` for `UNAUTHORIZED`, `NOT_FOUND`, or `FORBIDDEN`, respectively. Do not compare the error message; rethrow unexpected errors.
3. Check `access.role === 'owner'`. If not, return `{ ok: false, error: 'Only the owner can add collaborators' }`.
4. Look up the Clerk user: `const client = await clerkClient(); const { data } = await client.users.getUserList({ emailAddress: [email] })`.
5. Get `const user = data[0]`. If no user exists, return `{ ok: false, error: 'No user found with that email' }`. Then get `const targetUserId = user.id`.
6. Check for an existing collaborator: `prisma.collaborator.findUnique({ where: { projectId_userId: { projectId, userId: targetUserId } } })`. If it exists, return `{ ok: false, error: 'User is already a collaborator' }`.
7. Create the row: `await prisma.collaborator.create({ data: { projectId, userId: targetUserId, role: 'EDITOR' } })`.
8. Return `{ ok: true }`.

Export `async function removeCollaborator(projectId: string, userId: string)`:

1. Validate input with Zod: both are non-empty strings. On failure, return `{ ok: false, error: 'Invalid input' }`.
2. Call `requireProjectAccess(projectId)` inside a try/catch. Map `AccessError` by its `code` to the corresponding existing error result (`Unauthorized`, `Not found`, or `Forbidden`); do not compare message text, and rethrow unexpected errors.
3. Check `access.role === 'owner'`. If not, return `{ ok: false, error: 'Only the owner can remove collaborators' }`.
4. `await prisma.collaborator.delete({ where: { projectId_userId: { projectId, userId } } })`. If the row does not exist, Prisma throws `P2025`; catch it and return `{ ok: false, error: 'Collaborator not found' }`.
5. Return `{ ok: true }`.

Both actions must use `prisma.$transaction` only if a future change makes them touch multiple tables. In this unit, each action touches one row, so a plain `create`/`delete` is correct. Do not wrap a single operation in a transaction unnecessarily.

### 2. Temporary test route `app/api/_test/collaborators/route.ts`

For verification only. It must:

- Export `GET` and accept `?action=add|remove&projectId=test-project&email=user_editor_test@example.com&userId=user_editor_test`.
- For `action=add`, call `addCollaborator` with the project ID and email. Because the test route cannot sign in as the owner, it temporarily mocks `requireProjectAccess` by importing the action's logic directly and replacing the `clerkClient` lookup with a fixed result. The simplest approach: the test route does not call the real action; it calls the action's internal logic with a `// TEST ONLY` override that sets `access = { role: 'owner' }` and `targetUserId = 'user_editor_test'`.
- For `action=remove`, call `removeCollaborator` with the project ID and userId, using the same `// TEST ONLY` override for `access`.
- Return `Response.json(result)`.
- This route and its overrides are deleted after Checks pass.

If the agent cannot cleanly override `requireProjectAccess` without modifying `lib/server/auth.ts`, it must use a `tsx` script that imports the action module and calls the exported functions with a mocked `clerkClient` and `prisma`. The script is deleted after Checks pass. The report states which approach was used.

### 3. Seed test data

Before testing, insert:

- `Project` with `id = 'test-project'`, `name = 'Test Project'`, `ownerId = 'user_owner_test'`.
- One `Collaborator` row with `projectId = 'test-project'`, `userId = 'user_existing_test'`, `role = EDITOR`, so the "already a collaborator" case can be tested.

Delete both rows after Checks pass.

## E. Integration Contracts

- **Contract introduced:** `addCollaborator(projectId, email)` and `removeCollaborator(projectId, userId)` returning `{ ok: true } | { ok: false, error: string }`. A later UI unit (not in the current feature map's UI-006 scope) wires these to buttons. The return shape is stable.
- **Contract consumed:** `requireProjectAccess` and `prisma`.

## F. Scope Limits

Do not:

- Send Clerk Organization invitations. Systema uses Consumer mode; invitations require a Clerk Organization and Email sign-up [citation:1][citation:13].
- Add a collaborator UI or wire the actions to any component. This unit is actions only.
- Add Prisma transactions. Each action touches one row.
- Modify `lib/server/auth.ts`, `lib/db.ts`, `components/ui/*`, `app/globals.css`, `context/*`, `planning/*`, or `AGENTS.md`.
- Leave the test route, test script, or test rows after Checks pass.

## G. Protected Behavior and Compatibility

- AUTH-001, AUTH-002, AUTH-003 verification gates still pass.
- `requireProjectAccess` and `prisma` unchanged.
- `components/ui/*`, `app/globals.css`, `context/*`, `planning/*`, `AGENTS.md` unchanged.

## H. Acceptance Criteria

1. `zod` is installed.
2. `actions/collaborators.ts` exists with `"use server"` and exports both actions.
3. `addCollaborator` validates input, checks owner role, looks up the Clerk user by email, rejects duplicates, and creates the row.
4. `removeCollaborator` validates input, checks owner role, deletes the row, and handles the not-found case.
5. Non-owner callers are rejected by both actions.
6. The Clerk lookup uses `getUserList({ emailAddress: [email] })` .
7. Test route or script verifies: owner adds a new user; owner cannot add a duplicate; owner removes an existing collaborator; editor cannot add or remove.
8. All Checks pass; test route, script, and rows removed.
9. Agent reports PASS and stops.

## I. Checks

Check 1 — Zod installed. Run `npm ls zod`. Pass if a version is reported.

Check 2 — Actions file exists and exports both. Run `grep -c "addCollaborator" actions/collaborators.ts` and `grep -c "removeCollaborator" actions/collaborators.ts`. Each count must be at least 1.

Check 3 — Uses Clerk lookup. Run `grep -c "getUserList" actions/collaborators.ts` and `grep -c "emailAddress" actions/collaborators.ts`. Each count must be at least 1.

Check 4 — Owner check present. Run `grep -c "role === 'owner'" actions/collaborators.ts`. Pass if count is at least 1.

Check 5 — No hardcoded hex. Run `grep -cE "#[0-9a-fA-F]{3,8}" actions/collaborators.ts`. Pass if count is 0.

Check 6 — Build, typecheck, lint. Run `npm run build`, `npx tsc --noEmit`, `npm run lint`. If build fails with the Turbopack nvm shim issue, run `npx next build --webpack` and note the workaround.

Check 7 — Behavior test (manual). Using the test route or `tsx` script:

- Add `user_editor_test@example.com` as owner: expect `{ ok: true }`.
- Add the same email again: expect `{ ok: false, error: 'User is already a collaborator' }`.
- Remove `user_existing_test` as owner: expect `{ ok: true }`.
- Add as editor (override `role: 'editor'`): expect `{ ok: false, error: 'Only the owner can add collaborators' }`.

Pass if all four match.

Check 8 — Cleanup. Delete test route/script and both test rows. Confirm `ls app/api/_test/collaborators/route.ts 2>/dev/null || echo "removed"` prints "removed".

Check 9 — No out-of-scope packages. Run `npm ls @trigger.dev/sdk @liveblocks/client @vercel/blob`. Pass if absent/empty.

## J. Report

Status: `PASS` or `FAIL`.

If PASS, report:

- `zod` version installed.
- One-line result per check.
- Which verification approach was used (test route or `tsx` script) and why.
- Confirmation that the test route/script and test rows were removed.
- Confirmation that `lib/server/auth.ts`, `lib/db.ts`, `components/ui/*`, `app/globals.css`, `context/*`, `planning/*`, and `AGENTS.md` are unchanged.
- Note that the actions are not yet wired to any UI; a future unit will add the collaborator management UI.
- Closing line: "AUTH-004 complete. Awaiting the next feature specification."

If FAIL, report which check failed, the exact error, and whether the cause is in scope (fixed) or out of scope (reported). Closing line: "Blocked, awaiting user direction."
