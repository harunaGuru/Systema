# PROJ-002 — Create Project Action + Wire Dialog

## A. Identity and Objective

- **Feature ID:** PROJ-002
- **Title:** Create Project Action + Wire Dialog
- **Primary objective:** Create the `createProject` Server Action that writes a project to Postgres with the authenticated Clerk user as owner, and wire the Create Project dialog (from UI-006) to call it and redirect to `/editor/[projectid]`.
- **Expected outcome:** A signed-in user submits the Create dialog, a `Project` row is created with `ownerId` equal to their Clerk user ID, its project ID combines the name slug and a random suffix, and the browser lands on `/editor/[projectid]`.
- **References:** `planning/feature-map.md` PROJ-002; `context/architecture.md` Storage Model, Auth and Access Model; `context/code-standards.md` API Routes, Data and Storage; `context/ui-context.md` Layout Patterns; `AGENTS.md`.

## B. Execution Contract

The agent must do all of the following without asking the user for confirmation, in this order:

1. Read `AGENTS.md`, `context/architecture.md` (Storage Model, Auth and Access Model), `context/code-standards.md` (API Routes, Data and Storage).
2. Confirm AUTH-002, AUTH-004, and PROJ-001 are in place: `lib/server/auth.ts` exports `requireProjectAccess`, `lib/db.ts` exports `prisma`, `actions/collaborators.ts` exists, and `npx prisma migrate status` is clean.
3. Create `actions/projects.ts` per D.1.
4. Create `lib/slug.ts` per D.2.
5. Update `components/editor/dialogs/create-project-dialog.tsx` per D.3 to call the action.
6. Update `components/editor/editor-shell.tsx` per D.4 to pass the action to the dialog.
7. Run the **Checks** block in Section I top to bottom.
8. Fix any in-scope failure and re-run the failing check.
9. Report PASS or FAIL per Section J. On PASS, state the agent has stopped and is awaiting the next feature. On FAIL, state the exact blocker and stop.

Do not modify `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/db.ts`, `lib/server/auth.ts`, or `actions/collaborators.ts`.

## C. Context and Dependencies

- **Prerequisites:** AUTH-002 (prisma, requireProjectAccess), AUTH-004 (actions pattern), PROJ-001 (schema verified).
- **Contract introduced:** `createProject(name: string, idSuffix: string)` Server Action returning `{ ok: false, error: string }` or redirecting on success.
- **Contract consumed:** `prisma` from `lib/db.ts`, `auth()` from `@clerk/nextjs/server`.
- **Approved decisions:**
  - `ownerId` is the Clerk user ID from `auth().userId`. It is **never** accepted from the client. This is the first unit that persists a real Clerk ID.
  - The name slug plus the dialog-generated 12-character random hexadecimal suffix serves as `Project.id`. The suffix is validated by the action. Duplicate-ID errors use a generic similar-name-or-URL message and do not reveal whether another owner has a matching name slug.
  - Project creation is a single-row insert, so a Prisma transaction is not required. If a future unit adds initial collaborators at creation time, that unit wraps both inserts in a transaction.
  - Server Actions call `redirect()` outside `try/catch` because `redirect` throws and a catch block would swallow it.

## D. Implementation Requirements

### 1. `actions/projects.ts`

A Server Actions file (`"use server"` at the top).

Imports: `"use server"`, `z` from `zod`, `auth` from `@clerk/nextjs/server`, `redirect` from `next/navigation`, `Prisma` from `@/lib/generated/prisma/client`, `prisma` from `@/lib/db`, `slugify` from `@/lib/slug`.

Export `async function createProject(name: string, idSuffix: string)`:

1. Validate with Zod: `name` is a string, trimmed length 1–80. On failure, return `{ ok: false, error: 'Invalid name' }`.
2. Validate `idSuffix` as exactly 12 lowercase hexadecimal characters. On failure, return `{ ok: false, error: 'Invalid name' }`.
3. `const { userId } = await auth()`. If `!userId`, return `{ ok: false, error: 'Unauthorized' }`.
4. `const slug = slugify(name)`; if empty, return `{ ok: false, error: 'Invalid name' }`. Build `id` as `${slug}-${idSuffix}`.
5. Check for an existing project: `prisma.project.findUnique({ where: { id } })`. If it exists, return `{ ok: false, error: 'A project with a similar name or URL already exists' }`.
6. Create the project with `await prisma.project.create({ data: { id, name: name.trim(), ownerId: userId } })` inside a try/catch. If the caught error is an instance of `Prisma.PrismaClientKnownRequestError` with `code === 'P2002'`, return `{ ok: false, error: 'A project with a similar name or URL already exists' }`. Rethrow all other errors.
7. `redirect('/editor/' + id)` **outside** the create try/catch. The function returns `Promise<never>` on success because `redirect` throws.

