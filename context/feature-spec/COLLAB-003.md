# COLLAB-003 — Comments

## A. Identity and Objective

- **Feature ID:** COLLAB-003
- **Title:** Comments
- **Primary objective:** Add a comments feature to the editor using Liveblocks Comments, displayed in the "Comments" tab of the right AI sidebar.
- **Expected outcome:** A user can open the right sidebar, switch to the Comments tab, read existing comments, and post new comments. Comments are threaded, synced in real-time across sessions, and visually consistent with the dark theme.
- **References:** `planning/feature-map.md` COLLAB-003; `context/ui-context.md` Layout Patterns, Interaction States; `context/architecture.md` Auth and Access Model; `context/code-standards.md` Next.js, Styling; `AGENTS.md`.

## B. Execution Contract

The agent must do all of the following without asking the user for confirmation, in this order:

1. Read `AGENTS.md`, `context/ui-context.md` (Layout Patterns, Interaction States), `context/architecture.md`, `context/code-standards.md`.
2. Confirm COLLAB-002 is in place: `LiveblocksRoom` exists and wraps the canvas, and presence (cursors) works.
3. Install Liveblocks Comments: run `npm install @liveblocks/react-ui`.
4. Update `liveblocks.config.ts` per D.1 to support comment threads.
5. Create the right sidebar container `components/editor/ai-sidebar.tsx` per D.2 (if it doesn't exist yet, create a basic shell with three tabs: Prompt, Comments, Spec).
6. Integrate `@liveblocks/react-ui` comments into the "Comments" tab per D.3.
7. Update `components/editor/editor-shell.tsx` to render the right sidebar (toggled from the navbar) per D.4.
8. Update `components/editor/editor-navbar.tsx` to add the right sidebar toggle button per D.5.
9. Run the **Checks** block in Section I top to bottom.
10. Fix any in-scope failure and re-run the failing check.
11. Report PASS or FAIL per Section J. On PASS, state the agent has stopped and is awaiting the next feature. On FAIL, state the exact blocker and stop.

Do not modify `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/*`, `actions/*`, `components/editor/project-sidebar.tsx`, or `components/editor/canvas/*` (except if needed to add the sidebar toggle to the navbar).

## C. Context and Dependencies

- **Prerequisites:** COLLAB-002 complete and verified.
- **Contract introduced:** The right sidebar shell (`AiSidebar`) and the Comments tab.
- **Contract consumed:** `LiveblocksRoom` (the comments must be inside the `RoomProvider`).
- **Approved decisions:**
  - Liveblocks Comments is the engine. Do not build a custom comment database schema or API routes.
  - The right sidebar has three tabs: "Prompt", "Comments", and "Spec". Only "Comments" is functional in this unit; the others are placeholders.
  - The `@liveblocks/react-ui` package provides pre-built, themed components. Use its default CSS import (`@liveblocks/react-ui/styles.css`) and apply the `dark` class to the container to match the app theme.
  - Comments are scoped to the room (`projectId`).

## D. Implementation Requirements

### 1. Update `liveblocks.config.ts`

Liveblocks Comments requires thread metadata to be typed. Ensure the global `Liveblocks` interface includes an empty `ThreadMetadata` block to enable document-level comments.

START OF liveblocks.config.ts snippet

    interface Liveblocks {
      // ... existing Presence, Storage, UserMeta ...
      ThreadMetadata: {
        // Leave empty for now to enable document-level comments.
      };
    }

END OF liveblocks.config.ts snippet

### 2. Create `components/editor/ai-sidebar.tsx`

A client component (`"use client"`).

Create a floating right sidebar that mirrors the left sidebar's behavior (fixed width, slides from the right, floating-panel styling).

- It should have a header with a close button and three tabs using shadcn `<Tabs>`: `prompt`, `comments`, `spec`.
- The "Comments" tab renders the Liveblocks Comments UI.
- The "Prompt" and "Spec" tabs render a simple `div` with `text-sm text-text-muted` saying "Coming soon."

### 3. Integrate Liveblocks Comments UI

Inside the "Comments" tab, use the `@liveblocks/react-ui` components.

Import the styles at the top of the component:
`import "@liveblocks/react-ui/styles.css";`

Render the Comments UI. If the package exports a single `<Comments />` component that handles both the list and the composer, use that. If it requires manual wiring, use the `Thread` and `Composer` components.

START OF ai-sidebar.tsx snippet

    import { Thread, Composer } from "@liveblocks/react-ui";
    // Or: import { Comments } from "@liveblocks/react-ui";

    // Inside the tab content:
    <div className="dark flex flex-col h-full bg-bg-surface rounded-md overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4">
        {/* Threads will render here */}
      </div>
      <div className="p-4 border-t border-border-default">
        <Composer />
      </div>
    </div>

END OF ai-sidebar.tsx snippet

### 4. Update `components/editor/editor-shell.tsx`

- Add state for the right sidebar: `const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false)`.
- Render `<AiSidebar isOpen={isRightSidebarOpen} onClose={() => setIsRightSidebarOpen(false)} />`.
- Pass `isRightSidebarOpen` and `onToggleRightSidebar` to `EditorNavbar`.

### 5. Update `components/editor/editor-navbar.tsx`

- Accept `onToggleRightSidebar` as a prop.
- Render a second toggle button on the right side of the navbar (e.g., using the `MessageSquare` icon from Lucide) to open the AI sidebar.
- Ensure the `EditorNavbar` props are updated to include the new toggle.

## E. Integration Contracts

- **Contract introduced:** The `AiSidebar` component and the comments UI.
- **Contract consumed:** `RoomProvider` context, `@liveblocks/react-ui`.

## F. Scope Limits

Do not:

- Build a custom comment database or API.
- Add pinned comments (clicking on the canvas to leave a comment). That is a future enhancement; this unit is document-level comments in the sidebar.
- Modify `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/*`, `actions/*`, or `components/editor/canvas/*` (except for the navbar toggle).
- Change the left sidebar behavior.

## G. Protected Behavior and Compatibility

- COLLAB-001 and COLLAB-002 gates still pass (live sync, cursors).
- CANVAS-001 through CANVAS-005 gates still pass (shapes, drag-and-drop, palette).
- The left sidebar toggle still works.

## H. Acceptance Criteria

1. `@liveblocks/react-ui` is installed.
2. The right sidebar opens and closes, floating from the right.
3. It has three tabs: Prompt, Comments, Spec.
4. The Comments tab shows a composer and allows posting a comment.
5. Comments sync in real-time between two sessions.
6. The comment UI is dark-themed and readable.
7. All Checks pass.
8. Agent reports PASS and stops.

## I. Checks

Check 1 — Package installed. Run `npm ls @liveblocks/react-ui`. Pass if a version is reported.

Check 2 — Sidebar exists. Run `ls components/editor/ai-sidebar.tsx`. Pass if listed.

Check 3 — Tabs present. Run `grep -c "Prompt" components/editor/ai-sidebar.tsx`, `grep -c "Comments" ...`, `grep -c "Spec" ...`. Each count must be at least 1.

Check 4 — Liveblocks UI integrated. Run `grep -c "@liveblocks/react-ui" components/editor/ai-sidebar.tsx`. Pass if count is at least 1.

Check 5 — Right sidebar wired. Run `grep -c "isRightSidebarOpen" components/editor/editor-shell.tsx`. Pass if count is at least 1.

Check 6 — No hardcoded hex. Run `grep -cE "#[0-9a-fA-F]{3,8}" components/editor/ai-sidebar.tsx`. Pass if count is 0.

Check 7 — Build, typecheck, lint. Run `npm run build`, `npx tsc --noEmit`, `npm run lint`. If build fails with the Turbopack nvm shim issue, run `npx next build --webpack` and note the workaround.

Check 8 — Playwright Browser Test. If Playwright MCP is available, use it to navigate to the editor, open the right sidebar, click the Comments tab, and take a snapshot to confirm the composer is visible and dark-themed. If unavailable, report the limitation.

Check 9 — No out-of-scope packages. Run `npm ls @trigger.dev/sdk`. Pass if absent/empty.

## J. Report

Status: `PASS` or `FAIL`.

If PASS, report:

- One-line result per check.
- Whether `@liveblocks/react-ui` provided a single `<Comments />` component or required manual `Thread`/`Composer` wiring.
- Confirmation that the right sidebar opens and closes.
- Confirmation that the comment composer renders in dark mode.
- Note that manual two-session verification of real-time comment syncing is required by the user.
- Closing line: "COLLAB-003 complete. Awaiting the next feature specification."

If FAIL, report which check failed, the exact error, and whether the cause is in scope (fixed) or out of scope (reported). Closing line: "Blocked, awaiting user direction."
