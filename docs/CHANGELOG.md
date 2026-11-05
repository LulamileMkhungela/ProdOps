# Changelog

## Unreleased

- **ProdOps Lab** in the role studio: instant template drafts that work without a server, a handoff readiness score with a traceability matrix, saved versions with an iteration brief, and an agent-agnostic handoff pack. See `docs/GAPS.md`.
- The five-stage flow is published at `design.html`, with links between the two workspaces.
- The static preview resolves its assets relative to the site path and never calls a server.

## [2026.3.0]

- **Five workflow commands** join the fifteen: `/write-spec`, `/create-tasks`,
  `/implement-tasks`, `/orchestrate-tasks` and `/improve-skills` — the part of the v2 loop that
  turns a shaped idea into a spec, a task list, code and a verification report. Twenty commands
  in one folder, and the export writes them all.
- `/coverage` gained a **canon** group that recomputes every count the library prints, and
  `npm run smoke` now clicks Start on a kit and asserts a CRM compiles out of it.

## [2026.2.9]

- Streamlined `/product-vision`: now generates the product overview, product roadmap, and data shape all in one conversational flow. After clarifying questions, all three files are written automatically without draft approval.
- Updated `/product-roadmap` and `/data-shape` to follow the update pattern: if the file already exists, show current state and ask what to change; if not, generate immediately from prerequisites.
- Streamlined `/shape-section` flow: after clarifying questions, the spec, sample data, and TypeScript types are now generated automatically without requiring draft approval.
- Streamlined `/sample-data` flow: when run standalone, auto-generates data immediately. When data already exists, asks what to change then auto-updates.
- Reframed `/export-product` as a UI design handoff (not a full-stack spec). Removed prescriptive backend/database guidance from preamble, milestone instructions, prompts, and test specs. The handoff now focuses on UI components, product requirements, and user flows — leaving backend architecture decisions to the implementation agent.
- Consolidated foundation + shell into a single `01-shell.md` milestone (design tokens + app shell). Sections now start at milestone 02.
- Renamed `data-model/` to `data-shapes/` in the export package, with a new `overview.ts` that aggregates all section types as a combined reference.
- Simplified export prompt files — replaced prescriptive backend question categories with lighter, open-ended clarifying questions.
- Refocused export test specs (`tests.md`) on UI behavior only — removed backend testing guidance.
- Renamed `/data-model` to `/data-shape` throughout. The command, UI, routes, and all references now use "data shape" to emphasize this step is about sketching the general shape of data, not defining a final data model.
- Switched to date-based version numbers.

## [0.1.2] - 2025-12-19

- Fixed errors related to importing google fonts out of order.
- Handled sections that use '&' in their name.

## [0.1.1] - 2025-12-18

- In the export package, consolidated '01-foundation' and '02-shell' into one.
- Updated README.md tips that come in the export.

## [0.1] - 2025-12-16

- Initial release
