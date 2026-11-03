# Project Analysis

## 1. Project Summary

Systema is a real-time collaborative system design workspace for solo developers and small teams. Users describe a system in plain English, an AI agent maps it onto a shared canvas, collaborators refine the architecture together, and the application generates a downloadable Markdown technical specification from the resulting graph. The product replaces output-less whiteboard sessions with a workspace that produces a build-ready specification.

**Project type:** New project. No repository, no prototype, no existing implementation. This analysis is derived entirely from six approved context files and the `AGENTS.md` entry point.

**Analysis scope:** Establish requirements, constraints, risks, and unresolved decisions to serve as input for feature mapping. This report does not generate the feature map or feature specifications.

## 2. Goals and Intended Users

**Goals (confirmed, from `project-overview.md`):**

1. Enable a solo developer to translate a plain-English system idea into an editable, connected architecture graph without a blank canvas.
2. Enable small teams to collaborate on the same design in real time (simultaneous editing, presence, comments).
3. Produce a downloadable Markdown specification from the graph, node/edge names/descriptions, and comments, suitable as input for another AI agent.
4. Persist projects so users can save, reopen, and continue designs.
5. Operate within a zero-cost budget using free-tier services.

**Intended users:**

- Solo developers translating ideas into architecture.
- Small teams (owner + editors) collaborating on a shared design.
- Not commercial: personal use by the developer and friends.

**User needs (derived):**

- Fast path from idea to diagram, whether by manual construction, starter template, or AI generation.
- Real-time shared editing with visible presence.
- A specification output that is directly usable by another AI agent.

## 3. Core Workflows

**Three peer entry paths into the editor.** All three produce the same artifact — a saved project at `/editor/[projectid]` scoped to the owner and collaborators — and all three converge on the same editable canvas surface:

- **Path A — Blank canvas.** User opens a project, builds the design manually using the six shapes, and saves it.
- **Path B — Fixed starter template.** User imports one of the codebase-defined starter templates into their project, then edits it.
- **Path C — AI generation.** User prompts the AI, which generates a graph into the project as a Trigger.dev background job, then edits it.

**Composability of editing.** Any design, regardless of origin, can be edited or extended manually, with AI, or both:

- A manually built graph can be extended by AI.
- An AI-generated graph can be edited manually.
- A template-imported graph can be edited either manually or by AI.
- AI and templates are additive inputs to the same editable surface, never prerequisites for editing.

**Primary workflow (from `project-overview.md`, with the entry paths made explicit):**

1. Sign in (Clerk).
2. Create or select a project.
3. Enter the project workspace (`/editor/[projectid]`).
4. Choose an entry path: blank canvas, fixed starter template, or AI prompt. (Optional — the user may also arrive at an existing saved project.)
5. Edit or extend the design manually, with AI, or both.
6. Collaborators edit and refine in real time.
7. Trigger spec generation from the AI sidebar.
8. App generates and persists the Markdown spec.
9. Review, preview, or download the spec.
10. Optionally download the canvas JSON snapshot.
11. Log out.

**Alternative flows:**

- Invite a collaborator at any time.
- Owner adds/removes collaborators by email.

**Extended flow (confirmed by user, extends current scope):**

- Delete a project, which must delete its blobs and metadata.

## 4. Functional Requirements

**Confirmed (from `project-overview.md` and `architecture.md`):**

| Area                            | Requirement                                                                                                                                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth                            | Clerk sign-in/sign-out; authenticated users only                                                                                                                                                        |
| Roles                           | Owner and Editor (collaborator); no viewer                                                                                                                                                              |
| Project creation                | Any authenticated user creates a project and becomes owner; auto-generated slug serves as `projectId`                                                                                                   |
| Collaborators                   | Owner-only add/remove by email; collaborators must be authenticated                                                                                                                                     |
| Canvas editing                  | Create/edit/delete nodes and edges manually                                                                                                                                                             |
| Canvas editing independence     | Manual editing operations are complete and verifiable on their own. A design built entirely by hand must be fully editable, savable, and usable without ever using AI or templates.                     |
| Node behavior                   | Six shapes (rectangle, diamond, circle, pill, cylinder, hexagon); unnamed by default; editable name/description; universal 6-color palette; user-resizable                                              |
| Edge behavior                   | Named and editable; single consistent stroke color; optional label background                                                                                                                           |
| Editing composability           | Any graph, regardless of origin (manual, template, AI), can be edited or extended manually or with AI                                                                                                   |
| Starter templates               | Fixed set in codebase (monolith, microservices, event-driven, serverless); available in every workspace; importable into a project; **not user-created and not reusable by other owners**               |
| Saved designs                   | A user's saved design is a **project**, not a template. It persists at `/editor/[projectid]` and is accessible only to the owner and that project's collaborators. It cannot be reused by other owners. |
| AI generation                   | Prompt → generate/extend/modify graph; Trigger.dev background job; Gemini primary, Groq fallback                                                                                                        |
| AI sidebar                      | Three tabs: prompt + AI feedback; comments; spec generation                                                                                                                                             |
| Real-time                       | Simultaneous editing, presence (cursors + avatars), comments, conflict handling via Liveblocks                                                                                                          |
| Persistence                     | Autosave + small number of recovery snapshots; reopenable                                                                                                                                               |
| Spec generation                 | AI-generated Markdown from graph + names/descriptions + comments; previewable; downloadable by owner and editors                                                                                        |
| Canvas JSON download            | Downloadable snapshot stored in Vercel Blob                                                                                                                                                             |
| **Project deletion (extended)** | **Deleting a project must delete its blobs and metadata**                                                                                                                                               |

