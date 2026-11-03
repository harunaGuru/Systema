# Feature Map

## 1. Project and Analysis References

| Reference                      | Purpose                                                           |
| ------------------------------ | ----------------------------------------------------------------- |
| `planning/project-analysis.md` | Approved project analysis (input to this map)                     |
| `context/project-overview.md`  | Product definition, goals, features, scope, success criteria      |
| `context/architecture.md`      | Stack, system boundaries, storage model, auth model, invariants   |
| `context/ui-context.md`        | Theme, tokens, layout patterns, shapes, interaction states        |
| `context/code-standards.md`    | TypeScript, Next.js, styling, API, data, file organization rules  |
| `context/ai-workflow-rules.md` | Development workflow, scoping, protected files, verification gate |
| `context/progress-tracker.md`  | Current phase, open questions, architecture decisions             |
| `AGENTS.md`                    | Agent entry point, context reading order, Next.js 16 notes        |

**Analysis approval:** Approved by user. Seven unresolved decisions were resolved and approved before this map (Section 12). Context files are protected and read-only during this phase; no changes were made to them.

## 2. Feature Map Summary

Systema is decomposed into **8 capability groups** and **30 implementation units**, ordered strictly sequentially with no parallel work. The sequence follows a **visuals-first principle**: the first seven units produce visible UI that can be verified by looking at the screen, with mock data where a backend is not yet needed. Backend capabilities (Prisma, Clerk wiring, Liveblocks, Trigger.dev) are introduced only when a unit genuinely requires them.

**Key structural decisions:**

- Strict linear sequence. No unit runs in parallel with another. Each unit has at most one predecessor in the proposed order.
- Design system and editor chrome come before any backend.
- Auth UI comes before auth backend; the Clerk provider and proxy are wired in the auth unit, and the database-backed access helper follows.
- Prisma and Neon arrive at `PROJ-001`, the first unit that needs persistence, not in foundation.
- The editor route, canvas, and AI sidebar each get a visible mock unit before their real backend unit.
- Sensitive units (`AUTH-003`, `PROJ-005`, `COLLAB-001`, `PERSIST-001`, `SPEC-001`) carry a short planning note inside their spec, not a separate planning document.

**Total:** 30 units across 8 capability groups.

## 3. Capability Groups

| Group                  | ID Prefix | Units | Purpose                                                                           |
| ---------------------- | --------- | ----- | --------------------------------------------------------------------------------- |
| UI Foundation          | `UI`      | 6     | Next.js, design system, fonts, editor chrome, editor home, project dialogs (mock) |
| Authentication         | `AUTH`    | 4     | Clerk wiring, access helper, Liveblocks auth, collaborator actions                |
| Project Lifecycle      | `PROJ`    | 5     | Prisma + schema, create, list, editor access, delete                              |
| Canvas & Graph         | `CANVAS`  | 5     | React Flow shell, shapes, CRUD, color palette, toolbar, templates                 |
| Collaboration          | `COLLAB`  | 3     | Liveblocks room, presence, comments                                               |
| AI-Assisted Design     | `AI`      | 3     | Trigger.dev setup, graph task, sidebar prompt tab                                 |
| Persistence            | `PERSIST` | 2     | Autosave + manual save, snapshot restore                                          |
| Specification & Export | `SPEC`    | 2     | Spec task, preview/download                                                       |

## 4. Implementation Unit Inventory

### UI Foundation (`UI`)

**UI-001 — Next.js 16 + TypeScript + Tailwind v4**

- **Objective:** Initialize the project with Next.js 16 App Router, strict TypeScript, and Tailwind v4.
- **Outcome:** `package.json`, `tsconfig.json` (strict + `noUncheckedIndexedAccess` + `noFallthroughCasesInSwitch` + `useUnknownInCatchVariables`), `next.config.ts`, Tailwind configured, `app/layout.tsx` and `app/page.tsx` render.
- **Scope boundary:** No shadcn, no fonts, no backend.
- **Dependencies:** None.
- **Verification:** `npm run build`, `npx tsc --noEmit`, `npm run lint` pass.
- **Risk:** Low.

**UI-002 — shadcn/ui + globals.css**

