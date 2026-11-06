# AUTH-003 — Liveblocks Auth Endpoint

## A. Identity and Objective

- **Feature ID:** AUTH-003
- **Title:** Liveblocks Auth Endpoint
- **Primary objective:** Create a Route Handler that issues Liveblocks room tokens only after verifying the Clerk user is the project owner or a collaborator, using the `requireProjectAccess` helper from AUTH-002.
- **Expected outcome:** `POST /api/liveblocks-auth` accepts a `room` (project ID), verifies access via `requireProjectAccess`, and returns a Liveblocks session token scoped to that room. Unauthenticated or unauthorized requests are rejected with the correct status.
- **References:** `planning/feature-map.md` AUTH-003; `context/architecture.md` Auth and Access Model, Invariant #3; `context/code-standards.md` API Routes; `AGENTS.md`.

## B. Execution Contract

The agent must do all of the following without asking the user for confirmation, in this order:

1. Read `AGENTS.md`, `context/architecture.md` (Auth and Access Model, Invariant #3), `context/code-standards.md` (API Routes).
2. **Stop and ask the user to set the Liveblocks secret key before proceeding.** Tell the user where to find it: Liveblocks Dashboard → API keys page (`https://liveblocks.io/dashboard/apikeys`). Instruct the user to add `LIVEBLOCKS_SECRET_KEY` to `.env.local` (not committed); do not ask them to provide the secret in chat. Ask only for confirmation that it is set.
3. Confirm AUTH-002 is in place: `lib/server/auth.ts` exports `requireProjectAccess`, `lib/db.ts` exports `prisma`, and `@liveblocks/node` is not yet installed.
4. Install the Liveblocks Node package: run `npm install @liveblocks/node`.
5. Create `app/api/liveblocks-auth/route.ts` per D.1.
6. Create the temporary SDK verification script described in D.2.
7. Run the **Checks** block in Section I top to bottom.
8. Delete the temporary verification script after checks pass.
9. Fix any in-scope failure and re-run the failing check.
10. Report PASS or FAIL per Section J. On PASS, state the agent has stopped and is awaiting the next feature. On FAIL, state the exact blocker and stop.

Do not modify `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, or `lib/server/auth.ts`.

## C. Context and Dependencies

- **Prerequisites:** AUTH-002 complete and verified (`requireProjectAccess` exists and works).
- **Contract introduced:** `POST /api/liveblocks-auth` accepts `{ room: string }` and returns either a Liveblocks token response (`{ token: string }`) or an error (`{ error: string }`) with status 401 (unauthenticated) or 403 (forbidden). Later units (COLLAB-001) configure `LiveblocksProvider authEndpoint` to point at this route.
- **Contract consumed:** `requireProjectAccess(projectId)` from `lib/server/auth.ts`.
- **Approved decisions:**
  - Room ID = `projectId` (slug). One room per project. This is recorded in the feature map and `architecture.md`.
  - Liveblocks Free plan allows **10 simultaneous connections per room** [citation:4]. This is a plan limit, not something the endpoint enforces.
  - Liveblocks recommends `@liveblocks/node` with `prepareSession` and `session.allow` for access token permissions [citation:16][citation:24].
  - The auth endpoint must verify project access **before** issuing a token. This is invariant #3 in `architecture.md`.
  - Clerk's `auth.protect()` is not used here because the endpoint must return 401/403 JSON, not a redirect or 404. The `requireProjectAccess` helper already handles the session check.

## D. Implementation Requirements

### 1. `app/api/liveblocks-auth/route.ts`

Create a Route Handler with:

- `import { Liveblocks } from '@liveblocks/node'`.
- `import { AccessError, requireProjectAccess } from '@/lib/server/auth'`.
- A module-scope `const liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY! })`.
- `export async function POST(request: Request)`:
  - Parse the body: `const { room } = await request.json()`. Validate that `room` is a non-empty string. If invalid, return `Response.json({ error: 'Missing room' }, { status: 400 })`.
  - Call `requireProjectAccess(room)` inside a `try/catch`.
  - On success, the result contains `userId` and `role`. Create a session:
    - `const session = liveblocks.prepareSession(userId, { userInfo: { name: userId } })`. Use a minimal `userInfo` for now; COLLAB-002 adds name and avatar from Clerk.
    - `session.allow(room, session.FULL_ACCESS)`.
    - `const { status, body } = await session.authorize()`.
    - Return `new Response(body, { status })`.
  - On `AccessError` with code `UNAUTHORIZED`, return `Response.json({ error: error.message }, { status: 401 })`.
  - On `AccessError` with code `NOT_FOUND`, return `Response.json({ error: error.message }, { status: 404 })`.
  - On `AccessError` with code `FORBIDDEN`, return `Response.json({ error: error.message }, { status: 403 })`.
  - On any other error, return `Response.json({ error: 'Internal error' }, { status: 500 })`. Map typed errors by `code`, never by comparing `message`.
- Do not use `auth.protect()` in this route. The helper handles session verification. Using `auth.protect()` would redirect or return 404 instead of the JSON error shape this endpoint needs.

### 2. Temporary SDK verification script

For SDK wiring verification only, create a temporary `tsx` script that directly calls `liveblocks.prepareSession` with a test `userId`, calls `session.allow` for a test room, and calls `session.authorize`. Confirm the response has status 200 and a string `body`, then delete the script after verification. This does not test the endpoint's authorization path; verify that path by code inspection and the AUTH-002 helper tests, and report this limitation.

Do not create a test route or bypass authentication to invoke the endpoint.

## E. Integration Contracts

- **Contract introduced:** `POST /api/liveblocks-auth` with request `{ room: string }` and response either `{ token: string }` or `{ error: string }`. The status codes are 200 (success), 400 (missing room), 401 (unauthenticated), 403 (forbidden), 404 (project not found), 500 (internal).
- **Contract consumed:** `requireProjectAccess` from `lib/server/auth.ts`.

## F. Scope Limits

Do not:

- Configure `LiveblocksProvider` on the client (COLLAB-001).
- Add presence, cursors, or storage sync (COLLAB-001).
- Create the `liveblocks.config.ts` file (COLLAB-001).
- Modify `lib/server/auth.ts`.
- Add Trigger.dev, Vercel Blob, or any package other than `@liveblocks/node`.
- Leave the test script in the codebase after checks pass.

## G. Protected Behavior and Compatibility

- AUTH-001 verification gate still passes (Clerk provider, proxy, sign-in pages).
- AUTH-002 verification gate still passes (`requireProjectAccess` works).
- `components/ui/*`, `app/globals.css`, `context/*`, `planning/*`, `AGENTS.md` unchanged.

## H. Acceptance Criteria

1. `@liveblocks/node` is installed.
2. `app/api/liveblocks-auth/route.ts` exists and exports `POST`.
3. The route calls `requireProjectAccess(room)` before creating the session.
4. Missing `room` returns 400.
5. Unauthorized returns 401.
6. Not found returns 404.
7. Forbidden returns 403.
8. A valid owner/editor gets a Liveblocks token response with status 200.
9. The route does not use `auth.protect()`.
10. All checks in Section I pass.
11. The test script is removed after checks pass.
12. The agent reports PASS and stops.

## I. Checks (run top to bottom, fix in-scope failures, re-run)

Check 1 — Liveblocks Node installed. Run `npm ls @liveblocks/node`. Pass if a version is reported.

Check 2 — Route exists. Run `ls app/api/liveblocks-auth/route.ts`. Pass if listed.

Check 3 — Route imports the helper. Run `grep -c "requireProjectAccess" app/api/liveblocks-auth/route.ts`. Pass if count is at least 1.

Check 4 — Route does not use auth.protect. Run `grep -c "auth.protect" app/api/liveblocks-auth/route.ts`. Pass if count is 0.

Check 5 — Route uses prepareSession. Run `grep -c "prepareSession" app/api/liveblocks-auth/route.ts`. Pass if count is at least 1.

Check 6 — No hardcoded hex. Run `grep -cE "#[0-9a-fA-F]{3,8}" app/api/liveblocks-auth/route.ts`. Pass if count is 0.

Check 7 — Build, typecheck, lint. Run each and pass on exit code 0: `npm run build`, `npx tsc --noEmit`, `npm run lint`. If `npm run build` fails due to the Turbopack/nvm shim issue from AUTH-001, run `npx next build --webpack` instead and note the workaround in the report.

Check 8 — SDK wiring test (manual). Run a temporary `tsx` script that imports `Liveblocks` from `@liveblocks/node`, calls `prepareSession('test-user', { userInfo: { name: 'Test' } })`, calls `session.allow('test-room', session.FULL_ACCESS)`, and calls `session.authorize()`. Pass if the response has status 200 and a `body` string. Delete the script after. If the script fails, report the error.

Check 9 — No out-of-scope packages. Run `npm ls @trigger.dev/sdk @vercel/blob`. Pass if all are absent or empty.

If any check fails and the cause is in scope, fix and re-run. If out of scope, stop and report.

## J. Report

Status: `PASS` or `FAIL`.

If PASS, report:

- Confirmation that `LIVEBLOCKS_SECRET_KEY` was set by the user before the agent proceeded.
- `@liveblocks/node` version installed.
- One-line result per check in Section I.
- Confirmation that the test script was removed after checks passed.
- A note that the endpoint's access-check logic is verified by code inspection plus the AUTH-002 helper tests, not by an end-to-end request with a real Clerk session. Manual verification of the endpoint with a signed-in user is required by the user once COLLAB-001 configures the client.
- Confirmation that `components/ui/*`, `app/globals.css`, `context/*`, `planning/*`, and `AGENTS.md` are unchanged.
- Closing line: "AUTH-003 complete. Awaiting the next feature specification."

If FAIL, report which check failed, the exact error, and whether the cause is in scope (fixed) or out of scope (reported). Closing line: "Blocked, awaiting user direction."