**Scope boundary:**

- In scope: all of the above.
- Out of scope: billing, enterprise tiers beyond owner/editor, mobile app, user-created reusable templates, detailed UI layout/screen design (deferred to later design documents).

## 5. Non-Functional Requirements

**Confirmed or established:**

| Area                   | Requirement                                                                                                 | Source                         |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Budget                 | Zero-cost / free tier only                                                                                  | `project-overview.md`          |
| Accessibility          | WCAG AA contrast for text; focus-visible states; `prefers-reduced-motion` respected                         | `ui-context.md`                |
| Theme                  | Dark only                                                                                                   | `ui-context.md`                |
| TypeScript             | Strict mode + `noUncheckedIndexedAccess` + `noFallthroughCasesInSwitch` + `useUnknownInCatchVariables`      | `code-standards.md`            |
| Server/client boundary | Server Components default; `'use client'` only when required; `server-only` package guards server modules   | `code-standards.md`            |
| Authorization          | All checks server-side (Route Handlers, Server Actions, Liveblocks auth endpoint, Trigger.dev entry points) | `architecture.md` invariant #1 |
| Background work        | AI jobs only in Trigger.dev; never inline                                                                   | `architecture.md` invariant #2 |
| Secrets                | Never reach client bundles                                                                                  | `architecture.md` invariant #5 |

**Unresolved (recorded as decisions to make before relevant feature specs):**

- Canvas performance target (small/medium diagrams vs. large graphs).
- Collaborator concurrency per room (2–5 vs. 10+).
- Browser support (evergreen only vs. older browsers).

## 6. Technical Stack and Constraints

**Stack (from `architecture.md`):**

| Layer           | Technology                               |
| --------------- | ---------------------------------------- |
| Framework       | Next.js 16 (App Router) + TypeScript     |
| UI              | Tailwind CSS v4 + React Flow             |
| Real-time       | Liveblocks                               |
| Auth            | Clerk                                    |
| Database        | Neon Postgres + Prisma                   |
| Object Storage  | Vercel Blob (private store)              |
| Background Jobs | Trigger.dev                              |
| AI              | Google Gemini (primary), Groq (fallback) |
| Hosting         | Vercel                                   |

**Constraints:**

- Zero-cost budget: all services must operate within free-tier allowances. When limits are exceeded, features may pause rather than bill.
- Next.js 16: `params`/`searchParams` are Promises and must be awaited; `next lint` removed; `proxy.ts` replaces `middleware.ts` for Clerk; bundled docs in `node_modules/next/dist/docs/` take precedence over training data.
- Prisma in Trigger.dev: pool size `max: 1` per run; `tasks.onWait` handler must call `prisma.$disconnect()` to release connections. This may require a separate Prisma client configuration for Trigger.dev vs. Next.js.
- Vercel Blob private store: reads require authentication and route through a Vercel Function; SDK uses OIDC on Vercel or `BLOB_READ_WRITE_TOKEN` outside.
- Clerk: `clerkMiddleware()` goes in `proxy.ts`, not `middleware.ts`.

## 7. Architecture and Major Components

**System boundaries (from `architecture.md`):**

- `app/` — Routes, pages, layouts. Server Components default; delegates to components and lib.
- `app/api/` — Route Handlers: Liveblocks auth, Trigger.dev job triggering, artifact access.
- `actions/` — Server Actions for form mutations (Create Project, collaborator add/remove, simple edits).
- `components/` — UI components; shadcn/ui primitives in `components/ui/`.
- `hooks/` — Client-only React hooks for canvas/collaboration wiring; no server-only imports.
- `lib/` — Shared server utilities: Prisma, Blob, Clerk, Liveblocks auth, Trigger.dev client, AI clients.
- `lib/server/` — Server-only modules guarded with `server-only`.
- `trigger/` — Trigger.dev task definitions.
- `prisma/` — Schema and migrations.
- `types/` — Shared TypeScript types.

