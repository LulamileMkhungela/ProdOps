# Standards & references

> **Local template draft.** Generated in your browser from the brief by the ProdOps compiler. No AI model was used and nothing was validated with real users. Replace anything that does not fit before approval.

Suggested from the **Clinic operations** pattern. If entities, sections or personas below do not fit your product, rename or delete them; pick a different pattern if the match is wrong.

## Stack
| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 15 · App Router | Server components by default; the prototype and the production app share one routing model. |
| Language | TypeScript 5.9 · strict | The generated data layer and component props are typed, so a contract break fails at build time. |
| UI runtime | React 19 | Matches the AppShell and the component registry the prototype renders from. |
| Styling | Tailwind CSS 4 + generated @theme | tokens.css and tailwind-theme.css come from the same compiled design system. |
| Registry | Radix UI primitives headless | Behaviour without opinions, so every visual decision still comes from tokens. |
| Data | Drizzle ORM Postgres 16 | The dummy data layer sits behind repository interfaces; swapping the adapter is a one-file change. |
| Validation | Zod 4 | Form and API inputs share one schema, derived from the entity fields. |
| Charts | Chart primitives (generated) latest | Chart props are already normalised into labels + series by the screen compiler. |
| Tests | Vitest + Playwright latest | Acceptance criteria in each section spec map to one Playwright spec. |
| Knowledge | Wiki in Git branches / worktrees | Every iteration snapshots the product, design and flow knowledge next to the code. |

## Standards to agree
- Naming, folder layout and formatting
- Test runner and coverage expectations
- Review rules and branch policy

> Record real existing patterns under references; do not invent them.
