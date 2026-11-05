# Milestone 03 — Appointments

Enter plan mode first. Do not write code until the plan is agreed.

## Read
- `AGENTS.md`
- `build-plan/prd.md` — focus **only** on milestone 3
- `design/design-system.md` — reuse its components
- The logs from earlier milestones, they hold decisions the PRD does not:
- `build-plan/milestones/01-foundation/milestone-log.md`
- `build-plan/milestones/02-patients/milestone-log.md`

## Build
Build Appointments as described in the PRD, and nothing beyond it.

**Appointments**
- In: Book a patient with a therapist for a date, start time, 30, 45 or 60 minutes, and a kind of visit.
- In: Refuse a booking that overlaps another booking for the same therapist, or for the same patient, and say which time clashes.
- In: Refuse a booking outside opening hours (08:00 to 17:00).
- In: Allowed status moves are Unconfirmed to Confirmed, Arrived or Cancelled; Confirmed to Arrived, No-show or Cancelled; Arrived to Completed. Nothing else.
- Out: Recurring bookings and waiting lists.

Target: Web app (React). Ask clarifying questions about anything the PRD leaves open (for example search, sorting, deletion and who can see what) and explain the trade-offs when you ask.

## Do not build
- Billing, claims and medical-aid submissions
- Reminders by SMS or email
- Accounts, logins and permissions (version one is used on one shared front-desk screen)
- Adding or editing therapists (two are fixed in the code)
- Amending a signed note
- Imports, exports and reports

## Standards to follow

Read these before writing code. They are the source of truth.

- @specs/development/code-standards/design-system-first.md — Check the design system before writing any markup or styles; reuse its components for buttons, forms, listings and modals.
- @specs/development/code-standards/semantic-html-for-text.md — Use plain semantic elements (h1, h2, p, label) and the base styles; do not restyle each heading with ad hoc classes.
- @specs/development/code-standards/tokens-not-raw-values.md — Use named colour, spacing, radius and type tokens; never raw hex values or pixel sizes in components.

## Finish
1. Run the whole test suite, not only the new tests.
2. Write `build-plan/milestones/03-appointments/milestone-log.md` using the template beside this file. The first section must be a plain list of what is new, so a person knows what to check.
3. Stop. Do not start the next milestone.
