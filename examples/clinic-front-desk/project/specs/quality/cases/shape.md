# Acceptance & test cases

> **Local template draft.** Generated in your browser from the brief by the ProdOps compiler. No AI model was used and nothing was validated with real users. Replace anything that does not fit before approval.

Suggested from the **Clinic operations** pattern. If entities, sections or personas below do not fit your product, rename or delete them; pick a different pattern if the match is wrong.

## Front desk
| # | Case | Type |
| --- | --- | --- |
| 1 | The overview renders its headline numbers from one request. | happy |
| 2 | Clicking a stat navigates to the filtered collection that produced it. | happy |
| 3 | A record dated on the last day of the month appears in the correct cell. | happy |
| 4 | Changing the displayed month does not lose the selected record. | happy |
| 5 | Front desk: a user with the Viewer role can read but cannot mutate schedule. | happy |
| 6 | Front desk: the section is reachable from the primary navigation and highlights when active. | happy |
| — | Day at a glance: Loading — Skeleton rows matching final layout; no spinner over the whole page. | state |
| — | Day at a glance: Empty — Zero-state explains what a appointment is and offers the primary create action. | state |
| — | Day at a glance: Error — Inline retry with the failed request named; cached data stays visible. | state |
| — | Day at a glance: Permission — Read-only view for viewers, with the create action hidden rather than disabled. | state |
| — | Schedule: Loading — Skeleton rows matching final layout; no spinner over the whole page. | state |
| — | Schedule: Empty — Zero-state explains what a appointment is and offers the primary create action. | state |
| — | Schedule: Error — Inline retry with the failed request named; cached data stays visible. | state |
| — | Schedule: Permission — Read-only view for viewers, with the create action hidden rather than disabled. | state |

## Patients
| # | Case | Type |
| --- | --- | --- |
| 1 | Opening the collection shows the first page of records, newest first, with a visible total. | happy |
| 2 | Applying a status filter updates the URL and the row count together. | happy |
| 3 | Opening a record by direct URL renders the correct primary field. | happy |
| 4 | An unknown id shows a not-found state with a link back to the collection. | happy |
| 5 | Submitting an empty required field shows an inline error and keeps focus in the form. | happy |
| 6 | A failed save preserves all typed values and offers a retry. | happy |
| 7 | Patients: a user with the Viewer role can read but cannot mutate patients. | happy |
| 8 | Patients: the section is reachable from the primary navigation and highlights when active. | happy |
| — | Patient index: Loading — Skeleton rows matching final layout; no spinner over the whole page. | state |
| — | Patient index: Empty — Zero-state explains what a patient is and offers the primary create action. | state |
| — | Patient index: Error — Inline retry with the failed request named; cached data stays visible. | state |
| — | Patient index: Permission — Read-only view for viewers, with the create action hidden rather than disabled. | state |
| — | Patient record: Loading — Skeleton rows matching final layout; no spinner over the whole page. | state |
| — | Patient record: Empty — Zero-state explains what a patient is and offers the primary create action. | state |
| — | Patient record: Error — Inline retry with the failed request named; cached data stays visible. | state |
| — | Patient record: Permission — Read-only view for viewers, with the create action hidden rather than disabled. | state |
| — | Register a patient: Loading — Skeleton rows matching final layout; no spinner over the whole page. | state |
| — | Register a patient: Empty — Zero-state explains what a patient is and offers the primary create action. | state |
| — | Register a patient: Error — Inline retry with the failed request named; cached data stays visible. | state |
| — | Register a patient: Permission — Read-only view for viewers, with the create action hidden rather than disabled. | state |

## Appointments
| # | Case | Type |
| --- | --- | --- |
| 1 | A record dated on the last day of the month appears in the correct cell. | happy |
| 2 | Changing the displayed month does not lose the selected record. | happy |
| 3 | Opening the collection shows the first page of records, newest first, with a visible total. | happy |
| 4 | Applying a status filter updates the URL and the row count together. | happy |
| 5 | Submitting an empty required field shows an inline error and keeps focus in the form. | happy |
| 6 | A failed save preserves all typed values and offers a retry. | happy |
| 7 | Appointments: a user with the Viewer role can read but cannot mutate schedule. | happy |
| 8 | Appointments: the section is reachable from the primary navigation and highlights when active. | happy |
| — | Diary: Loading — Skeleton rows matching final layout; no spinner over the whole page. | state |
| — | Diary: Empty — Zero-state explains what a appointment is and offers the primary create action. | state |
| — | Diary: Error — Inline retry with the failed request named; cached data stays visible. | state |
| — | Diary: Permission — Read-only view for viewers, with the create action hidden rather than disabled. | state |
| — | Appointment list: Loading — Skeleton rows matching final layout; no spinner over the whole page. | state |
| — | Appointment list: Empty — Zero-state explains what a appointment is and offers the primary create action. | state |
| — | Appointment list: Error — Inline retry with the failed request named; cached data stays visible. | state |
| — | Appointment list: Permission — Read-only view for viewers, with the create action hidden rather than disabled. | state |
| — | Book an appointment: Loading — Skeleton rows matching final layout; no spinner over the whole page. | state |
| — | Book an appointment: Empty — Zero-state explains what a appointment is and offers the primary create action. | state |
| — | Book an appointment: Error — Inline retry with the failed request named; cached data stays visible. | state |
| — | Book an appointment: Permission — Read-only view for viewers, with the create action hidden rather than disabled. | state |

## Clinical notes
| # | Case | Type |
| --- | --- | --- |
| 1 | Queue items are ordered by risk and each shows its reason. | happy |
| 2 | Pressing J then K moves focus forward and back without using the mouse. | happy |
| 3 | Opening a record by direct URL renders the correct primary field. | happy |
| 4 | An unknown id shows a not-found state with a link back to the collection. | happy |
| 5 | Clinical notes: a user with the Viewer role can read but cannot mutate encounters. | happy |
| 6 | Clinical notes: the section is reachable from the primary navigation and highlights when active. | happy |
| — | Notes to finish: Loading — Skeleton rows matching final layout; no spinner over the whole page. | state |
| — | Notes to finish: Empty — Zero-state explains what a encounter is and offers the primary create action. | state |
| — | Notes to finish: Error — Inline retry with the failed request named; cached data stays visible. | state |
| — | Notes to finish: Permission — Read-only view for viewers, with the create action hidden rather than disabled. | state |
| — | Encounter note: Loading — Skeleton rows matching final layout; no spinner over the whole page. | state |
| — | Encounter note: Empty — Zero-state explains what a encounter is and offers the primary create action. | state |
| — | Encounter note: Error — Inline retry with the failed request named; cached data stays visible. | state |
| — | Encounter note: Permission — Read-only view for viewers, with the create action hidden rather than disabled. | state |

## Failure paths
- First run to first value: Empty tables with no example path back into creation.
- Daily core loop: A record is edited twice because the first change gave no feedback.
- Exception and recovery: An item can be marked resolved without its upstream state changing.
- Set up the workspace: Settings save silently and the invite goes out with the wrong role.
