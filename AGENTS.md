# ProdOps — agent instructions

> **Current workspace:** `src/main.tsx` mounts the role-based studio in
> `src/studio/`. `server/studio.ts` injects the existing skills into an optional,
> model using either a tab-scoped personal key or server configuration in explicitly trusted mode; generation is not a local compiler and never proves
> code was run or tested. The previous five-stage workspace described below is
> retained as legacy source and is no longer the active entry point. See
> `README.md` for current setup, handoff, privacy and deployment limits.

ProdOps is a product-planning workspace: it turns an idea into a specified,
designed, exportable product without asking the builder for a model, a key or
an account. This file is the entry point for any agent working in this repo.

Product owner: Lulamile Mkhungela.

## Two contexts

1. **The ProdOps app** — `src/` (React 19, TypeScript, Vite). This is the tool
   the builder uses; its views are the five stages.
2. **A product being built** — the exported package (`product-plan/`,
   `sections/`, `shell/`, `standards/`, `server/`). Nothing in `src/` is part
   of a user's product, and a user's product is never written back into `src/`.

## The five stages, and the commands behind them

| Stage | Command | Writes |
| --- | --- | --- |
| Product | `/product-vision`, `/product-roadmap` | `product/product-overview.md`, `product-roadmap.md`, `_build_plan/prd.md` |
| Data Shape | `/data-shape` | `data-shape/data-shape.md`, `schema.sql` |
| Design | `/design-tokens`, `/design-shell` | `design-system/colors.json`, `typography.json`, `product/shell/spec.md` |
| Sections | `/shape-section`, `/sample-data`, `/design-screen`, `/screenshot-design` | `sections/<name>/shape.md`, `plan.md`, `references.md`, `standards.md`, `visuals/` |
| Export | `/export-product` | `product-plan/` — the whole handoff |

Commands live in `.agents/commands/prodops/` — twenty of them: the ten stage
commands above, five standards commands, and five workflow commands
(`/write-spec`, `/create-tasks`, `/implement-tasks`, `/orchestrate-tasks`,
`/improve-skills`) that carry a shaped idea through spec, tasks, implementation
and verification. Upstream Agent OS and Design OS commands are in `.agents/commands/agent-os/` and `.agents/commands/design-os/`. Skills live in `.agents/skills/`; their sources and licences are in `.agents/UPSTREAM.md`.

## Standards commands

Standards set-up (`/discover-standards`, `/index-standards`, `/inject-standards`,
`/plan-product`, `/shape-spec`) is in `.agents/commands/prodops/` alongside the stage commands.

## Legacy five-stage rules (not the current studio)

- **Local compiler, optional assistant.** The compiler runs locally. The opt-in assistant sends conversation and project context to a server-configured provider; never claim it is offline or has built or tested anything. The legacy assistant required an access password; the current studio does not. The current studio must only enable its no-password AI endpoint in an explicitly trusted environment or behind separate authentication. Personal keys must remain in tab memory and travel only to the fixed provider through a trusted server; never save or log them. Server-configured credentials stay server-side.
- **A stage ticks only when it is confirmed**, never merely because its
  artefacts exist. Complete is not the same as done.
- **One decision at a time, with a proposed default and its reasoning.**
- **The brief is a *what* document.** No libraries, method names or retry
  strategies in it; those belong to the plan for each milestone.
- **Guidance, never a dead end.** After any rebuild, say what to do next.

## Skills, commands and agent files

These rules come from the agentcanon and bm-skills repositories' own instructions, adapted to this repo.

- **One canonical home.** Skills live in `.agents/skills/<name>/`; `.claude/skills` is a symlink to it. `AGENTS.md` is the real instructions file and `CLAUDE.md` is a symlink to it: edit only `AGENTS.md`. `scripts/link-agents.sh` recreates the links. Never reintroduce a second copy of a skill.
- **Skill names** are lowercase letters, digits and single hyphens, and the folder name must equal the `name` in `SKILL.md`. ProdOps's own skills start with `prodops-`.
- **Upstream files are verbatim.** `.agents/upstream/`, the `bm-*`, `agentcanon-*` and `frontend-design` skills, and `.agents/commands/agent-os/` and `design-os/` are unchanged copies. Do not hand-edit them. To update, re-copy from the upstream repository and update the commit ids in `.agents/UPSTREAM.md`. Local changes belong in a `prodops-*` skill or in `.agents/commands/prodops/`.
- **Adding or changing a skill:** update its folder, add it to `SKILL_GUIDE` in `src/studio/lab/agentpack.ts` and to `.agents/UPSTREAM.md`, add a `docs/CHANGELOG.md` entry, and run `npm run test:lab`.
- **Public repo.** No private context, tokens or personal paths in any skill or command.
- **Never move, merge or delete a user's files** before showing a plan and getting approval (the `agentcanon-repo` protocol).
- The upstream `AGENTS.md` and `CLAUDE.md` files are reference only, in `.agents/upstream/`. They describe how to work in those repositories.

## Design rules for the screens ProdOps generates

From the Design OS and design-system guidance. They apply to generated screens and specs, not to the ProdOps app's own styles.

- Mobile responsive, and light and dark if the tokens define both.
- Use the product's design tokens; fall back to neutral defaults only when none exist. Check the design system before writing UI, and propose adding a missing component to it before building a one-off.
- Components take their data and callbacks as props; they never import data themselves.
- Section screens contain no navigation; the application shell owns it.
- The design tool's look and the product's look are separate: never apply the tool's palette to the product.
- Tailwind rules (v4 only, no `tailwind.config.js`, built-in utilities and colours) apply only to a project that uses Tailwind.
- A design handoff covers UI, requirements and flows. Backend, data modelling and business-logic decisions go to the implementation agent, who should ask clarifying questions about the stack before building.

## Verification

- After a significant feature, add tests and run the full suite (`npm run check`); it must pass before the task is reported done.
- For any UI change, open it in a real browser, walk the user paths end to end, and check a desktop and a phone width. Keep screenshots out of git.
- Run verification servers on a port other than the one the human uses.
- Merging into `main` deploys the site to GitHub Pages (`.github/workflows/pages.yml`), so build with `VITE_STATIC_HOST=1 npx vite build` and run the checks first.

## Commands

```bash
npm run dev           # the workspace on :5173
npm run preview       # the built workspace on :4173
npm run check         # rendering, unit, export, walkthrough, smoke, build
npm run kit           # rewrite the toolkit files above
```
