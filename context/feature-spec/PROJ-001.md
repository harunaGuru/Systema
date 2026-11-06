# PROJ-001 — Prisma Schema Finalized (Prisma 7)

## A. Identity and Objective

- **Feature ID:** PROJ-001
- **Title:** Prisma Schema Finalized (Prisma 7)
- **Primary objective:** Verify and finalize the Prisma 7 schema and client created in AUTH-002, confirming that migrations apply cleanly, the generated client is importable, and the `prisma` singleton is usable from a server component. No new models are added in this unit.
- **Expected outcome:** `npx prisma migrate status` reports no pending migrations; `npx prisma generate` succeeds; `lib/db.ts` imports resolve without error; a temporary server-side check confirms `prisma.project.count()` returns a number; the AUTH-002 schema is unchanged and correct.
- **References:** `planning/feature-map.md` PROJ-001; `context/architecture.md` Storage Model; `context/code-standards.md` Data and Storage; `AGENTS.md`.

## B. Execution Contract

The agent must do all of the following without asking the user for confirmation, in this order:

1. Read `AGENTS.md`, `context/architecture.md` (Storage Model), `context/code-standards.md` (Data and Storage).
2. Confirm AUTH-002 is in place: `prisma.config.ts` exists, `prisma/schema.prisma` exists with the four models, `lib/db.ts` exports `prisma`, and `@prisma/adapter-pg@7` is installed.
3. Run `npx prisma generate` to regenerate the client from the current schema.
4. Run `npx prisma migrate status` to confirm the database is in sync.
5. Create a temporary server-side check script `scripts/verify-prisma.ts` per D.1.
6. Run the script with `npx tsx scripts/verify-prisma.ts`.
7. Run the **Checks** block in Section I top to bottom.
8. Delete the temporary script after checks pass.
9. Fix any in-scope failure and re-run the failing check.
10. Report PASS or FAIL per Section J. On PASS, state the agent has stopped and is awaiting the next feature. On FAIL, state the exact blocker and stop.

Do not modify `prisma/schema.prisma`, `prisma.config.ts`, `lib/db.ts`, `lib/server/auth.ts`, `components/ui/*`, `app/globals.css`, `context/*`, `planning/*`, or `AGENTS.md`.

## C. Context and Dependencies

- **Prerequisites:** AUTH-002 complete and verified. The schema, config, and `lib/db.ts` already exist from AUTH-002.
- **Contract consumed:** `prisma` singleton from `lib/db.ts`. This unit confirms it works; it does not change it.
- **Approved decisions:**
  - Prisma 7 is the pinned version. The `prisma` CLI and `@prisma/client` are at major 7. The `latest` tag resolves to Prisma 8 prerelease and must not be used [citation:3][citation:4].
  - The schema uses `provider = "prisma-client"` with an explicit `output` path, not `prisma-client-js` [citation:1][citation:6].
  - The datasource block has no `url` or `directUrl`. The CLI connection is in `prisma.config.ts` using `DATABASE_URL_UNPOOLED` [citation:3][citation:4].
  - `lib/db.ts` instantiates `new PrismaClient({ adapter })` with `PrismaPg` from `@prisma/adapter-pg` and imports from the generated output path, not `@prisma/client` [citation:3][citation:13].
  - `npx prisma migrate dev` in Prisma 7 does **not** automatically run `generate` or seed scripts. Run them explicitly [citation:5][citation:10].

## D. Implementation Requirements

### 1. Temporary verification script `scripts/verify-prisma.ts`

Create a script that:

- Imports `prisma` from `@/lib/db`.
- Calls `await prisma.project.count()`.
- Calls `await prisma.collaborator.count()`.
- Calls `await prisma.canvasSnapshot.count()`.
- Calls `await prisma.artifact.count()`.
- Logs each count to the console.
- Exits with code 0 if all calls succeed, code 1 if any throws.
- Uses `npx tsx scripts/verify-prisma.ts` to run. The `tsx` package is already installed from AUTH-002.

The script is deleted after Checks pass. It is not committed.

### 2. Do not change the schema

The schema from AUTH-002 is already correct for this unit. If `npx prisma migrate status` reports drift, the agent must report the exact drift and stop. It must not modify the schema to "fix" drift without user approval, because the schema is the approved contract from AUTH-002.

