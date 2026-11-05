# Personas & needs

> **Local template draft.** Generated in your browser from the brief by the ProdOps compiler. No AI model was used and nothing was validated with real users. Replace anything that does not fit before approval.

Suggested from the **Clinic operations** pattern. If entities, sections or personas below do not fit your product, rename or delete them; pick a different pattern if the match is wrong.

## Personas
### Sister Dlamini — Practice Manager
- **Segment:** small physiotherapy clinic
- **Goal:** Fill the day and stop the no-show leak
- **Pain:** Phones ring at the front desk while the queue grows
- **In their words:** ““A front-desk tool for a small physiotherapy clinic” — the description this brief was compiled from.”
- _Illustrative persona, synthesised by the compiler. Validate with three real interviews before locking scope._

### Dr. Naidoo — Clinician
- **Segment:** Sees 18–26 patients a day
- **Goal:** Finish notes in the room, not at 8pm
- **Pain:** Templates do not match how she actually writes
- **In their words:** “If the note takes longer than the consult, the tool is the problem.”
- _Illustrative persona, synthesised by the compiler. Validate with three real interviews before locking scope._

## Jobs to be done
- When a recall needs attention, I want to see why it is flagged so I can decide in seconds.
- When a practice manager asks for an update, I want to answer without leaving the record.
- When the day starts, I want a ranked list of what matters so I do not rebuild context from scratch.
- When a deadline approaches, I want a warning before it becomes an incident.

## Journeys
### First run to first value
Sister Dlamini wants to **Fill the day and stop the no-show leak**. Trigger: A new account lands with no records of its own.

1. Land on Day at a glance — Answer "what needs attention right now" across schedule in under ten seconds.
2. Start the primary job — The clearest “do the thing” affordance leads into Patients.
3. Choose an example or start blank — Pre-filled sample data makes the first screen legible without onboarding copy.
4. See the result on Encounter note — Hold the complete story of one encounter — fields, history and related records.

- **Success:** The first real record exists and Encounter note reflects it.
- **Failure:** Empty tables with no example path back into creation.

### Daily core loop
Dr. Naidoo wants to **Finish notes in the room, not at 8pm**. Trigger: A shift starts and the queue is already busy.

1. Scan Patient index — Find, filter and act on any patient without leaving the list.
2. Open a record — Detail arrives in a drawer so the queue keeps its place.
3. Change status in Register a patient — One state change per action, with the consequence written next to it.
4. Check Encounter note — The loop closes on evidence, not on a success toast.

- **Success:** Patient index is shorter at the end of the shift than at the start.
- **Failure:** A record is edited twice because the first change gave no feedback.

### Exception and recovery
Dr. Naidoo wants to **Find what is stuck before a customer does.**. Trigger: A status stops moving for longer than its own threshold.

1. Open Notes to finish — Clear the queue in risk order with keyboard-first controls.
2. Filter to the exception — Status filters are saved views, not ad-hoc typing.
3. Decide: retry, escalate or close — Each branch is a real state with an owner.
4. Confirm on Patient index — The record leaves the exception view only when the state actually changed.

- **Success:** The exception queue reaches zero without a second ticket.
- **Failure:** An item can be marked resolved without its upstream state changing.

### Set up the workspace
Dr. Naidoo wants to **Make the product fit this team before inviting anyone.**. Trigger: Trial started, no integrations connected.

1. Open Encounter note — Hold the complete story of one encounter — fields, history and related records.
2. Define the fields this team actually uses — Custom fields are data, not code.
3. Connect WhatsApp Business — Integrations are scoped to one job each.
4. Invite the first operator — Roles are decided before the invite is sent.

- **Success:** A teammate accepts the invite and lands on the same data.
- **Failure:** Settings save silently and the invite goes out with the wrong role.
