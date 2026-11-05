# Journeys & flows

> **Local template draft.** Generated in your browser from the brief by the ProdOps compiler. No AI model was used and nothing was validated with real users. Replace anything that does not fit before approval.

Suggested from the **Clinic operations** pattern. If entities, sections or personas below do not fit your product, rename or delete them; pick a different pattern if the match is wrong.

## First run to first value
**Persona:** Sister Dlamini · **Goal:** Fill the day and stop the no-show leak

| # | Step | Kind | Screen |
| --- | --- | --- | --- |
| 1 | Land on Day at a glance — Answer "what needs attention right now" across schedule in under ten seconds. | entry | overview-appointments |
| 2 | Start the primary job — The clearest “do the thing” affordance leads into Patients. | step | editor-patients |
| 3 | Choose an example or start blank — Pre-filled sample data makes the first screen legible without onboarding copy. | decision | collection-patients |
| 4 | See the result on Encounter note — Hold the complete story of one encounter — fields, history and related records. | exit | detail-notes |

**Edge case to design:** Empty tables with no example path back into creation.

## Daily core loop
**Persona:** Dr. Naidoo · **Goal:** Finish notes in the room, not at 8pm

| # | Step | Kind | Screen |
| --- | --- | --- | --- |
| 1 | Scan Patient index — Find, filter and act on any patient without leaving the list. | entry | collection-patients |
| 2 | Open a record — Detail arrives in a drawer so the queue keeps its place. | step | editor-patients |
| 3 | Change status in Register a patient — One state change per action, with the consequence written next to it. | step | editor-patients |
| 4 | Check Encounter note — The loop closes on evidence, not on a success toast. | exit | detail-notes |

**Edge case to design:** A record is edited twice because the first change gave no feedback.

## Exception and recovery
**Persona:** Dr. Naidoo · **Goal:** Find what is stuck before a customer does.

| # | Step | Kind | Screen |
| --- | --- | --- | --- |
| 1 | Open Notes to finish — Clear the queue in risk order with keyboard-first controls. | entry | inbox-notes |
| 2 | Filter to the exception — Status filters are saved views, not ad-hoc typing. | step | inbox-notes |
| 3 | Decide: retry, escalate or close — Each branch is a real state with an owner. | decision | editor-patients |
| 4 | Confirm on Patient index — The record leaves the exception view only when the state actually changed. | exit | collection-patients |

**Edge case to design:** An item can be marked resolved without its upstream state changing.

## Set up the workspace
**Persona:** Dr. Naidoo · **Goal:** Make the product fit this team before inviting anyone.

| # | Step | Kind | Screen |
| --- | --- | --- | --- |
| 1 | Open Encounter note — Hold the complete story of one encounter — fields, history and related records. | entry | detail-notes |
| 2 | Define the fields this team actually uses — Custom fields are data, not code. | step | detail-notes |
| 3 | Connect WhatsApp Business — Integrations are scoped to one job each. | step | detail-notes |
| 4 | Invite the first operator — Roles are decided before the invite is sent. | exit | detail-notes |

**Edge case to design:** Settings save silently and the invite goes out with the wrong role.