Note: the return type is `{ ok: false, error: string }` for failures and `never` for success. TypeScript infers this correctly if `redirect` is the last statement outside the try/catch.

### 2. `lib/slug.ts`

A pure function, no imports beyond standard JS.

Export `function slugify(input: string): string`:

- Lowercase the input.
- Replace any run of characters that are not `a-z`, `0-9`, or `-` with a single `-`.
- Trim leading and trailing `-`.
- Collapse consecutive `-` into one.
- Return the result. May be an empty string if the input contains no alphanumerics.

Keep it under 10 lines. No dependencies.

### 3. Update `components/editor/dialogs/create-project-dialog.tsx`

The dialog accepts `onSubmit: (name: string, idSuffix: string) => Promise<{ ok: true } | { ok: false; error: string }>` and handles the async result. When the first non-empty name is entered, generate and retain a random 12-character lowercase hexadecimal suffix; display the complete project ID in the live slug preview.

- Add `const [error, setError] = useState<string | null>(null)` and `const [pending, setPending] = useState(false)`.
- On submit: set `pending` true, clear error, and call `onSubmit(name.trim(), idSuffix)`. If `result.ok` is false, set the error and keep the dialog open. If true, the Server Action will redirect; the dialog does not need to close explicitly.
- Disable Create while `pending` is true.
- Show the error message below the input in `text-sm text-state-error` when `error` is set.
- Keep the existing slug preview, autofocus, Enter-to-submit, and Cancel behavior.

Do not import `createProject` directly into the dialog. The dialog stays a presentational client component and receives `onSubmit` from its parent.

### 4. Update `components/editor/editor-shell.tsx`

- Import `createProject` from `@/actions/projects`.
- Pass it to the Create dialog's `onSubmit` prop.
- The existing `useProjectDialogs` hook keeps managing `activeDialog` and `targetProject`. Do not change the hook.
- For the Rename and Delete dialogs, keep the console-log placeholders from UI-006. They are not wired in this unit.
- The Create dialog must not close on success; the redirect navigates away. On failure, the dialog stays open and shows the error.

## E. Integration Contracts

- **Contract introduced:** `createProject(name, idSuffix)` returns `{ ok: false, error }` on failure and redirects on success. A future unit that adds project creation from a different entry point (e.g., a dashboard) calls the same action with a validated random suffix.
- **Contract changed:** `CreateProjectDialog`'s `onSubmit` prop is now async and returns a result. UI-006's console-log placeholder is replaced by the real action passed from `EditorShell`.

## F. Scope Limits

Do not:

- Build the project list or fetch projects (PROJ-003).
- Build the editor route access check (PROJ-004).
- Build project deletion (PROJ-005).
- Add initial collaborator rows at creation time. A project starts with only its owner.
- Add a Prisma transaction. Single-row insert.
- Add slug retry logic. The dialog supplies a random suffix; collisions return a generic error.
- Modify `lib/db.ts`, `lib/server/auth.ts`, `actions/collaborators.ts`, `components/ui/*`, `app/globals.css`, `context/*`, `planning/*`, or `AGENTS.md`.

## G. Protected Behavior and Compatibility

- AUTH-001 through AUTH-004 and PROJ-001 gates still pass.
- The Rename and Delete dialogs still open and close with console-log placeholders.
- The sidebar toggle, home content, and other UI from UI-004 through UI-006 still work.
- `components/ui/*` unchanged.

## H. Acceptance Criteria

