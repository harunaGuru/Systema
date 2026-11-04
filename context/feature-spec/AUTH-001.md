# AUTH-001 — Clerk Provider, Proxy, Sign-In/Up Pages, Route Protection

## A. Identity and Objective

- **Feature ID:** AUTH-001
- **Title:** Clerk Provider, Proxy, Sign-In/Up Pages, Route Protection
- **Primary objective:** Wire Clerk into the Next.js 16 application with the dark theme, custom sign-in and sign-up pages, route protection via `proxy.ts`, and a `UserButton` in the editor navbar.
- **Expected outcome:** Unauthenticated users are redirected to `/sign-in`; authenticated users can sign in and reach `/editor`; the navbar shows the Clerk `UserButton` with profile and logout actions; `proxy.ts` exists at the root (not `middleware.ts`).
- **References:** `planning/feature-map.md` AUTH-001; `context/architecture.md` Auth and Access Model; `context/ui-context.md` Layout Patterns, Interaction States; `context/code-standards.md` Next.js, API Routes; `AGENTS.md`.

## B. Execution Contract

The agent must do all of the following without asking the user for confirmation, in this order:

1. Read `AGENTS.md`, `context/architecture.md` (Auth and Access Model), `context/code-standards.md` (Next.js, API Routes), `context/ui-context.md` (Layout Patterns, Interaction States).
2. **Stop and ask the user for the Clerk keys before proceeding.** Request `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`. Tell the user where to find them: Clerk Dashboard → API keys page (https://dashboard.clerk.com/~/api-keys). Instruct the user to add them to `.env.local` (not committed). Wait for confirmation that both are set.
3. Confirm UI-006 is in place: `components/editor/editor-shell.tsx` exists, `components/editor/editor-navbar.tsx` exists, `lucide-react` is installed.
4. Install Clerk: run `npm install @clerk/nextjs`. If `@clerk/themes` is not already available as a transitive dependency, also run `npm install @clerk/themes`.
5. Create `proxy.ts` at the project root per D.1.
6. Update `app/layout.tsx` to wrap with `ClerkProvider` using the dark theme per D.2.
7. Create `app/sign-in/[[...sign-in]]/page.tsx` per D.3.
8. Create `app/sign-up/[[...sign-up]]/page.tsx` per D.4.
9. Update `components/editor/editor-navbar.tsx` to replace the placeholder avatar with Clerk's `UserButton` per D.5.
10. Update `app/page.tsx` to redirect authenticated users to `/editor` and unauthenticated users to `/sign-in` per D.6.
11. Run the **Checks** block in Section I top to bottom.
12. Fix any in-scope failure and re-run the failing check.
13. Report PASS or FAIL per Section J. On PASS, state the agent has stopped and is awaiting the next feature. On FAIL, state the exact blocker and stop.

Do not modify `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, or `AGENTS.md`.

## C. Context and Dependencies

- **Prerequisites:** UI-006 complete and verified.
- **Approved decisions:**
  - Clerk handles identity only; roles (owner/editor) live in Postgres (AUTH-002).
  - `proxy.ts` replaces `middleware.ts` in Next.js 16; the code inside is identical to the old middleware.
  - By default `clerkMiddleware()` protects no routes; all routes are public unless opt-in. This spec protects every matched route except `/`, `/sign-in`, and `/sign-up`. The root page handles its own unauthenticated redirect.
  - `UserButton` provides profile settings and sign-out without rebuilding Clerk internals.
  - Auth pages use Clerk's `dark` theme with appearance overrides using app CSS variables, no hardcoded colors.

## D. Implementation Requirements

### 1. `proxy.ts` at the project root

Create `proxy.ts` (not `middleware.ts`) at the root of the project, alongside `package.json`.

The file must:

- Import `clerkMiddleware` and `createRouteMatcher` from `@clerk/nextjs/server`.
- Define `isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)', '/'])`.
- Export `clerkMiddleware` with an async handler that calls `await auth.protect()` for non-public routes.
- Export a `config` object with a matcher that skips Next.js internals and static files. Use the standard Clerk matcher: `'/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)'` and also `'/(api|trpc)(.*)'`.

Do not add organization or session checks. Do not protect the Liveblocks auth endpoint explicitly; it will be handled by the access helper in AUTH-002.

### 2. Update `app/layout.tsx`

Wrap the existing `<body>` content with `<ClerkProvider>`.

Import `ClerkProvider` from `@clerk/nextjs`.

Pass the `appearance` prop to apply Clerk's `dark` theme with overrides using Systema tokens. The `dark` theme is imported from `@clerk/themes`.

The appearance object:

