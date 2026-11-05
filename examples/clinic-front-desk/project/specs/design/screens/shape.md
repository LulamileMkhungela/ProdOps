# Wireframes & screens

> **Local template draft.** Generated in your browser from the brief by the ProdOps compiler. No AI model was used and nothing was validated with real users. Replace anything that does not fit before approval.

Suggested from the **Clinic operations** pattern. If entities, sections or personas below do not fit your product, rename or delete them; pick a different pattern if the match is wrong.

## Front desk
### Day at a glance (/front-desk/overview)
Answer "what needs attention right now" across schedule in under ten seconds.

**Blocks:** pageHeader, stats, chart, table, activity

**States:** Loading — Skeleton rows matching final layout; no spinner over the whole page.; Empty — Zero-state explains what a appointment is and offers the primary create action.; Error — Inline retry with the failed request named; cached data stays visible.; Permission — Read-only view for viewers, with the create action hidden rather than disabled.

**Acceptance**
- A user can reach day at a glance in one click from the Front desk navigation.
- Every value on the screen maps to a field in the Appointment model or a documented aggregate.
- The screen is usable at 375px with no horizontal scroll on primary content.

### Schedule (/front-desk/calendar)
Place schedule in time and spot collisions before they happen.

**Blocks:** pageHeader, calendar, timeline

**States:** Loading — Skeleton rows matching final layout; no spinner over the whole page.; Empty — Zero-state explains what a appointment is and offers the primary create action.; Error — Inline retry with the failed request named; cached data stays visible.; Permission — Read-only view for viewers, with the create action hidden rather than disabled.

**Acceptance**
- A user can reach schedule in one click from the Front desk navigation.
- Every value on the screen maps to a field in the Appointment model or a documented aggregate.
- The screen is usable at 375px with no horizontal scroll on primary content.

## Patients
### Patient index (/patients)
Find, filter and act on any patient without leaving the list.

**Blocks:** pageHeader, filters, table

**States:** Loading — Skeleton rows matching final layout; no spinner over the whole page.; Empty — Zero-state explains what a patient is and offers the primary create action.; Error — Inline retry with the failed request named; cached data stays visible.; Permission — Read-only view for viewers, with the create action hidden rather than disabled.

**Acceptance**
- A user can reach patient index in one click from the Patients navigation.
- Every value on the screen maps to a field in the Patient model or a documented aggregate.
- The screen is usable at 375px with no horizontal scroll on primary content.

### Patient record (/patients/:patientId)
Hold the complete story of one patient — fields, history and related records.

**Blocks:** pageHeader, detail, timeline

**States:** Loading — Skeleton rows matching final layout; no spinner over the whole page.; Empty — Zero-state explains what a patient is and offers the primary create action.; Error — Inline retry with the failed request named; cached data stays visible.; Permission — Read-only view for viewers, with the create action hidden rather than disabled.

**Acceptance**
- A user can reach patient record in one click from the Patients navigation.
- Every value on the screen maps to a field in the Patient model or a documented aggregate.
- The screen is usable at 375px with no horizontal scroll on primary content.

### Register a patient (/patients/new)
Capture a patient with the least possible friction and zero data loss.

**Blocks:** pageHeader, form, callout

**States:** Loading — Skeleton rows matching final layout; no spinner over the whole page.; Empty — Zero-state explains what a patient is and offers the primary create action.; Error — Inline retry with the failed request named; cached data stays visible.; Permission — Read-only view for viewers, with the create action hidden rather than disabled.

**Acceptance**
- A user can reach register a patient in one click from the Patients navigation.
- Every value on the screen maps to a field in the Patient model or a documented aggregate.
- The screen is usable at 375px with no horizontal scroll on primary content.

## Appointments
### Diary (/appointments/calendar)
Place schedule in time and spot collisions before they happen.

**Blocks:** pageHeader, calendar, timeline

**States:** Loading — Skeleton rows matching final layout; no spinner over the whole page.; Empty — Zero-state explains what a appointment is and offers the primary create action.; Error — Inline retry with the failed request named; cached data stays visible.; Permission — Read-only view for viewers, with the create action hidden rather than disabled.

**Acceptance**
- A user can reach diary in one click from the Appointments navigation.
- Every value on the screen maps to a field in the Appointment model or a documented aggregate.
- The screen is usable at 375px with no horizontal scroll on primary content.

### Appointment list (/appointments)
Find, filter and act on any appointment without leaving the list.

**Blocks:** pageHeader, filters, table

**States:** Loading — Skeleton rows matching final layout; no spinner over the whole page.; Empty — Zero-state explains what a appointment is and offers the primary create action.; Error — Inline retry with the failed request named; cached data stays visible.; Permission — Read-only view for viewers, with the create action hidden rather than disabled.

**Acceptance**
- A user can reach appointment list in one click from the Appointments navigation.
- Every value on the screen maps to a field in the Appointment model or a documented aggregate.
- The screen is usable at 375px with no horizontal scroll on primary content.

### Book an appointment (/appointments/new)
Capture a appointment with the least possible friction and zero data loss.

**Blocks:** pageHeader, form, callout

**States:** Loading — Skeleton rows matching final layout; no spinner over the whole page.; Empty — Zero-state explains what a appointment is and offers the primary create action.; Error — Inline retry with the failed request named; cached data stays visible.; Permission — Read-only view for viewers, with the create action hidden rather than disabled.

**Acceptance**
- A user can reach book an appointment in one click from the Appointments navigation.
- Every value on the screen maps to a field in the Appointment model or a documented aggregate.
- The screen is usable at 375px with no horizontal scroll on primary content.

## Clinical notes
### Notes to finish (/clinical-notes/inbox)
Clear the queue in risk order with keyboard-first controls.

**Blocks:** pageHeader, filters, list, timeline

**States:** Loading — Skeleton rows matching final layout; no spinner over the whole page.; Empty — Zero-state explains what a encounter is and offers the primary create action.; Error — Inline retry with the failed request named; cached data stays visible.; Permission — Read-only view for viewers, with the create action hidden rather than disabled.

**Acceptance**
- A user can reach notes to finish in one click from the Clinical notes navigation.
- Every value on the screen maps to a field in the Encounter model or a documented aggregate.
- The screen is usable at 375px with no horizontal scroll on primary content.

### Encounter note (/clinical-notes/:noteId)
Hold the complete story of one encounter — fields, history and related records.

**Blocks:** pageHeader, detail, timeline

**States:** Loading — Skeleton rows matching final layout; no spinner over the whole page.; Empty — Zero-state explains what a encounter is and offers the primary create action.; Error — Inline retry with the failed request named; cached data stays visible.; Permission — Read-only view for viewers, with the create action hidden rather than disabled.

**Acceptance**
- A user can reach encounter note in one click from the Clinical notes navigation.
- Every value on the screen maps to a field in the Encounter model or a documented aggregate.
- The screen is usable at 375px with no horizontal scroll on primary content.
