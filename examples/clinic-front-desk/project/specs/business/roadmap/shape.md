# Roadmap & milestones

> **Local template draft.** Generated in your browser from the brief by the ProdOps compiler. No AI model was used and nothing was validated with real users. Replace anything that does not fit before approval.

Suggested from the **Clinic operations** pattern. If entities, sections or personas below do not fit your product, rename or delete them; pick a different pattern if the match is wrong.

Ordered by dependency: foundation first, then Appointments. A phase is done when its sections are usable with real data. 

## Foundation · Weeks 1–4
**Goal:** Prove the core loop end to end with real data in it.

- Workspace shell, auth and role presets shipped
- Data model migrated with seed data and one import path
- First usable workflow: Front desk
- Design tokens wired into the codebase and enforced in review

**Main risk:** Trying to polish the shell before the core loop works.

## Core operations · Weeks 5–9
**Goal:** Make the daily job faster than the spreadsheet it replaces.

- Appointments: Book, confirm and backfill the diary.
- Clinical notes: Write and sign notes in the room, not after hours.
- Bulk actions, saved filters and CSV import/export in place
- Audit log recording every state change with actor

**Main risk:** Feature breadth outrunning data quality.
