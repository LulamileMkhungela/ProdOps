# ProdOps — agent instructions

> **Current workspace:** `src/main.tsx` mounts the role-based studio in
> `src/studio/`. `server/studio.ts` injects the existing skills into an optional,
> model using either a tab-scoped personal key or server configuration in explicitly trusted mode; generation is not a local compiler and never proves
> code was run or tested. The previous five-stage workspace described below is
> retained as legacy source and is no longer the active entry point. See
> `README.md` for current setup, handoff, privacy and deployment limits. The fictional Orbit dashboard is in `src/studio/dashboard.ts`; sample approvals are illustrative, not evidence.

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
and verification. Skills live in `.agents/skills/`.

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

## Commands

```bash
npm run dev           # the workspace on :5173
npm run preview       # the built workspace on :4173
npm run check         # rendering, unit, export, walkthrough, smoke, build
npm run kit           # rewrite the toolkit files above
```
