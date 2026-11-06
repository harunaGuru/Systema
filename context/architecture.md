# Architecture Context

## Stack

| Layer           | Technology                               | Role                                                                   |
| --------------- | ---------------------------------------- | ---------------------------------------------------------------------- |
| Framework       | Next.js (App Router) + TypeScript        | UI, API routes, server-side authorization, orchestration               |
| UI              | Tailwind CSS + React Flow                | Canvas rendering, styling, graph interaction                           |
| Real-time       | Liveblocks                               | Live collaborative canvas state, presence, comments, conflict handling |
| Auth            | Clerk                                    | Identity verification and session management                           |
| Database        | Neon Postgres + Prisma 7 (ESM, driver adapter)                   | Project metadata, collaborators, snapshot records, artifact paths      |
| Object Storage  | Vercel Blob                              | Markdown specs and canvas JSON snapshots                               |
| Background Jobs | Trigger.dev                              | AI graph generation/modification and spec generation                   |
| AI              | Google Gemini (primary), Groq (fallback) | Model calls, executed only inside Trigger.dev jobs                     |
| Hosting         | Vercel                                   | Next.js deployment                                                     |

## System Boundaries

- `app/` — Routing, pages, and layouts. Thin; delegates UI to `components/` and logic/clients to `lib/`.
- `app/api/` — Authenticated request handlers: input validation, ownership checks, task triggering, and persistence. Thin; delegates logic and clients to `lib/`.
- `components/` — Reusable UI components, including the canvas and AI sidebar.
- `hooks/` — Client-side React hooks for canvas interaction and collaboration: Liveblocks presence/storage bindings, React Flow state wiring, and AI job status subscriptions. Client-only; must not import server-only modules.
- `lib/` — Shared server utilities: Prisma client, Vercel Blob client, Clerk helpers, Liveblocks auth helper, Trigger.dev client, and AI provider clients.
- `lib/server/` — Server-only modules guarded against client imports.
- `trigger/` — Trigger.dev task definitions for AI graph generation and spec generation.
- `prisma/` — Prisma schema and migrations.
- `types/` — Shared TypeScript types for canvas node/edge data and API payloads.

## Storage Model

- **Postgres (Neon)**: Authoritative for project metadata and references — `Project` (ownerId, name, timestamps), `Collaborator` (projectId, userId, role), `CanvasSnapshot` (projectId, blobPath, createdAt), and `Artifact` (projectId, type: spec | canvas-json, blobPath, createdAt).
- **Vercel Blob**: Generated Markdown specs and canvas JSON snapshots. Postgres holds only their paths; authoritative ownership and metadata never live in Blob.
- **Liveblocks Storage**: Live collaborative canvas state (nodes, edges). Autosave writes the current state to Vercel Blob and records a snapshot in Postgres; on room load, the latest persisted snapshot rehydrates Liveblocks.

## Auth and Access Model

- Every user signs in via Clerk; the Clerk user ID is stored in `Project.ownerId` and `Collaborator.userId`.
- Each project has a single owner. Editors are recorded as `Collaborator` rows.
- Access to a project requires an authenticated Clerk session and either ownership or a matching `Collaborator` record.
- Liveblocks room tokens are issued by the auth endpoint only after that access check passes.
- Only the owner may add or remove collaborators.
- All protected operations are re-verified server-side in `app/api/` route handlers and Trigger.dev task entry points; client-side checks are never sufficient.

## Invariants

1. All authorization checks happen server-side — specifically in `app/api/` route handlers, the Liveblocks auth endpoint, and Trigger.dev task entry points — never client-only.
2. AI graph generation and spec generation run only as Trigger.dev background jobs, never synchronously in a Next.js route handler.
3. Liveblocks room tokens are issued only after verifying the Clerk user is the project owner or a collaborator.
4. Every `blobPath` stored in Postgres must reference an existing Vercel Blob object; deleting a project must delete its blobs.
5. Server-only secrets (Clerk secret, Liveblocks secret, Blob token, AI keys) must never reach client bundles.
6. Canvas state in Liveblocks Storage is the live collaborative source; persisted snapshots are for recovery and spec generation, not for live sync.
