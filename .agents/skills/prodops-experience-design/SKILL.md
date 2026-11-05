---
name: prodops-experience-design
description: Design screens and flows for a ProdOps project from approved requirements, using the project's design tokens and design system. Use for user flows, wireframes, screen specs and design-requirement files before any code is written.
---

# ProdOps experience design

Inputs: approved `specs/business/requirements/`, `design/design-tokens.json`, and `design/design-system.md` if it exists. If the design system does not exist, create it first with the `bm-design-system` skill or the Lab's Design system tab; do not style screens ad hoc.

## Steps

1. **Flows.** For each in-scope feature, write the shortest path a person takes, including the empty, error and loading states.
2. **Screens.** One file per screen under `specs/design/screens/`: purpose, content in priority order, primary action (only one), states, and the requirement each part satisfies.
3. **Tokens.** Use named colour and type tokens. Never put a raw hex value in a screen spec or in code. If a needed token is missing, propose it and wait.
4. **Accessibility.** Text contrast is at least 4.5:1, interface components at least 3:1. Every input has a visible label. Everything is reachable by keyboard. Touch targets are at least 44px.
5. **Copy.** Say what the product does for whom. Real words, never lorem ipsum.
6. **Handover.** List components to reuse and any new ones, each with when to use and when not to.

## Check before finishing

- Every requirement points to a screen or is marked as not visual.
- No screen has two primary actions.
- The page still works at a 390px width.
