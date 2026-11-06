# AUTH-002 — Access Helper + Prisma 7 + Neon

## A. Identity and Objective

- **Feature ID:** AUTH-002
- **Title:** Access Helper + Prisma 7 + Neon
- **Primary objective:** Connect Prisma 7 to Neon using `@prisma/adapter-pg`, define the initial schema (`Project`, `Collaborator`, `CanvasSnapshot`, `Artifact`), and create the server-side `requireProjectAccess` helper.
- **Expected outcome:** `prisma.config.ts` and `schema.prisma` are configured for Prisma 7; migrations apply to Neon; `lib/db.ts` exports a client using the Neon adapter; `lib/server/auth.ts` exports `requireProjectAccess`.
- **References:** `planning/feature-map.md` AUTH-002; `context/architecture.md` Storage Model; `context/code-standards.md` Data and Storage; `AGENTS.md`.

## B. Execution Contract

1. Read `AGENTS.md`, `context/architecture.md`, `context/code-standards.md` (Data and Storage).
2. **Stop and ask the user for both Neon connection strings.** Request `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct). Tell the user: Neon Console → Connect → copy both. Add to `.env.local`. Wait for confirmation.
3. Confirm AUTH-001 is in place (`@clerk/nextjs`, `proxy.ts`, `ClerkProvider`).
4. Install dependencies: `npm install prisma@7 @prisma/client@7 @prisma/adapter-pg@7 pg dotenv` and `npm install -D tsx`.
5. Set `"type": "module"` in `package.json`. Update `tsconfig.json` for ESM (`"module": "ESNext"`, `"moduleResolution": "bundler"`, `"target": "ES2023"`).
6. Create `prisma.config.ts` per D.2.
7. Replace `prisma/schema.prisma` with D.1 content.
8. Create `lib/db.ts` per D.3.
9. Create `lib/server/auth.ts` per D.4.
10. Run `npx prisma generate` then `npx prisma migrate dev --name init`.
11. Create temporary test route per D.5, run Checks, delete route.
12. Report PASS or FAIL per Section J.

Do not modify `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, or `AGENTS.md`.

## C. Context and Dependencies

- **Prerequisites:** AUTH-001 verified.
- **Contracts introduced:** `prisma` singleton (D.3); `requireProjectAccess(projectId)` returning `{ role, userId, projectId }` or throwing `AccessError` with a typed `code` (D.4). Consumed by AUTH-003, AUTH-004, PROJ-004, PROJ-005.
- **Approved decisions:** Prisma 7 ESM, `@prisma/adapter-pg`, `prisma.config.ts`. Direct connection (`DATABASE_URL_UNPOOLED`) for CLI migrations; pooled (`DATABASE_URL`) for the adapter. Schema models unchanged from the original AUTH-002.

## D. Implementation Requirements

### 1. `prisma/schema.prisma`

Replace the file with the content between the START and END markers below.

START OF schema.prisma

    generator client {
      provider = "prisma-client"
      output   = "../lib/generated/prisma"
    }

    datasource db {
      provider = "postgresql"
    }

    model Project {
      id            String           @id
      name          String
      ownerId       String
      createdAt     DateTime         @default(now())
      updatedAt     DateTime         @updatedAt
      collaborators Collaborator[]
      snapshots     CanvasSnapshot[]
      artifacts     Artifact[]
    }

    model Collaborator {
      id        String           @id @default(cuid())
      projectId String
      userId    String
      role      CollaboratorRole @default(EDITOR)
      createdAt DateTime         @default(now())
      project   Project          @relation(fields: [projectId], references: [id], onDelete: Cascade)

      @@unique([projectId, userId])
      @@index([userId])
    }

    enum CollaboratorRole {
      EDITOR
    }

    model CanvasSnapshot {
      id        String   @id @default(cuid())
      projectId String
      blobPath  String
      createdAt DateTime @default(now())
      project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

      @@index([projectId])
    }

    model Artifact {
      id        String       @id @default(cuid())
      projectId String
      type      ArtifactType
      blobPath  String
      createdAt DateTime     @default(now())
      project   Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)

      @@index([projectId])
    }

    enum ArtifactType {
      SPEC
      CANVAS_JSON
    }

END OF schema.prisma

Note: no `url` or `directUrl` in the datasource block. Prisma 7 requires this.

### 2. `prisma.config.ts` (project root)

Replace or create the file with the content between the markers.

START OF prisma.config.ts

    import 'dotenv/config'
    import { defineConfig, env } from 'prisma/config'

    export default defineConfig({
      schema: 'prisma/schema.prisma',
      datasource: {
        url: env('DATABASE_URL_UNPOOLED'),
      },
    })

