# Architecture & stack

> **Local template draft.** Generated in your browser from the brief by the ProdOps compiler. No AI model was used and nothing was validated with real users. Replace anything that does not fit before approval.

Suggested from the **Clinic operations** pattern. If entities, sections or personas below do not fit your product, rename or delete them; pick a different pattern if the match is wrong.

## Stack
| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 · App Router |
| Language | TypeScript 5.9 · strict |
| UI runtime | React 19 |
| Styling | Tailwind CSS 4 + generated @theme |
| Registry | Radix UI primitives headless |
| Data | Drizzle ORM Postgres 16 |
| Validation | Zod 4 |
| Charts | Chart primitives (generated) latest |
| Tests | Vitest + Playwright latest |
| Knowledge | Wiki in Git branches / worktrees |

## Data layer
Repository interface per entity, one mock adapter, one Postgres adapter.

- UI imports types and hooks only — never a table or a query.
- Every read goes through a repository method; screens never hold their own fixtures.
- The mock adapter returns the seeded rows from the data shape, so the prototype runs with no database.
- Swapping to Postgres changes the adapter, not the screens.
- Mutations are typed once in the repository and reused by forms and the API layer.

## Modules
- **Front desk** — The day at a glance: arrivals, gaps and confirmations outstanding.
- **Patients** — A single patient record with contact, cover and visit history.
- **Appointments** — Book, confirm and backfill the diary.
- **Clinical notes** — Write and sign notes in the room, not after hours.
