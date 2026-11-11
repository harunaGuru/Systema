# PROJ-007 — Collaborator Management UI

## A. Identity and Objective

- **Feature ID:** PROJ-007
- **Title:** Collaborator Management UI
- **Primary objective:** Provide an Owner-only interface in the editor to add or remove collaborators by email, utilizing the existing `addCollaborator` and `removeCollaborator` Server Actions from AUTH-004.
- **Expected outcome:** An Owner viewing `/editor/[projectId]` sees a "Share" (or "Manage Collaborators") button in the navbar or left sidebar. Clicking it opens a dialog where they can type an email to add a user, see a list of current collaborators, and remove them.
- **References:** `planning/feature-map.md` PROJ-007; `context/ui-context.md` Layout Patterns, Interaction States; `context/architecture.md` Auth and Access Model; `AGENTS.md`.

## B. Execution Contract

The agent must do all of the following without asking the user for confirmation, in this order:

1. Read `AGENTS.md`, `context/architecture.md` (Auth and Access Model), `context/ui-context.md` (Interaction States).
2. Confirm AUTH-004 and PROJ-004 are in place: `actions/collaborators.ts` exists, and `/editor/[projectid]` verifies access via `requireProjectAccess`.
3. Create `app/api/projects/[projectId]/collaborators/route.ts` per D.1 to fetch the current list of collaborators.
4. Create `components/editor/collaborator-dialog.tsx` per D.2 for the UI (adding by email, listing, and removing).
5. Update `components/editor/editor-navbar.tsx` (or the left sidebar) to render a "Share" button visible **only to the project owner** per D.3.
6. Run the **Checks** block in Section I top to bottom.
7. Fix any in-scope failure and re-run the failing check.
8. Report PASS or FAIL per Section J. On PASS, state the agent has stopped and is awaiting the next feature. On FAIL, state the exact blocker and stop.

Do not modify `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/db.ts`, `lib/server/auth.ts`, `actions/*`, or `components/editor/canvas/*`.

## C. Context and Dependencies

- **Prerequisites:** AUTH-004 complete (Actions exist) and PROJ-004 complete (Route access check exists).
- **Contract introduced:** The `/api/projects/[projectId]/collaborators` GET endpoint and the `CollaboratorDialog` component.
- **Contract consumed:** `addCollaborator` and `removeCollaborator` (from `actions/collaborators.ts`), `requireProjectAccess`.
- **Approved decisions:**
  - The button must only be visible if the current user is the project owner. Since the Server Component page already calls `requireProjectAccess(projectid)` and gets `role`, we can pass `isOwner={role === 'owner'}` down to the client shell.
  - Adding/removing a collaborator should trigger a refresh of the collaborator list in the dialog so the UI stays in sync.
  - We will fetch the collaborator list via a Route Handler (GET) rather than a Server Component, so it can be dynamically refreshed without reloading the page.

## D. Implementation Requirements

### 1. Create `app/api/projects/[projectId]/collaborators/route.ts`

A `GET` handler that returns the list of collaborators for the project.

- Call `requireProjectAccess(projectId)` (only owner needs to see this, but any authorized user getting it doesn't hurt; restrict it to owner if preferred).
- Query `prisma.collaborator.findMany({ where: { projectId }, include: { project: false } })`. Note: You may need to fetch Clerk user details for each `userId` to display their names/emails in the UI.
- Return `NextResponse.json({ collaborators })`. (If you fetch Clerk details, return `{ id, userId, name, email }`).

### 2. Create `components/editor/collaborator-dialog.tsx`

A client component that receives `projectId` and `isOwner` as props.

- **State:** `open` (boolean), `email` (string), `collaborators` (array), `loading` (boolean), `error` (string).
- **Fetching:** When opened, fetch `GET /api/projects/[projectId]/collaborators` to populate the list.
- **Add UI:** An input field for the email address and an "Add" button. On submit, call `await addCollaborator(projectId, email)`. If successful, clear the input and refetch the list. If it fails, show the `error` message.
- **List UI:** Display the current collaborators. For each, provide a "Remove" (Trash) button. On click, call `await removeCollaborator(projectId, userId)` and refetch.
- **Dialog:** Use the shadcn `<Dialog>` component.

### 3. Update `components/editor/editor-navbar.tsx` and `editor-shell.tsx`

- In `app/editor/[projectid]/page.tsx`, we already have the `role` from `requireProjectAccess`. Pass `isOwner={role === 'owner'}` to `<EditorShell>` and then to `<EditorNavbar>`.
- In `EditorNavbar`, conditionally render a "Share" button (using the Lucide `Share2` or `Users` icon) if `isOwner` is true.
- Clicking the button opens the `CollaboratorDialog`.

## E. Integration Contracts

- **Contract introduced:** The `/api/projects/[projectId]/collaborators` endpoint and the `CollaboratorDialog`.
- **Contract consumed:** `addCollaborator`, `removeCollaborator`.

## F. Scope Limits

Do not:

- Allow non-owners to add or remove collaborators (AUTH-004 already enforces this on the server, but the UI should also hide it).
- Modify the left sidebar if the navbar is an easier place to put the Share button. (The navbar is recommended since it's global across the editor).
- Modify `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/db.ts`, `lib/server/auth.ts`, `actions/*`, or `components/editor/canvas/*`.

## G. Protected Behavior and Compatibility

- AUTH-004, PERSIST-001, and PERSIST-002 gates still pass.
- The left sidebar and canvas remain untouched.

## H. Acceptance Criteria

1. The `/api/projects/[projectId]/collaborators` GET route exists and returns data.
2. The Share button only appears for owners.
3. The Collaborator Dialog allows adding a new email.
4. The Collaborator Dialog lists current collaborators and allows removing them.
5. Adding/removing triggers a list refresh.
6. All Checks pass.

## I. Checks

Check 1 — API Route exists. Run `ls app/api/projects/\[projectId\]/collaborators/route.ts`. Pass if listed.

Check 2 — Dialog exists. Run `ls components/editor/collaborator-dialog.tsx`. Pass if listed. Run `grep -c "addCollaborator" components/editor/collaborator-dialog.tsx` and `grep -c "removeCollaborator" components/editor/collaborator-dialog.tsx`. Each count must be at least 1.

Check 3 — Owner restriction. Run `grep -c "isOwner" components/editor/editor-navbar.tsx` or `grep -c "isOwner" app/editor/\[projectid\]/page.tsx`. Pass if count is at least 1.

Check 4 — Build, typecheck, lint. Run `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack`.

## J. Report

Status: `PASS` or `FAIL`.

If PASS, report:

- One-line result per check.
- Confirmation that the Share button is hidden for non-owners.
- Note that manual browser verification (logging in as an owner, opening the dialog, adding a user, and verifying the user can see the project in their Shared list) is required by the user.
- Closing line: "PROJ-007 complete. Awaiting the next feature specification."
