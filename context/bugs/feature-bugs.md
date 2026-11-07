# Feature Bug Report: Nodes are invisible after toolbar drop

## Symptom

React Flow reports: `The parent container needs a width and a height to render the graph.` Nodes added by drag-and-drop are therefore not visible.

## Diagnosis

The drag-and-drop flow already validates the shape, converts the pointer position, and adds the node to controlled state. The canvas wrapper and React Flow root use `h-full`, but the shell's content height was only implicit through a flex sizing chain. The editor shell/layout refinement left React Flow's parent without a dependable resolved height, matching the warning. Event propagation was not the cause.

## Fix

- Restored `onDragOver` and `onDrop` on the canvas wrapper div; neither uses capture phase.
- Gave the `EditorShell` main canvas region an explicit `calc(100dvh - 3.5rem)` height, accounting for the 3.5rem navbar. The nested content and canvas wrapper continue to fill that region with `h-full`.
- Kept React Flow's explicit `width: 100%` and `height: 100%` inline style.

## Verification status

- `npm run lint` passed.
- `npx tsc --noEmit` passed using Node.js v24.22.1.
- `next build --webpack` passed using Node.js v24.22.1.
- `git diff --check` passed.
- Browser console verification remains unavailable here: no browser automation package or browser executable is installed. Confirm in the browser that the container-size warning is gone and that a dropped node appears.
