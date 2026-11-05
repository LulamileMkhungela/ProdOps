# Installed skills and commands

Everything here is plain Markdown that any agent reads. Install it for all your projects by copying `skills/*` into `~/.agents/skills/` (or into a project's `.agents/skills/`). For Claude Code, link it: `ln -s ../.agents/skills .claude/skills`.

## Skills (`.agents/skills/`)

| Skill | Source | Use it to |
| --- | --- | --- |
| `bm-prd-creator` | [buildermethods/bm-skills](https://github.com/buildermethods/bm-skills) @ 7bee335 | Interview you from a raw idea to a PRD plus milestone prompts |
| `bm-design-system` | same | Scaffold a React + Tailwind v4 design system with a live reference page and agent guardrails |
| `bm-skill-builder` | same | Turn a repeatable process into a well-built skill |
| `bm-favicon-creator` | same | Generate a favicon set from a Lucide icon or SVG |
| `agentcanon-manifest`, `agentcanon-repo` | [buildermethods/agentcanon](https://github.com/buildermethods/agentcanon) @ 792bb0c | Keep one `.agents/skills` folder that every tool reads |
| `frontend-design` | [buildermethods/design-os](https://github.com/buildermethods/design-os) @ 2f14c46 | Distinctive, production-grade interfaces |
| `prodops-product-workflow`, `prodops-experience-design`, `prodops-quality-engineering`, `prodops-delivery-operations`, `prodops-handoff` | Written for ProdOps | One per role, plus how to build from a ProdOps pack |

## Commands (`.agents/commands/`)

- `agent-os/`: discover, index and inject standards, plan a product, shape a spec. From [buildermethods/agent-os](https://github.com/buildermethods/agent-os) @ e892e61.
- `design-os/`: product vision, roadmap, data shape, design tokens, shell, section and screen design, export. From [buildermethods/design-os](https://github.com/buildermethods/design-os) @ 2f14c46.
- `prodops/`: the ProdOps editions of the same commands plus the workflow commands, written to ProdOps's file layout by `npm run kit`.

## Licences

The upstream files are copied unchanged and are MIT licensed by CasJam Media LLC (Builder Methods). Their licence texts are in `.agents/upstream/`. The `frontend-design` skill's header says "Complete terms in LICENSE.txt", but upstream ships no such file, so its terms are those of the design-os repository (MIT) as far as can be verified. The `prodops-*` skills are part of ProdOps (MIT).

Upstream repositories checked: `agent-os`, `design-os`, `bm-skills` and `agentcanon` are MIT. `build-new` (a Rails starter) has no licence file and is not included.
