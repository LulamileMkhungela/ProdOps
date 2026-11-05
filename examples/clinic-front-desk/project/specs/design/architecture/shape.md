# Information architecture

> **Local template draft.** Generated in your browser from the brief by the ProdOps compiler. No AI model was used and nothing was validated with real users. Replace anything that does not fit before approval.

Suggested from the **Clinic operations** pattern. If entities, sections or personas below do not fit your product, rename or delete them; pick a different pattern if the match is wrong.

## Navigation
- Front desk
- Patients
- Appointments
- Clinical notes

## Shell
sidebar layout, airy density, content width 1280px.

## Sections and routes
| Section | Screen | Route | Kind |
| --- | --- | --- | --- |
| Front desk | Day at a glance | /front-desk/overview | overview |
| Front desk | Schedule | /front-desk/calendar | calendar |
| Patients | Patient index | /patients | collection |
| Patients | Patient record | /patients/:patientId | detail |
| Patients | Register a patient | /patients/new | editor |
| Appointments | Diary | /appointments/calendar | calendar |
| Appointments | Appointment list | /appointments | collection |
| Appointments | Book an appointment | /appointments/new | editor |
| Clinical notes | Notes to finish | /clinical-notes/inbox | inbox |
| Clinical notes | Encounter note | /clinical-notes/:noteId | detail |
