# Changelog

All notable changes to the Atelier platform (BerocFr/ds-devo-platform). The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Entries are derived from `git log`; each cites its short commit SHA. Dates are commit dates (UTC).

## Unreleased

- Owner validation pending: FAQ answers two to five (written from facts on the home), the LinkedIn link of the newsletter band, the header navigation of the new live site (Expertise, Insights, Events, About us, Careers, Get in touch) not yet mirrored.

## 2026-10-31

### Added

- Forward Deployed Engineering as a working process (owner reference): stepped step cards with a 3D object each (Microsoft Fluent Emoji 3D, MIT) that floats and tilts toward the pointer, static under reduced motion; the statement panel stays as a variant. (d2eac54)
- Home continuation from the owner capture of the live devoteam.com, in the live order after What we do: Forward Deployed Engineering, Multi Partner, Complete Tech Toolkit for AI, What Sets Us Apart, success story library, Change Starts Here, Insights from the field, FAQs. (681c609)
- Six patterns: service steps panel `pat-fde`, partner cards `pat-partner-cards`, reasons and proof `pat-apart`, story library `pat-story-library` (search, topic filters, empty state, announced count), call to action with quotes `pat-change`, insights hub `pat-insights`. `catalogVersion` 4. (681c609)
- Intro statement takes pills and a second action; footer takes a newsletter band. (681c609)
- e2e step: the home story library search and filters narrow the cards (21 steps). (681c609)
- Handoff documents: this changelog and `docs/ai-architecture.md` (pipeline, actors, gates, Engrym mapping, how to resume).

### Changed

- Global restyle toward the latest blocks: bold tight display type, red-dot labels in every pattern and in earlier patterns, aligned grids instead of stepped cards, key figures band as KPI cards, closing card without decorative tiles, FAQ as cards with the title on the left, partners page on the partner cards. (681c609)
- Text buttons carry no icon, on the site and in the library. (681c609)

### Fixed

- Tier tags in partner cards: dark text for contrast, accessible name that contains the visible label (axe). (681c609)

## 2026-10-30

### Added

- KPI figures as one card each (Lucide icon, pill tag, counting figure, bold label and detail, one dark card), with a subgrid that keeps figures aligned. (8ab049a)
- "What we do" block after the KPIs: intro statement gains a centred headline variant (label, bold short headline, one paragraph, optional red action). Home now follows the live order: hero, KPIs, What we do, spotlight. (5315295)
- KPI block statement variant (default on the home): small label, large positioning statement, four figures in a two by two grid with hairlines; the overlapping card stays as the card variant. (4c9532a)
- Impact intro pattern `pat-impact` after the home hero: four key figures in a card overlapping the hero edge, then "We are Agents of Change" and the positioning paragraph. (7d5e7e6)
- Real hero copy above the fold ("Your Forward Deployed Tech Partner for AI-Driven Business Transformation"), red "Get in Touch" and ghost "Explore Services" actions, proof line with portraits, success story card. New Services index page. e2e checks the fold at 1440x900. (028a0e2)
- Procedurally generated hero visuals (`tools/make-hero-visuals.py`): coral light through fluted glass, six variants, one per page. (9a221a4)
- Burger menu: full-screen panel in a portal, curtain opening, cascading links, services submenu; Escape, focus trap, focus return, scroll lock, reduced motion. (9a221a4)
- "Rowalo-grade" identity for the site patterns (owner reference, bench-05): cinematic duotone heroes, glass label, white pill action with corner arrow, floating header, new layouts (blog-style spotlight, black service index, staggered cards, selected-projects rows, tilted photo collage, logo card on a dotted canvas, CTA card in coral tiles, method checklist, person cards). (2eb9904)
- "AI leader, same DNA" identity for the site patterns (bench-04): night canvas, fluid display scale (cqi tokens), numbered home sections, pill actions, signal lattice motif with pause control, home ask bar, new layouts (services index list, partner bento, evidence figures, giant footer wordmark), `tone` prop on every rebuild pattern. (42d5b7f)
- devoteam.com rebuilt from patterns at `#/site`: home, cybersecurity, cloud native architecture, join us, our offices, plus the pages their actions lead to; UI pass notes per page; pattern overlay linked to the library. (3a6a11a)
- 14 new patterns covering every live-site block, richer expertise grid, key figures, partner band (marquee with pause), expert team, office directory with working search. (3a6a11a)
- 37 Pexels photos with alt text and brand-art fallback; Lucide icons; initials (never stock faces) for real people; expressive motion tokens from bench-03 (derived). (3a6a11a)
- `mergeSeed` and `catalogVersion` so saved workspaces absorb new catalog items once. (3a6a11a)
- GitHub Pages workflow and relative base path. (3a6a11a)
- Tests at that commit: 61 unit, 20 e2e steps with axe on every site page and at phone width. (3a6a11a)

### Changed

