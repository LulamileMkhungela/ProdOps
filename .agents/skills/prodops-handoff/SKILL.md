---
name: prodops-handoff
description: Read a ProdOps agent pack and build from it safely: where the brief, scope, standards, design system and milestone prompts are, in what order to read them, and how to stop and ask. Use when you open a repo or folder containing AGENTS.md and build-plan/.
---

# Building from a ProdOps pack

Read in this order, and stop reading when you have what the current task needs:

1. `AGENTS.md`, the rules for this project.
2. `brief.md`, what and for whom.
3. `specs/business/scope/scope.md`, what is in and out of scope. Do not build anything listed as out.
4. `specs/development/code-standards/index.yaml`, one line per standard. Open only the standards that fit the task.
5. `design/design-system.md` and `design/design-tokens.json`. Use tokens and existing components; do not add raw colours or one-off styles.
6. `build-plan/prd.md`, then only the milestone you are working on in `build-plan/milestones/NN-name/prompt.md`, and the earlier milestone logs.

## How to work

- Plan first and wait for agreement before writing code.
- Build one milestone only. At the end, run the tests, write `milestone-log.md` (what changed in plain language, decisions, what the next milestone must know), and stop.
- If something is unclear, ask one question with a recommended default. Do not guess about scope, money, personal data or permissions.
- If a requirement and a standard disagree, say so; do not choose silently.
