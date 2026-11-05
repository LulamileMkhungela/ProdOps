# Design rules

## Design system rules

The design system is documented in `design/design-system.md` (humans: `design/design-system.html`).

- Before writing any UI, read it and reuse the matching component. If none fits, ask: “There is no component for X. Add it to the design system so it stays consistent, or do a one-off?” Default to proposing the design-system addition, then use it.
- Refer to colours, radius and type by token name. Never write a raw hex value, a raw font size or a one-off radius in a component.
- Use plain semantic elements for text (`h1`–`h3`, `p`, `label`, `button`) and put typography in the base styles. Do not restyle each heading with a stack of utility classes.
- One primary button per view. Every input has a visible label. Errors appear beside the field, in words.
- Every interactive element has a visible focus state and meets 4.5:1 text contrast.
- Never reach for a new colour, shadow or spacing value to fix one screen. Change the token and every screen follows.
- When asked for UI, say which design-system component you used.