END OF prisma.config.ts

The CLI uses the unpooled connection for migrations. If both `prisma.config.ts` and `prisma7.config.ts` exist, the CLI loads `prisma7.config.ts` and ignores the other. Ensure only `prisma.config.ts` exists.

### 3. `lib/db.ts`

Replace or create the file with the content between the markers.

START OF lib/db.ts

    import 'server-only'
    import { PrismaClient } from '@/lib/generated/prisma/client'
    import { PrismaPg } from '@prisma/adapter-pg'

    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error('DATABASE_URL must be set to initialize Prisma')
    }

    const adapter = new PrismaPg({
      connectionString: databaseUrl,
    })

    const globalForPrisma = globalThis as unknown as {
      prisma: PrismaClient | undefined
    }

    export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = prisma
    }

END OF lib/db.ts

Import path is the generated output, not `@prisma/client`.

### 4. `lib/server/auth.ts`

Same logic as the original AUTH-002, but with the Prisma 7 import path. Replace or create the file with the content between the markers.

START OF lib/server/auth.ts

    import 'server-only'
    import { auth } from '@clerk/nextjs/server'
    import { prisma } from '@/lib/db'

    export type AccessErrorCode = 'UNAUTHORIZED' | 'NOT_FOUND' | 'FORBIDDEN'

    const accessErrorMessages: Record<AccessErrorCode, string> = {
      UNAUTHORIZED: 'Unauthorized',
      NOT_FOUND: 'Not found',
      FORBIDDEN: 'Forbidden',
    }

    export class AccessError extends Error {
      constructor(readonly code: AccessErrorCode) {
        super(accessErrorMessages[code])
        this.name = 'AccessError'
      }
    }

    export type ProjectAccess =
      | { role: 'owner'; userId: string; projectId: string }
      | { role: 'editor'; userId: string; projectId: string }

    export async function requireProjectAccess(
      projectId: string,
    ): Promise<ProjectAccess> {
      const { userId } = await auth()
      if (!userId) throw new AccessError('UNAUTHORIZED')

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { collaborators: { where: { userId } } },
      })

      if (!project) throw new AccessError('NOT_FOUND')
      if (project.ownerId === userId) {
        return { role: 'owner', userId, projectId }
      }
      if (project.collaborators.length > 0) {
        return { role: 'editor', userId, projectId }
      }
      throw new AccessError('FORBIDDEN')
    }

END OF lib/server/auth.ts

### 5. Temporary test route

Create `app/api/_test/access/route.ts`. It must:

- Import `AccessError` from `@/lib/server/auth` for typed access failures.
- Export a `GET` handler reading `projectId` and `as` from the query string.
- If `process.env.NODE_ENV !== 'production'`, temporarily override `auth()` behavior by wrapping the helper: if `as === 'owner'` return `{ role: 'owner', userId: 'user_owner_test', projectId }`; if `as === 'editor'` return `{ role: 'editor', userId: 'user_editor_test', projectId }`; if `as === 'other'` throw `new AccessError('FORBIDDEN')`. This bypass is marked `// TEST ONLY` and is removed with the route.
- Return `Response.json({ ok: true, ...result })` on success. Catch `AccessError` and map its `code` to 401 (`UNAUTHORIZED`), 404 (`NOT_FOUND`), or 403 (`FORBIDDEN`), preserving `error.message` in the response. Map unexpected errors to 500 without inspecting message text.

Seed two rows before testing using `npx prisma db execute` or a temporary `tsx` script:

- `Project` with `id = 'test-project'`, `name = 'Test Project'`, `ownerId = 'user_owner_test'`.
- `Collaborator` with `projectId = 'test-project'`, `userId = 'user_editor_test'`, `role = EDITOR`.

Delete the test route and the two rows after Checks pass.

## E. Integration Contracts

- **`prisma` singleton** in `lib/db.ts`. Uses `@prisma/adapter-pg` and the generated client path. Every server-side unit from AUTH-003 onward imports it.
- **`requireProjectAccess(projectId)`** in `lib/server/auth.ts`. Signature and return shape unchanged from the original AUTH-002.

## F. Scope Limits

Do not:

- Use Prisma 6, `prisma-client-js`, or `new PrismaClient()` without an adapter.
- Add `url` or `directUrl` to `schema.prisma`.
- Create the Liveblocks auth endpoint (AUTH-003) or collaborator actions (AUTH-004).
- Implement Trigger.dev pooling (AI-001).
- Leave the test route or test data after Checks pass.

