# CANVAS-004 — Bottom Shape Toolbar

## A. Identity and Objective

- **Feature ID:** CANVAS-004
- **Title:** Bottom Shape Toolbar
- **Primary objective:** Add a centered, floating toolbar at the bottom of the editor screen containing the six shapes. Users drag a shape from the toolbar and drop it onto the canvas to create a new node.
- **Expected outcome:** A floating toolbar appears at the bottom center of the editor. Dragging a shape from the toolbar onto the canvas creates a new node at the drop position with the default Slate color. The temporary "Add Test Node" button from CANVAS-002 is removed.
- **References:** `planning/feature-map.md` CANVAS-004; `context/ui-context.md` Layout Patterns, Shapes, Interaction States; `context/code-standards.md` Next.js, Styling; `AGENTS.md`.

## B. Execution Contract

The agent must do all of the following without asking the user for confirmation, in this order:

1. Read `AGENTS.md`, `context/ui-context.md` (Layout Patterns, Shapes, Interaction States), `context/code-standards.md` (Next.js, Styling).
2. Confirm CANVAS-003 is in place: `color-palette.tsx` exists, the palette is wired to the nodes, and the temporary test button from CANVAS-002 exists in `canvas.tsx`.
3. Create `components/editor/canvas/shape-toolbar.tsx` per D.1.
4. Update `components/editor/canvas/canvas.tsx` per D.2 to integrate the toolbar, remove the temporary test button, and handle drag-and-drop node creation.
5. Run the **Checks** block in Section I top to bottom.
6. Fix any in-scope failure and re-run the failing check.
7. Report PASS or FAIL per Section J. On PASS, state the agent has stopped and is awaiting the next feature. On FAIL, state the exact blocker and stop.

Do not modify `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/*`, `actions/*`, `components/editor/project-sidebar.tsx`, `components/editor/canvas/color-palette.tsx`, or `components/editor/canvas/edge.tsx`.

## C. Context and Dependencies

- **Prerequisites:** CANVAS-003 complete and verified.
- **Contract introduced:** The `ShapeToolbar` component. The canvas handles the HTML5 drag-and-drop events (`onDragStart`, `onDragOver`, `onDrop`).
- **Contract consumed:** `ShapeType` from CANVAS-001.
- **Approved decisions:**
  - The toolbar floats at the bottom center (`ui-context.md` Layout Patterns). It uses the `floating-panel` utility class (defined in `globals.css`).
  - The toolbar shows six shape icons (using Lucide icons or simple SVG representations of the shapes). It does not show labels.
  - Dragging uses HTML5 drag-and-drop for simplicity. A node is created at the drop coordinates with `data: { name: '', description: '', color: 'slate' }`.
  - The temporary "Add Test Node" button from CANVAS-002 is removed in this unit.

## D. Implementation Requirements

### 1. `components/editor/canvas/shape-toolbar.tsx`

A client component (`"use client"`).

Imports: `"use client"`, Lucide icons (or custom SVGs), `ShapeType` from `./shapes`.

Export `function ShapeToolbar()`:

- Render a container `<div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 floating-panel rounded-md p-2 flex gap-2">`.
- Define the shapes array: `const shapes: { type: ShapeType; label: string; icon: React.ReactNode }[] = ...`.
- For the icons, use Lucide approximations or simple SVG shapes:
  - `rectangle`: `Square`
  - `diamond`: `Diamond`
  - `circle`: `Circle`
  - `pill`: `Capsule` (or `RectangleHorizontal` if Capsule is unavailable)
  - `cylinder`: `Database`
  - `hexagon`: `Hexagon`
- For each shape, render a `<div>` with:
  - `draggable`
  - `onDragStart={(e) => { e.dataTransfer.setData('application/reactflow', shape.type); e.dataTransfer.effectAllowed = 'move'; }}`
  - `className="cursor-grab p-2 rounded-sm hover:bg-bg-elevated text-text-primary"`
  - `title={shape.label}`
  - The icon inside (`h-5 w-5`).

### 2. Update `components/editor/canvas/canvas.tsx`

- Remove the temporary "Add Test Node" button (and any associated state or handler).
- Import `ShapeToolbar` from `./shape-toolbar`.
- Import `useReactFlow` from `@xyflow/react` if it is not already imported. It provides `screenToFlowPosition`.
- Add a ref to the React Flow wrapper: `const wrapperRef = useRef<HTMLDivElement>(null)`.
- Implement `onDragOver`: `(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }`.
- Implement `onDrop`:
  - `e.preventDefault()`.
  - `const type = e.dataTransfer.getData('application/reactflow') as ShapeType`.
  - If `!type`, return.
  - Get the flow position: `const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })`.
  - Add the new node: `setNodes((nds) => nds.concat({ id: crypto.randomUUID(), type, position, data: { name: '', description: '', color: 'slate' } }))`.
