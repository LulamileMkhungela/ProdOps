# Functional requirements

> Drafted by ProdOps from the brief, then edited by hand. Each line can be checked by a test.

## Patients
1. A patient needs a name, a phone number and an email address; leading and trailing spaces are removed.
2. A phone number uses digits with an optional leading plus, spaces, brackets or hyphens, and has at least 7 digits.
3. An email address is registered once; the comparison ignores upper and lower case.
4. A new patient has the status New; it becomes Active when their first appointment is completed.
5. The patient list can be searched by name, phone or email and filtered by status (New or Active).

## Appointments
6. A booking has a patient, a therapist, a date, a start time, a length of 30, 45 or 60 minutes and a kind of visit.
7. The clinic is open from 08:00 to 17:00; a booking must end by 17:00.
8. A booking is refused when it overlaps an active booking for the same therapist, and the message names the clashing time.
9. A booking is refused when it overlaps an active booking for the same patient.
10. A new booking is Unconfirmed.
11. Status moves are limited to: Unconfirmed to Confirmed, Arrived or Cancelled; Confirmed to Arrived, No-show or Cancelled; Arrived to Completed.
12. An appointment can only be completed when its visit note is signed.

## Visit notes
13. A note can be written once the patient is Arrived, and has a required summary of up to 2000 characters.
14. A note is a Draft until it is signed; a signed note cannot be changed.

## Front desk
15. For the chosen day, show counts of booked (not cancelled), waiting to confirm, arrived, completed and no-shows.
16. List the day's appointments in time order, each with the actions its status allows.
17. For each therapist show the next free 30-minute slot, or that there is none.
