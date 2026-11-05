# Clinic front desk design system

Generated from `design/design-tokens.json`. Refer to tokens by name.

## Colours

| Token | Value | Use | Contrast on background |
| --- | --- | --- | --- |
| primary | #c2410c | Main actions, links, focus rings | 4.9:1 |
| background | #fcf8f2 | Page background | 1.0:1 |
| text | #241e1a | Body text and headings | 15.6:1 |
| surface | #ffffff | Supporting colour | 1.1:1 |
| muted | #70665e | Supporting colour | 5.3:1 |
| border | #e9dfd6 | Supporting colour | 1.2:1 |
| success | #16865a | Supporting colour | 4.3:1 |
| danger | #b3261e | Supporting colour | 6.2:1 |

## Typography

System font stack, 16px body, 1.55 line height. Sample headline: "Book, treat and sign off visits at the front desk.". Style plain `h1`–`h3` and `p` once in the base styles.

## Shape

Radius 10px on buttons, fields and cards; modals 1.5×. Spacing steps: 4, 8, 12, 16, 24, 40.

## Buttons

**Use when:** One primary button per view for the main action; secondary for alternatives; ghost for low-emphasis actions; danger for destructive actions.

**Do not use when:** Do not use a button to navigate (use a link) or put two primary buttons side by side.

```html
<button class="btn btn-primary">Save</button>
<button class="btn btn-secondary">Cancel</button>
<button class="btn btn-ghost">Learn more</button>
<button class="btn btn-danger">Delete</button>
```

## Form fields

**Use when:** Every input has a visible label above it; show errors in words beside the field and keep what the user typed.

**Do not use when:** Do not use placeholder text instead of a label.

```html
<label class="field">Name
  <input class="input">
</label>
<label class="field">Email
  <input class="input is-error">
  <span class="error">Enter a full email address.</span>
</label>
```

## Badges

**Use when:** A short status or count next to a title (Open, Paid, 3 new).

**Do not use when:** Do not use badges for long text or as buttons.

```html
<span class="badge badge-primary">Active</span>
```

## Listings

**Use when:** Any collection (contacts, invoices, tasks): a main title, one line of detail, an optional badge, and actions on the right.

**Do not use when:** Do not build a table for fewer than three columns of real data.

```html
<ul class="list">
  <li>
    <div><b>Title</b><small>Detail line</small></div>
    <span class="badge">Status</span>
  </li>
</ul>
```

## Modal

**Use when:** A short, focused task that returns to the same screen (up to about five fields, or a confirmation).

**Do not use when:** Do not use a modal for long forms or content people may want to link to.

```html
<div class="modal" role="dialog" aria-modal="true">
  <h3>Title</h3>
  <p>One sentence of detail.</p>
  <div class="row end">…buttons…</div>
</div>
```

## Design system rules

The design system is documented in `design/design-system.md` (humans: `design/design-system.html`).

- Before writing any UI, read it and reuse the matching component. If none fits, ask: “There is no component for X. Add it to the design system so it stays consistent, or do a one-off?” Default to proposing the design-system addition, then use it.
- Refer to colours, radius and type by token name. Never write a raw hex value, a raw font size or a one-off radius in a component.
- Use plain semantic elements for text (`h1`–`h3`, `p`, `label`, `button`) and put typography in the base styles. Do not restyle each heading with a stack of utility classes.
- One primary button per view. Every input has a visible label. Errors appear beside the field, in words.
- Every interactive element has a visible focus state and meets 4.5:1 text contrast.
- Never reach for a new colour, shadow or spacing value to fix one screen. Change the token and every screen follows.
- When asked for UI, say which design-system component you used.