**Storage model:**

- Postgres: `Project` (ownerId, name, timestamps), `Collaborator` (projectId, userId, role), `CanvasSnapshot` (projectId, blobPath, createdAt), `Artifact` (projectId, type: spec | canvas-json, blobPath, createdAt).
- Vercel Blob: Markdown specs and canvas JSON snapshots. Paths in Postgres; authoritative metadata never in Blob.
- Liveblocks Storage: live collaborative canvas state. Autosave writes to Blob + Postgres snapshot; room load rehydrates from latest persisted snapshot.

**AI pipeline:**

- Single Trigger.dev job. Gemini primary, Groq fallback. Fallback policy: one retry on transient failure, respect `Retry-After` on 429, exponential backoff before failover, immediate failover on non-retryable errors.
- Graph generation output: job writes to Postgres/Blob, client applies to canvas (confirmed decision).
- Spec generation input: latest persisted snapshot + Postgres comments (confirmed decision). Trigger.dev does not need Liveblocks secret for this.

## 8. Existing Functionality and Reusable Capabilities

**None.** No repository, no prototype, no scratch work exists. The starting point is zero. This section will remain empty until implementation begins.

## 9. Data, Integrations, and Important Contracts

**Data entities:**

- `Project` — id (slug), ownerId (Clerk user ID), name, timestamps.
- `Collaborator` — projectId, userId (Clerk), role (`editor`).
- `CanvasSnapshot` — projectId, blobPath, createdAt.
- `Artifact` — projectId, type (`spec` | `canvas-json`), blobPath, createdAt.

**External integrations:**

- **Clerk** — identity, session. Keys: publishable + secret.
- **Liveblocks** — room tokens, presence, storage, comments. Keys: public + secret.
- **Neon** — Postgres connection string.
- **Vercel Blob** — `BLOB_READ_WRITE_TOKEN` (or OIDC on Vercel).
- **Trigger.dev** — project ref + secret key; its own `DATABASE_URL`, Blob token, AI keys.
- **Gemini / Groq** — API keys, only in Trigger.dev.

**Canvas JSON schema (initial sample, from `progress-tracker.md`):**

- `nodes[]`: id, type (shape), position, width, height, data {name, description, color}.
- `edges[]`: id, source, target, data {name, description}.
- `viewport`: {x, y, zoom}.
- This schema is the persisted Blob artifact and the spec-generation input.

## 10. Security and Quality Considerations

**Security:**

- Auth: Clerk session required for all project access.
- Authorization: owner or `Collaborator` row, verified server-side in Route Handlers, Server Actions, Liveblocks auth endpoint, and Trigger.dev task entry points.
- Liveblocks room token issued only after access check.
- Secrets: server-only, never in client bundles. `server-only` package enforces `lib/server/`.
- Blob: private store; reads authenticated and routed through a Vercel Function.
- Validation: Zod at all system boundaries (Route Handlers, Server Actions, Trigger.dev entry points, AI responses).

**Quality:**

- TypeScript strict + `noUncheckedIndexedAccess`.
- Build (`npm run build`), typecheck (`npx tsc --noEmit`), lint (direct ESLint, not `next lint`).
- Manual success-criteria verification per unit, recorded in `progress-tracker.md`.
- No automated test framework in v1 (confirmed decision).

## 11. Risks and Technical Limitations

| Risk / limitation                          | Evidence                                                                                             | Why it matters                                                                                | Affected area                                                   |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Scope discrepancy: project deletion**    | `architecture.md` invariant #4 requires blob deletion; `project-overview.md` has no deletion feature | User confirmed deletion is required; this extends approved scope                              | `project-overview.md` scope; Data/Storage unit; feature mapping |
| **Free-tier limits may pause features**    | Confirmed in architecture and tracker assumptions                                                    | Not billing, but features stop working when limits exceeded                                   | All AI, collaboration, storage units                            |
| **Trigger.dev + Prisma pooling**           | Official guidance: `max: 1` per run; `$disconnect()` on wait                                         | Next.js and Trigger.dev have different pooling needs; a single `lib/db.ts` may not serve both | Prisma scaffolding unit; spec generation unit                   |
| **Canvas performance undefined**           | No target in approved docs                                                                           | Affects React Flow rendering strategy, Liveblocks payload size, autosave frequency            | Canvas unit; Persistence unit                                   |
| **Collaborator concurrency undefined**     | No target in approved docs                                                                           | Affects Liveblocks plan limits, presence design                                               | Collaboration unit                                              |
| **Vercel Blob private store read pattern** | Private reads route through a Function                                                               | Artifact download must go through an authenticated Route Handler, not a direct Blob URL       | Spec generation unit; artifact access Route Handler             |
| **No automated tests**                     | Confirmed decision                                                                                   | Regressions in canvas/Liveblocks integration may not be caught until manual verification      | All units; mitigated by manual checklists                       |
| **AI provider rate limits change**         | Free-tier limits are not fixed; shown per project                                                    | Fallback policy mitigates, but sustained usage may exceed free tiers                          | AI generation unit                                              |

