# Milestone 04 log — Visit notes

> Written by the assistant that built the example, after the fact: the application was built in one pass rather than in six separate sessions. Each log lists what that milestone contributes and how it is checked.

## What is new (plain language)
- Once a patient is marked arrived, a card for their visit appears under Visit notes.
- Write a summary, save it as a draft, then sign it. A summary is required.
- A signed note is shown as text and cannot be changed.
- A visit can be completed only after its note is signed.

## What was built
- Front end: the Visit notes screen, one card per arrived or completed visit.
- Back end / data: `saveNote` and `signNote` in `app.js`. A note is a Draft until signed.
- Tests added, and the result of the full suite: the note rules and the end-to-end page test in `scripts/example.test.ts`. All 9 tests in that file pass.

## Decisions the PRD did not cover
- The summary is limited to 2000 characters.
- Sign is disabled until a draft has been saved.

## Open issues and paper cuts
- A signed note cannot be amended (out of scope).

## For the next milestone
- The front desk shows counts by appointment status. It does not need note data.
