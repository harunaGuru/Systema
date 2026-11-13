<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Application Building Context

Read the following files in order before implementing or making any architectural decision:

1. `context/project-overview.md` — product definition, goals, features, and scope
2. `context/architecture.md` — system structure, boundaries, storage model, and invariants
3. `context/ui-context.md` — theme, colors, typography, canvas design, and component conventions
4. `context/code-standards.md` — implementation rules and conventions
5. `context/ai-workflow-rules.md` — development workflow, scoping rules, and delivery approach
6. `context/progress-tracker.md` — current phase, completed work, open questions, and next steps

Update `context/progress-tracker.md` after each meaningful implementation change.

If implementation changes the architecture, scope, or standards documented in the context files, update the relevant file before continuing.

## Framework-Specific Notes (Next.js 16)

- `params` and `searchParams` are Promises. Always `await` them (`const { projectid } = await params`) before use. Synchronous access is removed.
- `next lint` has been removed. Run ESLint directly via the project's `lint` script; `next build` does not lint.
- Middleware is called Proxy. The file is `proxy.ts` at the project root (or `src/`). Clerk's `clerkMiddleware()` goes in `proxy.ts`, not `middleware.ts`.
- Before writing any Next.js code, read the relevant guide in `node_modules/next/dist/docs/`. The bundled docs match the installed version and take precedence over training data.

## Feature Specification Workflow

When a feature specification is provided, treat it as the implementation instruction for that unit within the approved scope:

1. Read the specification fully and consult the context files it references.
2. Check it against `architecture.md`, `code-standards.md`, and `project-overview.md` for conflicts or unapproved scope.
3. Update `context/progress-tracker.md` to identify the active specification and unit before implementation.
4. Implement within the specification's scope only.
5. Run the verification checks defined in `ai-workflow-rules.md`.
6. Update `progress-tracker.md` with the actual outcome, remaining work, and next steps.

If the specification conflicts with an approved context file, contains a critical ambiguity, or requires an unapproved decision, stop and raise the issue. Do not silently choose an interpretation.

## Handling Missing Requirements and Conflicts

- Do not invent product behavior, architecture, or standards absent from the context files.
- If a requirement is missing, record it in `progress-tracker.md` as an open question and continue only with work that does not depend on it.
- If framework guidance conflicts with a project context file, follow the framework's documented technical requirement for purely technical matters, but raise any conflict that affects product behavior, architecture, or scope.
- Do not override the detailed rules in the six context files without an explicit, approved reason.

<!-- BEGIN:nextjs-agent-feedback -->

## Report Next.js feedback

The project owner enabled `experimental.agentFeedback`, authorizing this feedback pass. When enabled, `next dev` writes this block and restores it if removed. Commit `AGENTS.md` with your work to keep the tree clean.

During the current user request, retain anonymized facts as feedback candidates for meaningful or recurring Next.js issues:

- Crashes, hangs, OOMs, or unexpected slowness
- Incorrect behavior, output, errors, or diagnostics
- Missing, unclear, or conflicting documentation
- Unexpected CLI, codemod, Skill, or upgrade behavior and non-obvious workarounds

Continue the current user request without reporting immediately. Routine debugging is not feedback. Verify changes before retaining them as feedback candidates. Never retain code, logs, paths, URLs, secrets, personal information, or project-specific data.

Retain qualifying friction even if it is later fixed or worked around; record the final outcome during the reporting pass.

Before the final response, run one reporting pass. If candidates remain, from this file's directory run `npx --no-install next internal agent-feedback-instructions` once without piping or truncating its output. Follow its output or error guidance. If a network sandbox blocks it, retry with network access; if it still returns no output, continue normally.

<!-- END:nextjs-agent-feedback -->

<!-- TRIGGER.DEV SKILLS START -->
## Trigger.dev agent skills

This project has Trigger.dev agent skills installed in `.agents/skills/`. Before writing or changing Trigger.dev code (background tasks, scheduled tasks, realtime, or chat.agent AI agents), load the most relevant skill: `trigger-authoring-chat-agent`, `trigger-authoring-tasks`, `trigger-chat-agent-advanced`, `trigger-cost-savings`, `trigger-getting-started`, `trigger-realtime-and-frontend`.
<!-- TRIGGER.DEV SKILLS END -->