## 12. Assumptions and Unresolved Decisions

**Assumptions:**

- Vercel Blob store is **private** (consistent with project data and earlier approval).
- The AI fallback policy recorded in `architecture.md` (one retry, respect `Retry-After`, exponential backoff, immediate failover on non-retryable errors) is approved.
- Canvas JSON schema sample in `progress-tracker.md` is the initial reference; coding agent may extend with approval and a corresponding `architecture.md` update.
- Context files live in `context/`; analysis lives in `planning/`.

**Terminology:**

- "Starter template" means a **fixed, codebase-defined** design pattern available in every workspace. It is not user-editable as a template and is not reusable by other owners.
- "Project" means a **user-authored saved design**, scoped to its owner and collaborators at `/editor/[projectid]`. A project is not a template and cannot be reused by other owners.
- The user's vocabulary sometimes uses "template" for a saved project. This analysis uses "project" for that concept and "starter template" for the fixed codebase templates.

**Unresolved decisions (block feature units):**

1. **Canvas performance target** (small/medium vs. large graphs) — blocks Canvas unit.
2. **Collaborator concurrency per room** — blocks Collaboration unit.
3. **Browser support** — blocks Canvas unit and overall UI.
4. **Autosave cadence** — blocks Persistence unit. (Proposed: debounced 3s on change, force-save every 60s if dirty; awaiting confirmation.)
5. **Recovery snapshot retention count** — blocks Persistence unit.
6. **Liveblocks room ID strategy** (projectId as room ID vs. separate room concept) — blocks Collaboration unit.
7. **Node resize min/max bounds** — blocks Canvas unit.

**Resolved by this analysis:**

- Project deletion is **in scope** and must delete blobs and metadata. This requires updating `project-overview.md` to add the feature.
- Spec generation reads from latest persisted snapshot + Postgres comments (no Liveblocks secret in Trigger.dev).
- Canvas editing is composable in both directions: any graph from any origin can be edited manually or with AI.

## 13. Recommendations Requiring Approval

1. **Update `project-overview.md` to add project deletion** to In Scope, Features (Persistence or a new subsection), and Success Criteria ("A project can be deleted and its blobs and metadata are removed"). This is the cleanest way to resolve the scope discrepancy. **Awaiting approval.**
2. **Adopt the proposed autosave cadence** (debounced 3s, force-save 60s if dirty) and record it in `architecture.md`. **Awaiting approval.**
3. **Confirm the remaining unresolved decisions** (performance target, concurrency, browser support, snapshot count, room ID, resize bounds) or explicitly defer them to their respective feature specs. **Awaiting your instruction.**
4. **Consider separate Prisma client configuration for Trigger.dev** (`max: 1`, `tasks.onWait` disconnect) vs. Next.js. This is an implementation detail for the Prisma scaffolding unit, but flagging it now avoids rework. **Awaiting acknowledgement.**

## 14. Readiness for Feature Mapping

The project is **ready for feature mapping with conditions**. The product definition, architecture, UI system, coding standards, and workflow are approved and internally consistent. The feature categories that require decomposition are:

1. **Scaffolding** (piecemeal: Next.js 16 + TS + Tailwind; shadcn + globals; Geist; Prisma + Neon; Clerk + proxy; base layout).
2. **Authentication and authorization** (Clerk, roles, access checks).
3. **Project lifecycle** (create, list, open, delete).
4. **Canvas and graph editing** (shapes, nodes, edges, resize, color palette, manual editing independence, composability with AI).
5. **Templates** (fixed starter templates, import).
6. **Real-time collaboration** (Liveblocks room, presence, comments, conflict handling).
7. **AI-assisted design** (Trigger.dev job, Gemini/Groq, graph generation output).
8. **Persistence and autosave** (Blob, Postgres snapshots, recovery).
9. **Specification generation and export** (Trigger.dev job, Markdown, preview, download).
10. **Canvas JSON export** (download artifact).

**Ordering constraint:** Canvas and graph editing must be independently complete and verifiable before AI generation and Templates are built, because both AI and Templates feed into the same editable surface and cannot be verified without it.

**Conditions before feature mapping:**

- Confirm or defer the unresolved decisions in Section 12.
- Approve the `project-overview.md` update for project deletion.
- Acknowledge the Trigger.dev Prisma pooling consideration.

No feature map or feature specification has been generated. This report is the input for the next phase.
