# Traceability — Clinic front desk (worked example)

Requirement → design → quality. 95% reach design, 86% reach tests. Matching is by shared vocabulary, so treat gaps as questions, not verdicts.

| # | Requirement | Design | Tests | Source |
| ---: | --- | :---: | :---: | --- |
| 1 | The receptionist can register a patient in under a minute, so the person at the desk is not kept waiting. | ✅ | ✅ | specs/business/requirements/business-requirements.md |
| 2 | The receptionist can book a visit knowing it will not double-book a therapist or a patient. | ✅ | ✅ | specs/business/requirements/business-requirements.md |
| 3 | A therapist can write and sign a short note for a visit while the patient is still in the room. | ✅ | ✅ | specs/business/requirements/business-requirements.md |
| 4 | The clinic owner can see the day at a glance: who is booked, who has arrived, who has not confirmed and who did not come. | ✅ | ✅ | specs/business/requirements/business-requirements.md |
| 5 | No-shows fall because every booking is confirmed before the day and unconfirmed bookings are visible on the front desk. | ✅ | ✅ | specs/business/requirements/business-requirements.md |
| 6 | A patient needs a name, a phone number and an email address; leading and trailing spaces are removed. | ✅ | ✅ | specs/business/requirements/functional-requirements.md |
| 7 | A phone number uses digits with an optional leading plus, spaces, brackets or hyphens, and has at least 7 digits. | ✅ | ✅ | specs/business/requirements/functional-requirements.md |
| 8 | An email address is registered once; the comparison ignores upper and lower case. | ✅ | ✅ | specs/business/requirements/functional-requirements.md |
| 9 | A new patient has the status New; it becomes Active when their first appointment is completed. | ✅ | ✅ | specs/business/requirements/functional-requirements.md |
| 10 | The patient list can be searched by name, phone or email and filtered by status (New or Active). | ✅ | ✅ | specs/business/requirements/functional-requirements.md |
| 11 | A booking has a patient, a therapist, a date, a start time, a length of 30, 45 or 60 minutes and a kind of visit. | ✅ | ✅ | specs/business/requirements/functional-requirements.md |
| 12 | The clinic is open from 08:00 to 17:00; a booking must end by 17:00. | ✅ | ✅ | specs/business/requirements/functional-requirements.md |
| 13 | A booking is refused when it overlaps an active booking for the same therapist, and the message names the clashing time. | ✅ | ✅ | specs/business/requirements/functional-requirements.md |
| 14 | A booking is refused when it overlaps an active booking for the same patient. | ✅ | ✅ | specs/business/requirements/functional-requirements.md |
| 15 | A new booking is Unconfirmed. | ❌ | ❌ | specs/business/requirements/functional-requirements.md |
| 16 | Status moves are limited to: Unconfirmed to Confirmed, Arrived or Cancelled; Confirmed to Arrived, No-show or Cancelled; Arrived to Complete | ✅ | ❌ | specs/business/requirements/functional-requirements.md |
| 17 | An appointment can only be completed when its visit note is signed. | ✅ | ✅ | specs/business/requirements/functional-requirements.md |
| 18 | A note can be written once the patient is Arrived, and has a required summary of up to 2000 characters. | ✅ | ✅ | specs/business/requirements/functional-requirements.md |
| 19 | A note is a Draft until it is signed; a signed note cannot be changed. | ✅ | ✅ | specs/business/requirements/functional-requirements.md |
| 20 | For the chosen day, show counts of booked (not cancelled), waiting to confirm, arrived, completed and no-shows. | ✅ | ✅ | specs/business/requirements/functional-requirements.md |
| 21 | List the day's appointments in time order, each with the actions its status allows. | ✅ | ✅ | specs/business/requirements/functional-requirements.md |
| 22 | For each therapist show the next free 30-minute slot, or that there is none. | ✅ | ❌ | specs/business/requirements/functional-requirements.md |
