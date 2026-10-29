# Atelier: Design System and Journey Builder platform

Atelier lets a company keep its design system, its component library and its user journeys in one place, and trace every screen back to the use case and the user insight that justify it.

The chain it implements, end to end:

**Company identity → Design System → Component Library → Use Cases & Insights → Journey Builder → Interactive Preview**

The sample workspace is **Devoteam**. Brand values come from [`BerocFr/DS-Devo`](https://github.com/BerocFr/DS-Devo) `brand/README.md` (Engrym "Devoteam DS" 6c66409e v2); values the brand does not define yet are flagged `TODO-BRAND`, never invented. Part of the component catalog comes from the DS-Devo benchmark (`docs/slices/research/`, arbitration bench-01).

## Run it

```bash
npm ci
npm run dev          # http://localhost:5173
npm test             # 34 unit tests (domain, store, app shell)
npm run build        # type check + production build
npm run e2e          # builds must exist; headless Chromium walk-through + axe (WCAG 2.2 AA)
npm run build:single # one self-contained HTML file in dist-single/
```

Node 22.12 or later.

## What you can do

| Section | What works |
| --- | --- |
| Overview | The brand-to-experience chain with real status per stage, recent journeys with their validation result, design system health, library summary, insights not yet addressed, activity, quick actions. |
| Design System | Brand identity and principles (editable), primitive palette with color pickers, semantic colors as references, WCAG contrast checks, type scale, spacing, radius, elevation, motion with a demo, a filterable table of every token with inline validated editing, add and delete (deletion is refused while something depends on the token), a dependency view primitive → semantic → components, and a live preview of real components that updates with every edit. |
| Components | Searchable, filterable library (category, status, core or benchmark). Live preview with variant, size, state and property controls. Usage do and don't, accessibility rules, provenance, tokens consumed with resolved values, and every screen that uses the component. Create, edit, duplicate, deprecate, restore, delete (refused when used). |
| Journeys | List by folder with status and validation result. New blank journey, duplicate, delete, and **Generate from a use case**. |
| Journey Builder | Three panels. Left: use case, insights, needs and pain points (link them to the selected step), the component library (drag onto a screen), journey blocks (drag onto the canvas). Center: canvas with start, screen, decision and outcome nodes; screens show a live miniature built from the library; connections with labels, conditions, main and alternative paths; zoom, pan, minimap. Right: properties of the step, its component instances (variant, size, state, props, interaction and which connection it triggers, with advanced settings behind a toggle), linked insights and design decisions, checks; connection editor. Toolbar: name, status, save state, undo and redo, zoom, validate, preview, settings. Keyboard: Delete, Ctrl or Cmd + Z, Ctrl or Cmd + Shift + Z, Escape, Ctrl or Cmd + S. |
| Preview | Walks the journey with the real components: buttons follow the connection they trigger, decisions let you simulate each branch, outcomes end the run. Mobile and desktop widths, back, restart, path so far, and "Why this step" with the decisions and insights behind the screen. |
| Use Cases & Insights | Use cases with objective, audience, context and metric; insights by kind and evidence, with the journey steps that address them (or a warning when none does). Generate or start a journey from a use case. |
| Settings | Workspace name, interface theme (system, light, dark), export and import the workspace as JSON, reset the demo. |

## Journey generation from the catalog

The generator (`src/domain/generator.ts`) assembles a journey from the component library following a pattern: account creation, contact request, explore case studies, access recovery, find an answer. Each pattern cites the benchmark evidence it rests on. It resolves every component against the live library (deprecated or missing components are skipped and reported), links the selected insights to the steps whose topics they match, records design decisions only when a selected insight supports them, and lays the result out on the canvas. It is rule-based and runs in the browser; its `GenerateInput → GenerateResult` interface is where a model-backed generator can be plugged in.

## Validation

`src/domain/validation.ts` checks a journey against the flow, the design system and the content and accessibility rules:

- Flow: one entry point, at least one outcome, reachability, dead ends, decisions with at least two branches and written conditions, interactive components that lead nowhere, connections whose trigger was removed.
- Design system: empty screens, components or variants missing from the library, deprecated or beta components, missing tokens, placeholder `TODO-BRAND` tokens, more than one primary button per screen.
- Accessibility and content: buttons and links without a label, fields without a visible label, vague labels such as "Submit", page title, progress values.
- Traceability: screens with no linked insight, design decisions with no supporting insight.

Errors block the "validated" status; warnings and notes do not.

## Architecture

```
src/
  domain/      types, tokens (resolution, contrast), validation, generator   (pure, unit-tested)
  data/        Devoteam seed workspace and the benchmark catalog
  store/       zustand store with per-journey undo history; repository interface (localStorage, memory)
  ds/          renderer of the workspace design system: every value is a --ds-* custom property from tokens
  ui/          platform kit: dialog with focus trap, tabs, fields, toasts
  features/    overview, design-system, components, journeys, builder, insights, settings
  app/         shell, hash router, validation hook
e2e/smoke.mjs  headless walk-through with axe
```

The platform chrome is deliberately neutral (editor blue for selection). The workspace design system (Devoteam coral, Montserrat) appears only where it is the subject: previews, canvas miniatures, the journey preview.

Three levels of a component are kept apart: `ComponentDef` (its design in the library), `ComponentInstance` (one use in a screen, with its own variant and props) and `JourneyNode` (the role of the screen in the journey).

Persistence goes through `PlatformRepository`. The prototype stores the workspace in the browser; a server or a design-token pipeline (for example the DS-Devo `@devoteam/tokens` package once released) can replace it without touching the UI.

## Known limits

- Single user, single browser; no backend, no authentication, no real-time collaboration.
- New components reuse one of the existing renderers; a component with a brand-new anatomy needs code.
- The local token layer mirrors DS-Devo by hand until DS-Devo publishes its packages (S-012).
- Status colors (error, success) are `TODO-BRAND` placeholders until the Devoteam brand defines them.
