# Milestone 02 log — Patients

> Written by the assistant that built the example, after the fact: the application was built in one pass rather than in six separate sessions. Each log lists what that milestone contributes and how it is checked.

## What is new (plain language)
- Register a patient with name, phone, email and how they pay (self-pay or medical aid).
- Bad input is explained next to the field and what was typed is kept.
- A second patient with the same email, in any letter case, is refused.
- The patient list can be searched by name, phone or email and filtered by New or Active.

## What was built
- Front end: the Patients screen (registration form beside the list).
- Back end / data: `validatePatient` and `register` in `app.js`. A new patient has the status New and 0 visits.
- Tests added, and the result of the full suite: "patient rules" and the page walk-through in `scripts/example.test.ts`. All 9 tests in that file pass.

## Decisions the PRD did not cover
- A phone number is valid with digits, an optional leading plus, spaces, brackets or hyphens, and at least 7 digits. No country-specific format is enforced.
- Names are limited to 120 characters.

## Open issues and paper cuts
- Patients cannot be edited or deleted (out of scope).

## For the next milestone
- A patient's status changes from New to Active when their first appointment is completed. Milestone 03 triggers this.
