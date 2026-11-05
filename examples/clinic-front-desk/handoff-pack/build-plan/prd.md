# Clinic front desk (worked example) — product requirements

## Overview

A front-desk tool for a small physiotherapy clinic. The receptionist registers patients, books appointments without double-booking a therapist, and therapists write short visit notes. The clinic owner sees the day at a glance and no-shows drop.

## In scope (version one)

- Patients — Register a patient and find them again by name, phone or email.
- Appointments — Book a visit without double-booking a therapist, and move it through confirmed, arrived, completed, no-show or cancelled.
- Visit notes — Write a short note for a visit in the room, then sign it.
- Front desk — The day at a glance: how many are booked, waiting to confirm, arrived and done, and the next free slot for each therapist.

## Out of scope (version one)

- Billing, claims and medical-aid submissions
- Reminders by SMS or email
- Accounts, logins and permissions (version one is used on one shared front-desk screen)
- Adding or editing therapists (two are fixed in the code)
- Amending a signed note
- Imports, exports and reports

## Features

### Patients

- In: Register a patient with name, phone, email and how they pay.
- In: Name, phone and email are required, and an email can only be registered once.
- In: Search by name, phone or email, and filter by status (New or Active).
- Out: Recall due and Inactive statuses, editing or merging patient records.
- Out: Uploading documents.

### Appointments

- In: Book a patient with a therapist for a date, start time, 30, 45 or 60 minutes, and a kind of visit.
- In: Refuse a booking that overlaps another booking for the same therapist, or for the same patient, and say which time clashes.
- In: Refuse a booking outside opening hours (08:00 to 17:00).
- In: Allowed status moves are Unconfirmed to Confirmed, Arrived or Cancelled; Confirmed to Arrived, No-show or Cancelled; Arrived to Completed. Nothing else.
- Out: Recurring bookings and waiting lists.

### Visit notes

- In: A note can be written once the patient has arrived, saved as a draft, and signed.
- In: A signed note is final.
- In: An appointment can only be completed after its note is signed.
- Out: Diagnosis codes and amendments.

### Front desk

- In: Counts for the chosen day: booked, waiting to confirm, arrived, completed, no-shows.
- In: The day's diary in time order with the next allowed action on each row.
- In: The next free 30-minute slot for each therapist.
- Out: Charts and trends.

## Milestones

1. **Foundation** — Design tokens, the app shell and navigation, the data model with sample data, and the test setup. No features yet.
2. **Patients** — Build Patients as described in the PRD, and nothing beyond it. (after milestone 1)
3. **Appointments** — Build Appointments as described in the PRD, and nothing beyond it. (after milestone 2)
4. **Visit notes** — Build Visit notes as described in the PRD, and nothing beyond it. (after milestone 3)
5. **Front desk** — Build Front desk as described in the PRD, and nothing beyond it. (after milestone 4)
6. **Verify and hand off** — Run the whole suite, walk every flow on a phone-sized screen, fix paper cuts, and update the PRD to match what was built. (after milestone 5)

## Definition of done

Behaviour matches this document, tests pass (success and failure paths), nothing outside "In scope" was added, and the milestone log is written.