- **Objective:** Initialize shadcn/ui and integrate the approved `globals.css` tokens.
- **Outcome:** `components.json`, shadcn CLI working, `app/globals.css` with tokens from `ui-context.md`, `lib/utils.ts` with `cn()`.
- **Scope boundary:** Tokens and CLI only; no feature components.
- **Dependencies:** UI-001.
- **Verification:** Build passes; a sample button renders with `bg-surface`/`text-primary`; no hardcoded colors.
- **Risk:** Low.

**UI-003 — Geist fonts**

- **Objective:** Load Geist Sans and Geist Mono via `next/font`.
- **Outcome:** `--font-geist-sans` / `--font-geist-mono` set on `<html>`; `--font-sans` / `--font-mono` resolve.
- **Scope boundary:** Fonts only.
- **Dependencies:** UI-002.
- **Verification:** Body renders in Geist Sans; mono in Geist Mono; build passes.
- **Risk:** Low.

**UI-004 — Editor chrome (navbar + left sidebar shell)**

- **Objective:** Build the reusable TopNavbar and floating left sidebar shell with mock content.
- **Outcome:** `components/editor/editor-navbar.tsx` (three sections: sidebar toggle with `PanelLeftOpen`/`PanelLeftClose`, empty right section), `components/editor/project-sidebar.tsx` (floating, slides from left, `isOpen` prop, header, `Tabs` with "My Projects" / "Shared" empty states, full-width "New Project" button with `Plus` icon). Both use tokens from `globals.css`.
- **Scope boundary:** Shell only; no dialogs, no data, no auth.
- **Dependencies:** UI-003.
- **Verification:** Navbar and sidebar render; toggle animates; tabs switch; build passes.
- **Risk:** Low.

**UI-005 — Editor home screen (mock)**

- **Objective:** Build the `/editor` home screen with centered call-to-action.
- **Outcome:** `app/editor/page.tsx` reusing the chrome; centered heading, description, "New Project" button that opens the Create Project dialog (dialog in UI-006).
- **Scope boundary:** No persistence, no API calls.
- **Dependencies:** UI-004.
- **Verification:** Home renders with chrome; button opens dialog placeholder; build passes.
- **Risk:** Low.

**UI-006 — Project dialogs (mock)**

- **Objective:** Build Create, Rename, and Delete project dialogs with local state and slug preview.
- **Outcome:** Three dialog components; Create has name input + live slug preview; Rename is prefilled + autofocuses + Enter submits; Delete is destructive confirmation only. A dedicated hook manages dialog/form/loading state. Sidebar item actions (rename, delete) wired, shown only for owned projects.
- **Scope boundary:** Mock data only; no API calls, no persistence.
- **Dependencies:** UI-005.
- **Verification:** Slug preview updates; dialogs open/close; sidebar actions show for owned only; build passes.
- **Risk:** Low.

### Authentication (`AUTH`)

**AUTH-001 — Clerk provider, proxy, sign-in/up pages**

- **Objective:** Wire Clerk into the app with dark theme, auth pages, and route protection.
- **Outcome:** `ClerkProvider` with Clerk `dark` theme wrapping the root layout; appearance overrides using app CSS variables (no hardcoded colors); sign-in and sign-up pages (large: two-panel; small: form only); `proxy.ts` at root with `clerkMiddleware()`; public routes from Clerk env vars, everything else protected; `/` redirects authenticated → `/editor`, unauthenticated → `/sign-in`; Clerk `UserButton` in editor navbar right section.
- **Scope boundary:** Auth UI and routing only; no database-backed access helper yet.
- **Dependencies:** UI-006. Requires Clerk keys (user supplies).
- **Verification:** Sign-in flow works; protected route redirects; `proxy.ts` exists (not `middleware.ts`); build passes.
- **Risk:** Medium (Next.js 16 `proxy.ts` convention, Clerk keys).

**AUTH-002 — Access helper + Prisma + Neon**

- **Objective:** Add Prisma + Neon and the server-side `requireProjectAccess` helper.
- **Outcome:** `prisma/schema.prisma` with `Project`, `Collaborator`, `CanvasSnapshot`, `Artifact`; migration applied; `lib/db.ts` singleton; `lib/server/auth.ts` exporting `requireProjectAccess(projectId)` that checks Clerk session + owner/collaborator.
- **Scope boundary:** Schema and helper only; no queries used yet by other units.
- **Dependencies:** AUTH-001. Requires Neon `DATABASE_URL` (user supplies).
- **Verification:** Migration succeeds; helper returns role for owner/collaborator, rejects others; build passes.
- **Risk:** Medium (security-critical helper).
- **Planning note in spec:** Document the access check contract and the error behavior (redirect vs. 404) before implementation.

