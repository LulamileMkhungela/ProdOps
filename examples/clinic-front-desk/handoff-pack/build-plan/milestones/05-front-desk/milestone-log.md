# Milestone 05 log — Front desk

> Written by the assistant that built the example, after the fact: the application was built in one pass rather than in six separate sessions. Each log lists what that milestone contributes and how it is checked.

## What is new (plain language)
- The front desk shows, for the chosen day: booked (not cancelled), waiting to confirm, arrived, completed and no-shows.
- The day's diary in time order, with the actions each visit allows.
- For each therapist, the next free 30-minute slot, or "none today".
- Choosing another day shows that day's diary.

## What was built
- Front end: the Front desk screen. It is the first screen when the application opens.
- Back end / data: `nextFree` in `app.js`. Counts are computed from the appointment list.
- Tests added, and the result of the full suite: `nextFree` assertions and the end-to-end page test in `scripts/example.test.ts`. All 9 tests in that file pass.

## Decisions the PRD did not cover
- The day opens on today's date in the browser.
- "Next free slot" looks from 08:00 in 30-minute steps; it does not skip slots in the past.

## Open issues and paper cuts
- No charts or trends (out of scope).

## For the next milestone
- Nothing outstanding.
