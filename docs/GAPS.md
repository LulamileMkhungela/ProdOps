# Gaps, and what ProdOps adds

A comparison with the Design OS workflow shown in its public demo (vision → roadmap → data shape → design system → sections → screenshots → export), and with this project before the Lab. Claims here are about this repository's behaviour; nothing is measured against outside products beyond that demo.

## What Design OS leaves open

| Gap | What ProdOps does | Where | Limit |
| --- | --- | --- | --- |
| Iterating on a shipped build is thin: new requirements mean redoing the export. | Save a version, compare, get an **iteration brief** listing changed files, the roles that must look again, and a prompt asking an agent for only the difference. | Lab → Versions · `src/studio/lab/versions.ts` | Line-based diff. Impact is a fixed role map, not an analysis. Stored in this browser (about 3 MB per project, 20 versions). |
| Designs are checked by eye only. | **Readiness** checks WCAG contrast of the primary colour, flags the untouched default palette and generic headlines. | Lab → Readiness · `readiness.ts`, `color.ts` | It spots defaults, not taste. |
| No link between requirements and what covers them. | **Traceability matrix**: each requirement, whether a design spec and a test case use its vocabulary. | `readiness.ts` | Keyword overlap. It finds likely gaps; it cannot prove coverage. |
| Output is tied to one coding agent. | **Agent pack**: `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, Cursor rule, Copilot instructions, milestone prompts, specs. | Lab → Agent pack · `agentpack.ts` | Instructions only. No agent is run, no component code is generated. |
| Mobile only appears as a request. | The pack has an **Expo / React Native** target that changes the rules and prompts (tokens as a theme object, touch targets, navigation). | `agentpack.ts` | Prompt tailoring only. |
| Needs a model and a subscription to get started. | **Instant draft** works with no model, no server and no network. | Lab → Instant draft · `offline.ts` | Template output. Archetype detection is crude, so a pattern picker is provided; every file says it is a template draft. |

## What ProdOps was missing

| Gap | Resolution |
| --- | --- |
| The hosted preview showed an empty-feeling workspace because AI drafting needs a server. | Instant draft, readiness, versions and the pack run in the browser. |
| The earlier five-stage flow was not reachable from the published site. | Published as `design.html`, linked both ways. |
| Approving a step full of placeholders was easy. | Readiness fails a check when an approved step still has placeholder text. |

## Not solved here

- Real screenshots (Design OS uses a browser automation tool; ProdOps previews are SVG/HTML).
- Anything that needs judgement about users: the drafts are starting points, and validation with real users is still your job.
- Sync across devices or people. Everything is stored in your browser.
- Generating a finished app from the specs. That is what the agent of your choice does with the pack.

## Tests

`npm run test:lab` runs unit tests (`scripts/lab.test.ts`) and a jsdom walk through the Lab with fetch disabled (`scripts/lab-smoke.tsx`).
