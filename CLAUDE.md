# Atelier platform: working rules

Product: the Design System and Journey Builder platform described in the "DS Devoteam" Claude project. The Devoteam design system itself lives in BerocFr/DS-Devo; this repo consumes it and never redefines brand values.

- Brand values come from DS-Devo `brand/README.md`. A value the brand does not define is a `todo-brand` token, never an invented one.
- Generic components the platform needs (Stepper, code input, empty state, tabs) are proposed as DS-Devo backlog rows, not frozen here.
- WCAG 2.2 AA: visible focus, keyboard reachability, accessible names that contain the visible label, 4.5:1 text contrast, reduced motion respected. `npm run e2e` runs axe and fails on serious or critical violations.
- No em dashes in shipped copy. Sentence case, verbs on buttons, errors that say how to fix.
- Domain logic stays pure in `src/domain` and is unit-tested. Persistence only through `PlatformRepository`.
- Before pushing: `npm run typecheck && npm test && npm run build && npm run e2e`.
- Stage files by explicit path. Never `git add -A`.