- `theme: dark` (from `@clerk/themes`).
- `variables`: set `colorPrimary` to the accent primary value, `colorBackground` to `bg-surface`, `colorText` to `text-primary`, `colorTextSecondary` to `text-muted`, `colorInputBackground` to `bg-elevated`, `colorInputText` to `text-primary`, `borderRadius` to the `--radius-md` value.
- `elements`: set `formButtonPrimary` to use `bg-accent-primary` and `text-bg-base`, `card` to use `bg-surface` and `border-border-default`, `headerTitle` to use `text-primary`, `headerSubtitle` to use `text-muted`.

Do not hardcode hex or OKLCH values in the layout. The values must reference the CSS variables already defined in `globals.css` (for example, `var(--color-accent-primary)`). If Clerk's `variables` prop requires a computed string rather than a `var()` reference, use `oklch(...)` values copied from `ui-context.md` and note this in the report. Do not invent new color values.

Keep the existing `GeistSans.variable` and `GeistMono.variable` classes on `<html>`.

### 3. `app/sign-in/[[...sign-in]]/page.tsx`

A Server Component (no `"use client"`).

Layout:

- Large screens: two-panel. Left panel contains a compact logo (text "Systema" in `font-sans text-xl font-medium`), a tagline ("Design systems together, in real time." in `text-sm text-text-muted`), and a short text-only feature list (three bullet points using `text-sm text-text-muted`, no cards, no icons). Right panel contains `<SignIn />` from `@clerk/nextjs`, centered.
- Small screens: form only, no left panel. Use Tailwind responsive classes (`hidden lg:flex` on the left panel).
- No gradients, no oversized hero, no feature cards, no scroll-heavy layout.
- Background `bg-bg-base`, text `text-text-primary`.

The `<SignIn />` component must use the Clerk `dark` theme inherited from the provider. Pass `routing="path"` and `path="/sign-in"` if the Clerk version requires explicit routing props; otherwise rely on the provider defaults.

### 4. `app/sign-up/[[...sign-up]]/page.tsx`

Same structure as D.3 but with `<SignUp />` from `@clerk/nextjs` and `path="/sign-up"`.

The left panel copy can be identical or slightly adapted; do not add new product claims. Keep it text-only.

### 5. Update `components/editor/editor-navbar.tsx`

Replace the placeholder avatar `<div>` in the right section with Clerk's `<UserButton />` from `@clerk/nextjs`.

- The `UserButton` must be rendered only when a user is signed in. Because the navbar is a client component, either wrap it in `<SignedIn>` from `@clerk/nextjs` or check `isSignedIn` from `useAuth()` and render conditionally.
- Keep the two disabled placeholder icon buttons (Sparkles, History) unchanged.
- Do not rebuild the user menu or customize Clerk internals. The default `UserButton` menu provides profile and sign-out.
- Set `afterSignOutUrl="/sign-in"` on the `UserButton` if the installed Clerk version accepts it; otherwise set it on `<ClerkProvider>` in the layout.

### 6. Update `app/page.tsx`

This page must redirect based on auth state:

- Import `auth` from `@clerk/nextjs/server`.
- Call `const { userId } = await auth()`.
- If `userId` is present, `redirect('/editor')`.
- If not, `redirect('/sign-in')`.

This page becomes a Server Component with no JSX (only a redirect). Remove the previous home content from `app/page.tsx`; the editor home at `/editor` remains.

Note: `/` is public to `proxy.ts`; `app/page.tsx` handles its authenticated and unauthenticated redirects. `app/editor/page.tsx` is protected by `proxy.ts`. Do not add a duplicate auth check there in this unit; AUTH-002 adds the database-backed access helper.

### 7. Do not create the access helper or Liveblocks auth endpoint

Those belong to AUTH-002 and AUTH-003. Do not query Postgres or verify project ownership in this unit.

## E. Integration Contracts

- **Contract changed:** `EditorNavbar` now renders Clerk's `UserButton` in the right section instead of a placeholder. The `isSidebarOpen` and `onToggleSidebar` props are unchanged.
- **Contract introduced:** auth state is now available app-wide via `ClerkProvider`. Later units use `auth()` from `@clerk/nextjs/server` to get the Clerk user ID.
- **Contract consumed:** Clerk's `dark` theme and `UserButton`.

## F. Scope Limits

Do not:

- Create the Postgres-backed `requireProjectAccess` helper (AUTH-002).
- Create the Liveblocks auth endpoint (AUTH-003).
- Add Prisma, Neon, Trigger.dev, Liveblocks, or Vercel Blob.
- Build a custom user menu; use `UserButton` as-is.
- Add roles or ownership checks to project routes; `proxy.ts` only enforces "signed in", not "owns this project".
- Modify `app/globals.css`, `components/ui/*`, `context/*`, `planning/*`, or `AGENTS.md`.

## G. Protected Behavior and Compatibility

