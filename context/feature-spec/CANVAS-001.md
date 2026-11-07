# CANVAS-001 — Canvas Shell + Six Shapes

## A. Identity and Objective

- **Feature ID:** CANVAS-001
- **Title:** Canvas Shell + Six Shapes
- **Primary objective:** Mount a React Flow canvas inside the editor route and implement the six SVG shapes (rectangle, diamond, circle, pill, cylinder, hexagon) with their default styles, mono labels, and resize bounds.
- **Expected outcome:** Navigating to `/editor/[projectid]` shows a dark canvas. Shapes can be dragged from the bottom toolbar (added in CANVAS-004) or rendered programmatically. This unit focuses on the canvas shell and the shape components; full CRUD (adding/removing via UI) and the toolbar are CANVAS-002 and CANVAS-004.
- **References:** `planning/feature-map.md` CANVAS-001; `context/ui-context.md` Theme, Colors, Shapes, Layout Patterns; `context/code-standards.md` Styling, Next.js; `AGENTS.md`.

## B. Execution Contract

The agent must do all of the following without asking the user for confirmation, in this order:

1. Read `AGENTS.md`, `context/ui-context.md` (Theme, Colors, Shapes, Layout Patterns), `context/code-standards.md` (Styling, Next.js).
2. Confirm PROJ-006 is in place: `actions/rename-project.ts` exists, and the editor route `app/editor/[projectid]/page.tsx` renders `EditorShell`.
3. Install React Flow: run `npm install @xyflow/react`.
4. Create `components/editor/canvas/shapes.tsx` per D.1.
5. Create `components/editor/canvas/canvas.tsx` per D.2.
6. Update `app/editor/[projectid]/page.tsx` to render `<Canvas>` inside the `EditorShell` per D.3.
7. Run the **Checks** block in Section I top to bottom.
8. Fix any in-scope failure and re-run the failing check.
9. Report PASS or FAIL per Section J. On PASS, state the agent has stopped and is awaiting the next feature. On FAIL, state the exact blocker and stop.

Do not modify `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/*`, `actions/*`, or `components/editor/project-sidebar.tsx`.

## C. Context and Dependencies

- **Prerequisites:** PROJ-006 complete and verified.
- **Contract introduced:** the `SystemaNode` type and the six node types (`rectangle`, `diamond`, `circle`, `pill`, `cylinder`, `hexagon`). CANVAS-002 (CRUD) and CANVAS-004 (toolbar) consume these.
- **Approved decisions:**
  - React Flow v12 (`@xyflow/react`) is the canvas library .
  - The six shapes are SVG-based so they stay crisp on resize . Text labels are HTML overlaid on the SVG, not SVG `<text>`, so they inherit Geist Mono from `globals.css` and wrap correctly.
  - Nodes are resizable with `NodeResizer`. Bounds are min 80×60, max 600×400. Label text clamps within the node.
  - Default color is Slate. The color palette UI is CANVAS-003; this unit only implements the `color` field in node data and the corresponding `node-slate` classes.
  - The canvas background uses the `bg-canvas` token (slightly darker than the page base). React Flow's default edge, handle, and control styles are overridden in `globals.css` (from UI-002), so they should already match.

## D. Implementation Requirements

### 1. `components/editor/canvas/shapes.tsx`

A client component (`"use client"` at the top).

Define:

- `export type ShapeType = 'rectangle' | 'diamond' | 'circle' | 'pill' | 'cylinder' | 'hexagon'`.
- `export type NodeColor = 'slate' | 'blue' | 'violet' | 'green' | 'amber' | 'rose'`.
- `export type SystemaNodeData = { name: string; description: string; color: NodeColor }`.

Create a wrapper component `<ShapeWrapper>` that accepts `{ shape: ShapeType, color: NodeColor, width: number, height: number, selected: boolean, children: React.ReactNode }`:

- Renders an absolute-positioned SVG that fills the node area. The SVG path depends on `shape`:
  - `rectangle`: a rounded rect (`rx` equals the `--radius-node` value, 8px).
  - `diamond`: a polygon `(50%,0) (100%,50%) (50%,100%) (0,50%)`.
  - `circle`: an `<ellipse>` with `rx=50% ry=50%`.
  - `pill`: a rect with `rx` = half the height (9999px equivalent).
  - `cylinder`: a path with a top ellipse, two vertical sides, and a bottom curve.
  - `hexagon`: a polygon with six points.
- The SVG `fill` uses `currentColor`, and the wrapper sets `className` based on `color` (e.g., `text-node-slate`), so the fill follows the token.
- A border stroke uses `stroke` with the matching `-border` token (e.g., `stroke-node-slate-border`).
- When `selected` is true, the stroke becomes `stroke-accent-primary` with `strokeWidth={2}`.
- The children (the label) are rendered inside a `div` with `absolute inset-0 flex items-center justify-center p-2 text-center pointer-events-none`. The label uses `font-mono text-xs` and `text-node-{color}-text` (or `text-text-primary` for Slate).

Export the six node components (`RectangleNode`, `DiamondNode`, `CircleNode`, `PillNode`, `CylinderNode`, `HexagonNode`). Each accepts React Flow's `NodeProps<SystemaNodeData>`, renders a `<NodeResizer minWidth={80} minHeight={60} maxWidth={600} maxHeight={400} isVisible={selected} />`, and wraps its shape in `<ShapeWrapper>`.

If `data.name` is empty, show nothing (the node is unnamed by default per `project-overview.md`). If `data.name` is set, render it.

### 2. `components/editor/canvas/canvas.tsx`

A client component.

Imports: `"use client"`, `ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState, addEdge` from `@xyflow/react`, `@xyflow/react/dist/style.css`, the six node components from `./shapes`.

Define `export const nodeTypes = { rectangle: RectangleNode, diamond: DiamondNode, circle: CircleNode, pill: PillNode, cylinder: CylinderNode, hexagon: HexagonNode }`.

Export `function Canvas()`:

- `const [nodes, setNodes, onNodesChange] = useNodesState<...>([])`
- `const [edges, setEdges, onEdgesChange] = useEdgesState([])`
- `const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [])`
- Render `<ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} nodeTypes={nodeTypes} fitView className="bg-bg-canvas">`.
- Include `<Background gap={16} size={1} color="var(--color-border-subtle)" />`, `<Controls />`, and `<MiniMap nodeColor="var(--color-bg-elevated)" maskColor="rgba(0,0,0,0.5)" />`.

To prove the shapes render without the toolbar (CANVAS-004), initialize `nodes` with one of each shape at spread positions. Use `data: { name: shapeName, description: '', color: 'slate' }`. Mark these seed nodes with a comment `// SEED NODES — removed in CANVAS-002`. CANVAS-002 replaces this seed with an empty array and real add/remove.

Do not add a toolbar, palette picker, or edge labels in this unit.

### 3. Update `app/editor/[projectid]/page.tsx`

Replace the centered placeholder from PROJ-004 with `<Canvas />`. The page remains a Server Component that awaits `params`, calls `requireProjectAccess`, and renders `<EditorShell><Canvas /></EditorShell>`.

The `EditorShell` already accepts `children` (from UI-005) and renders them in its `<main>`. The canvas fills the available space.

## E. Integration Contracts

- **Contract introduced:** the `SystemaNodeData` type and the six `nodeTypes` keys. CANVAS-002, CANVAS-003, and CANVAS-004 extend `Canvas` and use `nodeTypes`. COLLAB-001 binds the `nodes`/`edges` state to Liveblocks; it does not change the shape components.
- **Contract consumed:** `EditorShell` children slot; `globals.css` React Flow overrides from UI-002.

## F. Scope Limits

Do not:

- Add the shape toolbar (CANVAS-004).
- Add the color palette picker (CANVAS-003).
- Add node/edge CRUD UI (CANVAS-002).
- Add Liveblocks sync (COLLAB-001).
- Add AI generation (AI-003).
- Modify `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/*`, `actions/*`, or `components/editor/project-sidebar.tsx`.
- Add persistence. The canvas state is in-memory only in this unit.

