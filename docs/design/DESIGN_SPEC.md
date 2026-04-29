# RapidScan — UI/UX Design Specification

**Version:** 1.0  
**Status:** Approved — governs all frontend issues (#5, #14, #18, #25)  
**Last updated:** 2026-04-29

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Typography](#2-typography)
3. [Colour System](#3-colour-system)
4. [Component Library](#4-component-library)
5. [Layout & Navigation](#5-layout--navigation)
6. [Component Patterns](#6-component-patterns)
7. [Animation Specifications](#7-animation-specifications)
8. [Status & Severity Tokens](#8-status--severity-tokens)
9. [Screen Designs](#9-screen-designs)
   - [Projects List](#91-projects-list)
   - [New Project Modal](#92-new-project-modal)
   - [Project Detail — Shell](#93-project-detail--shell)
   - [Manifest Tab](#94-manifest-tab)
   - [Tasks Tab](#95-tasks-tab)
   - [Settings Tab](#96-settings-tab)
   - [Scan Progress Overlay](#97-scan-progress-overlay)
   - [Empty States](#98-empty-states)

---

## 1. Design Principles

| Principle | Description |
|---|---|
| Dark mode only | Dusk palette — deep dark backgrounds with a blue-grey tint. Not pure black. Think 9 PM sky. |
| Flat & muted | No gradients, no saturated colours. Muted, desaturated tones throughout. |
| Rounded everywhere | Consistent `border-radius` on cards, panels, inputs, buttons, badges, and avatars. |
| Soft shadows | Low-opacity, diffuse box shadows. No harsh drop shadows. |
| Backdrop blur | All modals and popovers use `backdrop-filter: blur` on the overlay. |
| Playful feedback | Animations communicate state in a light, game-like way — not corporate. |

---

## 2. Typography

**Font:** [Geist](https://vercel.com/font) (Geist Sans)  
**Fallback stack:** `'Geist Sans', 'Inter', ui-sans-serif, system-ui, sans-serif`

Geist is geometric, clean, and Helvetica-inspired with rounded terminals. It is well-suited to dark UI at all sizes.

| Token | Size | Weight | Line height | Usage |
|---|---|---|---|---|
| `--text-display` | 24px | 600 | 1.3 | Page titles, modal headings |
| `--text-heading` | 18px | 600 | 1.4 | Section headings, card titles |
| `--text-subheading` | 14px | 500 | 1.4 | Sub-section labels, tab labels |
| `--text-body` | 14px | 400 | 1.6 | Body copy, descriptions |
| `--text-small` | 12px | 400 | 1.5 | Meta info, timestamps, secondary labels |
| `--text-mono` | 13px | 400 | 1.6 | Code blocks, file paths, dependency names |

**Mono font:** `'Geist Mono', 'JetBrains Mono', ui-monospace, monospace`

---

## 3. Colour System

### 3.1 Background Layers

| Token | Hex | Usage |
|---|---|---|
| `--bg-base` | `#0c1117` | Root page background |
| `--bg-surface` | `#131920` | Sidebar, nav, secondary panels |
| `--bg-elevated` | `#1a2332` | Cards, list items, panel headers |
| `--bg-overlay` | `#1f2b3e` | Modals, drawers, popovers |
| `--bg-hover` | `rgba(255,255,255,0.04)` | Row hover, menu item hover |
| `--bg-selected` | `rgba(16,185,129,0.10)` | Selected list item, active nav tab |

### 3.2 Borders

| Token | Value | Usage |
|---|---|---|
| `--border-subtle` | `rgba(255,255,255,0.06)` | Card outlines, dividers |
| `--border-default` | `rgba(255,255,255,0.10)` | Input borders, panel edges |
| `--border-emphasis` | `rgba(255,255,255,0.20)` | Focused inputs, active elements |

### 3.3 Text

| Token | Hex | Usage |
|---|---|---|
| `--text-primary` | `#e2e8f0` | Primary content |
| `--text-secondary` | `#8b9ab0` | Labels, secondary info |
| `--text-muted` | `#4a5568` | Placeholders, disabled, timestamps |
| `--text-inverse` | `#0c1117` | Text on bright accent backgrounds |

### 3.4 Accent (Emerald)

| Token | Hex | Usage |
|---|---|---|
| `--accent` | `#10b981` | Primary buttons, active tabs, badges |
| `--accent-hover` | `#059669` | Button hover state |
| `--accent-subtle` | `rgba(16,185,129,0.12)` | Accent tinted backgrounds |
| `--accent-text` | `#34d399` | Accent-coloured text on dark backgrounds |

### 3.5 Semantic Colours

| Token | Hex | Usage |
|---|---|---|
| `--color-danger` | `#ef4444` | Errors, critical status |
| `--color-danger-subtle` | `rgba(239,68,68,0.10)` | Critical row tint |
| `--color-warning` | `#f59e0b` | Warnings, high/medium status |
| `--color-warning-subtle` | `rgba(245,158,11,0.08)` | High/medium row tint |
| `--color-success` | `#10b981` | Healthy status, low severity |
| `--color-success-subtle` | `rgba(16,185,129,0.08)` | Low-severity row tint |
| `--color-info` | `#3b82f6` | Informational, orphaned/cleanup |
| `--color-info-subtle` | `rgba(59,130,246,0.08)` | Orphaned/cleanup row tint |
| `--color-neutral` | `#6b7280` | Unknown status |
| `--color-deprecated` | `#f97316` | Deprecated status |

### 3.6 Shadows

```css
--shadow-sm:  0 1px 3px rgba(0,0,0,0.40);
--shadow-md:  0 4px 12px rgba(0,0,0,0.35);
--shadow-lg:  0 8px 24px rgba(0,0,0,0.45);
--shadow-xl:  0 16px 40px rgba(0,0,0,0.50);
```

### 3.7 Border Radius

```css
--radius-sm:   4px   /* tags, small badges */
--radius-md:   8px   /* inputs, buttons, small cards */
--radius-lg:   12px  /* panels, cards */
--radius-xl:   16px  /* modals */
--radius-full: 9999px /* pills, avatar circles */
```

---

## 4. Component Library

**Selection: [shadcn/ui](https://ui.shadcn.com/)**

### Rationale

| Factor | Decision |
|---|---|
| Ownership | shadcn/ui copies components directly into the repo — no vendor lock-in, fully customisable tokens |
| Tailwind CSS | Pairs with Tailwind v4; tokens map cleanly onto the dusk colour system |
| Dark mode | First-class dark mode support via CSS variables |
| Radix UI primitives | Accessible dialog, dropdown, tooltip, tabs primitives with no extra effort |
| Ecosystem fit | React + Vite + TypeScript — exact match |
| Community | Dominant in 2025/2026 React ecosystem; well-understood by any hire |

### Configuration

- Tailwind CSS v4 as the styling engine
- CSS variable approach for all colour tokens (defined in `src/index.css`, dark class on `<html>`)
- shadcn/ui components installed into `src/components/ui/`
- Custom variants extend, not replace, shadcn defaults

### Packages to install

```
shadcn/ui           component source + CLI
tailwindcss v4      styling engine
@radix-ui/*         underlying primitives (installed by shadcn)
lucide-react        icon set (used by shadcn; consistent design language)
geist               font package
```

---

## 5. Layout & Navigation

### 5.1 Shell Layout

```
┌─────────────────────────────────────────────────────┐
│  [sidebar 56px]  │  [main content area — flex grow] │
│                  │                                   │
│  collapsed:      │  Header (page title + actions)   │
│  icon tabs only  │  ─────────────────────────────── │
│                  │  Content area (scrollable)        │
│  hover → expands │                                   │
│  to 200px        │                                   │
└─────────────────────────────────────────────────────┘
```

The sidebar and main content sit in a `flex-row` root container that is `100vh` tall. The main content area handles its own internal scroll.

### 5.2 Sidebar Tabs

Each sidebar tab has:
- An icon (lucide-react, 20px)
- A label (visible only when sidebar is expanded)
- An active state: left-border accent stripe + `--bg-selected` background
- A hover state: `--bg-hover` background

Tab order within Project Detail:
1. Manifest (icon: `layers`)
2. Tasks (icon: `check-square`)
3. Settings (icon: `settings`)

Global (top-level, outside project):
1. Projects (icon: `folder`)

---

## 6. Component Patterns

### 6.1 Modal Pattern

- Backdrop: `position: fixed; inset: 0; background: rgba(0,0,0,0.60); backdrop-filter: blur(6px)`
- Modal card: `--bg-overlay`, `--radius-xl`, `--shadow-xl`, max-width varies by content
- Opened via Radix `Dialog` primitive
- Close on backdrop click and Escape key
- Focus trap inside modal

### 6.2 Side Panel Pattern

**Pattern: Split view (inline, not drawer overlay)**

When a user selects a dependency row (Manifest tab) or a task row (Tasks tab), the main content area splits horizontally:
- Left: list at ~45% width, min 300px
- Right: detail panel at ~55% width, max 600px
- Divider: `--border-subtle` 1px vertical line
- Panel slides in from the right using a 180ms ease-out transition on `width` and `opacity`
- On viewport widths below 900px: panel becomes a bottom sheet (fixed, 60vh height, `--radius-xl` top corners, backdrop blur)
- Panel closes via an `×` button in its header or pressing Escape

### 6.3 Card Pattern

```css
background: var(--bg-elevated);
border: 1px solid var(--border-subtle);
border-radius: var(--radius-lg);
box-shadow: var(--shadow-sm);
padding: 16px 20px;
```

### 6.4 Input Pattern

```css
background: var(--bg-surface);
border: 1px solid var(--border-default);
border-radius: var(--radius-md);
color: var(--text-primary);
padding: 8px 12px;
font-size: 14px;
transition: border-color 120ms ease;

&:focus {
  border-color: var(--accent);
  outline: none;
  box-shadow: 0 0 0 3px rgba(16,185,129,0.15);
}
```

### 6.5 Button Variants

| Variant | Background | Text | Border | Usage |
|---|---|---|---|---|
| Primary | `--accent` | `--text-inverse` | none | Main CTAs |
| Secondary | `--bg-elevated` | `--text-primary` | `--border-default` | Supporting actions |
| Destructive | `--color-danger` | white | none | Delete actions |
| Ghost | transparent | `--text-secondary` | none | Icon buttons, tertiary |

All buttons: `--radius-md`, `padding: 8px 16px`, `font-weight: 500`.

### 6.6 Badge / Tag Pattern

```css
border-radius: var(--radius-sm);
padding: 2px 7px;
font-size: 12px;
font-weight: 500;
```

Colour combinations defined in [Section 8](#8-status--severity-tokens).

### 6.7 Code Block Pattern

```css
background: var(--bg-surface);
border: 1px solid var(--border-subtle);
border-radius: var(--radius-md);
font-family: var(--font-mono);
font-size: 13px;
color: var(--text-primary);
padding: 12px 16px;
overflow-x: auto;
white-space: pre;
```

Syntax highlighting: [shiki](https://shiki.style/) — single dark theme, `github-dark-dimmed` or equivalent dusk-compatible theme.

---

## 7. Animation Specifications

### 7.1 Sidebar Expand / Collapse

| Property | Value |
|---|---|
| Trigger | Mouse enter / leave on sidebar element (not a click toggle) |
| Delay before expand | 100ms (prevents flicker on cursor pass-through) |
| Delay before collapse | 200ms (prevents snap-close on minor movement) |
| Expanded width | 200px |
| Collapsed width | 56px |
| Animated property | `width` on sidebar container |
| Duration | 220ms |
| Easing | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` (ease-out) |
| Label fade | Opacity 0→1 over 120ms, starting after 80ms (so it appears mid-expand, not too early) |
| Feel | Light and game-like — not snappy, not sluggish |

Implementation note: use CSS `transition: width 220ms cubic-bezier(0.25, 0.46, 0.45, 0.94)` on the sidebar container. Labels use `opacity` and `overflow: hidden` — do not use `display: none` which breaks transitions.

### 7.2 Scan Progress Animation

**Approach: Lottie (JSON animation file)**

| Property | Value |
|---|---|
| Library | `lottie-react` npm package |
| Animation | AI character lifting and stacking boxes, looping infinite |
| Source | Custom SVG Lottie JSON, committed to `src/assets/scan-animation.json` |
| Size | 240×240px displayed |
| Loop | Infinite, autoplay |
| Feel | Playful, slightly exaggerated motion — communicates "working hard" |

Animation content description (for designer/animator reference):
- A small robot/AI character stands to the left of a growing stack of boxes
- It bends down, picks up a box, lifts it overhead, and places it on the stack
- The stack grows with each cycle (can loop using a 3-box cap, then reset)
- Character colours match the dusk palette: body in `--bg-elevated` tones, accent highlight in `--accent`
- No text within the animation itself

Fallback (if Lottie file is not yet available): CSS spinner using `--accent` colour, 40px, `border-radius: 50%`, `border-top` accent, rest `--border-subtle`, spin 800ms linear infinite.

### 7.3 Side Panel Slide-In

| Property | Value |
|---|---|
| Property animated | `width` (desktop) or `transform: translateY` (mobile bottom sheet) |
| Duration | 180ms |
| Easing | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` |
| Opacity | 0→1 over 150ms |

### 7.4 Modal Open / Close

| Property | Value |
|---|---|
| Open | Scale 0.96→1.0, opacity 0→1, duration 160ms, ease-out |
| Close | Scale 1.0→0.96, opacity 1→0, duration 120ms, ease-in |
| Backdrop | Opacity 0→1, 140ms ease |

### 7.5 Row Hover

All list rows: `background` transition 100ms ease. No scale or translate — keep it subtle.

---

## 8. Status & Severity Tokens

### 8.1 Dependency Status

| Status | Colour token | Icon (lucide) | Label | Badge background |
|---|---|---|---|---|
| Healthy | `--color-success` `#10b981` | `check-circle` | Healthy | `rgba(16,185,129,0.15)` |
| Warning | `--color-warning` `#f59e0b` | `alert-triangle` | Warning | `rgba(245,158,11,0.15)` |
| Critical | `--color-danger` `#ef4444` | `x-circle` | Critical | `rgba(239,68,68,0.15)` |
| Deprecated | `--color-deprecated` `#f97316` | `clock` | Deprecated | `rgba(249,115,22,0.15)` |
| Unknown | `--color-neutral` `#6b7280` | `help-circle` | Unknown | `rgba(107,114,128,0.15)` |

Badge text colour: always the same as the colour token (e.g. `#10b981` text on `rgba(16,185,129,0.15)` background).

### 8.2 Severity Badges

| Severity | Background | Text | Label |
|---|---|---|---|
| Critical | `rgba(239,68,68,0.18)` | `#f87171` | CRITICAL |
| High | `rgba(249,115,22,0.18)` | `#fb923c` | HIGH |
| Medium | `rgba(245,158,11,0.18)` | `#fbbf24` | MEDIUM |
| Low | `rgba(16,185,129,0.18)` | `#34d399` | LOW |

All severity badge labels are uppercase, `font-size: 11px`, `font-weight: 600`, `letter-spacing: 0.04em`.

### 8.3 Task Row Urgency Highlights

Applied as a background tint on the full table row:

| Urgency | Row background |
|---|---|
| Critical | `rgba(239,68,68,0.07)` |
| High | `rgba(249,115,22,0.07)` |
| Medium | `rgba(245,158,11,0.07)` |
| Low | `rgba(16,185,129,0.07)` |
| Orphaned / Cleanup | `rgba(59,130,246,0.07)` |

On row hover, add an additional `rgba(255,255,255,0.03)` layer on top.

### 8.4 Score Display

Scores are integers 0–100. Displayed as a numeric badge.

| Score range | Badge background | Text colour | Label |
|---|---|---|---|
| 0–29 | `rgba(16,185,129,0.18)` | `#34d399` | Low risk |
| 30–59 | `rgba(245,158,11,0.18)` | `#fbbf24` | Medium risk |
| 60–79 | `rgba(249,115,22,0.18)` | `#fb923c` | High risk |
| 80–100 | `rgba(239,68,68,0.18)` | `#f87171` | Critical risk |

Score badge displays the raw number (e.g. "73") — no icon. Tooltip on hover shows the label ("High risk").

### 8.5 Task Status

| Status | Colour | Icon | Label |
|---|---|---|---|
| Open | `--color-warning` | `circle` | Open |
| In Progress | `--accent` | `loader` | In Progress |
| Resolved | `--color-success` | `check-circle` | Resolved |
| Won't Fix | `--color-neutral` | `minus-circle` | Won't Fix |

---

## 9. Screen Designs

### 9.1 Projects List

#### Layout

Full-width page. No sidebar (sidebar is project-scoped — only appears inside a project).

```
┌──────────────────────────────────────────────────────────────┐
│  [RapidScan logo + wordmark, top-left]                       │
│  ──────────────────────────────────────────────────────────  │
│  Page title: "Projects"                    [+ New Project]   │
│  ──────────────────────────────────────────────────────────  │
│  [Project cards grid — 1 col on narrow, 2-3 on wide]        │
└──────────────────────────────────────────────────────────────┘
```

#### Project Card (populated state)

Card uses `--bg-elevated`, `--radius-lg`, `--shadow-sm`, `--border-subtle`.

```
┌────────────────────────────────────────────────┐
│  Project Name                       [⋮ menu]   │
│  github / my-org/my-repo                        │
│  ─────────────────────────────────────────────  │
│  Last scanned: 2 hours ago                      │
│  Open tasks: [12 badge - amber]                 │
│  Status: [Healthy badge - green]                │
│  ─────────────────────────────────────────────  │
│  [View Project]               [Run Scan →]      │
└────────────────────────────────────────────────┘
```

Fields per card:
- Project name (`--text-heading`)
- Input type + identifier line (`--text-secondary`, `--text-small`)
- Last scanned: relative time (`--text-muted`)
- Open task count: integer badge, colour from highest urgency active task
- Status badge: from Section 8.1 (overall project status = worst dependency status)
- Two buttons: secondary "View Project", primary "Run Scan"
- Overflow menu (⋮): "Edit", "Delete" (destructive, with confirmation)

#### Populated State

Cards displayed in a responsive grid (`grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))`).

#### Empty State

See [Section 9.8 — Empty States](#98-empty-states).

---

### 9.2 New Project Modal

Triggered by "+ New Project" button. Uses the modal pattern from Section 6.1.

**Modal dimensions:** max-width 560px, height auto.

```
┌──────────────────────────────────────────────┐
│  New Project                              [×] │
│  ──────────────────────────────────────────── │
│  Project Name                                 │
│  [________________________]                   │
│                                               │
│  Input type                                   │
│  [○ GitHub repo] [○ ZIP upload] [○ Local path]│
│                                               │
│  ── (fields vary by input type) ──            │
│                                               │
│  [Cancel]                    [Create Project] │
└──────────────────────────────────────────────┘
```

#### Variant A — GitHub repo

Additional fields (shown only when "GitHub repo" is selected):

```
  Repository URL or owner/repo
  [________________________]

  Personal Access Token (optional — for private repos)
  [________________________]
  ℹ "Leave blank for public repositories"
```

PAT field is `type="password"` with a show/hide toggle (eye icon). Help text in `--text-muted`.

#### Variant B — ZIP upload

```
  Upload ZIP file
  ┌──────────────────────────────────────────┐
  │  Drag & drop a ZIP file here, or         │
  │  [Browse files]                          │
  └──────────────────────────────────────────┘
  Accepted: .zip only. Max size: 100 MB.
```

Drop zone: dashed `--border-default` border, `--bg-surface` background, `--radius-md`. On drag-over: border changes to `--accent`, background to `--accent-subtle`.

#### Variant C — Local path

```
  Local directory path
  [________________________]
  ℹ "Absolute path accessible from the API server"
```

#### Validation

- Name: required, non-empty
- GitHub URL: required for GitHub type, valid format
- ZIP: required for ZIP type, .zip extension
- Local path: required for local type
- Inline error messages below each field in `--color-danger` at `--text-small`
- "Create Project" button disabled until all required fields for the current type are valid

---

### 9.3 Project Detail — Shell

Navigating into a project enters the project shell: sidebar + main content area.

```
┌──────────────────────────────────────────────────────────────┐
│  [sidebar]  │  [Project header]                              │
│             │  ──────────────────────────────────────────    │
│  [layers]   │  [Tab content area — Manifest / Tasks /        │
│  [check]    │   Settings]                                    │
│  [settings] │                                                │
│             │                                                │
└──────────────────────────────────────────────────────────────┘
```

#### Project Header

Appears above the tab content area, not inside the sidebar.

```
┌──────────────────────────────────────────────────────────────┐
│  ← Projects   |   My Project Name                            │
│               |   github · my-org/my-repo                    │
│               |   Last scanned: 3 hours ago                  │
│               |                          [Run Scan] [•••]    │
└──────────────────────────────────────────────────────────────┘
```

- "← Projects" breadcrumb link, `--text-secondary`, navigates back to list
- Project name: `--text-display`
- Subtitle line: input type + identifier, `--text-secondary`
- Last scanned timestamp, `--text-muted`
- "Run Scan" primary button (disabled if scan in progress)
- `•••` overflow for Edit / Delete

---

### 9.4 Manifest Tab

The Manifest tab displays all dependencies found in the last scan, grouped by category.

#### Layout

```
┌──────────────────────────────────────────────┬──────────────┐
│  Manifest                          [🔍 search] │  [Side panel │
│  6 categories · 42 dependencies              │   when a dep  │
│  ─────────────────────────────────────────── │   is selected]│
│  ▼ npm packages (18)                          │               │
│    [dep rows...]                              │               │
│  ▶ Azure SDKs (4)                             │               │
│  ▶ AI models (2)                              │               │
│  ▶ Third-party APIs (6)                       │               │
│  ▶ Azure services (8)                         │               │
│  ▶ Orphaned code (4)                          │               │
└──────────────────────────────────────────────┴──────────────┘
```

#### Category Group Header

```
▼  npm packages                         18 dependencies   [status badge]
```

- Chevron toggle (▼ expanded / ▶ collapsed), `--text-secondary`, animates 90° rotation on 150ms
- Category name: `--text-subheading`
- Count: `--text-muted`
- Status badge: worst-case status across all deps in category
- Clicking the row toggles expand/collapse
- Default: all expanded

#### Dependency Row

```
[status dot]  package-name       1.2.3 → 1.3.0    [severity badge]  [score badge]
              src/utils/db.ts +3 more files                          [▸ to select]
```

Columns:
- Status dot: 8px circle, `--color-success/warning/danger` fill
- Dependency name: `--text-primary`, `font-family: --font-mono`
- Version info: current → latest (if upgrade available), `--text-muted`, `--text-small`
- Severity badge: from Section 8.2
- Score badge: from Section 8.4
- Reference preview: first file + "n more", `--text-muted`, `--text-small`
- Clicking the row opens the side panel

Row height: 52px. Hover: `--bg-hover`.

#### Dependency Side Panel

Slides in from the right as a split view (Section 6.2).

```
┌────────────────────────────────────────────────┐
│  package-name                               [×] │
│  npm package · v1.2.3 → v1.3.0                  │
│  [severity badge]  [score badge]  [status badge]│
│  ─────────────────────────────────────────────  │
│  References (4)                                 │
│  • src/utils/db.ts   line 12                    │
│  • src/api/client.ts  line 34, 89               │
│  • ...                                          │
│  ─────────────────────────────────────────────  │
│  Call chain                                     │
│  src/index.ts                                   │
│    └── src/api/client.ts                        │
│          └── src/utils/db.ts  ← import site     │
│  ─────────────────────────────────────────────  │
│  Description                                    │
│  [AI-generated note about this dependency]      │
└────────────────────────────────────────────────┘
```

Call chain: monospace tree structure, `--text-mono`, each level indented 16px with `└──` connector in `--text-muted`.

---

### 9.5 Tasks Tab

Displays all tasks generated for this project, ordered by score descending by default.

#### Layout

```
┌──────────────────────────────────────────────┬──────────────┐
│  Tasks                             [🔍] [▼ filter]          │
│  12 open · 3 in progress · 5 resolved        │  [Side panel  │
│  ─────────────────────────────────────────── │   when task   │
│  [task rows with urgency tint backgrounds...]  │   selected]  │
└──────────────────────────────────────────────┴──────────────┘
```

Summary line: counts per status, `--text-secondary`.

Filter controls: dropdown to filter by status, severity, category.

#### Task Row

```
[severity badge]  Task title                          [score badge]  [status badge]
                  package-name · npm package · src/utils/db.ts       [Created: 2h ago]
```

- Full-row background tint from Section 8.3 based on severity
- Severity badge
- Task title: `--text-primary`
- Score badge from Section 8.4
- Status badge from Section 8.5
- Subtitle: dependency name · category · primary file, `--text-muted`, `--text-small`
- Timestamp, `--text-muted`
- Clicking row opens side panel

Row height: 56px.

#### Task Side Panel

```
┌────────────────────────────────────────────────┐
│  Task title                                 [×] │
│  [severity badge] [score] [status dropdown ▼]  │
│  package-name · npm package                     │
│  ─────────────────────────────────────────────  │
│  Description                                    │
│  [AI-generated task description paragraph]      │
│  ─────────────────────────────────────────────  │
│  Location map                                   │
│  • src/utils/db.ts  lines 12–18                 │
│  • src/api/client.ts  line 34                   │
│  ─────────────────────────────────────────────  │
│  Suggested fix                                  │
│  ```js                                          │
│  // code block with fix                         │
│  ```                                            │
│  ─────────────────────────────────────────────  │
│  Tests                                          │
│  ```js                                          │
│  // suggested test code                         │
│  ```                                            │
│  ─────────────────────────────────────────────  │
│  [Create GitHub Issue]          [Mark Resolved] │
└────────────────────────────────────────────────┘
```

Status control: inline dropdown (Radix Select) to change task status without leaving panel.

Code blocks: use code block pattern from Section 6.7.

"Create GitHub Issue" button: secondary variant. Only visible if GitHub is connected (Settings). Shows a tooltip "Connect GitHub in Settings" if not connected.

---

### 9.6 Settings Tab

Settings is divided into five sections, displayed as a vertically scrolling single-column form (no sub-tabs).

```
┌────────────────────────────────────────────────┐
│  Settings                                       │
│  ─────────────────────────────────────────────  │
│  [Section 1: GitHub Connection]                 │
│  [Section 2: Scan Configuration]                │
│  [Section 3: Issue Creation]                    │
│  [Section 4: Scoring Weights]                   │
│  [Section 5: Scoring Explanation]               │
└────────────────────────────────────────────────┘
```

Each section is a card (Section 6.3) with a heading, description, and its form fields.

#### Section 1 — GitHub Connection

```
  GitHub Connection
  Connect a GitHub token to enable automatic issue creation.
  ──────────────────────────────────────────────────────────
  Personal Access Token
  [••••••••••••••••]  [eye toggle]
  Scopes required: repo, issues

  Repository (for issue creation)
  [owner/repo]

  [Save]     Connected: my-org/my-repo ✓    (if already configured)
```

Status indicator: green check + "Connected" text if PAT is valid and repo accessible.

#### Section 2 — Scan Configuration

```
  Scan Configuration
  ──────────────────────────────────────────────────────────
  Orphan detection pass
  [✓] Run orphan detection after each scan
      (adds ~30% to scan time)

  Maximum file size to scan
  [500] KB

  File patterns to exclude (one per line)
  [textarea: node_modules/, dist/, *.min.js]
```

#### Section 3 — Issue Creation

```
  Issue Creation
  Automatically create GitHub issues for high-risk findings.
  ──────────────────────────────────────────────────────────
  Minimum score to create issue
  [70] (slider 0–100)

  Issue label
  [rapidscan]

  [Save]
```

#### Section 4 — Scoring Weights

Five category weights, each an integer 1–10. They do not need to sum to any value — they are relative weights.

```
  Scoring Weights
  Adjust how much each dependency category contributes to the overall score.
  ──────────────────────────────────────────────────────────
  npm packages           [7]
  Azure SDKs             [8]
  AI models              [9]
  Third-party APIs       [8]
  Azure services         [9]
  Orphaned code          [5]

  [Reset to defaults]   [Save]
```

Each weight input: number input, min 1, max 10, `--radius-md`, width 60px.

#### Section 5 — Scoring Explanation

Read-only informational section (not a form). Uses a card with muted background.

```
  How scores are calculated
  ──────────────────────────────────────────────────────────
  Scores (0–100) are generated by GPT-5.4-mini based on:
  • Severity of the dependency issue
  • Version currency (how out-of-date)
  • Exposure (number of files referencing it)
  • Category weight (configured above)
  • Known CVEs or deprecation notices

  Score ranges:
  [colour legend: 0–29 Low · 30–59 Medium · 60–79 High · 80–100 Critical]
```

Colour legend: four inline badge samples (using Section 8.4 colours) with labels.

---

### 9.7 Scan Progress Overlay

When a scan is triggered, an overlay appears over the project detail area (not full-screen). The project header and sidebar remain accessible.

```
┌──────────────────────────────────────────────────────────────┐
│  [backdrop: rgba(12,17,23,0.85) blur(4px)]                   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                                                      │   │
│  │          [Lottie scan animation 240×240px]           │   │
│  │                                                      │   │
│  │   Scanning your project...                           │   │
│  │   ──────────────────────────────────────────         │   │
│  │   Files processed:  47 / 213                         │   │
│  │   [progress bar]                                     │   │
│  │   Current file:  src/utils/httpClient.ts             │   │
│  │   Elapsed:  0:42                                     │   │
│  │                                                      │   │
│  │   Recent findings                                    │   │
│  │   • axios  →  HIGH (score 72)                        │   │
│  │   • @azure/storage-blob  →  WARNING (score 45)       │   │
│  │   • openai  →  CRITICAL (score 88)                   │   │
│  │                                                      │   │
│  │                            [Cancel scan]             │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

#### Elements

- **Title:** "Scanning your project..." — `--text-heading`
- **Files processed:** `n / total` counter, updates in real-time via polling or SSE
- **Progress bar:** `width` transitions smoothly; background `--bg-elevated`; fill `--accent`; `--radius-full`; height 6px
- **Current file:** truncated to last 40 chars with `…` prefix; updates in real-time; `--font-mono`, `--text-small`
- **Elapsed timer:** `mm:ss` format, ticks every second
- **Recent findings:** last 3 findings, newest at bottom; animates in with 200ms fade + 8px slide up; findings older than 3 are faded out
- **Cancel button:** ghost variant, `--color-danger` text on hover

#### Completion

On completion (or error):
- Animation stops, character "relaxes" (or if using fallback spinner, it stops)
- Title changes to "Scan complete" (or "Scan failed")
- File counter shows final count
- After 2 seconds, overlay auto-dismisses and Manifest + Tasks tabs refresh
- On failure: error message replaces file counter, "Close" button replaces cancel

---

### 9.8 Empty States

All empty states share this structure:

```
[Illustrated icon, 64px, --text-muted]
Heading (--text-heading, --text-secondary)
Supporting sentence (--text-body, --text-muted)
[Optional CTA button]
```

| Screen | Icon | Heading | Support text | CTA |
|---|---|---|---|---|
| Projects list — no projects | `folder-plus` | No projects yet | Scan an existing codebase to get started | + New Project |
| Manifest — no scan run | `scan` | No scan data | Run a scan to map this project's dependencies | Run Scan |
| Manifest — scan running | _(overlay covers this)_ | — | — | — |
| Manifest — no results in filter/search | `search-x` | No matches | Try a different search term or clear filters | Clear filters |
| Tasks — no scan run | `check-square` | No tasks yet | Run a scan to generate tasks | Run Scan |
| Tasks — all resolved | `party-popper` | All clear | No open tasks. Run another scan to check for new findings. | Run Scan |
| Tasks — no results in filter | `filter-x` | No matching tasks | Adjust your filters to see tasks | Clear filters |

Icon colours: `--text-muted`. All icons: lucide-react.

Empty state containers are vertically and horizontally centred within their parent content area.

---

## Appendix: Open Questions

None. All design questions are resolved in this document.

---

*This document is the authoritative design reference. Any deviation during implementation must be discussed and recorded as a design amendment here.*