- UI-001 through UI-006 verification gate still passes.
- The sidebar toggle and slide-in animation from UI-004 still work.
- The home screen content from UI-005 still renders at `/editor` (now behind auth).
- `components/ui/*` unchanged.
- Next.js 16 conventions: `proxy.ts`, no `next lint`, async `params`.

## H. Acceptance Criteria

1. `@clerk/nextjs` is installed; `@clerk/themes` is available (installed directly if not transitive).
2. `proxy.ts` exists at the root (not `middleware.ts`), leaves `/`, `/sign-in`, and `/sign-up` public, and protects other matched routes.
3. `app/layout.tsx` wraps the app in `<ClerkProvider>` with the dark theme and Systema token overrides.
4. `/sign-in` and `/sign-up` render Clerk's prebuilt forms with the dark theme; large screens show the two-panel layout, small screens show the form only.
5. `app/page.tsx` redirects signed-in users to `/editor` and signed-out users to `/sign-in`.
6. The editor navbar shows Clerk's `UserButton` when signed in; the default menu provides profile and sign-out.
7. Signing out via `UserButton` returns the user to `/sign-in`.
8. All colors in the auth pages and Clerk appearance come from tokens or the approved OKLCH values; no hardcoded hex.
9. All checks in Section I pass.
10. The agent reports PASS and stops.

## I. Checks (run top to bottom, fix in-scope failures, re-run)

Check 1 — Clerk installed. Run `npm ls @clerk/nextjs`. Pass if a version is reported.

Check 2 — `proxy.ts` exists and is not `middleware.ts`. Run `ls proxy.ts` and `ls middleware.ts 2>/dev/null || true`. Pass if `proxy.ts` is listed and `middleware.ts` is not.

Check 3 — Proxy route protection. Confirm `proxy.ts` exports its proxy function (as a default export or named `proxy`) and an active `config.matcher` covering page routes plus `/api` and `/trpc`; confirm the public-route matcher includes `/`. With no session, request `/` and confirm `app/page.tsx` redirects to `/sign-in`, request `/editor` and confirm it is denied or redirected to sign-in, and request an existing API or TRPC route and confirm it is denied according to that endpoint's unauthenticated response behavior. These runtime requests must exercise the configured proxy. Do not create an out-of-scope endpoint to satisfy this check; if no API or TRPC route exists, report that route-class check as blocked rather than substituting a text search.

Check 4 — Provider in layout. Run `grep -c "ClerkProvider" app/layout.tsx` and `grep -c "appearance" app/layout.tsx`. Each count must be at least 1.

Check 5 — Auth pages exist. Run `ls app/sign-in/[[...sign-in]]/page.tsx app/sign-up/[[...sign-up]]/page.tsx`. Pass if both are listed.

Check 6 — Root redirect. Run `grep -c "redirect" app/page.tsx` and `grep -c "auth()" app/page.tsx`. Each count must be at least 1.

Check 7 — Navbar has `UserButton`. Run `grep -c "UserButton" components/editor/editor-navbar.tsx`. Pass if count is at least 1.

Check 8 — No hardcoded hex in modified files. Run `grep -cE "#[0-9a-fA-F]{3,8}" app/layout.tsx app/sign-in/[[...sign-in]]/page.tsx app/sign-up/[[...sign-up]]/page.tsx components/editor/editor-navbar.tsx`. Pass if each reports 0.

Check 9 — No out-of-scope packages. Run `npm ls @prisma/client @trigger.dev/sdk @liveblocks/client`. Pass if all are absent or empty.

Check 10 — Build, typecheck, lint. Run each and pass on exit code 0: `npm run build`, `npx tsc --noEmit`, `npm run lint`.

Check 11 — Auth page runtime check. Start the dev server, fetch `/sign-in` without a session and confirm it returns 200, then stop the server. Manual sign-in, sign-out, and `UserButton` interaction must be verified by the user; the agent reports this limitation.

If any check fails and the cause is in scope, fix and re-run. If out of scope, stop and report.

## J. Report

Status: `PASS` or `FAIL`.

If PASS, report:

- Confirmation that both Clerk keys were set by the user before the agent proceeded.
- `@clerk/nextjs` version installed.
- One-line result per check in Section I.
- The exact `appearance` object used in `app/layout.tsx` (or a summary if long).
- Confirmation that UI-004, UI-005, and UI-006 behavior still works (sidebar, home content, dialogs).
- Confirmation that `components/ui/*`, `app/globals.css`, `context/*`, `planning/*`, and `AGENTS.md` are unchanged.
- Note that manual sign-in, sign-out, and `UserButton` interaction must be verified by the user in the browser; the agent's runtime check only confirms redirect behavior and page rendering.
- Closing line: "AUTH-001 complete. Awaiting the next feature specification."

If FAIL, report which check failed, the exact error, and whether the cause is in scope (fixed) or out of scope (reported). Closing line: "Blocked, awaiting user direction."