- Section labels use a red dot instead of the plus; e2e home order includes the What we do block. (8ab049a)
- Home hero gets more space under the actions (56px to 88px depending on height) and a bold claim; KPI figures are smaller and count up once on scroll (final value for screen readers, immediate under reduced motion). (396ac67)
- Hero claim about 15% larger, still above the fold at 1440x900, 1280x720 and 1000x600. (c4620c6)
- Smaller hero claim (display-xl up to 4rem, three lines). (104b8c3)
- Badge redesigned (signal dot in a halo, hairline gradient border, sentence case); desktop navigation back inline, smaller and quieter, services dropdown; burger panel kept below 1000px. (028a0e2)
- Primary actions in red (coral 700, white text 4.60:1) on every canvas; lighter copy, shorter leads, no extra hero or middle card so the home follows the live block order. (9a221a4)
- No mono face and no lattice by default (DS-Devo D-I6, D-I7); lattice kept as a hero variant pending OD-I2. (2eb9904)
- Candidate night and mono tokens marked todo-brand (DS-Devo D-I2, D-I8). (6fff6bc)
- Home partner band static (DS-Devo D-M9); the moving variant stays in the library for campaign pages. (149e8fb)
- CI: `configure-pages` may enable Pages on first run. (6b95119)

### Fixed

- Hero claim sized by viewport height too (min of width and 5.6svh), compact hero below 820px of height, navigation on one line from 1000px; e2e checks the fold at 1440x900, 1280x720 and 1000x600. (b435a59)
- Word-by-word headline exposes one accessible name (`aria-label`, words hidden). (149e8fb)
- Builder refits the canvas once nodes are measured (the view could open empty); e2e fits the journey before selecting a far node. (42d5b7f)
- e2e waits for focus to return to the menu button. (1e995b7)
- e2e waits for fonts before the fold check and reports failures as CI annotations. (338de43)
- e2e screenshots that time out in software rendering are reported as warnings. (104b8c3)
- e2e screenshots freeze CSS animations and allow slow software rendering. (2eb9904)

## 2026-10-29

### Added

- Natural-language journeys in English or French: rules planner everywhere, Claude planner in the hosted version (sanitised against the library), draft shown page by page before creation. (06a3c0b)
- 21 section patterns and 15 new components from the devoteam.com analysis, bench-01 and bench-02, with provenance and `composedOf`; stronger brand rendering. (06a3c0b)
- 12 use cases and 19 insights from the devoteam.com review; 12 journey types; Pages view in the builder; prompt bar on the overview. 54 unit tests, 15-step e2e with axe. (06a3c0b)
- Atelier platform: Design System (tokens with brand, derived and TODO-BRAND provenance from DS-Devo `brand/README.md`, contrast checks, dependency view, live preview), component library (29 components, 14 from DS-Devo bench-01), use cases and insights with traceability, Journey Builder (three-panel React Flow canvas, screen miniatures, decisions, alternative paths, inspector, undo and redo, validation, interactive preview), rule-based journey generator. 34 unit tests, headless e2e with axe (WCAG 2.2 AA). (80aad96)

### Fixed

- Phone layout, clipboard export in embedded frames, `tsconfig.tsbuildinfo` untracked. (968e6a0)

## Upstream design system (DS-Devo, BerocFr/ds-devo)

Summary of the upstream repository's `git log`, for context only. This repository does not edit DS-Devo; its own changelog is DS-Devo `CHANGELOG.md`.

### 2026-10-30

- Bench-05 second owner round recorded (generated hero visuals, red primary, burger menu). (ea9b918)
- Bench-05 owner reference (Rowalo) and how the platform applied it. (9a2ec41)
- Bench-04 identity benchmark, founder arbitration, backlog rows S-063 to S-066. (fb2a6c1)
- Bench-03 motion benchmark, owner rulings on imagery, icons and motion, rows S-053 to S-062. (82080eb)

### 2026-10-29

- Devoteam.com analysis, bench-02, founder arbitration, rows S-038 to S-052. (c2d18a1)
- Benchmark 01 (Awwwards agencies, Webflow components, DS content and motion), founder arbitration, owner rulings (D3, OD-1, OD-2, OD-3), rows S-013 to S-037. (30b63a0, 329a64f, 45575b2)
- S-002 brand intake: Devoteam brand mirror in `brand/README.md` with per-section Engrym citations, brand fidelity review, vault note; first blocked (no brand docs in Engrym), then ratified at d322f8e after correctives and rebase. (a58da4c, 3a54b3c, 4206502, 1264eb8, f654935, 6ee2b3d, d322f8e, 4c20f21)
- S-001 monorepo bootstrap: npm workspaces, strict TS, Vitest, Changesets, Storybook 8 docs workspace, workspace-contract tests, GitHub Actions on Node 22.12.0 and 24; ratified at cf95030. (a4340e3, bac6398, 117e4b3, 92d59c1, 73a5173, c20c1e9, a81bce3, 9e736be, ae15e5a, cf95030, a89e4e6)
- Session handoff documents for another Claude account. (752defd, 719724c, 87b2c54)
- Brand sourced from the Engrym project "Devoteam DS". (b416fef)
- Autonomous agentic orchestration for the Devoteam design system (protocol, roster, gates). (82cac24)
