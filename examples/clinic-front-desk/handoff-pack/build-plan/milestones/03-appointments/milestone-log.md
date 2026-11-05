# Milestone 03 log — Appointments

> Written by the assistant that built the example, after the fact: the application was built in one pass rather than in six separate sessions. Each log lists what that milestone contributes and how it is checked.

## What is new (plain language)
- Book a visit: patient, therapist, date, start time, 30, 45 or 60 minutes and a kind of visit.
- A booking that overlaps another booking for the same therapist is refused, and the message names the time that clashes. The same goes for the same patient.
- A booking that would end after 17:00 is refused.
- Each appointment shows only the next steps its status allows: Confirm, Mark arrived, Complete, No-show, Cancel.

## What was built
- Front end: the Appointments screen (booking form beside the list) and the action buttons on each row.
- Back end / data: `validateBooking`, `book`, `move` and the allowed-moves table in `app.js`. The moves are enforced by the rules, not only hidden in the interface.
- Tests added, and the result of the full suite: "booking rules" and "status and note rules" in `scripts/example.test.ts`. All 9 tests in that file pass.

## Decisions the PRD did not cover
- Back-to-back bookings are allowed (10:00 after a 09:00 to 10:00 visit).
- Cancelled and no-show bookings free their slot.
- A completed visit still blocks its slot, since it happened.

## Open issues and paper cuts
- No way to move an appointment to another time: cancel and book again.

## For the next milestone
- Completing an appointment is refused until its note is signed. That rule lives in `move` and needs milestone 04's notes.
