/** Outlines are headings and questions only. They contain no sample answers. */
import type { FileItem } from './model'

export const OUTLINE_MARK = '> Outline — write under each heading, then delete this line.'

export function outlineFiles(prefix: string, label: string, purpose: string): FileItem[] {
  return [
    { path: prefix + 'shape.md', content: `# ${label}\n\n${OUTLINE_MARK}\n\n## Goal and scope\nWhat is this step for (${purpose.replace(/\.$/, '')}), and what is out of scope?\n\n## Requirements or decisions\nWhat work is needed, who is it for, and what result do they get?\n\n## Acceptance criteria\nHow will the team know this is done?\n` },
    { path: prefix + 'references.md', content: `# References\n\n${OUTLINE_MARK}\n\nWhich briefs, source materials or related work does this rely on?\n` },
    { path: prefix + 'standards.md', content: `# Standards\n\n${OUTLINE_MARK}\n\nWhich rules were supplied, and which points are only assumptions?\n` },
    { path: prefix + 'plan.md', content: `# ${label} plan\n\n${OUTLINE_MARK}\n\nWhat are the actions, their order, dependencies and owner? How will the result be checked?\n` },
  ]
}

/** Empty outlines for the three requirement files, so a new project shows where requirements go. */
export function starterRequirements(): FileItem[] {
  return [
    { path: 'specs/business/requirements/business-requirements.md', content: `# Business requirements\n\n${OUTLINE_MARK}\n\n## Business problem\nWhat problem does this solve, and for whom?\n\n## Outcomes\nWhat will be different when it works, and how will you measure it?\n\n## Constraints\nWhat limits time, money, people or rules?\n` },
    { path: 'specs/business/requirements/functional-requirements.md', content: `# Functional requirements\n\n${OUTLINE_MARK}\n\nList what the product must do, one numbered line each. Each line should be something a tester can check.\n` },
    { path: 'specs/design/screens/design-requirements.md', content: `# Design requirements\n\n${OUTLINE_MARK}\n\nWhich screens are needed, what is the one main action on each, and which states (empty, error, loading) matter?\n` },
  ]
}
