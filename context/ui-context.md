# UI Context

## Theme

Dark only. No light mode.

The design language is a calm, low-contrast dark technical workspace ("Deep Slate") with a faint cool-blue undertone. Surfaces are layered rather than flat, borders are subtle, and a restrained blue accent marks interactive elements. A separate teal accent is reserved for AI status and AI-generated content so users can distinguish "AI is doing something" from "this is clickable." In the editor, the canvas background sits slightly darker than the page background so the canvas reads as an inset working surface.

## Colors

All components must use these tokens — no hardcoded hex or OKLCH values. Values are OKLCH to match the Tailwind v4 / shadcn token system.

### Surfaces and text

| Role                         | CSS Variable       | Value                  | Tailwind utility |
| ---------------------------- | ------------------ | ---------------------- | ---------------- |
| Page background              | `--bg-base`        | `oklch(0.12 0.01 260)` | `bg-base`        |
| Surface (floating panels)    | `--bg-surface`     | `oklch(0.18 0.01 260)` | `bg-surface`     |
| Elevated (modals, dropdowns) | `--bg-elevated`    | `oklch(0.22 0.01 260)` | `bg-elevated`    |
| Canvas background            | `--bg-canvas`      | `oklch(0.10 0.01 260)` | `bg-canvas`      |
| Primary text                 | `--text-primary`   | `oklch(0.92 0 0)`      | `text-primary`   |
| Muted text                   | `--text-muted`     | `oklch(0.62 0.01 260)` | `text-muted`     |
| Border default               | `--border-default` | `oklch(0.28 0.01 260)` | `border-default` |
| Border subtle                | `--border-subtle`  | `oklch(0.22 0.01 260)` | `border-subtle`  |

### Interactive and state

| Role                              | CSS Variable       | Value                  | Tailwind utility |
| --------------------------------- | ------------------ | ---------------------- | ---------------- |
| Accent primary                    | `--accent-primary` | `oklch(0.65 0.15 250)` | `accent-primary` |
| Accent hover                      | `--accent-hover`   | `oklch(0.70 0.16 250)` | `accent-hover`   |
| AI accent (status and AI content) | `--accent-ai`      | `oklch(0.72 0.14 160)` | `accent-ai`      |
| Error                             | `--state-error`    | `oklch(0.55 0.2 25)`   | `state-error`    |
| Success                           | `--state-success`  | `oklch(0.6 0.15 150)`  | `state-success`  |
| Warning                           | `--state-warning`  | `oklch(0.7 0.16 75)`   | `state-warning`  |

### Node palette

A single universal palette of six colors applies to every node shape. Newly dropped nodes use **Slate** by default. Each palette entry has a paired text color that is applied automatically and is **not** shown in the swatch picker. Node borders use a value one step lighter than the node background.

| #   | Name            | Background             | Paired text       | Tailwind utility |
| --- | --------------- | ---------------------- | ----------------- | ---------------- |
| 1   | Slate (default) | `oklch(0.24 0.01 260)` | `oklch(0.92 0 0)` | `node-slate`     |
| 2   | Blue            | `oklch(0.30 0.08 250)` | `oklch(0.95 0 0)` | `node-blue`      |
| 3   | Violet          | `oklch(0.30 0.08 295)` | `oklch(0.95 0 0)` | `node-violet`    |
| 4   | Green           | `oklch(0.30 0.07 150)` | `oklch(0.95 0 0)` | `node-green`     |
| 5   | Amber           | `oklch(0.32 0.07 75)`  | `oklch(0.95 0 0)` | `node-amber`     |
| 6   | Rose            | `oklch(0.30 0.08 20)`  | `oklch(0.95 0 0)` | `node-rose`      |

Edges are not part of the node palette. Edges use a single consistent stroke color derived from `--border-default`, with an optional label background using `--bg-elevated`.

## Typography

| Role                   | Font       | Variable      |
| ---------------------- | ---------- | ------------- |
| UI text                | Geist Sans | `--font-sans` |
| Code and canvas labels | Geist Mono | `--font-mono` |

