# CANVAS-002 — Node and Edge CRUD

## A. Identity and Objective

- **Feature ID:** CANVAS-002
- **Title:** Node and Edge CRUD
- **Primary objective:** Implement the ability to create, edit, and delete nodes and edges manually on the React Flow canvas.
- **Expected outcome:** A user can add a node (the toolbar drag-and-drop is added in CANVAS-004, so this unit uses a programmatic or standard React Flow interaction to test), rename a node or edge inline by double-clicking, edit its description, and delete a selected node or edge. The canvas starts empty (seed nodes from CANVAS-001 are removed).
- **References:** `planning/feature-map.md` CANVAS-002; `context/ui-context.md` Shapes, Interaction States; `context/code-standards.md` Next.js, Styling; `AGENTS.md`.

## B. Execution Contract

The agent must do all of the following without asking the user for confirmation, in this order:

1. Read `AGENTS.md`, `context/ui-context.md` (Shapes, Interaction States), `context/code-standards.md` (Next.js, Styling).
2. Confirm CANVAS-001 is in place: `components/editor/canvas/canvas.tsx` and `shapes.tsx` exist, `@xyflow/react` is installed.
3. Update `components/editor/canvas/shapes.tsx` per D.1 to support inline editing and selection-based deletion.
4. Create `components/editor/canvas/edge.tsx` per D.2 for custom edge rendering and inline editing.
5. Update `components/editor/canvas/canvas.tsx` per D.3 to remove seed nodes, support adding nodes (via a temporary test button or standard React Flow selection), editing, and deleting.
6. Update `app/globals.css` per D.4 only if necessary to support the edge label background. (Note: `app/globals.css` is generally protected, but the UI-002 spec explicitly defined edge styles. If the existing `.react-flow__edge-textbg` is insufficient, apply the Tailwind classes directly in the edge component instead of modifying `globals.css`.)
7. Run the **Checks** block in Section I top to bottom.
8. Fix any in-scope failure and re-run the failing check.
9. Report PASS or FAIL per Section J. On PASS, state the agent has stopped and is awaiting the next feature. On FAIL, state the exact blocker and stop.

Do not modify `lib/*`, `actions/*`, `components/editor/project-sidebar.tsx`, `context/*`, `planning/*`, or `AGENTS.md`.

## C. Context and Dependencies

- **Prerequisites:** CANVAS-001 complete and verified.
- **Contract introduced:** Node and edge selection states, the `onNodeDoubleClick` and `onEdgeDoubleClick` editing triggers, and the deletion keyboard shortcut (Backspace/Delete).
- **Contract consumed:** `SystemaNodeData` and `nodeTypes` from CANVAS-001.
- **Approved decisions:**
  - Nodes and edges are unnamed by default (`project-overview.md`). Empty names render as empty strings, not placeholders. Users can edit the name and description inline.
  - Edge labels use the same visual treatment as node labels but with a smaller background box (`--bg-elevated`) for readability over the canvas.
  - Deletion is handled by React Flow's default behavior (selecting and pressing Backspace/Delete). This unit ensures `deleteKeyCode` is configured correctly.
  - The mock "Add Node" button is for testing only; CANVAS-004 replaces it with the bottom toolbar.

## D. Implementation Requirements

### 1. Update `components/editor/canvas/shapes.tsx`

The shape components currently render static labels. Add inline editing:

- Wrap the label area in a `<div>` that handles `onDoubleClick`.
- When double-clicked, switch to an `<input>` (or `<textarea>`) with `autoFocus`.
- The input uses `className="w-full bg-transparent text-center font-mono text-xs text-node-slate-text outline-none"` (or the appropriate `-text` token for the node's color).
- On blur or Enter, save the value to `data.name` (or `data.description` if editing the description; use a second line or a small "edit description" icon).
- If the input is empty, save an empty string. Do not force a fallback name.
- To edit the description, add a small `Info` icon (Lucide) in the top-right corner of the node. Clicking it opens a similar inline input for the description, or a small popover. Keep it simple: a popover with a `<textarea>` is sufficient.
- Ensure `onDoubleClick` on the input does not trigger the React Flow zoom.

### 2. Create `components/editor/canvas/edge.tsx`

Create a custom edge component (`SystemaEdge`) to support editable labels:

- Imports: `"use client"`, `BaseEdge`, `EdgeLabelRenderer`, `getBezierPath`, `EdgeProps` from `@xyflow/react`.
- Renders `<BaseEdge path={edgePath} markerEnd={markerEnd} style={{ stroke: 'var(--color-border-default)', strokeWidth: 1.5 }} />`.
- Renders an `<EdgeLabelRenderer>` containing a `<div>` positioned at `labelX`, `labelY` with `transform: translate(-50%, -50%)`.
- The label div shows the edge's `data.name` if present, otherwise nothing.
- Double-clicking the label opens an inline `<input>` similar to the node label editor.
- The label background uses `bg-bg-elevated text-text-primary text-xs font-mono px-1 py-0.5 rounded-sm border border-border-subtle`.

### 3. Update `components/editor/canvas/canvas.tsx`

- Remove the seed nodes and the `// SEED NODES` comment. The canvas starts with `nodes = []` and `edges = []`.
- Add `edgeTypes = { default: SystemaEdge }` and pass it to `<ReactFlow>`.
- Ensure `deleteKeyCode={['Backspace', 'Delete']}` is set on `<ReactFlow>`.
- Add a temporary "Add Test Node" button (e.g., absolute bottom-4 right-4) that appends a node to `nodes` with `type: 'rectangle'`, `position: { x: 100, y: 100 }`, and `data: { name: '', description: '', color: 'slate' }`. This button is for testing without the toolbar and will be removed in CANVAS-004.
- Update `onConnect` to add an edge with `type: 'default'` and `data: { name: '', description: '' }`.
- Implement `onNodeDoubleClick` and `onEdgeDoubleClick` if the editing logic is centralized in the canvas rather than the components. (Prefer handling it inside the components to avoid prop drilling.)
- Pass `onNodesChange` and `onEdgesChange` so React Flow can handle selection and deletion.

### 4. (Optional) `app/globals.css`

Only modify this if the custom edge's label needs a specific class not achievable with Tailwind in the component. The existing `.react-flow__edge-textbg` and `.react-flow__edge-text` from UI-002 should be sufficient if you use `<EdgeLabelRenderer>` with standard HTML. If you must add a class, note it in the report.

## E. Integration Contracts

- **Contract changed:** The shape components now handle their own inline editing. The canvas no longer uses seed nodes.
- **Contract introduced:** `SystemaEdge` for custom edge rendering and labeling.
- **Contract consumed:** React Flow's built-in selection, deletion, and `onConnect` behaviors.

## F. Scope Limits

Do not:

- Add the shape toolbar (CANVAS-004).
- Add the color palette picker (CANVAS-003). Nodes use the default `slate` color.
- Add Liveblocks sync (COLLAB-001).
- Add AI generation (AI-003).
- Add persistence (PERSIST-001).
- Modify `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/*`, `actions/*`, or `components/editor/project-sidebar.tsx`.
- Leave the temporary "Add Test Node" button after CANVAS-004 is implemented (note this in the report).

## G. Protected Behavior and Compatibility

- CANVAS-001 gate still passes: six shapes render, resizing works.
- The editor route still enforces access.
- The sidebar and dialogs still work.
- `components/ui/*` unchanged.

## H. Acceptance Criteria

1. Canvas starts empty (no seed nodes).
2. A test button can add a node.
3. Dragging from a node handle to another node creates an edge.
4. Double-clicking a node label opens an inline input; saving updates the name.
5. Double-clicking an edge label opens an inline input; saving updates the name.
6. Selecting a node or edge and pressing Backspace/Delete removes it.
7. Nodes without names render without placeholder text.
8. All Checks pass.
9. Agent reports PASS and stops.

## I. Checks

Check 1 — Files updated/created. Run `ls components/editor/canvas/shapes.tsx components/editor/canvas/edge.tsx components/editor/canvas/canvas.tsx`. Pass if all three are listed.

Check 2 — Seed nodes removed. Run `grep -c "SEED NODES" components/editor/canvas/canvas.tsx`. Pass if count is 0. Run `grep -c "useNodesState(\[\])" components/editor/canvas/canvas.tsx`. Pass if count is at least 1.

Check 3 — Edge component exists and registered. Run `grep -c "SystemaEdge" components/editor/canvas/edge.tsx` and `grep -c "edgeTypes" components/editor/canvas/canvas.tsx`. Each count must be at least 1.

Check 4 — Delete key configured. Run `grep -c "deleteKeyCode" components/editor/canvas/canvas.tsx`. Pass if count is at least 1.

Check 5 — Inline editing present. Run `grep -c "onDoubleClick" components/editor/canvas/shapes.tsx` and `grep -c "onDoubleClick" components/editor/canvas/edge.tsx`. Each count must be at least 1.

Check 6 — No hardcoded hex. Run `grep -cE "#[0-9a-fA-F]{3,8}" components/editor/canvas/shapes.tsx components/editor/canvas/edge.tsx components/editor/canvas/canvas.tsx`. Pass if each reports 0.

Check 7 — Build, typecheck, lint. Run `npm run build`, `npx tsc --noEmit`, `npm run lint`. If build fails with the Turbopack nvm shim issue, run `npx next build --webpack` and note the workaround.

Check 8 — Behavior test. Start the dev server, navigate to `/editor/[valid project]`, click the test button to add a node, double-click to rename, drag between handles to create an edge, double-click the edge to name it, select and delete. If a browser is unavailable, the agent reports this limitation and verifies the code logic.

Check 9 — No out-of-scope packages. Run `npm ls @trigger.dev/sdk @liveblocks/client`. Pass if absent/empty.

## J. Report

Status: `PASS` or `FAIL`.

If PASS, report:

- One-line result per check.
- Confirmation that the test button was added and its exact text/location.
- Confirmation that manual add, edit, and delete work for both nodes and edges (or the limitation if browser testing is unavailable).
- Confirmation that `app/globals.css` was not modified (or the exact change if it was unavoidable).
- Confirmation that `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/*`, `actions/*`, and `components/editor/project-sidebar.tsx` are unchanged.
- Note: the temporary "Add Test Node" button is left in place for the user to verify and will be removed in CANVAS-004.
- Closing line: "CANVAS-002 complete. Awaiting the next feature specification."

If FAIL, report which check failed, the exact error, and whether the cause is in scope (fixed) or out of scope (reported). Closing line: "Blocked, awaiting user direction."