## G. Protected Behavior and Compatibility

- AUTH-001 gate passes (`proxy.ts`, Clerk provider, sign-in).
- UI-001 through UI-006 behavior preserved.
- `components/ui/*`, `app/globals.css`, `context/*`, `planning/*`, `AGENTS.md` unchanged.

## H. Acceptance Criteria

1. `prisma@7`, `@prisma/client@7`, `@prisma/adapter-pg@7`, `pg`, and `dotenv` are installed; `@prisma/adapter-neon` is removed; `prisma` is pinned to 7, not 8.
2. `package.json` has `"type": "module"`.
3. `prisma.config.ts` exists and uses `DATABASE_URL_UNPOOLED`.
4. `schema.prisma` uses `provider = "prisma-client"` with `output`, and the datasource has no `url`/`directUrl`.
5. `lib/db.ts` validates that `process.env.DATABASE_URL` is set before constructing `PrismaPg`, passes the validated value as `connectionString`, and imports from the generated path.
6. `npx prisma migrate dev --name init` applies successfully.
7. `requireProjectAccess` returns owner/editor or throws `AccessError` with `UNAUTHORIZED`, `NOT_FOUND`, or `FORBIDDEN` while preserving the existing error messages.
8. Test route verifies owner, editor, forbidden.
9. All Checks pass; test route removed.
10. Agent reports PASS and stops.

## I. Checks

Check 1 — Prisma 7 and PostgreSQL adapter installed. Run `npm ls prisma @prisma/client @prisma/adapter-pg pg @prisma/adapter-neon`. Pass if Prisma, client, and adapter report version `7.x`, `pg` is installed, and `@prisma/adapter-neon` is absent. If a Prisma package reports `8.x`, fail and reinstall with the `@7` tag.

Check 2 — ESM set. Run `grep -c '"type": "module"' package.json`. Pass if count is 1.

Check 3 — `prisma.config.ts` exists and uses the unpooled URL. Run `grep -c "DATABASE_URL_UNPOOLED" prisma.config.ts`. Pass if count is at least 1.

Check 4 — Schema uses `prisma-client` and has no `url`. Run `grep -c "provider = \"prisma-client\"" prisma/schema.prisma` (pass if at least 1). Run `grep -c "url" prisma/schema.prisma` (pass if 0).

Check 5 — `lib/db.ts` uses the PostgreSQL adapter. Run `grep -c "PrismaPg" lib/db.ts`, `grep -c "@prisma/adapter-pg" lib/db.ts`, and `grep -c "@/lib/generated/prisma/client" lib/db.ts`. Each count must be at least 1. Confirm it validates `DATABASE_URL` before constructing `PrismaPg({ connectionString: databaseUrl })` and does not import `@prisma/adapter-neon`.

Check 6 — Migration applied. Run `npx prisma migrate status`. Pass if no pending migrations.

Check 7 — Build, typecheck, lint. Run `npm run build`, `npx tsc --noEmit`, `npm run lint`. If build fails with the Turbopack nvm shim issue from AUTH-001, run `npx next build --webpack` and note the workaround.

Check 8 — Test route logic. With dev server running, curl the three cases (owner, editor, other). Pass if responses match. If curl unavailable, use a temporary `tsx` script.

Check 9 — Cleanup. Delete test route and test rows. Confirm `ls app/api/_test/access/route.ts 2>/dev/null || echo "removed"` prints "removed".

Check 10 — No out-of-scope packages. Run `npm ls @trigger.dev/sdk @liveblocks/client @vercel/blob`. Pass if absent/empty.

## J. Report

Status: `PASS` or `FAIL`.

If PASS, report:

- Confirmation that `DATABASE_URL` and `DATABASE_URL_UNPOOLED` were set before proceeding.
- Prisma, `@prisma/client`, and `@prisma/adapter-pg` versions (must be 7.x); confirm `pg` installed and `@prisma/adapter-neon` removed.
- Confirmation that `prisma` was not installed from the `latest` tag.
- One-line result per check.
- Confirmation that the test route and test data were removed.
- Note: Trigger.dev Prisma pooling (`max: 1`, `tasks.onWait` disconnect) is deferred to AI-001.
- Confirmation that `components/ui/*`, `app/globals.css`, `context/*`, `planning/*`, `AGENTS.md` unchanged.
- Closing line: "AUTH-002 complete. Awaiting the next feature specification."

If FAIL, report which check failed, the exact error, and whether in scope (fixed) or out of scope (reported). Closing line: "Blocked, awaiting user direction."
