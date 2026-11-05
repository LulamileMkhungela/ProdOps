---
name: prodops-quality-engineering
description: Plan and write tests for a ProdOps project: a test strategy, cases traced to requirements, negative and edge cases, and a regression checklist per milestone. Use after requirements and design exist, or at the end of every build milestone.
---

# ProdOps quality engineering

Every requirement gets at least one test case, and every test case names the requirement it checks. Untested requirements are listed, not hidden.

## Steps

1. **Strategy.** Decide what is tested at which level: unit for logic, integration for data and APIs, end-to-end for the few journeys that must never break. Write down what is deliberately not tested and why.
2. **Cases.** One table per feature: id, requirement, steps, expected result. Include the failure path for every happy path: empty input, too long, duplicate, no permission, offline, slow response.
3. **Data.** Say what test data is needed. Never use real personal data.
4. **Accessibility and phone checks.** Keyboard only, a screen-reader pass on the main flow, and a 390px-wide pass.
5. **Regression list.** After each milestone, re-run the previous milestone's cases and record results in the milestone log.
6. **Defects.** Log what, where, how to reproduce, and severity. Do not mark a milestone done with an open severe defect.

## Rules

- A test that cannot fail is not a test. Show it failing once before trusting it.
- Test behaviour a person sees, not implementation details.
- Keep the run fast enough that people run it.
