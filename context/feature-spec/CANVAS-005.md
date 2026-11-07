# CANVAS-005 — Starter Template Import

## A. Identity and Objective

- **Feature ID:** CANVAS-005
- **Title:** Starter Template Import
- **Primary objective:** Define the fixed starter templates in the codebase and add a UI mechanism to import a selected template into the current canvas, merging its nodes and edges with any existing content.
- **Expected outcome:** A user can open an import menu, select from the fixed starter templates (monolith, microservices, event-driven, serverless), and the canvas updates to include the template's nodes and edges. The imported nodes are fully editable using the existing CRUD features.
- **References:** `planning/feature-map.md` CANVAS-005; `context/ui-context.md` Shapes, Interaction States; `context/code-standards.md` Next.js, Styling; `AGENTS.md`.

## B. Execution Contract

The agent must do all of the following without asking the user for confirmation, in this order:

1. Read `AGENTS.md`, `context/ui-context.md` (Shapes, Interaction States), `context/code-standards.md` (Next.js, Styling).
2. Confirm CANVAS-004 is in place: `components/editor/canvas/canvas.tsx` and `shape-toolbar.tsx` exist, and the test button is removed.
3. Create `lib/templates/index.ts` per D.1 with the template data.
4. Update `components/editor/canvas/canvas.tsx` per D.2 to add the import UI and merge logic.
5. Run the **Checks** block in Section I top to bottom.
6. Fix any in-scope failure and re-run the failing check.
7. Report PASS or FAIL per Section J. On PASS, state the agent has stopped and is awaiting the next feature. On FAIL, state the exact blocker and stop.

Do not modify `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/db.ts`, `lib/server/*`, `actions/*`, `components/editor/project-sidebar.tsx`, `components/editor/canvas/shape-toolbar.tsx`, `components/editor/canvas/color-palette.tsx`, or `components/editor/canvas/edge.tsx`.

## C. Context and Dependencies

- **Prerequisites:** CANVAS-004 complete and verified.
- **Contract introduced:** The `Templates` array in `lib/templates/index.ts` and the `importTemplate` logic in the canvas.
- **Contract consumed:** `SystemaNodeData`, `ShapeType`, React Flow's `useReactFlow`.
- **Approved decisions:**
  - The four templates (monolith, microservices, event-driven, serverless) are static JSON data stored in the codebase. They are not fetched from a database.
  - Importing a template **merges** its nodes and edges into the existing canvas. It does not wipe the current state.
  - IDs for imported nodes and edges must be prefixed with the template name and a random string to avoid collisions with existing nodes.
  - The import UI is a temporary "Load Template" button or dropdown in the top-right corner of the canvas container (where the "Add Test Node" button used to be). A more formal UI can be added later if needed.
  - Nodes are positioned relative to a center point to avoid importing them completely off-screen.

## D. Implementation Requirements

### 1. `lib/templates/index.ts`

Create a file that exports the template data.

- Import types from `@/components/editor/canvas/shapes` if needed.
- Define an interface `StarterTemplate` with `id: string`, `name: string`, `description: string`, and `data: { nodes: any[], edges: any[] }`.
- Export `export const starterTemplates: StarterTemplate[] = [ ... ]`.
- Define four templates:
  - **Monolith:** A central "App Server" (rectangle) connected to a "Database" (cylinder) and "Client" (circle).
  - **Microservices:** An "API Gateway" (rectangle) connected to "Service A", "Service B" (rectangles), which connect to respective "Database A", "Database B" (cylinders).
  - **Event-Driven:** A "Producer" (rectangle) connecting to an "Event Bus" (hexagon), which connects to "Consumer A" and "Consumer B" (rectangles).
  - **Serverless:** A "Client" (circle) connecting to an "API Gateway" (rectangle), which connects to two "Lambda Functions" (rectangles).
- The nodes in the data should have `type`, `position`, and `data: { name, description: '', color: 'slate' }`.
- The edges in the data should have `source`, `target`, and `data: { name: '', description: '' }`.

### 2. Update `components/editor/canvas/canvas.tsx`

Add an import mechanism:

- Import `starterTemplates` from `@/lib/templates`.
- Add state for a dropdown or use a simple `<select>` element to choose a template.
- Create a handler `handleImportTemplate(templateId: string)`:
  - Find the template by ID.
  - Use React Flow's `getViewport()` (via `useReactFlow`) to determine the current center of the screen, or use a fixed offset. To keep it simple, shift the template's nodes by a small offset (e.g., `{ x: 50, y: 50 }`) relative to the current nodes.
  - Generate new IDs for all nodes and edges in the template (e.g., `tmpl-${templateId}-${crypto.randomUUID()}`).
  - Update the edge `source` and `target` references to use the new node IDs.
  - Call `setNodes((nds) => [...nds, ...newNodes])` and `setEdges((eds) => [...eds, ...newEdges])`.
