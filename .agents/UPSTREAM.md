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

## Reference documents (`.agents/upstream/`)

Every Markdown file in the buildermethods repositories, copied unchanged (the ones inside `skills/` and the command folders are already installed above). Their own `AGENTS.md` and `CLAUDE.md` describe how to work *inside those repositories*, so they are kept here as reference and are **not** written to the root of your project, where they would override your own `AGENTS.md`.

| Folder | Repository | Commit | Contents |
| --- | --- | --- | --- |
| `bm-skills/` | [bm-skills](https://github.com/buildermethods/bm-skills) | 7bee335 | `README`, `AGENTS`, `CLAUDE`, `CHANGELOG`, plugin manifest, licence |
| `agent-os/` | [agent-os](https://github.com/buildermethods/agent-os) | e892e61 | `README`, `CHANGELOG`, default tech-stack profile, `.github` community files, licence |
| `design-os/` | [design-os](https://github.com/buildermethods/design-os) | 2f14c46 | `README`, `AGENTS`, `CLAUDE`, `CHANGELOG`, eight `docs/` guides, `.github` community files, licence |
| `agentcanon/` | [agentcanon](https://github.com/buildermethods/agentcanon) | 792bb0c | `README`, `AGENTS`, `CLAUDE`, licence |
| `build-new/` | [build-new](https://github.com/buildermethods/build-new) | 9321433 | `README`, `AGENTS`, `CLAUDE`, `CHANGELOG`, deployment guide (Markdown only; the Rails app is not copied) |

## Licences

`bm-skills`, `agent-os`, `design-os` and `agentcanon` are MIT licensed by CasJam Media LLC (Builder Methods); each licence text is in its folder above. `build-new` has no licence file; its README says "Open source. Free to use, fork, and adapt.", so only its Markdown is included, unchanged and credited. If you need a formal licence for it, ask the authors.

The `frontend-design` skill's header says "Complete terms in LICENSE.txt", but upstream ships no such file, so its terms are those of the design-os repository (MIT) as far as can be verified. The `prodops-*` skills are part of ProdOps (MIT).
