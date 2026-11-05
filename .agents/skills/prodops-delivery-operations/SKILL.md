---
name: prodops-delivery-operations
description: Prepare a ProdOps project for release and operation: environments, CI, deployment, rollback, monitoring, backups and a go-live checklist. Use when requirements, design and build are done and the product needs to ship or be handed to operators.
---

# ProdOps delivery and operations

Keep it small. A first release needs a repeatable way to ship, a way back, and a way to know it broke.

## Steps

1. **Environments.** Name them (local, preview, production), what differs, and where configuration lives. Secrets are never committed.
2. **Pipeline.** On every change: install, type-check, test, build. Deploy only from the main branch after those pass.
3. **Release.** Write the exact steps to ship and the exact steps to roll back, and say how long each takes. A rollback you have not tried is a guess.
4. **Monitoring.** Decide what a person is told when something breaks: errors, availability, one business signal (for example "bookings created today").
5. **Data.** Backups, restore test, retention, and who can read personal data.
6. **Go-live checklist.** Tests green, rollback tried, monitoring alert tested, docs updated, owner named, support route known.
7. **After release.** Watch the first day, write what was learned in the milestone log, and file follow-ups as new scope.

## Rules

- Prefer boring, managed hosting over clever infrastructure.
- Every alert has an owner and a first action.