- Render the import UI. A simple approach is an absolute-positioned container in the top-right:
  - `className="absolute top-4 right-4 z-50 flex gap-2"`
  - A shadcn `<Button variant="secondary">` that opens a small popover or dropdown containing the template options. Since shadcn `DropdownMenu` was not installed in UI-002, use a native `<select>` or a simple absolute-positioned list of buttons.
  - The simplest allowed approach: a `<Button>` that cycles through templates, or a `<select onChange={...}>` with the four template names.

## E. Integration Contracts

- **Contract introduced:** `starterTemplates` array and `handleImportTemplate`.
- **Contract consumed:** React Flow state (`setNodes`, `setEdges`), `SystemaNodeData`.

## F. Scope Limits

Do not:

- Fetch templates from the database or an API. They are static.
- Add a full "Templates Dashboard" page. The import mechanism lives inside the canvas for now.
- Modify `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/db.ts`, `lib/server/*`, `actions/*`, `components/editor/project-sidebar.tsx`, `components/editor/canvas/shape-toolbar.tsx`, `components/editor/canvas/color-palette.tsx`, or `components/editor/canvas/edge.tsx`.

## G. Protected Behavior and Compatibility

- CANVAS-001 through CANVAS-004 gates still pass.
- `components/ui/*` unchanged.

## H. Acceptance Criteria

1. `lib/templates/index.ts` exists and exports `starterTemplates` with at least four entries.
2. The canvas renders an import UI (button or select).
3. Selecting a template merges its nodes and edges into the canvas.
4. Imported nodes are editable (renaming, recoloring, deleting).
5. Importing does not overwrite existing nodes (it merges).
6. Imported node IDs are unique.
7. All Checks pass.
8. Agent reports PASS and stops.

## I. Checks

Check 1 — File exists. Run `ls lib/templates/index.ts`. Pass if listed.

Check 2 — Four templates present. Run `grep -c "monolith" lib/templates/index.ts`, `grep -c "microservices" ...`, `grep -c "event-driven" ...`, `grep -c "serverless" ...`. Each count must be at least 1.

Check 3 — Canvas has import logic. Run `grep -c "starterTemplates" components/editor/canvas/canvas.tsx` and `grep -c "setNodes" components/editor/canvas/canvas.tsx`. Each count must be at least 1.

Check 4 — ID collision prevention. Run `grep -c "crypto.randomUUID" components/editor/canvas/canvas.tsx` and `grep -c "source:" components/editor/canvas/canvas.tsx`. Each count must be at least 1. (The agent must map old IDs to new IDs for edges).

Check 5 — No hardcoded hex. Run `grep -cE "#[0-9a-fA-F]{3,8}" lib/templates/index.ts components/editor/canvas/canvas.tsx`. Pass if each reports 0.

Check 6 — Build, typecheck, lint. Run `npm run build`, `npx tsc --noEmit`, `npm run lint`. If build fails with the Turbopack nvm shim issue, run `npx next build --webpack` and note the workaround.

Check 7 — Behavior test. Start the dev server, navigate to `/editor/[valid project]`, import a template, confirm the nodes render and can be edited. If browser testing is unavailable, report the limitation.

Check 8 — No out-of-scope packages. Run `npm ls @trigger.dev/sdk @liveblocks/client`. Pass if absent/empty.

## J. Report

Status: `PASS` or `FAIL`.

If PASS, report:

- One-line result per check.
- The UI approach chosen for the import mechanism (button, select, etc.).
- Confirmation that imported nodes are editable and IDs are unique.
- Confirmation that `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/db.ts`, `lib/server/*`, `actions/*`, `components/editor/project-sidebar.tsx`, `components/editor/canvas/shape-toolbar.tsx`, `components/editor/canvas/color-palette.tsx`, and `components/editor/canvas/edge.tsx` are unchanged.
- Note that manual browser verification of template import is required by the user.
- Closing line: "CANVAS-005 complete. Awaiting the next feature specification."

If FAIL, report which check failed, the exact error, and whether the cause is in scope (fixed) or out of scope (reported). Closing line: "Blocked, awaiting user direction."