- Pass `onDragOver` and `onDrop` to the `<ReactFlow>` component (they are valid props). Alternatively, wrap `<ReactFlow>` in a `<div>` with the handlers if the React Flow version doesn't accept them directly. Use the React Flow standard approach: wrap the `<ReactFlow>` in a `<div ref={wrapperRef} className="w-full h-full" onDragOver={onDragOver} onDrop={onDrop}>`.
- Render `<ShapeToolbar />` as a sibling of `<ReactFlow>` inside the wrapper, so it floats above the canvas.

### 3. Confirm Node Creation Logic

- The new node uses `type` from the drag event and `position` from `screenToFlowPosition`.
- The node ID is a UUID.
- The default color is `'slate'`.
- The name and description are empty strings.

## E. Integration Contracts

- **Contract introduced:** `ShapeToolbar` component.
- **Contract consumed:** `ShapeType`, React Flow's `screenToFlowPosition`.

## F. Scope Limits

Do not:

- Add a mobile/touch fallback for drag-and-drop. The app is web-only and desktop-first for now.
- Add Liveblocks sync (COLLAB-001).
- Modify `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/*`, `actions/*`, `components/editor/project-sidebar.tsx`, `components/editor/canvas/color-palette.tsx`, or `components/editor/canvas/edge.tsx`.
- Leave the temporary "Add Test Node" button in the code.

## G. Protected Behavior and Compatibility

- CANVAS-001, CANVAS-002, and CANVAS-003 gates still pass: six shapes render, inline editing works, palette works.
- The canvas background remains `bg-canvas`.
- `components/ui/*` unchanged.

## H. Acceptance Criteria

1. `components/editor/canvas/shape-toolbar.tsx` exists and exports `ShapeToolbar`.
2. The toolbar floats at the bottom center using the `floating-panel` class.
3. Dragging a shape from the toolbar and dropping it on the canvas creates a new node of that shape at the drop position.
4. The temporary "Add Test Node" button is removed.
5. All Checks pass.
6. Agent reports PASS and stops.

## I. Checks

Check 1 — File exists. Run `ls components/editor/canvas/shape-toolbar.tsx`. Pass if listed.

Check 2 — Toolbar has the six shapes. Run `grep -c "rectangle" components/editor/canvas/shape-toolbar.tsx`, `grep -c "diamond" ...`, `grep -c "circle" ...`, `grep -c "pill" ...`, `grep -c "cylinder" ...`, `grep -c "hexagon" ...`. Each count must be at least 1.

Check 3 — Drag start logic. Run `grep -c "dataTransfer.setData" components/editor/canvas/shape-toolbar.tsx`. Pass if count is at least 1.

Check 4 — Canvas handles drop. Run `grep -c "onDrop" components/editor/canvas/canvas.tsx` and `grep -c "screenToFlowPosition" components/editor/canvas/canvas.tsx`. Each count must be at least 1.

Check 5 — Test button removed. Run `grep -c "Add Test Node" components/editor/canvas/canvas.tsx`. Pass if count is 0.

Check 6 — Toolbar is rendered. Run `grep -c "<ShapeToolbar" components/editor/canvas/canvas.tsx`. Pass if count is at least 1.

Check 7 — No hardcoded hex. Run `grep -cE "#[0-9a-fA-F]{3,8}" components/editor/canvas/shape-toolbar.tsx components/editor/canvas/canvas.tsx`. Pass if each reports 0.

Check 8 — Build, typecheck, lint. Run `npm run build`, `npx tsc --noEmit`, `npm run lint`. If build fails with the Turbopack nvm shim issue, run `npx next build --webpack` and note the workaround.

Check 9 — Behavior test. Start the dev server, navigate to `/editor/[valid project]`, drag a shape from the toolbar to the canvas, confirm the node appears at the drop location with the Slate color. If browser testing is unavailable, report the limitation.

Check 10 — No out-of-scope packages. Run `npm ls @trigger.dev/sdk @liveblocks/client`. Pass if absent/empty.

## J. Report

Status: `PASS` or `FAIL`.

If PASS, report:

- One-line result per check.
- Confirmation that the temporary "Add Test Node" button was removed.
- Confirmation that drag-and-drop works and creates a node with default Slate color and empty name/description.
- Confirmation that `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/*`, `actions/*`, `components/editor/project-sidebar.tsx`, `components/editor/canvas/color-palette.tsx`, and `components/editor/canvas/edge.tsx` are unchanged.
- Note that manual browser verification of the drag-and-drop interaction is required by the user.
- Closing line: "CANVAS-004 complete. Awaiting the next feature specification."

If FAIL, report which check failed, the exact error, and whether the cause is in scope (fixed) or out of scope (reported). Closing line: "Blocked, awaiting user direction."
