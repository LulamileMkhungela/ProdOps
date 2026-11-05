# Quality strategy

> **Local template draft.** Generated in your browser from the brief by the ProdOps compiler. No AI model was used and nothing was validated with real users. Replace anything that does not fit before approval.

Suggested from the **Clinic operations** pattern. If entities, sections or personas below do not fit your product, rename or delete them; pick a different pattern if the match is wrong.

## Risk-based focus
| Risk | Test emphasis |
| --- | --- |
| Notification fatigue kills adoption in week two | Default to a single daily digest and require an explicit opt-in per alert type. |
| Reporting is built before the workflow is used | Gate analytics behind two weeks of real usage; instrument events first. |
| Data migration becomes the real launch blocker | Ship an import dry-run that reports rejected rows before anyone commits to cut-over. |
| The clinic operations category is crowded above and below this price point | Win on operational depth rather than feature count. |

## Levels
- Unit for rules and calculations, integration for data, end-to-end for the journeys below

## Entry and exit
- Entry: requirements approved. Exit: no open failures on must-have requirements.
