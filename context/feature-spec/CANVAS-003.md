# CANVAS-003 — Node Color Palette

## A. Identity and Objective

- **Feature ID:** CANVAS-003
- **Title:** Node Color Palette
- **Primary objective:** Add a floating color palette above a selected node, allowing the user to change the node's background color from the approved six-color system without showing the paired text color.
- **Expected outcome:** Clicking a node shows a small floating swatch picker above it. Selecting a swatch updates `data.color` to one of the six approved values (`slate`, `blue`, `violet`, `green`, `amber`, `rose`). The node's background, border, and text update automatically based on the token classes. The picker does not appear for unselected nodes.
- **References:** `planning/feature-map.md` CANVAS-003; `context/ui-context.md` Node palette, Interaction States; `context/code-standards.md` Styling; `AGENTS.md`.

## B. Execution Contract

The agent must do all of the following without asking the user for confirmation, in this order:

1. Read `AGENTS.md`, `context/ui-context.md` (Node palette, Interaction States), `context/code-standards.md` (Styling).
2. Confirm CANVAS-002 is in place: `components/editor/canvas/canvas.tsx` and `shapes.tsx` exist, inline editing works, and the test button exists.
3. Create `components/editor/canvas/color-palette.tsx` per D.1.
4. Update `components/editor/canvas/shapes.tsx` per D.2 to render the palette when selected.
5. Run the **Checks** block in Section I top to bottom.
6. Fix any in-scope failure and re-run the failing check.
7. Report PASS or FAIL per Section J. On PASS, state the agent has stopped and is awaiting the next feature. On FAIL, state the exact blocker and stop.

Do not modify `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/*`, `actions/*`, `components/editor/project-sidebar.tsx`, or `components/editor/canvas/edge.tsx`.

## C. Context and Dependencies

- **Prerequisites:** CANVAS-002 complete and verified.
- **Contract introduced:** The `ColorPalette` component, which takes the current color and an `onChange` callback. The shape components consume it.
- **Contract consumed:** `NodeColor` type from CANVAS-001, `SystemaNodeData` from CANVAS-001.
- **Approved decisions:**
  - The palette shows only the background swatches. The paired text color is auto-applied and never shown in the picker (`ui-context.md`).
  - The palette uses the six approved palette keys: `slate`, `blue`, `violet`, `green`, `amber`, `rose`.
  - The palette floats above the selected node. It should not obstruct the node's main label or the resize handles.
  - Selecting a swatch updates `data.color`. The shape wrapper's `className` logic (from CANVAS-001) automatically resolves `text-node-{color}`, `stroke-node-{color}-border`, and `text-node-{color}-text`.

## D. Implementation Requirements

### 1. `components/editor/canvas/color-palette.tsx`

A client component (`"use client"`).

Imports: `"use client"`, `NodeColor` from `./shapes`.

Export `function ColorPalette({ currentColor, onChange }: { currentColor: NodeColor, onChange: (color: NodeColor) => void })`:

- Render a floating `<div>` with `absolute -top-12 left-1/2 -translate-x-1/2 z-50 flex gap-2 p-2 rounded-md bg-bg-elevated border border-border-default shadow-float`.
- Map over the six colors: `const colors: NodeColor[] = ['slate', 'blue', 'violet', 'green', 'amber', 'rose']`.
- For each, render a `<button>` with:
  - `type="button"`
  - `className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-accent-primary focus-visible:outline-offset-2"`
  - `style={{ backgroundColor: 'var(--color-node-' + color + ')' }}` — this is an exception to the "no hardcoded colors" rule because it dynamically composes the CSS variable name. Do not use hex values.
  - `borderColor: currentColor === color ? 'var(--color-accent-primary)' : 'transparent'`
  - `onClick={(e) => { e.stopPropagation(); onChange(color); }}`
  - `aria-label={`Set color ${color}`}`
- If `currentColor` matches the swatch, add a small checkmark (Lucide `Check` icon, `h-3 w-3 text-text-primary absolute inset-0 m-auto pointer-events-none`).

Do not show the text color inside the swatch.

### 2. Update `components/editor/canvas/shapes.tsx`

Inside the `ShapeWrapper` component (or the individual node components, whichever is simpler):

- The wrapper already receives `selected` and `color`.
- If `selected` is true, render `<ColorPalette currentColor={color} onChange={(newColor) => updateNodeData({ color: newColor })} />` inside the wrapper's `relative` container.
- To update the node data, use React Flow's `useReactFlow` hook and `updateNodeData(id, { color })`, or pass an `onColorChange` callback down from the canvas. The simplest approach is to use `useReactFlow` inside the node component.

