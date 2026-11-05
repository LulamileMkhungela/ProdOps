# Discovery & stakeholders

> **Local template draft.** Generated in your browser from the brief by the ProdOps compiler. No AI model was used and nothing was validated with real users. Replace anything that does not fit before approval.

Suggested from the **Clinic operations** pattern. If entities, sections or personas below do not fit your product, rename or delete them; pick a different pattern if the match is wrong.

## Who is involved
| Stakeholder | Interest | Concern to resolve |
| --- | --- | --- |
| Sister Dlamini — Practice Manager | Fill the day and stop the no-show leak | Phones ring at the front desk while the queue grows |
| Dr. Naidoo — Clinician | Finish notes in the room, not at 8pm | Templates do not match how she actually writes |

## Integrations and outside parties
- WhatsApp Business
- HL7 / FHIR
- Stripe
- Xero
- Twilio SMS

## Constraints to confirm
- Budget, timeline and team size
- Regulatory or privacy obligations for the data listed in the data step
- Existing systems that must keep working

## Risks and mitigations
| Risk | Mitigation |
| --- | --- |
| Notification fatigue kills adoption in week two | Default to a single daily digest and require an explicit opt-in per alert type. |
| Reporting is built before the workflow is used | Gate analytics behind two weeks of real usage; instrument events first. |
| Data migration becomes the real launch blocker | Ship an import dry-run that reports rejected rows before anyone commits to cut-over. |
| The clinic operations category is crowded above and below this price point | Win on operational depth rather than feature count. |

## Open questions
- Who signs off, and by when?
- Which stakeholder disagrees most with the vision?
