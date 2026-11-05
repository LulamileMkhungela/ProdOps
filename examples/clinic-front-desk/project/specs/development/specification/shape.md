# Shape specification

> **Local template draft.** Generated in your browser from the brief by the ProdOps compiler. No AI model was used and nothing was validated with real users. Replace anything that does not fit before approval.

Suggested from the **Clinic operations** pattern. If entities, sections or personas below do not fit your product, rename or delete them; pick a different pattern if the match is wrong.

## Front desk
The day at a glance: arrivals, gaps and confirmations outstanding.

- `TODA-01` Each card links to the filtered view that produced its number, so a number is never a dead end. (must)
- `TODA-02` The page must load its primary summary from a single request within 400ms on a warm cache. (must)
- `TODA-03` Month and week views share state, and arrow keys navigate periods without losing the selected record. (should)
- `TODA-04` Conflicting placements are flagged inline with a one-click resolution path. (should)
- `TODA-05` Appointment.room is required and stored trimmed; uniqueness is enforced at the database level where it identifies a record. (must)
- `TODA-06` Status transitions are constrained to Confirmed → Unconfirmed → Arrived → Completed → No-show → Cancelled; illegal transitions are rejected server-side, not hidden in the UI. (must)

**Out of scope:** nothing recorded

## Patients
A single patient record with contact, cover and visit history.

- `PATI-01` Remember the last used filter and column set per user, scoped to the Patients workspace. (must)
- `PATI-02` Export the current view to CSV using the same columns and active filters, with the export logged against the user. (must)
- `PATI-03` Destructive actions on the record require typed confirmation and are reversible for 30 seconds. (should)
- `PATI-04` Deep-link every patient by id; a stale link must show a recoverable not-found state, not a blank page. (should)
- `PATI-05` Autosave drafts locally every five seconds and offer recovery after an accidental close. (could)
- `PATI-06` Block duplicate submissions with an idempotency key and disable the submit control while pending. (could)
- `PATI-07` Patient.name is required and stored trimmed; uniqueness is enforced at the database level where it identifies a record. (must)
- `PATI-08` Patient.email is required and stored trimmed; uniqueness is enforced at the database level where it identifies a record. (must)
- `PATI-09` Status transitions are constrained to Active → New → Recall due → Inactive; illegal transitions are rejected server-side, not hidden in the UI. (must)

**Out of scope:** nothing recorded

## Appointments
Book, confirm and backfill the diary.

- `SCHE-01` Month and week views share state, and arrow keys navigate periods without losing the selected record. (must)
- `SCHE-02` Render all dates in the workspace timezone and label the timezone explicitly at the edge cases (month boundaries). (must)
- `SCHE-03` Export the current view to CSV using the same columns and active filters, with the export logged against the user. (should)
- `SCHE-04` Filtering and sorting schedule must be reflected in the URL so a view can be shared or bookmarked. (should)
- `SCHE-05` Block duplicate submissions with an idempotency key and disable the submit control while pending. (could)
- `SCHE-06` Validate on blur and on submit; a failed request must preserve every typed value. (could)
- `SCHE-07` Appointment.room is required and stored trimmed; uniqueness is enforced at the database level where it identifies a record. (must)
- `SCHE-08` Status transitions are constrained to Confirmed → Unconfirmed → Arrived → Completed → No-show → Cancelled; illegal transitions are rejected server-side, not hidden in the UI. (must)

**Out of scope:** nothing recorded

## Clinical notes
Write and sign notes in the room, not after hours.

- `ENCO-01` Resolving an item requires a resolution code so downstream reporting is meaningful. (must)
- `ENCO-02` Queue order is risk-based (deadline, severity, age) and shows the reason for each position. (must)
- `ENCO-03` Deep-link every encounter by id; a stale link must show a recoverable not-found state, not a blank page. (should)
- `ENCO-04` Destructive actions on the record require typed confirmation and are reversible for 30 seconds. (should)
- `ENCO-05` Encounter.summary is required and stored trimmed; uniqueness is enforced at the database level where it identifies a record. (must)
- `ENCO-06` Encounter.code is required and stored trimmed; uniqueness is enforced at the database level where it identifies a record. (must)
- `ENCO-07` Status transitions are constrained to Draft → Signed → Amended → Awaiting review; illegal transitions are rejected server-side, not hidden in the UI. (must)

**Out of scope:** Diagnosis coding assistance; Longitudinal problem lists