Use the following snippet as a guide for the `useReactFlow` wiring inside the node component. This block replaces what would otherwise be a nested code fence.

START OF shapes.tsx snippet

    import { useReactFlow } from '@xyflow/react';
    // inside the node component:
    const { updateNodeData } = useReactFlow();
    const handleColorChange = (newColor: NodeColor) => {
      updateNodeData(id, { color: newColor });
    };

END OF shapes.tsx snippet

- Ensure the palette's `onClick` calls `e.stopPropagation()` so it doesn't trigger the node's double-click or selection handlers.
- The palette should only render when `selected` is true. Do not render it on hover or always.

## E. Integration Contracts

- **Contract introduced:** `ColorPalette` component with `currentColor` and `onChange`.
- **Contract consumed:** `SystemaNodeData`, `NodeColor`, React Flow's `useReactFlow().updateNodeData`.

## F. Scope Limits

Do not:

- Add a color palette for edges. Edges use a single stroke color from `--border-default` (`ui-context.md`).
- Add the shape toolbar (CANVAS-004).
- Add Liveblocks sync (COLLAB-001).
- Modify `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/*`, `actions/*`, `components/editor/project-sidebar.tsx`, or `components/editor/canvas/edge.tsx`.

## G. Protected Behavior and Compatibility

- CANVAS-001 and CANVAS-002 gates still pass: six shapes render, inline editing works, nodes can be added and deleted.
- The canvas background remains `bg-canvas`.
- `components/ui/*` unchanged.

## H. Acceptance Criteria

1. `components/editor/canvas/color-palette.tsx` exists and exports `ColorPalette`.
2. Selecting a node shows the palette above it.
3. The palette shows six swatches in the approved colors.
4. Clicking a swatch updates the node's color to the corresponding token class.
5. The paired text color changes automatically; the swatch picker does not show the text color.
6. The palette does not appear for unselected nodes.
7. Clicking a swatch does not trigger node selection or deselection.
8. All Checks pass.
9. Agent reports PASS and stops.

## I. Checks

Check 1 — File exists. Run `ls components/editor/canvas/color-palette.tsx`. Pass if listed.

Check 2 — Palette component shape. Run `grep -c "currentColor" components/editor/canvas/color-palette.tsx` and `grep -c "onChange" components/editor/canvas/color-palette.tsx`. Each count must be at least 1.

Check 3 — Six colors present. Run `grep -c "slate" components/editor/canvas/color-palette.tsx`, `grep -c "blue" ...`, `grep -c "violet" ...`, `grep -c "green" ...`, `grep -c "amber" ...`, `grep -c "rose" ...`. Each count must be at least 1.

Check 4 — Shapes integrate the palette. Run `grep -c "ColorPalette" components/editor/canvas/shapes.tsx` and `grep -c "updateNodeData" components/editor/canvas/shapes.tsx`. Each count must be at least 1.

Check 5 — Palette is conditional on selection. Run `grep -c "selected &&" components/editor/canvas/shapes.tsx` or equivalent. Pass if the agent uses `selected` to conditionally render `ColorPalette`.

Check 6 — No hardcoded hex. Run `grep -cE "#[0-9a-fA-F]{3,8}" components/editor/canvas/color-palette.tsx components/editor/canvas/shapes.tsx`. Pass if each reports 0. (The dynamic `var(--color-node-...)` inline style is allowed.)

Check 7 — Build, typecheck, lint. Run `npm run build`, `npx tsc --noEmit`, `npm run lint`. If build fails with the Turbopack nvm shim issue, run `npx next build --webpack` and note the workaround.

Check 8 — Behavior test. Start the dev server, add a node (via the test button from CANVAS-002), click it to select, confirm the palette appears, click a swatch, confirm the node changes color and the text remains readable. If browser testing is unavailable, report the limitation.

Check 9 — No out-of-scope packages. Run `npm ls @trigger.dev/sdk @liveblocks/client`. Pass if absent/empty.

## J. Report

Status: `PASS` or `FAIL`.

If PASS, report:

- One-line result per check.
- How the palette was integrated: `useReactFlow` inside the node, or a callback from the canvas. (The spec prefers `useReactFlow`.)
- Confirmation that the text color is not shown in the picker.
- Confirmation that the palette appears only when selected.
- Confirmation that `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/*`, `actions/*`, `components/editor/project-sidebar.tsx`, and `components/editor/canvas/edge.tsx` are unchanged.
- Note that manual browser verification of the palette appearance and color switching is required by the user.
- Closing line: "CANVAS-003 complete. Awaiting the next feature specification."

If FAIL, report which check failed, the exact error, and whether the cause is in scope (fixed) or out of scope (reported). Closing line: "Blocked, awaiting user direction."