1. `actions/projects.ts` exists with `"use server"` and exports `createProject`.
2. `lib/slug.ts` exports `slugify` and passes the slug cases below.
3. `slugify("My API Gateway")` returns `my-api-gateway`.
4. `slugify("  Hello!!! World  ")` returns `hello-world`.
5. `slugify("???")` returns `""`.
6. `createProject` uses `auth().userId` as `ownerId`; it does not accept an owner from the caller.
7. Creating a project inserts a `Project` row with a unique `id` and the Clerk owner.
8. A duplicate project ID, whether found by the pre-check or reported by Prisma with `P2002` after a concurrent insert, returns `{ ok: false, error: 'A project with a similar name or URL already exists' }`.
9. On success, the browser lands on `/editor/[projectid]` using the displayed slug-plus-suffix ID.
10. On failure, the dialog stays open and shows the error.
11. All Checks pass.
12. Agent reports PASS and stops.

## I. Checks

Check 1 — Files exist. Run `ls actions/projects.ts lib/slug.ts`. Pass if both are listed.

Check 2 — Action has the right shape. Run `grep -c "use server" actions/projects.ts`, `grep -c "createProject" actions/projects.ts`, `grep -c "auth()" actions/projects.ts`, `grep -c "redirect" actions/projects.ts`. Each count must be at least 1.

Check 3 — Action does not accept owner from caller. Run `grep -c "ownerId" actions/projects.ts`. Pass if count is exactly 1 (the `ownerId: userId` line in the create call). If the agent wrote a second occurrence (e.g., a function parameter), fail.

Check 4 — Slug function. Run `npx tsx -e "import { slugify } from './lib/slug'; console.log(slugify('My API Gateway'), '|', slugify('  Hello!!! World  '), '|', slugify('???'))"`. Pass if output is `my-api-gateway | hello-world | ` (last empty).

Check 5 — Dialog accepts async onSubmit. Run `grep -c "Promise<" components/editor/dialogs/create-project-dialog.tsx`. Pass if count is at least 1. Run `grep -c "pending" components/editor/dialogs/create-project-dialog.tsx`. Pass if count is at least 1. Run `grep -c "state-error" components/editor/dialogs/create-project-dialog.tsx`. Pass if count is at least 1.

Check 6 — Shell wires the action. Run `grep -c "createProject" components/editor/editor-shell.tsx`. Pass if count is at least 1.

Check 7 — No hardcoded hex in new/modified files. Run `grep -cE "#[0-9a-fA-F]{3,8}" actions/projects.ts lib/slug.ts components/editor/dialogs/create-project-dialog.tsx components/editor/editor-shell.tsx`. Pass if each reports 0.

Check 8 — Build, typecheck, lint. Run `npm run build`, `npx tsc --noEmit`, `npm run lint`. If build fails with the Turbopack nvm shim issue from AUTH-001, run `npx next build --webpack` and note the workaround.

Check 9 — Behavior test (manual or via temporary `tsx` script). If a signed-in session is available in the browser, create a project named "Test Project" and confirm the redirect uses the displayed slug-plus-suffix ID and the `Project` row in Neon has `ownerId` equal to the signed-in user's Clerk ID. If no browser session is available, run a temporary `tsx` script that calls `createProject("Test Project", "<12 lowercase hexadecimal characters>")` with a mocked `auth()` returning `{ userId: 'user_test_owner' }`, then query Neon to confirm the row. Delete the row and the script after. The report states which path was used.

Check 10 — Cleanup. If the test created rows, delete them with `npx prisma db execute` or a `tsx` script. Confirm no `Test Project` row remains.

Check 11 — No out-of-scope packages. Run `npm ls @trigger.dev/sdk @liveblocks/client @vercel/blob`. Pass if absent/empty.

## J. Report

Status: `PASS` or `FAIL`.

If PASS, report:

- One-line result per check.
- Which behavior test path was used (browser or `tsx` script).
- The created project's `id` and `ownerId`, and confirmation that `ownerId` matched the Clerk user ID (not a request-supplied value).
- Confirmation that test rows were removed.
- Confirmation that `lib/db.ts`, `lib/server/auth.ts`, `actions/collaborators.ts`, `components/ui/*`, `app/globals.css`, `context/*`, `planning/*`, and `AGENTS.md` are unchanged.
- Note that the Rename and Delete dialogs still use console-log placeholders and are wired in a later unit.
- Closing line: "PROJ-002 complete. Awaiting the next feature specification."

If FAIL, report which check failed, the exact error, and whether the cause is in scope (fixed) or out of scope (reported). Closing line: "Blocked, awaiting user direction."
