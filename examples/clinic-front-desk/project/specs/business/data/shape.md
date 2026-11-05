# Business data & rules

> **Local template draft.** Generated in your browser from the brief by the ProdOps compiler. No AI model was used and nothing was validated with real users. Replace anything that does not fit before approval.

Suggested from the **Clinic operations** pattern. If entities, sections or personas below do not fit your product, rename or delete them; pick a different pattern if the match is wrong.

## Entities
### Patient
A person receiving care, with contact, cover and visit history.

| Field | Type | Required | Note |
| --- | --- | --- | --- |
| name | text | yes | Plain text, maximum 500 characters unless specified. |
| phone | phone | yes | E.164 formatted where possible. |
| email | email | yes | Validated email address, used for notifications. |
| status | status | yes | One of: Active · New · Recall due · Inactive |
| cover | tag | yes | Medical aid or self-pay |
| lastVisit | date | yes | Calendar date; rendered in the workspace timezone. |
| visits | number | yes | Plain text, maximum 500 characters unless specified. |

### Appointment
A booked consultation slot with confirmation and arrival state.

| Field | Type | Required | Note |
| --- | --- | --- | --- |
| patient | relation | yes | Links to Patient; enforced as a foreign key. |
| clinician | relation | yes | Links to Clinician; enforced as a foreign key. |
| time | date | yes | Calendar date; rendered in the workspace timezone. |
| kind | status | yes | One of: Consult · Follow-up · Procedure · Telehealth |
| status | status | yes | One of: Confirmed · Unconfirmed · Arrived · Completed · No-show · Cancelled |
| room | text | yes | Plain text, maximum 500 characters unless specified. |
| duration | number | yes | Minutes |

### Clinician
A practitioner with specialty, rooms and weekly availability.

| Field | Type | Required | Note |
| --- | --- | --- | --- |
| name | text | yes | Plain text, maximum 500 characters unless specified. |
| specialty | tag | yes | Free-form label drawn from a controlled vocabulary. |
| status | status | yes | One of: On duty · Off duty · On leave |
| rooms | text | yes | Plain text, maximum 500 characters unless specified. |
| patientsToday | number | yes | Plain text, maximum 500 characters unless specified. |
| utilisation | percent | yes | Whole percentage, 0–100. |

### Encounter
A clinical note tied to an appointment, with coding and closure state.

| Field | Type | Required | Note |
| --- | --- | --- | --- |
| summary | text | yes | Plain text, maximum 500 characters unless specified. |
| patient | relation | yes | Links to Patient; enforced as a foreign key. |
| appointment | relation | yes | Links to Appointment; enforced as a foreign key. |
| status | status | yes | One of: Draft · Signed · Amended · Awaiting review |
| signedAt | date | yes | Calendar date; rendered in the workspace timezone. |
| code | text | yes | Procedure or tariff code |

### Claim
A billing submission with scheme, amount and rejection reason.

| Field | Type | Required | Note |
| --- | --- | --- | --- |
| reference | text | yes | Plain text, maximum 500 characters unless specified. |
| patient | relation | yes | Links to Patient; enforced as a foreign key. |
| scheme | tag | yes | Free-form label drawn from a controlled vocabulary. |
| amount | money | yes | Currency amount, stored as numeric(14,2). |
| status | status | yes | One of: Draft · Submitted · Paid · Rejected · Resubmitted |
| submitted | date | yes | Calendar date; rendered in the workspace timezone. |

## Relationships
| From | To | Kind | Meaning |
| --- | --- | --- | --- |
| appointments | patients | 1:N | Patient has many schedule |
| appointments | clinicians | 1:N | Clinician has many schedule |
| notes | patients | 1:N | Patient has many encounters |
| notes | appointments | 1:N | Appointment has many encounters |
| claims | patients | 1:N | Patient has many claims |

## Business rules
- Every table carries a uuid primary key plus created_at / updated_at timestamptz columns.
- 5 foreign keys resolved from the 5 core entities; nothing is denormalised until a query proves it necessary.
- Status columns are text with a check constraint rather than enums, so new states ship without a migration lock.
- Money is numeric(14,2), never floating point. Percentages are smallint (0–100), never fractions.
- Soft deletes (deleted_at timestamptz) are used on patients, schedule, clinicians; everything else is hard-deleted.
- Suggest indexes on every status and date column used by the workspace queue.

## Status journeys
- **Patient** moves through: Active → New → Recall due → Inactive
- **Appointment** moves through: Confirmed → Unconfirmed → Arrived → Completed → No-show → Cancelled
- **Clinician** moves through: On duty → Off duty → On leave
- **Encounter** moves through: Draft → Signed → Amended → Awaiting review
- **Claim** moves through: Draft → Submitted → Paid → Rejected → Resubmitted
