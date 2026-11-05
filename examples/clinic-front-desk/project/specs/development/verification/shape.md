# Verification & regression

> **Local template draft.** Generated in your browser from the brief by the ProdOps compiler. No AI model was used and nothing was validated with real users. Replace anything that does not fit before approval.

Suggested from the **Clinic operations** pattern. If entities, sections or personas below do not fit your product, rename or delete them; pick a different pattern if the match is wrong.

## Checks per section
### Front desk
- The overview renders its headline numbers from one request.
- Clicking a stat navigates to the filtered collection that produced it.
- A record dated on the last day of the month appears in the correct cell.
- Changing the displayed month does not lose the selected record.
- Front desk: a user with the Viewer role can read but cannot mutate schedule.
- Front desk: the section is reachable from the primary navigation and highlights when active.

### Patients
- Opening the collection shows the first page of records, newest first, with a visible total.
- Applying a status filter updates the URL and the row count together.
- Opening a record by direct URL renders the correct primary field.
- An unknown id shows a not-found state with a link back to the collection.
- Submitting an empty required field shows an inline error and keeps focus in the form.
- A failed save preserves all typed values and offers a retry.
- Patients: a user with the Viewer role can read but cannot mutate patients.
- Patients: the section is reachable from the primary navigation and highlights when active.

### Appointments
- A record dated on the last day of the month appears in the correct cell.
- Changing the displayed month does not lose the selected record.
- Opening the collection shows the first page of records, newest first, with a visible total.
- Applying a status filter updates the URL and the row count together.
- Submitting an empty required field shows an inline error and keeps focus in the form.
- A failed save preserves all typed values and offers a retry.
- Appointments: a user with the Viewer role can read but cannot mutate schedule.
- Appointments: the section is reachable from the primary navigation and highlights when active.

### Clinical notes
- Queue items are ordered by risk and each shows its reason.
- Pressing J then K moves focus forward and back without using the mouse.
- Opening a record by direct URL renders the correct primary field.
- An unknown id shows a not-found state with a link back to the collection.
- Clinical notes: a user with the Viewer role can read but cannot mutate encounters.
- Clinical notes: the section is reachable from the primary navigation and highlights when active.

## Release gate
- Tests green, accessibility pass, no placeholder content
