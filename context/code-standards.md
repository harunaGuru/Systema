# Code Standards

## General

- Modules are small and single-purpose; a file should have one clear reason to change.
- Fix root causes rather than layering workarounds. If a type error appears at a boundary, fix the boundary — do not cast around it.
- Do not mix unrelated concerns in one component or route handler.
- Follow the system boundaries defined in `architecture.md`. `app/api/` handles request concerns, `lib/` owns shared clients, `trigger/` owns background jobs, and `actions/` owns form mutations.
- Exceptions to these standards require an inline comment explaining the reason and preserving the intent of the rule.
- AI job payloads are validated at both the route handler (or Server Action) that enqueues the job and the Trigger.dev task entry point that consumes it. Validation is not duplicated for its own sake — each boundary validates what it receives.

## TypeScript

- `strict: true` and `noUncheckedIndexedAccess: true` are required in `tsconfig.json`. `noUncheckedIndexedAccess` matters because Next.js route `params` are typed as `string` but can be `undefined` for malformed routes; this flag forces explicit handling [citation:5].
- `noFallthroughCasesInSwitch: true` and `useUnknownInCatchVariables: true` are required.
- Do not use `any` without an inline justification comment on the same or preceding line (`// any: <reason>`).
- Do not use `// @ts-ignore`. Use `// @ts-expect-error` so the suppression auto-errors when the underlying issue is fixed [citation:5].
- Validate unknown external input at system boundaries before trusting it. This includes `req.json()`, `formData`, AI provider responses, and parsed JSON from Blob. Use Zod schemas and `safeParse` or `parse` at the boundary; casting without validation is a violation [citation:5].
- Prefer inference for local variables and short internal functions where the type is immediately obvious from the initializer.
- Export explicit return types for public functions in `lib/`, `trigger/`, and `actions/` so contracts are visible across system boundaries.
- Use `unknown` rather than `any` for catch variables and unparsed data.

## Next.js