## G. Protected Behavior and Compatibility

- AUTH-001 through AUTH-004, PROJ-001 through PROJ-006 gates still pass.
- The editor route still enforces `requireProjectAccess`.
- The editor home at `/editor` still renders its content.
- The sidebar, navbar, and dialogs still work.
- `components/ui/*` unchanged.

## H. Acceptance Criteria

1. `@xyflow/react` is installed.
2. `components/editor/canvas/shapes.tsx` exports the six node components and the `SystemaNodeData` type.
3. `components/editor/canvas/canvas.tsx` exports `Canvas` and `nodeTypes`.
4. The editor route renders `<Canvas />` inside `<EditorShell>`.
5. The canvas background is `bg-canvas`.
6. All six seed shapes render visibly with labels and correct colors.
7. Resizing a shape stays within min 80×60 and max 600×400.
8. Selected shapes show the accent-primary border.
9. All Checks pass.
10. Agent reports PASS and stops.

## I. Checks

Check 1 — React Flow installed. Run `npm ls @xyflow/react`. Pass if a version is reported.

Check 2 — Shapes file exists. Run `ls components/editor/canvas/shapes.tsx components/editor/canvas/canvas.tsx`. Pass if both are listed.

Check 3 — Six node types registered. Run `grep -c "rectangle:" components/editor/canvas/canvas.tsx`, `grep -c "diamond:" ...`, `grep -c "circle:" ...`, `grep -c "pill:" ...`, `grep -c "cylinder:" ...`, `grep -c "hexagon:" ...`. Each count must be at least 1.

Check 4 — Resize bounds. Run `grep -c "minWidth={80}" components/editor/canvas/shapes.tsx`, `grep -c "maxWidth={600}" ...`, `grep -c "maxHeight={400}" ...`. Each count must be at least 1.

Check 5 — Editor route renders the canvas. Run `grep -c "<Canvas" app/editor/\[projectid\]/page.tsx`. Pass if count is at least 1. Run `grep -c "Project: " app/editor/\[projectid\]/page.tsx`. Pass if count is 0 (the placeholder is gone).

Check 6 — No hardcoded hex in the new files. Run `grep -cE "#[0-9a-fA-F]{3,8}" components/editor/canvas/shapes.tsx components/editor/canvas/canvas.tsx`. Pass if each reports 0. (Exception: SVG `rgba` in MiniMap maskColor is allowed; the check is for hex only.)

Check 7 — Build, typecheck, lint. Run `npm run build`, `npx tsc --noEmit`, `npm run lint`. If build fails with the Turbopack nvm shim issue, run `npx next build --webpack` and note the workaround.

Check 8 — Runtime check. Start the dev server, navigate to `/editor/[a valid project]`, confirm the six shapes render on a dark canvas. If a browser is unavailable, use `curl` to confirm the page returns 200 and the canvas class is in the HTML. Manual visual check remains for the user; the report states this.

Check 9 — No out-of-scope packages. Run `npm ls @trigger.dev/sdk @liveblocks/client @vercel/blob`. Pass if absent/empty (`@vercel/blob` is already installed from PROJ-005; if it appears, note it as expected).

## J. Report

Status: `PASS` or `FAIL`.

If PASS, report:

- `@xyflow/react` version installed.
- One-line result per check.
- Confirmation that the six seed shapes render and the canvas background is `bg-canvas`.
- Confirmation that the seed nodes are marked `// SEED NODES — removed in CANVAS-002` for the next unit.
- Confirmation that `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/*`, `actions/*`, and `components/editor/project-sidebar.tsx` are unchanged.
- Note that manual visual verification of shape rendering and resize bounds is required by the user.
- Closing line: "CANVAS-001 complete. Awaiting the next feature specification."

If FAIL, report which check failed, the exact error, and whether the cause is in scope (fixed) or out of scope (reported). Closing line: "Blocked, awaiting user direction."
