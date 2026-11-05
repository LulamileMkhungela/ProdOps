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

## Standards, design systems and build plans

| Practice | What ProdOps does | Limit |
| --- | --- | --- |
| Surface the conventions an agent cannot guess, and capture the reasoning | **Standards → Discover** reads code you choose and proposes candidates (file naming, tokens vs raw colours, shared libraries, repeated idioms, test layout), then asks why for each. | Text analysis only. It finds what repeats; the reason comes from you. It does not run an agent or interview you adaptively. |
| Keep standards short and load only what applies | One-line descriptions in `index.yaml`; **Inject** picks standards by task wording, by reference (single source of truth) or by copy. | Selection is keyword overlap between the task and the descriptions. |
| Different standards per project type | **Profiles**: three starters plus ones you save from a project (kept in this browser). | Not synced between devices. |
| Stop design drift | **Design system** page from your tokens, with when-to-use, when-not-to-use and sample markup, plus rules in `AGENTS.md`. | Documents component shapes; generates no component code. Rules are followed most of the time, not always. |
| Say what is out of scope | **PRD & milestones** drafts In / Out lists; readiness warns if Out is empty. | The out-of-scope suggestions are generic until you edit them. |
| Buildable milestones with a log that passes the baton | Each milestone has a prompt (plan first, read PRD and earlier logs, build only this, write the log) and a log template. | Order follows your list with a keyword-based dependency nudge. |
| Understand the question you are asked | **Decisions** explains 13 common trade-offs with a default for a small first version. | A written guide, not a model; it cannot answer anything outside it. |

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
