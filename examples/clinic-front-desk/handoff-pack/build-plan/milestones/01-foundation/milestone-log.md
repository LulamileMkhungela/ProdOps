# Milestone 01 log — Foundation

> Written by the assistant that built the example, after the fact: the application was built in one pass rather than in six separate sessions. Each log lists what that milestone contributes and how it is checked.

## What is new (plain language)
- A page with a header and four sections to switch between: Front desk, Patients, Appointments, Visit notes.
- The look comes from the project's design tokens (colours, corner radius). No colour or size is written into a component.
- Two therapists (Therapist A in Room 1, Therapist B in Room 2) and a clinic day of 08:00 to 17:00.

## What was built
- Front end: `solution/index.html`, `solution/styles.css` (starts with the token block copied from `design/design-tokens.css`) and `solution/app.js` (state, rules, views, events).
- Back end / data: none. Data is held in memory because the ProdOps preview has no browser storage; it resets when the preview closes.
- Tests added, and the result of the full suite: `scripts/example.test.ts` checks that the stylesheet starts with the project tokens. The whole example test file passes (9 tests).

## Decisions the PRD did not cover
- Plain HTML, CSS and JavaScript instead of React, so the finished application runs inside the ProdOps preview with no build step.
- The data model follows `specs/business/data/shape.md`: Patient, Appointment, Clinician (fixed) and Encounter (the visit note). Claim is not built (billing is out of scope).
- Text on the primary colour is white; the primary colour was darkened to #c2410c so it passes 4.5:1 (5.18:1).

## Open issues and paper cuts
- Typing in the patient search clears a half-filled registration form on the same screen.

## For the next milestone
- All rules are plain functions in `app.js` and are exported on `window.ClinicDesk` so tests can call them.
- Use the existing classes (`.card`, `.button`, `.input`, `.badge`, `.row`) and tokens; add a class to `styles.css` before writing a one-off style.