- Server Components are the default. Add `'use client'` only when the component needs React hooks, browser APIs, event handlers, or client-only libraries (React Flow, Liveblocks hooks) [citation:1][citation:6].
- Never make a Client Component `async`. Only Server Components can await.
- Pages must not be wholesale `'use client'` components. Keep `page.tsx` as a Server Component that performs the authorization check and composes a client child for interactive surfaces. The editor page (`/editor/[projectid]`) follows this pattern: the Server Component verifies project access, then renders a client `<EditorShell>`.
- `params` and `searchParams` are Promises in Next.js 16 and must be awaited (`const { projectid } = await params`). Synchronous access is removed [citation:9][citation:14].
- Authorization checks for protected routes happen in the Server Component page, the Route Handler, or the Server Action — never in a client component. Client-side checks are never sufficient (see `architecture.md` invariant #1).
- Do not run AI calls or other long-running work in a Route Handler or Server Action. Trigger a Trigger.dev job and return a handle (see `architecture.md` invariant #2).
- Server Actions are used for form mutations. Route Handlers are used for Liveblocks auth, Trigger.dev job triggering, and artifact access.
- Server Actions validate input with Zod, return a typed result for expected failures, and call `redirect()` outside of `try/catch` blocks (redirect throws, and a catch block would swallow it) [citation:2][citation:8].
- Avoid importing server-only modules (`lib/server/`, Prisma client, AI SDKs, Blob token) into any file with `'use client'`. The `server-only` package enforces this at build time.

## Styling

- Use the Tailwind utilities generated from `globals.css` exclusively. Do not use arbitrary values, raw OKLCH/hex/rgba colors, or inline styles for colors in components. The tokens in `globals.css` are the authoritative implementation of `ui-context.md`.
- Use shadcn/ui components from `components/ui/`. Add new components via the shadcn CLI rather than writing them from scratch.
- Use Lucide React icons only. Use `h-4 w-4` for inline icons and `h-5 w-5` for button icons. Icons inherit `currentColor`.
- Follow the border-radius scale from `globals.css`: `rounded-sm` for inline UI, `rounded-md` for cards and floating panels, `rounded-lg` for modals, `rounded-node` for rectangle nodes, `rounded-full` for pills.
- Use the `floating-panel` utility for sidebar and navbar surfaces rather than composing background, blur, shadow, and border manually.
- Every interactive element defines default, hover, focus-visible, active, and disabled states using the approved tokens. The focus ring uses `accent-primary` at 2px offset.
- Respect `prefers-reduced-motion`. Sidebar animations and transitions must degrade gracefully.

## API Routes

- Validate and parse request input before any logic runs. Use Zod and return a structured error response for validation failures (`{ ok: false, errors: {...} }` for Server Actions, a consistent JSON error shape for Route Handlers) [citation:2].
- Authenticate the Clerk session and verify project ownership or collaborator access before any read or mutation of project data. A `projectId` from the client is never trusted without an access check.
- Return consistent response shapes. Server Actions return typed results (`{ ok: true, ... }` or `{ ok: false, errors?, message? }`). Route Handlers return `Response.json(body, { status })` with a documented error shape.
- Do not run AI calls inline. Trigger a Trigger.dev job and return a job handle.
- Route Handlers and Server Actions are thin: validate → authorize → delegate to `lib/` → respond or redirect. No business logic in the handler or action body.
- Never log secrets or full request bodies containing sensitive data.
- For the Liveblocks auth endpoint, verify the Clerk user is the project owner or a collaborator before issuing a room token (see `architecture.md` invariant #3).

## Data and Storage

- Postgres (Neon) is the authoritative source for project metadata, ownership, collaborators, and artifact paths. Vercel Blob stores only generated artifacts (Markdown specs, canvas JSON snapshots). Authoritative metadata never lives in Blob (see `architecture.md` Storage Model).
- Every `blobPath` stored in Postgres must reference an existing Vercel Blob object. Project deletion cascades must clean up associated blobs (see `architecture.md` invariant #4).
- Create a single Prisma Client instance in `lib/db.ts` guarded by a global variable to avoid multiple instances during Next.js hot-reload.
- Prisma Client must not be imported into client bundles. It lives in `lib/` and is guarded with `import 'server-only'`.
- Use Prisma transactions for operations that touch multiple related records (for example, creating a project and its owner association in one transaction).
- Validate all external input before it reaches Prisma. Database constraints are a safety net, not a substitute for user-facing validation.
- Canvas state in Liveblocks Storage is the live collaborative source. Persisted snapshots are for recovery and spec generation, not for live sync (see `architecture.md` invariant #6).

## File Organization

- `app/` — Routes, pages, and layouts. Server Components by default; delegates to `components/`, `lib/`, and `actions/`.
- `app/api/` — Route Handlers: Liveblocks auth, Trigger.dev job triggering, artifact access. Thin; delegates to `lib/`.
- `actions/` — Server Actions for form mutations (Create Project, collaborator add/remove, simple project edits). Each action validates with Zod, authorizes via Clerk + Postgres, delegates to `lib/`, and returns a typed result.
- `components/` — Reusable UI components. shadcn/ui primitives in `components/ui/`; feature components (canvas, sidebars, toolbar) elsewhere.
- `components/ui/` — shadcn/ui primitives only. Do not modify generated components unless necessary; prefer composition.
- `hooks/` — Client-only React hooks for canvas and collaboration wiring: Liveblocks presence/storage bindings, React Flow state wiring, AI job status subscriptions. Must not import server-only modules.
- `lib/` — Shared server utilities: Prisma client (`lib/db.ts`), Vercel Blob client, Clerk helpers, Liveblocks auth helper, Trigger.dev client, AI provider clients.
- `lib/server/` — Server-only modules guarded with `import 'server-only'`.
- `trigger/` — Trigger.dev task definitions for AI graph generation and spec generation. Tasks validate their payload with Zod, authorize (if invoked on behalf of a user), and delegate to `lib/`.
- `prisma/` — Prisma schema and migrations.
- `types/` — Shared TypeScript types for canvas node/edge data, API payloads, and Server Action results.