**AUTH-003 — Liveblocks auth endpoint**

- **Objective:** Route Handler issuing Liveblocks room tokens after access check.
- **Outcome:** `app/api/liveblocks-auth/route.ts` validating Clerk session + `requireProjectAccess`, then issuing a token scoped to the room (room ID = `projectId`).
- **Scope boundary:** Token issuance only; no room UI.
- **Dependencies:** AUTH-002. Requires Liveblocks secret (user supplies).
- **Verification:** Owner/editor gets a token; non-collaborator rejected; build passes.
- **Risk:** High (invariant #3).
- **Planning note in spec:** Document token scope, error responses, and the exact `requireProjectAccess` call. No separate planning document.

**AUTH-004 — Collaborator management actions**

- **Objective:** Server Actions to add/remove collaborators by email, owner-only.
- **Outcome:** `actions/collaborators.ts` with `addCollaborator`/`removeCollaborator`; Zod validation; owner check; collaborator must be an authenticated Clerk user.
- **Scope boundary:** Actions only; UI wiring in a later spec if needed.
- **Dependencies:** AUTH-002, PROJ-001.
- **Verification:** Owner can add/remove; editor cannot; build passes.
- **Risk:** Medium.

### Project Lifecycle (`PROJ`)

**PROJ-001 — Prisma schema applied and seeded (first backend unit)**

- **Objective:** Finalize the Prisma schema and connection that the project feature needs.
- **Outcome:** Schema confirmed from AUTH-002; `npx prisma migrate dev` and `generate` succeed; `lib/db.ts` singleton with `server-only`; no queries yet.
- **Scope boundary:** Schema and client only.
- **Dependencies:** AUTH-002.
- **Verification:** Migrations apply; client generates; build passes.
- **Risk:** Medium.
- **Planning note in spec:** Record the Trigger.dev Prisma pooling note (`max: 1`, `$disconnect()` on wait) as a future consideration, not implemented here.

**PROJ-002 — Create project action + wire dialog**

- **Objective:** Server Action to create a project (name → slug → owner) and wire the Create dialog to it.
- **Outcome:** `actions/projects.ts` `createProject`; slug generation; `Project` row with `ownerId` from Clerk; `redirect()` to `/editor/[projectid]`; UI-006 Create dialog now calls the action instead of mock.
- **Scope boundary:** Create only.
- **Dependencies:** PROJ-001, UI-006.
- **Verification:** Create flow works end to end; slug is unique; redirect occurs; build passes.
- **Risk:** Low.

**PROJ-003 — Project list (owned/shared)**

- **Objective:** Replace mock sidebar data with real owned and shared projects.
- **Outcome:** Sidebar tabs fetch owned + shared projects from Postgres; each links to `/editor/[projectid]`.
- **Scope boundary:** List only.
- **Dependencies:** PROJ-002.
- **Verification:** Owner tab shows owned; Shared shows collaborator projects; build passes.
- **Risk:** Low.

**PROJ-004 — Editor route access check**

- **Objective:** Server Component page at `/editor/[projectid]` that verifies access.
- **Outcome:** `app/editor/[projectid]/page.tsx` awaits `params`, calls `requireProjectAccess`, renders the editor shell.
- **Scope boundary:** Route and access gate only; canvas in later units.
- **Dependencies:** AUTH-002, PROJ-003.
- **Verification:** Owner/editor sees shell; non-collaborator gets 404/redirect; build passes.
- **Risk:** Medium.

**PROJ-005 — Delete project + blobs**

- **Objective:** Delete project metadata and Vercel Blob objects.
- **Outcome:** Server Action `deleteProject`; Prisma transaction deletes `Project` + `Collaborator` + `CanvasSnapshot` + `Artifact`; Blob objects deleted; owner-only.
- **Scope boundary:** Deletion only.
- **Dependencies:** PROJ-004. Requires Blob token (user supplies).
- **Verification:** Owner deletes; blobs gone; editor cannot; build passes.
- **Risk:** High (destructive, invariant #4).
- **Planning note in spec:** Document the cascade order (Postgres first or Blob first), failure recovery if Blob deletion partially fails, and owner-only enforcement.

### Canvas & Graph (`CANVAS`)

**CANVAS-001 — React Flow shell + six shapes**

- **Objective:** Render React Flow in the editor with the six shapes available on the canvas.
- **Outcome:** `components/editor/canvas.tsx`; `bg-canvas`; themed controls/minimap; six SVG node types (rectangle, diamond, circle, pill, cylinder, hexagon); mono labels; default Slate; resizable min 80×60, max 600×400.
- **Scope boundary:** Rendering only; no CRUD, no palette, no Liveblocks.
- **Dependencies:** PROJ-004, UI-004.
- **Verification:** All six shapes render and resize; labels clamp; build passes.
- **Risk:** Medium.

**CANVAS-002 — Node and edge CRUD**

- **Objective:** Create, edit (name/description), and delete nodes and edges manually.
- **Outcome:** Add/remove handlers; inline label editing; edge labels; all operations work on any graph regardless of origin.
- **Scope boundary:** Manual editing only; no AI, no templates.
- **Dependencies:** CANVAS-001.
- **Verification:** Full manual editing works end to end; build passes.
- **Risk:** Medium.

**CANVAS-003 — Node color palette**

- **Objective:** Floating palette above selected/dragged node with six swatches.
- **Outcome:** Palette component; applies `node-*` utility; paired text auto-applied.
- **Scope boundary:** Palette UI and color mutation only.
- **Dependencies:** CANVAS-002.
- **Verification:** Selecting a swatch changes node background + text; build passes.
- **Risk:** Low.

**CANVAS-004 — Shape toolbar**

- **Objective:** Bottom-centered floating toolbar with draggable shapes.
- **Outcome:** Toolbar component; drag-and-drop creates a node at drop position.
- **Scope boundary:** Toolbar only.
- **Dependencies:** CANVAS-001.
- **Verification:** Dragging a shape creates a node; build passes.
- **Risk:** Low.

**CANVAS-005 — Starter template import (mock → static JSON)**

- **Objective:** Fixed starter templates as canvas JSON, importable into the current canvas.
- **Outcome:** `lib/templates/*` with monolith, microservices, event-driven, serverless; UI action + handler that merges template into the canvas.
- **Scope boundary:** Static JSON in codebase; not user-created.
- **Dependencies:** CANVAS-002.
- **Verification:** Import works and is editable afterward; build passes.
- **Risk:** Low.

### Collaboration (`COLLAB`)

**COLLAB-001 — Liveblocks room + storage sync**

- **Objective:** Bind React Flow state to Liveblocks Storage.
- **Outcome:** `@liveblocks/react-flow`; room ID = `projectId`; storage rehydration from latest snapshot on load.
- **Scope boundary:** Room and storage sync only; no presence/comments.
- **Dependencies:** CANVAS-002, AUTH-003. Requires Liveblocks public key (user supplies).
- **Verification:** Two sessions see the same canvas; build passes.
- **Risk:** High (real-time state, rehydration).
- **Planning note in spec:** Document snapshot rehydration order, conflict behavior, and the room ID = `projectId` decision before implementation.

**COLLAB-002 — Presence (cursors and avatars)**

- **Objective:** Live cursors and avatars for up to 10 concurrent users.
- **Outcome:** `@liveblocks/react` presence hooks; cursor overlay; avatar stack in navbar.
- **Scope boundary:** Presence only.
- **Dependencies:** COLLAB-001.
- **Verification:** Two sessions see cursors and avatars; build passes.
- **Risk:** Medium.

**COLLAB-003 — Comments**

- **Objective:** Session comments in the right sidebar comments tab.
- **Outcome:** Liveblocks Comments integration; comment thread UI.
- **Scope boundary:** Comments only.
- **Dependencies:** COLLAB-001.
- **Verification:** Two sessions exchange comments; build passes.
- **Risk:** Medium.

### AI-Assisted Design (`AI`)

**AI-001 — Trigger.dev setup**

- **Objective:** Configure Trigger.dev with a no-op test task.
- **Outcome:** `trigger.config.ts`; test task completes; Prisma pooling note (`max: 1`, `$disconnect()` on wait) recorded.
- **Scope boundary:** Setup only.
- **Dependencies:** PROJ-001. Requires Trigger.dev project ref + secret (user supplies).
- **Verification:** `npx trigger.dev dev` runs; test task succeeds.
- **Risk:** Medium.
- **Planning note in spec:** Record the Prisma pooling strategy decision before the first real AI task.

**AI-002 — Graph generation task**

- **Objective:** Task that takes prompt + current graph, calls Gemini (Groq fallback), writes result to Blob/Postgres.
- **Outcome:** `trigger/generate-graph.ts`; Zod-validated payload; fallback per `architecture.md`; artifact written and path recorded.
- **Scope boundary:** Task only; client application in AI-003.
- **Dependencies:** AI-001, CANVAS-002.
- **Verification:** Task produces a valid graph artifact; fallback tested; build passes.
- **Risk:** High.
- **Planning note in spec:** Document fallback policy, artifact contract, and error handling before implementation.

**AI-003 — AI sidebar prompt tab + graph application (mock → real)**

- **Objective:** Prompt tab in right sidebar that triggers the job and applies the result to the canvas.
- **Outcome:** `components/editor/ai-prompt-tab.tsx`; mock status first, then real job trigger via Route Handler; polling; applies nodes/edges on success.
- **Scope boundary:** UI and application only.
- **Dependencies:** AI-002, COLLAB-001.
- **Verification:** Prompt → generated graph appears and is editable; build passes.
- **Risk:** High.
- **Planning note in spec:** Document job status polling vs. subscription, error UX, and application-to-live-canvas semantics.

### Persistence (`PERSIST`)

**PERSIST-001 — Autosave + manual save**

- **Objective:** Debounced autosave (3s, forced 60s) and manual save button, both writing to Blob + Postgres snapshot, retention = last 5.
- **Outcome:** `hooks/use-autosave.ts`; `actions/save-canvas.ts`; manual save button in navbar; prune oldest when count > 5.
- **Scope boundary:** Save paths and retention only.
- **Dependencies:** COLLAB-001. Requires Blob token.
- **Verification:** Autosave writes after 3s; forced save at 60s; manual save immediate; 6th snapshot prunes oldest; build passes.
- **Risk:** High (invariant #4, data integrity).
- **Planning note in spec:** Document write order (Blob then Postgres or reverse), failure recovery, and pruning transaction.

**PERSIST-002 — Recovery snapshot restore**

- **Objective:** Restore the canvas from a recovery snapshot.
- **Outcome:** UI action in navbar; loads snapshot JSON into Liveblocks, replacing current state.
- **Scope boundary:** Restore only.
- **Dependencies:** PERSIST-001.
- **Verification:** Restore replaces canvas; build passes.
- **Risk:** Medium.

### Specification & Export (`SPEC`)

**SPEC-001 — Spec generation task**

- **Objective:** Task that reads latest snapshot + comments and produces Markdown, stored in Blob.
- **Outcome:** `trigger/generate-spec.ts`; input = persisted snapshot + Postgres comments; Gemini/Groq; Markdown artifact; path in `Artifact`.
- **Scope boundary:** Task only; UI in SPEC-002.
- **Dependencies:** AI-001, PERSIST-001, COLLAB-003.
- **Verification:** Task produces a Markdown spec artifact; build passes.
- **Risk:** High.
- **Planning note in spec:** Document input contract, prompt shape, and artifact naming before implementation.

**SPEC-002 — Spec preview + download (mock → real)**

- **Objective:** Spec tab in right sidebar; preview Markdown; download via authenticated Route Handler (private Blob).
- **Outcome:** Markdown renderer in spec tab; download route handler; mock data first, then real artifact.
- **Scope boundary:** Preview and download only.
- **Dependencies:** SPEC-001.
- **Verification:** Preview renders; download works for owner and editor; build passes.
- **Risk:** Medium.

## 5. Requirement-to-Feature Traceability

| Requirement                          | Units                                     |
| ------------------------------------ | ----------------------------------------- |
| Clerk sign-in/sign-out               | AUTH-001                                  |
| Owner/Editor roles                   | AUTH-002, AUTH-004                        |
| Project creation with slug           | PROJ-002                                  |
| Project list (Owner/Shared)          | PROJ-003                                  |
| Editor access check                  | PROJ-004, AUTH-002                        |
| Project deletion + blobs             | PROJ-005                                  |
| Manual canvas editing (independent)  | CANVAS-001, CANVAS-002                    |
| Six shapes, resize bounds            | CANVAS-001                                |
| Node color palette                   | CANVAS-003                                |
| Editing composability (any origin)   | CANVAS-002, CANVAS-005, AI-003            |
| Fixed starter templates              | CANVAS-005                                |
| Real-time editing + conflict         | COLLAB-001                                |
| Presence                             | COLLAB-002                                |
| Comments                             | COLLAB-003                                |
| AI generation                        | AI-001, AI-002, AI-003                    |
| AI sidebar (3 tabs)                  | AI-003, COLLAB-003, SPEC-002              |
| Autosave + manual save + snapshots   | PERSIST-001                               |
| Snapshot restore                     | PERSIST-002                               |
| Spec generation + preview + download | SPEC-001, SPEC-002                        |
| Canvas JSON download                 | SPEC-002 (reuses artifact access pattern) |
| Next.js 16 + TS strict + Tailwind    | UI-001, UI-002                            |
| Geist fonts                          | UI-003                                    |
| Prisma + Neon                        | AUTH-002, PROJ-001                        |
| Dark theme + tokens                  | UI-002, UI-004                            |
| Build/typecheck/lint gate            | All units                                 |

**Deferred:** Detailed layout/screen design. **Excluded:** Billing, enterprise tiers, mobile, user-created reusable templates.

## 6. Dependency Register

| Unit        | Depends on                      | Provides to                                 |
| ----------- | ------------------------------- | ------------------------------------------- |
| UI-001      | —                               | All                                         |
| UI-002      | UI-001                          | UI-004                                      |
| UI-003      | UI-002                          | All UI                                      |
| UI-004      | UI-003                          | UI-005, CANVAS-001                          |
| UI-005      | UI-004                          | UI-006                                      |
| UI-006      | UI-005                          | AUTH-001, PROJ-002                          |
| AUTH-001    | UI-006                          | AUTH-002                                    |
| AUTH-002    | AUTH-001                        | AUTH-003, AUTH-004, PROJ-001, PROJ-004      |
| AUTH-003    | AUTH-002                        | COLLAB-001                                  |
| AUTH-004    | AUTH-002, PROJ-001              | —                                           |
| PROJ-001    | AUTH-002                        | PROJ-002, AI-001                            |
| PROJ-002    | PROJ-001, UI-006                | PROJ-003                                    |
| PROJ-003    | PROJ-002                        | PROJ-004                                    |
| PROJ-004    | AUTH-002, PROJ-003              | PROJ-005, CANVAS-001                        |
| PROJ-005    | PROJ-004                        | —                                           |
| CANVAS-001  | PROJ-004, UI-004                | CANVAS-002, CANVAS-004                      |
| CANVAS-002  | CANVAS-001                      | CANVAS-003, CANVAS-005, COLLAB-001, AI-002  |
| CANVAS-003  | CANVAS-002                      | —                                           |
| CANVAS-004  | CANVAS-001                      | —                                           |
| CANVAS-005  | CANVAS-002                      | —                                           |
| COLLAB-001  | CANVAS-002, AUTH-003            | COLLAB-002, COLLAB-003, PERSIST-001, AI-003 |
| COLLAB-002  | COLLAB-001                      | —                                           |
| COLLAB-003  | COLLAB-001                      | SPEC-001                                    |
| AI-001      | PROJ-001                        | AI-002, SPEC-001                            |
| AI-002      | AI-001, CANVAS-002              | AI-003                                      |
| AI-003      | AI-002, COLLAB-001              | —                                           |
| PERSIST-001 | COLLAB-001                      | PERSIST-002, SPEC-001                       |
| PERSIST-002 | PERSIST-001                     | —                                           |
| SPEC-001    | AI-001, PERSIST-001, COLLAB-003 | SPEC-002                                    |
| SPEC-002    | SPEC-001                        | —                                           |

**Validation:** No circular dependencies. `UI-001` is the only root. Every unit has at most one predecessor in the proposed sequence. No unit is scheduled before its prerequisites.

## 7. Shared-Contract Register

| ID   | Contract                                   | Owner       | Consumers                                           | Status                                        |
| ---- | ------------------------------------------ | ----------- | --------------------------------------------------- | --------------------------------------------- |
| C-01 | Canvas JSON schema                         | CANVAS-001  | CANVAS-005, AI-002, PERSIST-001, SPEC-001, SPEC-002 | Established (sample in `progress-tracker.md`) |
| C-02 | `requireProjectAccess(projectId)`          | AUTH-002    | AUTH-003, AUTH-004, PROJ-004                        | Proposed                                      |
| C-03 | Project creation (name → slug → owner)     | PROJ-002    | PROJ-003                                            | Proposed                                      |
| C-04 | Project list query (owned + shared)        | PROJ-003    | PROJ-004                                            | Proposed                                      |
| C-05 | Liveblocks auth token issuance             | AUTH-003    | COLLAB-001                                          | Proposed; **security-sensitive**              |
| C-06 | Liveblocks storage sync (room = projectId) | COLLAB-001  | PERSIST-001, AI-003                                 | Proposed; **real-time-sensitive**             |
| C-07 | AI generation payload/result               | AI-002      | AI-003, SPEC-001                                    | Proposed                                      |
| C-08 | Persistence write (Blob + snapshot row)    | PERSIST-001 | PERSIST-002, SPEC-001, SPEC-002                     | Proposed; **invariant #4**                    |
| C-09 | Deletion cascade (Postgres + Blob)         | PROJ-005    | —                                                   | Proposed; **invariant #4**                    |
| C-10 | Spec artifact access (private Blob)        | SPEC-002    | —                                                   | Proposed                                      |

## 8. Proposed Implementation Sequence

Strictly linear. Every unit is completed and verified before the next begins.

| Order | Unit        | Stage                   |
| ----- | ----------- | ----------------------- |
| 1     | UI-001      | Foundation              |
| 2     | UI-002      | Foundation              |
| 3     | UI-003      | Foundation              |
| 4     | UI-004      | Editor chrome           |
| 5     | UI-005      | Editor home             |
| 6     | UI-006      | Project dialogs (mock)  |
| 7     | AUTH-001    | Auth UI                 |
| 8     | AUTH-002    | Auth backend + Prisma   |
| 9     | AUTH-003    | Liveblocks auth         |
| 10    | AUTH-004    | Collaborator actions    |
| 11    | PROJ-001    | Schema + client         |
| 12    | PROJ-002    | Create project          |
| 13    | PROJ-003    | Project list            |
| 14    | PROJ-004    | Editor access           |
| 15    | PROJ-005    | Delete project          |
| 16    | CANVAS-001  | Canvas shell + shapes   |
| 17    | CANVAS-002  | Node/edge CRUD          |
| 18    | CANVAS-003  | Color palette           |
| 19    | CANVAS-004  | Shape toolbar           |
| 20    | CANVAS-005  | Templates               |
| 21    | COLLAB-001  | Liveblocks room         |
| 22    | COLLAB-002  | Presence                |
| 23    | COLLAB-003  | Comments                |
| 24    | AI-001      | Trigger.dev setup       |
| 25    | AI-002      | Graph task              |
| 26    | AI-003      | AI sidebar              |
| 27    | PERSIST-001 | Autosave + manual save  |
| 28    | PERSIST-002 | Snapshot restore        |
| 29    | SPEC-001    | Spec task               |
| 30    | SPEC-002    | Spec preview + download |

**Note:** `PROJ-001` is placed after `AUTH-004` but before `PROJ-002`. `AUTH-002` already created the schema and client; `PROJ-001` finalizes and verifies them as a standalone unit before project creation uses them. This is intentional, not redundant.

## 9. Deferred and Reorderable Units

There is **no parallel work** in this plan. Each unit is completed sequentially. Some units are reorderable if a dependency is already satisfied, but none should run concurrently with another.

**Reorderable within constraints:**

- `CANVAS-003` (palette) and `CANVAS-004` (toolbar) can swap order; both depend only on `CANVAS-001`/`CANVAS-002`.
- `COLLAB-002` (presence) and `COLLAB-003` (comments) can swap; both depend on `COLLAB-001`.
- `PERSIST-002` and `SPEC-001` can swap only if `SPEC-001` does not require manual save behavior beyond autosave.

**Do not reorder:** `AUTH-002` before `AUTH-001`; `COLLAB-001` before `AUTH-003`; `PERSIST-001` before `COLLAB-001`; `SPEC-001` before `PERSIST-001` and `COLLAB-003`.

## 10. Risk and Complexity Assessment

| Risk   | Units                                                                                                                   | Planning note in spec                                                     |
| ------ | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| High   | AUTH-003, PROJ-005, COLLAB-001, AI-002, AI-003, PERSIST-001, SPEC-001                                                   | Yes — short note documenting the sensitive decision before implementation |
| Medium | AUTH-001, AUTH-002, AUTH-004, PROJ-001, PROJ-004, CANVAS-001, CANVAS-002, COLLAB-002, COLLAB-003, PERSIST-002, SPEC-002 | Record risks; note only if a material uncertainty emerges                 |
| Low    | UI-001 through UI-006, PROJ-002, PROJ-003, CANVAS-003, CANVAS-004, CANVAS-005                                           | Proceed directly                                                          |

## 11. Missing Capabilities and Potential Gaps

- No rate limiting on AI or spec generation. Free-tier limits may be hit; not in approved scope.
- No audit log for destructive operations.
- No collaborator notification when added/removed.
- No offline handling.
- No mobile-specific behavior beyond web-only and floating panels.

Recorded as potential gaps, not requirements. None block mapping.

## 12. Unresolved Decisions and Assumptions

**Resolved before this map (approved by user):**

1. Canvas performance: ≤100 nodes, ≤150 edges.
2. Concurrency: 10 simultaneous per room (Liveblocks Free limit).
3. Browser support: Chrome 111+, Safari 16.4+.
4. Autosave: debounced 3s, forced 60s if dirty.
5. Snapshot retention: last 5 per project.
6. Room ID: `projectId` (slug), one room per project.
7. Node resize: min 80×60, max 600×400.

**Additional confirmed behavior:**

- Manual save in addition to autosave; both share the same write path; manual save bypasses debounce and provides confirmation (PERSIST-001).

**Assumptions:**

- Vercel Blob store is private.
- AI fallback policy per `architecture.md`.
- Canvas JSON schema from `progress-tracker.md` is the initial reference.
- `project-overview.md` deletion edits applied before this map.

**Open for specification phase (short planning note inside the relevant spec):**

- Liveblocks token scope and error behavior (AUTH-003).
- Deletion cascade order and partial-failure recovery (PROJ-005).
- Snapshot rehydration order and conflict behavior (COLLAB-001).
- Prisma pooling strategy for Trigger.dev (AI-001, AI-002).
- Persistence write order and pruning transaction (PERSIST-001).
- Spec input contract and prompt shape (SPEC-001).

## 13. Recommended Planning Priorities

1. Complete `UI-001` through `UI-006` first. These produce visible UI and establish the verification baseline. No gates.
2. `AUTH-001` (Clerk UI) is the next visible unit. Then `AUTH-002` (backend helper) as the first backend unit.
3. `AUTH-003` and `AUTH-004` as needed; both depend on `AUTH-002`.
4. `PROJ-001` through `PROJ-004` establish real project lifecycle and the editor route.
5. `CANVAS-001` through `CANVAS-005` establish the editable surface that collaboration, AI, and persistence feed into.
6. `COLLAB-001` is the first real-time unit; its planning note is the most important in the project.
7. `PERSIST-001` before `SPEC-001`; both are gated by planning notes in their specs.
8. `SPEC-001` and `SPEC-002` last, because they depend on the AI task, persistence, and comments all existing.

## 14. Readiness for Individual Specification Generation

The feature map is **ready for specification generation with conditions:**

- 30 units have stable IDs, objectives, outcomes, dependencies, and preliminary verification.
- Shared contracts are registered; the five sensitive ones carry a planning note inside their spec.
- Requirement traceability is complete.
- Resolved decisions are recorded; remaining spec-phase questions are scoped to their units.
- The sequence is strictly linear; no unit requires concurrent work.

**Not yet ready:** Specification writing for any unit marked "High" risk until its planning note is drafted and approved inside the spec. For all other units, specification drafting can proceed directly.

## 15. Change History and Approval Status

| Version | Date       | Change                                                                              | Status                 |
| ------- | ---------- | ----------------------------------------------------------------------------------- | ---------------------- |
| 1.0     | 2026-11-02 | Initial feature map                                                                 | Superseded             |
| 2.0     | 2026-11-02 | Reordered visuals-first; strictly sequential; 30 units; planning notes inside specs | Awaiting user approval |

**Protected files unchanged:** `context/*` and `AGENTS.md` were not modified.
