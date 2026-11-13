# EXPORT-001 — Canvas JSON Download

## A. Identity and Objective

- **Feature ID:** EXPORT-001
- **Title:** Canvas JSON Download
- **Primary objective:** Add a button (likely in the navbar or the snapshot history dialog) that allows the user to download the latest saved canvas JSON snapshot. This fulfills the product requirement for exporting the raw graph.
- **Expected outcome:** A user clicks "Download JSON" (or a similar icon). The browser downloads a `.json` file containing the nodes and edges of the most recent snapshot.
- **References:** `planning/feature-map.md` EXPORT-001; `context/project-overview.md` (Persistence features); `context/architecture.md` (Storage Model); `AGENTS.md`.

## B. Execution Contract

The agent must do all of the following without asking you for confirmation, in this order:

1. Read `AGENTS.md`, `context/project-overview.md` (Features), `context/architecture.md` (Storage Model).
2. Confirm PERSIST-001 (snapshots exist) and SPEC-002 (download route pattern) are in place.
3. Create `app/api/projects/[projectId]/snapshots/latest/download/route.ts` per D.1 to serve the latest JSON file.
4. Update `components/editor/snapshot-history.tsx` (or the navbar) to include a "Download JSON" button per D.2.
5. Run the **Checks** block in Section I top to bottom.
6. Fix any in-scope failure and re-run the failing check.
7. Report PASS or FAIL per Section J.

Do not modify `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/db.ts`, `lib/server/auth.ts`, `actions/*`, or `components/editor/canvas/*`.

## C. Context and Dependencies

- **Prerequisites:** PERSIST-001 complete (snapshots exist in DB and Blob).
- **Contract introduced:** The latest snapshot download API route.
- **Contract consumed:** `prisma`, `@vercel/blob`, `requireProjectAccess`.
- **Approved decisions:**
  - The JSON file should be downloaded directly from the Blob, similar to how the Markdown spec is downloaded.
  - Because a project might have multiple snapshots, this feature downloads the **most recent** one. (If they want older ones, they can use the Snapshot History dialog).
  - The route must enforce `requireProjectAccess` so only the owner/editors can download it.

## D. Implementation Requirements

### 1. Create `app/api/projects/[projectId]/snapshots/latest/download/route.ts`

A `GET` handler that finds the latest snapshot and streams the JSON file.

START OF route.ts snippet
import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { AccessError, requireProjectAccess } from "@/lib/server/auth";

    export async function GET(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
      try {
        const { projectId } = await params;
        await requireProjectAccess(projectId);

        // Find the most recent snapshot
        const latestSnapshot = await prisma.canvasSnapshot.findFirst({
          where: { projectId },
          orderBy: { sequence: "desc" },
        });

        if (!latestSnapshot) {
          return NextResponse.json({ error: "No snapshots found for this project." }, { status: 404 });
        }

        // Fetch the private blob
        const blob = await get(latestSnapshot.blobPath, { access: "private" });
        if (!blob || blob.statusCode !== 200) {
          return NextResponse.json({ error: "Failed to fetch blob" }, { status: 500 });
        }

        const json = await new Response(blob.stream).text();

        return new Response(json, {
          headers: {
            "Content-Type": "application/json",
            "Content-Disposition": `attachment; filename="canvas-${projectId}.json"`,
          },
        });
      } catch (error) {
        if (error instanceof AccessError) {
          const status = error.code === "UNAUTHORIZED" ? 401 : error.code === "FORBIDDEN" ? 403 : 404;
          return NextResponse.json({ error: error.message }, { status });
        }
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Unable to download snapshot" },
          { status: 500 },
        );
      }
    }

END OF route.ts snippet

### 2. Update UI to Trigger the Download

- In `components/editor/snapshot-history.tsx`, add a button at the top or bottom that says "Download Latest JSON" or uses a Lucide `Download` icon.
- The button should be an `<a>` tag or a button with `window.location.href = '/api/projects/[projectId]/snapshots/latest/download'`. Because it has the `Content-Disposition` header, the browser will handle it as a file download.
- Alternatively, if it feels more natural in the TopNavbar, you can place the download icon next to the "History" icon. Do not create new UI if you can easily add it to the existing History popover.

## E. Integration Contracts

- **Contract introduced:** The `/api/projects/[projectId]/snapshots/latest/download` endpoint.
- **Contract consumed:** `requireProjectAccess`.

## F. Scope Limits

Do not:

- Allow downloading a specific older snapshot (only the latest one for this unit).
- Add ZIP or CSV exports.
- Modify `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, `AGENTS.md`, `lib/db.ts`, `lib/server/auth.ts`, `actions/*`, or `components/editor/canvas/*`.

## G. Protected Behavior and Compatibility

- PERSIST-001 and PERSIST-002 gates still pass.
- `components/ui/*` unchanged.

## H. Acceptance Criteria

1. `/api/projects/[projectId]/snapshots/latest/download` exists and requires authorization.
2. The route returns the JSON with the `Content-Disposition: attachment` header.
3. The UI has a way to trigger this download.
4. All Checks pass.

## I. Checks

Check 1 — Route exists. Run `ls app/api/projects/\[projectId\]/snapshots/latest/download/route.ts`. Pass if listed.

Check 2 — Header set. Run `grep -c "Content-Disposition" app/api/projects/\[projectId\]/snapshots/latest/download/route.ts`. Pass if count is 1.

Check 3 — UI updated. Run `grep -c "Download" components/editor/snapshot-history.tsx` or `grep -c "Download" components/editor/editor-navbar.tsx`. Pass if count is at least 1 in either file.

Check 4 — Build, typecheck, lint. Run `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack`.

## J. Report

Status: `PASS` or `FAIL`.

If PASS, report:

- One-line result per check.
- Where the download button was placed (Snapshot History or Navbar).
- Note that manual browser verification (clicking the button and checking the downloaded file) is required by the user.
- Closing line: "EXPORT-001 complete. The Systema MVP is fully implemented."