Load both through `next/font`. `--font-sans` applies to all UI text, headings, and body copy. `--font-mono` applies to canvas node and edge labels, code, spec preview code blocks, and any monospaced data.

## Border Radius

| Context                                    | CSS Variable    | Value          | Tailwind class |
| ------------------------------------------ | --------------- | -------------- | -------------- |
| Inline / small UI (buttons, inputs, icons) | `--radius-sm`   | 0.375rem (6px) | `rounded-sm`   |
| Cards / floating panels / sidebars         | `--radius-md`   | 0.75rem (12px) | `rounded-md`   |
| Modals / overlays / elevated surfaces      | `--radius-lg`   | 1rem (16px)    | `rounded-lg`   |
| Canvas nodes                               | `--radius-node` | 0.5rem (8px)   | `rounded-node` |
| Pills                                      | `--radius-pill` | 9999px         | `rounded-full` |

Rectangle nodes use `rounded-node`; pill nodes use `rounded-full`. Diamond, circle, cylinder, and hexagon are SVG shapes; any internal label container follows the small-UI radius.

## Component Library

shadcn/ui on top of Tailwind CSS. Components live in `components/ui/`. Add new components with the shadcn CLI rather than writing them from scratch. No other component library is used. Lucide React is the only icon library.

## Layout Patterns

- **Homepage:** Feature sections with a reusable top navbar and two floating sidebars. The main content extends beneath the floating panels rather than being boxed by them.
- **TopNavbar (reusable):** Three sections. (1) Sidebar toggle wired to hooks. (2) AI job status indicator and recovery snapshot restore icon. (3) Clerk user avatar showing the user's initials from first and last name, opening a menu with logout and profile actions.
- **Left sidebar (floating):** Header, a short description (“Create a project or jump into an existing room”), a **Create Project** button, then two tabs — **My Projects** and **Shared** — listing projects. The create action and description appear above the tabs; the empty state remains below the active tab.
- **Create Project modal:** Name input with an auto-generated project ID displayed beneath it (the normalized name slug plus a random suffix), and a Create button that creates the project and redirects to `/editor/[projectid]`. This modal has no tabs.
- **Right sidebar (floating):** AI tabs — prompt, spec, and comments.
- **Editor (`/editor/[projectid]`):** Same reusable top navbar and two floating sidebars. The canvas is the main surface. A centered floating shape toolbar sits at the bottom with draggable shapes.
- **Floating treatment:** Floating panels use `bg-surface/90` with `backdrop-blur-md` and `shadow-[0_8px_32px_rgba(0,0,0,0.3)]`. The editor canvas uses `bg-canvas` to read as an inset surface.
- **Sidebar toggle:** The left sidebar slides in from the left and the right sidebar slides in from the right, with an opacity transition (~200ms, ease-out). When closed they are fully removed from the screen so the canvas occupies the full viewport. Respect `prefers-reduced-motion`.
- **Node color picker:** A small floating palette appears above a selected or dragged node, showing the six swatches. The paired text color is applied automatically and is not shown.

## Icons

Lucide React. Stroke-based icons only. Use `h-4 w-4` for inline icons and `h-5 w-5` for button icons. Icons inherit `currentColor`.

## Shapes

All six shapes are SVG-based so they remain crisp when resized. Each node is user-resizable with defined minimum and maximum bounds, and label text clamps to the node bounds.

| Shape     | Meaning                                   |
| --------- | ----------------------------------------- |
| Rectangle | General-purpose service or component      |
| Diamond   | Decision / gateway / conditional routing  |
| Circle    | Event / endpoint / entry point            |
| Pill      | External system or third-party dependency |
| Cylinder  | Database or data store                    |
| Hexagon   | Queue / message broker / async boundary   |

## Interaction States

Every interactive element must define default, hover, focus-visible, active, and disabled states using the tokens above. Buttons and tab triggers show a pointer cursor and visible hover feedback. Switching the left sidebar tabs animates the selected tab indicator horizontally. The focus ring uses `accent-primary` at 2px offset. Loading states use the AI accent only for AI-related work. Empty states use `text-muted` on `bg-surface`.
