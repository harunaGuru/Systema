# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- **Foundation.** UI-001, UI-002, and UI-003 are complete and verified.

## Current Goal

- Await the next feature specification after UI-006.

## Completed

- **UI-001 — Project Initialization.** Confirmed the existing Next.js 16.4.3 App Router scaffold, ESLint, Tailwind CSS v4, root `app/`, `@/*` alias, placeholder `/` page, and global stylesheet integration. Required strict TypeScript flags are enabled.
- **UI-001 verification (Node.js v24.22.1):** `npm run build`, `npx tsc --noEmit`, and `npm run lint` passed. The development server returned HTTP 200 for `/` with the placeholder content.
- **UI-002 — Design System Foundation (revised specification).** Initialized shadcn/ui with the current CLI equivalent: Radix UI, Rhea preset, Neutral base, CSS variables enabled, RSC enabled, `app/globals.css`, `components`, and `lib/utils`. Installed Button, Card, Dialog, Input, Tabs, Textarea, and Scroll Area through the CLI. Replaced `app/globals.css` with the exact D.3 token block, `lib/utils.ts` with the exact D.4 helper, and `/` with the D.5 sample. The CLI-generated primitives were not edited after installation. Installed `cn`, `radix-ui`, and `lucide-react` dependencies required by these primitives; removed obsolete Base UI and temporary CLI/animation dependencies. Existing `geist@1.8.2` remains from the prior scaffold and is exempted by user direction.
- **UI-002 verification (Node.js v24.22.1):** Checks 1–7 passed (both configured files, seven primitives, helper, tokens, utilities, sample content, no page hex colors). Check 8 showed only the approved existing `geist@1.8.2` exception and the approved required `lucide-react@1.67.0`; Clerk, Prisma, Trigger.dev, and Liveblocks packages were absent. Check 9 passed: build, typecheck, and lint. Check 10 passed: dev server returned HTTP 200 and the response contained “Systema design system” twice. `AGENTS.md`, `planning/*`, and all other context files were unchanged; this progress tracker was updated as requested.
- **UI-003 - Geist Fonts.** Geist was already installed at `1.8.2`, so the package installation step was skipped. Removed the duplicate Inter font import and variable from `app/layout.tsx`, retaining the existing `GeistSans` and `GeistMono` variable classes on `<html>`. Replaced `/` with the specified Geist Sans / Geist Mono font sample. Left `app/globals.css` and `components/ui/*` unchanged.
- **UI-003 verification (Node.js v24.22.1):** Check 1 reported `geist@1.8.2`; Checks 2-5 passed (both imports and variables, unchanged font tokens, page samples). Check 6 passed: build, typecheck, and lint. Check 7 listed only the existing `lucide-react@1.67.0` dependency, already approved and required by UI-002; no package was installed during UI-003. Check 8 passed: dev server returned HTTP 200 and the response contained "Systema fonts" twice. `AGENTS.md`, planning files, `app/globals.css`, and `components/ui/*` were unchanged; progress tracker updated as requested.
- **UI-004 - Editor Chrome (Navbar + Left Sidebar Shell).** Added `EditorNavbar`, `ProjectSidebar`, and `EditorShell`, then replaced `/` with the shell. `lucide-react@1.67.0` was already installed, so no package change was needed; the specified `npm install lucide-react` command was attempted but stalled in the network-restricted environment.
- **UI-004 verification (Node.js v24.22.1):** Checks 1-4 and 6-10 passed (Lucide present, required component files/content, page renders `EditorShell`, no hardcoded hex colors, prohibited packages empty, runtime returned HTTP 200 with “PROJECTS” in the HTML, and production build/typecheck/lint passed). Check 5's immediate DOM-removal assertion is superseded by the user's request for animated closing: sidebars remain mounted but visually off-screen, transparent, and inert while closed so they can animate in both directions. UI-004 is complete.
- **UI-004 visual refinement (user screenshots):** Projects sidebar now has a separate colored header, full-width clickable My Projects/Shared tabs, and the centered “No projects yet.” state beneath the tabs; it contains no project cards. The navbar right section has Save, Import, Share, and a purple AI button. The AI button toggles a floating right sidebar with Prompt, Spec, and Comments tabs. Both sidebars use smooth transform/opacity transitions and `motion-reduce:transition-none`; they start closed and become inert while closed. Save, Import, Share remain disabled visual placeholders without handlers. Headless Chrome verified HTTP 200, initial closed states, correct tab/content vertical order, Shared tab selection by pointer input, both sidebars' open and close transitions, AI tabs, and reduced-motion setting `transition-property: none`. Build, `npx tsc --noEmit`, and lint all passed after these changes.
- **Review follow-up — Navbar disabled states and AUTH-001 route requirements.** Save, Import, and Share now apply hover feedback only while enabled while retaining disabled pointer handling and a distinct disabled appearance. AUTH-001 assigns unauthenticated `/` redirects to `app/page.tsx` by making `/` public to the proxy, and Check 3 now calls for runtime checks across page and API/TRPC routes plus active proxy configuration. Lint, typecheck, and production build passed. Runtime auth checks were not run because the Clerk/proxy implementation and API/TRPC routes are not present yet.
- **Navbar visibility fix.** Restored `EditorShell` as the root page content; the placeholder “Systema” page had replaced the shell, so the navbar was not being rendered. Verification: lint, typecheck, and production build passed.
- **UI-005 — Editor Home Screen (Mock).** Added `/editor` with the centered heading, description, and no-op New Project button; `/` reuses the `/editor` page. `EditorShell` now accepts optional `children` and renders them inside the existing main-area height wrapper. Verification on Node.js v24.22.1: Checks 1–5 passed; `npm ls @prisma/client @clerk/nextjs @trigger.dev/sdk @liveblocks/client` reported `(empty)`; build, `npx tsc --noEmit`, and lint passed; runtime returned HTTP 200 for `/editor` and `/` with the required heading; `git diff --check` passed. UI-004 sidebar state and navbar/sidebar wiring were preserved. `app/globals.css`, `components/ui/*`, `app/layout.tsx`, `planning/*`, and `AGENTS.md` were unchanged. UI-005 complete.
- **UI-006 — Project Dialogs (Mock).** Implemented the dialog-state hook, create/rename/delete dialogs, owned-only project actions, three mock projects, and Create dialog wiring from the sidebar and home screen. Checks 1–8 passed; `npm ls @prisma/client @clerk/nextjs @trigger.dev/sdk @liveblocks/client` reported `(empty)`; Node.js v24.22.1 build, typecheck, and lint passed; runtime Check 11 returned HTTP 200 for `/editor` with the required heading; `git diff --check` passed. Existing UI-004 sidebar/nav and UI-005 home content were preserved. Manual dialog interaction remains for user verification as required by the spec. `context/progress-tracker.md` was updated per AGENTS.md; other context files, `components/ui/*`, `app/globals.css`, `app/layout.tsx`, `planning/*`, and `AGENTS.md` were unchanged. UI-006 complete.
- **Review follow-up — Home create action, project-list scrolling, and slug validation.** `EditorShell` now provides `EditorHomeContent` with the create handler when no custom child is supplied; explicitly supplied children continue to render unchanged. Both project tabs scroll vertically, and creation is blocked when the trimmed name produces no slug. `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `git diff --check` passed; browser verification confirmed New Project opens the create dialog.

## In Progress



- **Sidebar and navbar interaction refinement — In Progress.** Moved the description and Create project action above the tabs, kept a horizontal selected-tab indicator while making the content panel a stable flex-centered region, and added hover feedback to the navbar controls. `npm run lint`, `npx tsc --noEmit`, and `npm run build` passed on Node.js v24.22.1. The reported hydration attributes (`suppresshydrationwarning`, `data-qb-installed`) do not appear in the app source; the root layout is static, so disable the browser extension injecting them when testing localhost. Browser visual review remains.
- **UI-004 visual refinement.** Restyled the left sidebar to match the supplied reference (Projects header, full-width clickable My Projects/Shared shadcn tabs, centered empty state below the tabs, no project cards). User clarified the four right-side navbar controls are Save, Import, Share, and AI; the AI button toggles a floating right sidebar using the Prompt, Spec, and Comments tabs in `ui-context.md`. Both sidebars now transition in and out while remaining mounted off-screen and inert when closed; reduced-motion disables transitions. Save, Import, and Share are disabled visual placeholders without handlers.

## Next Up

- Manually review the left-tab slide/hover states in a browser, then await the next feature specification.
## Open Questions

1. **AI provider fallback policy (detailed).** `architecture.md` says Gemini primary, Groq fallback, but does not define retry counts, timeouts, or failover behavior. **Blocks:** AI-Assisted Design unit. **Proposed standard:** one retry on transient failure (timeout, 5xx, connection error), respect `Retry-After` on 429, exponential backoff before failover, immediate failover on non-retryable errors (400, 401, 403, 404, malformed response). Awaiting approval to record in `architecture.md`.
2. **Autosave cadence.** `architecture.md` says autosave writes to Vercel Blob + Postgres snapshot, but does not define the trigger (debounce interval, Liveblocks storage event, or fixed interval). **Blocks:** Persistence unit.
3. **Recovery snapshot retention count.** "Small number" is undefined. **Blocks:** Persistence unit.
4. **Liveblocks room ID strategy.** Is the room ID the `projectId` (one room per project), or is there a separate room concept? **Blocks:** Collaboration unit.
5. **Node resize min/max bounds.** `ui-context.md` says nodes are resizable with bounds, but values are not defined. **Blocks:** Canvas unit.
6. **Canvas JSON schema (initial).** Sample recorded in Session Notes below. Coding agent may extend with additional fields as needed; any change must be recorded in `architecture.md` before implementation. **Blocks:** Persistence and Specification Generation units.

## Architecture Decisions

- **One AI agent pipeline, Gemini primary, Groq fallback (not two agents).** Single Trigger.dev job calls Gemini first; Groq is used only on failure. Reason: simpler orchestration, fewer failure modes. See `architecture.md` invariant #2.
- **Ownership model: `Project.ownerId` + `Collaborator` table.** Owner is not a member row; editors are `Collaborator` rows with `role: editor`. Reason: single source of truth for ownership, simpler authorization query. See `architecture.md` Auth and Access Model.
- **Liveblocks Storage is live collaborative state; snapshots are for recovery and spec generation.** Reason: separation between real-time sync and durable persistence. See `architecture.md` invariant #6.
- **Server Actions for form mutations; Route Handlers for Liveblocks auth, Trigger.dev job triggering, and artifact access.** Reason: Server Actions fit form flows; Route Handlers handle external callbacks and auth tokens. See `architecture.md` system boundaries and `code-standards.md`.
- **Split secrets between Vercel and Trigger.dev.** Vercel holds Clerk, Liveblocks public key, Blob token, `DATABASE_URL`. Trigger.dev holds `DATABASE_URL`, Blob token, Gemini/Groq keys, Liveblocks secret (if spec job reads canvas). Reason: Trigger.dev runs outside Vercel and needs its own access. See `architecture.md` and `code-standards.md`.

## Session Notes

UI-001 through UI-004 have been implemented and verified in this workspace. The UI-004 screenshot refinement is complete: project tabs work, both floating sidebars animate open and closed, and the AI button controls the right sidebar. The next step is the next feature specification.

**Canvas JSON schema (initial sample):**

```json
{
  "nodes": [
    {
      "id": "node-1",
      "type": "rectangle",
      "position": { "x": 100, "y": 100 },
      "width": 180,
      "height": 80,
      "data": {
        "name": "API Gateway",
        "description": "Entry point",
        "color": "slate"
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "node-1",
      "target": "node-2",
      "data": { "name": "routes to", "description": "" }
    }
  ],
  "viewport": { "x": 0, "y": 0, "zoom": 1 }
}
```
