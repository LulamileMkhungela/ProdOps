# Vision & outcomes

> **Local template draft.** Generated in your browser from the brief by the ProdOps compiler. No AI model was used and nothing was validated with real users. Replace anything that does not fit before approval.

Suggested from the **Clinic operations** pattern. If entities, sections or personas below do not fit your product, rename or delete them; pick a different pattern if the match is wrong.

## In your words
> A front-desk tool for a small physiotherapy clinic. The receptionist registers patients, books appointments without double-booking a therapist, and therapists write short visit notes. The clinic owner sees the day at a glance and no-shows drop.

## Vision
Care that keeps its own calendar.

Clinic Works is a healthcare workspace for small physiotherapy clinic. The failure it is built to stop: no-shows go unmanaged.

## Problems worth solving
### No-shows go unmanaged
Appointments are booked but not confirmed, and empty slots are never backfilled.

**Cost of leaving it:** 15–25% of clinical capacity lost

### Notes are written after hours
Clinical documentation competes with the next patient, so it is either rushed or unpaid overtime.

**Cost of leaving it:** Clinician burnout and compliance risk

### Billing lags the visit
Codes and claims are reconstructed days later from memory, and revenue quietly leaks.

**Cost of leaving it:** Delayed cash and rejected claims

## Outcomes and measures
| Measure | Target | Why it matters |
| --- | --- | --- |
| No-show rate | < 8% | Capacity is the constraint |
| Note completion same day | ≥ 95% of visits | Compliance and clinician sanity |
| Claim clean rate | ≥ 97% first pass | Rejections cost weeks of cash |
| Check-in time | < 90 seconds | Front desk throughput |

## What makes it different
- **Frictionless confirmation** — Every booking carries a confirmation state, with automatic slot backfill from a waitlist.
- **Note templates by visit type** — Structured, fast, specialty-aware notes that pre-fill from the appointment context.
- **Visit-to-claim continuity** — The billing line is created from the encounter, not re-typed a week later.

## Not in scope
- Full EHR certification
- Radiology or imaging storage
- Insurance clearing-house ownership
- A public API beyond the internal integration layer