### 3. Do not create a new migration

`npx prisma migrate dev` is not run in this unit. The migration already exists from AUTH-002. This unit only verifies that the existing migration is applied and the client works.

## E. Integration Contracts

- **Contract confirmed:** `prisma` singleton from `lib/db.ts` works for all four models. PROJ-002 (Create Project) imports `prisma` from `lib/db.ts` and calls `prisma.project.create`. PROJ-003 (List Projects) calls `prisma.project.findMany`. PROJ-005 (Delete) calls `prisma.project.delete`. All of them rely on the singleton working, which this unit verifies.

## F. Scope Limits

Do not:

- Modify `prisma/schema.prisma`, `prisma.config.ts`, or `lib/db.ts`.
- Run `npx prisma migrate dev` or create a new migration.
- Add new models or change existing fields.
- Create the Create Project action or any project CRUD (PROJ-002 onward).
- Leave the verification script in the codebase after Checks pass.

## G. Protected Behavior and Compatibility

- AUTH-001, AUTH-002, AUTH-003, AUTH-004 verification gates still pass.
- `lib/server/auth.ts` unchanged.
- `components/ui/*`, `app/globals.css`, `context/*`, `planning/*`, `AGENTS.md` unchanged.

## H. Acceptance Criteria

1. `npx prisma generate` succeeds and the generated client exists at the configured output path.
2. `npx prisma migrate status` reports "Database schema is up to date" or equivalent with no pending migrations.
3. `scripts/verify-prisma.ts` runs and prints four numeric counts (including zero) without throwing.
4. All Checks pass; the script is deleted.
5. Agent reports PASS and stops.

## I. Checks

Check 1 — Prisma 7 and PostgreSQL adapter still installed and pinned. Run `npm ls prisma @prisma/client @prisma/adapter-pg`. Pass if each reports version `7.x`. If any reports `8.x`, fail and reinstall with the `@7` tag [citation:3][citation:4].

Check 2 — Config file exists and uses unpooled URL. Run `grep -c "DATABASE_URL_UNPOOLED" prisma.config.ts`. Pass if count is at least 1.

Check 3 — Schema uses `prisma-client` and has no `url`. Run `grep -c "provider = \"prisma-client\"" prisma/schema.prisma` (pass if at least 1). Run `grep -c "url" prisma/schema.prisma` (pass if 0).

Check 4 — Generate succeeds. Run `npx prisma generate`. Pass if exit code 0.

Check 5 — Migration status clean. Run `npx prisma migrate status`. Pass if output reports no pending migrations.

Check 6 — Verification script runs. Run `npx tsx scripts/verify-prisma.ts`. Pass if exit code 0 and output contains four count lines.

Check 7 — Build, typecheck, lint. Run `npm run build`, `npx tsc --noEmit`, `npm run lint`. If build fails with the Turbopack nvm shim issue from AUTH-001, run `npx next build --webpack` and note the workaround.

Check 8 — Cleanup. Delete `scripts/verify-prisma.ts`. Confirm `ls scripts/verify-prisma.ts 2>/dev/null || echo "removed"` prints "removed".

Check 9 — No out-of-scope packages. Run `npm ls @trigger.dev/sdk @liveblocks/client @vercel/blob`. Pass if absent/empty.

## J. Report

Status: `PASS` or `FAIL`.

If PASS, report:

- Prisma, `@prisma/client`, and `@prisma/adapter-pg` versions (must be 7.x).
- One-line result per check.
- The four counts printed by the verification script.
- Confirmation that the verification script was deleted.
- Confirmation that `prisma/schema.prisma`, `prisma.config.ts`, `lib/db.ts`, `lib/server/auth.ts`, `components/ui/*`, `app/globals.css`, `context/*`, `planning/*`, and `AGENTS.md` are unchanged.
- Note: `npx prisma migrate dev` in Prisma 7 does not auto-run `generate` or seed; this unit ran `generate` explicitly [citation:5][citation:10].
- Closing line: "PROJ-001 complete. Awaiting the next feature specification."

If FAIL, report which check failed, the exact error, and whether the cause is in scope (fixed) or out of scope (reported). Closing line: "Blocked, awaiting user direction."
