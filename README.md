# Atelier: Design System and Journey Builder platform

Atelier lets a company keep its design system, its component library and its user journeys in one place, and trace every screen back to the use case and the user insight that justify it.

The chain it implements, end to end:

**Company identity → Design System → Component Library → Use Cases & Insights → Journey Builder → Interactive Preview**

The sample workspace is **Devoteam**. Brand values come from [`BerocFr/DS-Devo`](https://github.com/BerocFr/DS-Devo) `brand/README.md` (Engrym "Devoteam DS" 6c66409e v2); values the brand does not define yet are flagged `TODO-BRAND`, never invented. Part of the component catalog comes from the DS-Devo benchmark (`docs/slices/research/`, arbitration bench-01).

## Run it

```bash
npm ci
npm run dev          # http://localhost:5173
npm test             # 61 unit tests (domain, planners, store, site rebuild, app shell)
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
| Journeys | List by folder with status and validation result. New blank journey, duplicate, delete, and **Describe a journey** (natural language) or pick a pattern. |
| Journey Builder | Three panels. Left: use case, insights, needs and pain points (link them to the selected step), the component library (drag onto a screen), journey blocks (drag onto the canvas). Center: canvas with start, screen, decision and outcome nodes; screens show a live miniature built from the library; connections with labels, conditions, main and alternative paths; zoom, pan, minimap. Right: properties of the step, its component instances (variant, size, state, props, interaction and which connection it triggers, with advanced settings behind a toggle), linked insights and design decisions, checks; connection editor. Toolbar: name, status, save state, undo and redo, zoom, validate, preview, settings. Keyboard: Delete, Ctrl or Cmd + Z, Ctrl or Cmd + Shift + Z, Escape, Ctrl or Cmd + S. |
| Preview | Walks the journey with the real components: buttons follow the connection they trigger, decisions let you simulate each branch, outcomes end the run. Mobile and desktop widths, back, restart, path so far, and "Why this step" with the decisions and insights behind the screen. |
| Use Cases & Insights | Use cases with objective, audience, context and metric; insights by kind and evidence, with the journey steps that address them (or a warning when none does). Generate or start a journey from a use case. |
| Site rebuild | devoteam.com rebuilt from patterns only (`#/site`): home, cybersecurity, cloud native architecture, join us, our offices, plus the pages their actions lead to (contact, AI maturity assessment, jobs, success stories, partner and service pages). "Show patterns" outlines every block and links it to its library entry; "About this prototype" lists, page by page, the patterns used and what the UI pass changed. |
| Settings | Workspace name, interface theme (system, light, dark), export and import the workspace as JSON, reset the demo. |

## Describe a journey in plain language

Type what the journey should do, in English or French ("Un candidat cherche un poste de data engineer au Portugal et postule avec son CV"). The platform drafts it as structured pages built from the library and its patterns, shows the draft page by page (sections, linked insights, validation result) and creates it on the canvas.

- **Claude engine** (in the hosted version): the request, the whole library, the use cases and the insights go to Claude, which answers with a journey plan in JSON. `src/domain/claudePlanner.ts` keeps only components, variants, props, insights and links that exist, maps triggers to the components that fire them, adds a missing start or outcome, and lays the result out. Uses the viewer's own Claude account after consent; falls back to the rules engine on any failure.
- **Rules engine** (`src/domain/nlPlanner.ts`, everywhere): scores the 12 journey types on English and French cues, extracts subject, partner, country, role and event, reuses the matching use case or creates one, and picks the insights that concern the steps.

The **Pages** view of the builder shows the journey as a sequence of desktop pages, each with its section outline, linked insights and exits.

## Patterns

35 section patterns (the 14 rebuild patterns above, and expertise grid, key figures band, case study index, expert team, contact section, event listing and detail, job board, job offer, application form, newsletter band, insights grid, office directory, document library, long read with contents, gated download, offering blocks, self-assessment, FAQ, partner band, testimonial band) are page sections composed of library components. Each declares `composedOf`, so the library shows what it is built from and validation warns when one of its parts is deprecated or missing.

They came from an analysis of devoteam.com (12 use cases, 19 insights, 38 component needs) and two benchmarks: bench-01 (Awwwards agencies, Webflow templates, content and motion systems) and bench-02 (event card, job card and filters, file upload, office card, share links, contents, document list; GOV.UK, Carbon, Polaris, USWDS, NHS, Fluent).

## devoteam.com rebuilt from patterns

`#/site` rebuilds the live devoteam.com pages read on 2026-10-30 with the library patterns only, keeping their storytelling and section order (`src/data/devoteamSite.ts`). Every block of the live site that was not yet a pattern became one (14 new patterns: site header and footer, hero with media, page hero, featured stories, partner showcase, story teaser, story split, closing statement, challenge cards, feature rows, spotlight band, intro statement, signposts), so they stay available for journeys. The pages render from the workspace store: edit a token in the Design System and the site follows.

- **UI pass**: each page lists what changed compared with the live page (missing calls to action added, experts linked to contact, figures pulled out of paragraphs, an office search, a contact section closing each service page).
- **Photos**: 37 royalty-free photos from Pexels (`src/data/photos.json`), loaded from the Pexels CDN at view time; token-built brand art replaces any photo that cannot load. No stock face is put on a real person: experts show initials.
- **Icons**: Lucide.
- **Motion**: from the agency benchmark (DS-Devo `docs/slices/research/bench-03-motion-agencies.md`): scroll fade and rise, headline word reveal once per page, staggered grids, photo clip reveal, page crossfade. The moving partner row (with a pause control) exists as a library variant for campaign pages only; the corporate pages keep it static (DS-Devo D-M9). Tokens `motion.expressive.*` are marked derived. Reduced motion turns all of it off.
- **Sample content**: stories other than Cellnex, jobs, assessment questions and the generic service and partner pages are samples; forms send nothing. A banner on every page says it is a prototype.

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

## Deploy

`.github/workflows/pages.yml` publishes `dist/` to GitHub Pages on every push to `main` (the build uses relative paths). One-time setting: Settings > Pages > Source: GitHub Actions. On a private repository, Pages needs a paid GitHub plan.

## Known limits

- Single user, single browser; no backend, no authentication, no real-time collaboration.
- New components reuse one of the existing renderers; a component with a brand-new anatomy needs code.
- The local token layer mirrors DS-Devo by hand until DS-Devo publishes its packages (S-012).
- Status colors (error, success) are `TODO-BRAND` placeholders until the Devoteam brand defines them.
