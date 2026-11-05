---
name: prodops-product-workflow
description: Run the business-analysis side of a ProdOps project: turn a brief into vision, stakeholders, user stories, requirements and scope with an explicit in-scope and out-of-scope list. Use when a ProdOps project has a brief but no approved requirements, or when scope is being argued about.
---

# ProdOps product workflow

Work in the order ProdOps uses. Each step writes files under `specs/business/<step>/` and ends with a human decision. Do not skip ahead and do not approve a step yourself.

1. **Vision and outcomes.** Restate the brief in plain words. Name who it is for, the problem, and one measurable outcome. Ask one question at a time if the brief is missing any of these. Never invent users or numbers; mark guesses `ASSUMPTION:`.
2. **Discovery and stakeholders.** List who is affected, what each wants, and who can say no.
3. **User stories.** One line each: as a ‹person›, I want ‹action› so that ‹outcome›. Add acceptance criteria that a tester could check.
4. **Requirements and scope.** Split into business, functional and design requirements. Every requirement is testable. Write `specs/business/scope/scope.md` with `## In scope`, `## Out of scope` and one `## Feature: Name` section per feature, with `In:` and `Out:` lines. The order of the list is the build order.
5. **Review.** Read the files back to the user, list every assumption, and stop for approval.

## Rules

- Out of scope is as important as in scope. If nothing is listed as out, ask what the user is tempted to add.
- Prefer fewer features that are finished over many that are sketched.
- When a requirement changes after design or build started, say which downstream steps need another look.
- For a long guided interview that produces a PRD and milestone prompts, hand over to the `bm-prd-creator` skill.
