/**
 * Instant draft: a step's four spec files, written locally.
 *
 * No model is called and no network request is made. The brief is run through
 * the ProdOps compiler (`src/engine`), which proposes a product pattern with
 * entities, sections, flows, tokens and a roadmap; this module lays that out as
 * the step's Markdown. The result is a structured starting point that quotes
 * the brief and is labelled as a local template draft, never as AI output or as
 * validated work.
 */
import { specPrefix, workflows, type Role } from '../workflows'
import type { FileItem, StudioProject } from '../model'
import type { Project } from '../../types'

export const DRAFT_NOTE = '> **Local template draft.** Generated in your browser from the brief by the ProdOps compiler. No AI model was used and nothing was validated with real users. Replace anything that does not fit before approval.'

export interface DraftOptions { archetypeId?: string }
export interface Pattern { id: string; label: string }

/** The compiler's product patterns, for a "starting pattern" picker. */
export async function patterns(): Promise<Pattern[]> {
  const { ARCHETYPES } = await import('../../engine')
  return ARCHETYPES.map(a => ({ id: a.id, label: a.label }))
}

export async function compileBrief(brief: string, options: DraftOptions = {}): Promise<Project> {
  const { compileProject, seedFrom } = await import('../../engine')
  return compileProject({ idea: brief, seed: seedFrom(brief), archetypeId: options.archetypeId, now: 0, createdAt: 0 })
}

const bullets = (items: string[]) => (items.length ? items.map(i => `- ${i}`).join('\n') : '- _None identified yet._')
const numbered = (items: string[]) => items.map((item, i) => `${i + 1}. ${item}`).join('\n')
const table = (head: string[], rows: string[][]) => [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map(r => `| ${r.map(c => String(c).replace(/\|/g, '\\|').replace(/\n/g, ' ')).join(' | ')} |`)].join('\n')

/** The original wording, quoted, so the draft never drifts from what the person wrote. */
const quote = (brief: string) => brief.trim().split('\n').slice(0, 14).map(l => `> ${l}`).join('\n')

type Builder = (p: Project, brief: string) => string

const fieldRow = (f: { name: string; type: string; required: boolean; note: string }) => [f.name, f.type, f.required ? 'yes' : 'no', f.note]

const BODY: Record<string, Builder> = {
  'business/vision': (p, brief) => `## In your words\n${quote(brief)}\n\n## Vision\n${p.brief.tagline}\n\n${p.brief.elevator}\n\n## Problems worth solving\n${p.brief.problems.map(x => `### ${x.title}\n${x.detail}\n\n**Cost of leaving it:** ${x.cost}`).join('\n\n')}\n\n## Outcomes and measures\n${table(['Measure', 'Target', 'Why it matters'], p.brief.metrics.map(m => [m.label, m.target, m.why]))}\n\n## What makes it different\n${bullets(p.brief.differentiators.map(d => `**${d.title}** — ${d.detail}`))}\n\n## Not in scope\n${bullets(p.brief.nonGoals)}`,
  'business/discovery': (p) => `## Who is involved\n${table(['Stakeholder', 'Interest', 'Concern to resolve'], p.brief.personas.map(x => [`${x.name} — ${x.role}`, x.goal, x.pain]))}\n\n## Integrations and outside parties\n${bullets(p.brief.integrations)}\n\n## Constraints to confirm\n- Budget, timeline and team size\n- Regulatory or privacy obligations for the data listed in the data step\n- Existing systems that must keep working\n\n## Risks and mitigations\n${table(['Risk', 'Mitigation'], p.brief.risks.map(r => [r.risk, r.mitigation]))}\n\n## Open questions\n- Who signs off, and by when?\n- Which stakeholder disagrees most with the vision?`,
  'business/users': (p) => `## Personas\n${p.brief.personas.map(x => `### ${x.name} — ${x.role}\n- **Segment:** ${x.segment}\n- **Goal:** ${x.goal}\n- **Pain:** ${x.pain}\n- **In their words:** “${x.quote}”\n- _${x.quoteTruth}_`).join('\n\n')}\n\n## Jobs to be done\n${bullets(p.brief.jobs)}\n\n## Journeys\n${p.flows.map(f => `### ${f.name}\n${f.persona} wants to **${f.goal}**. Trigger: ${f.trigger}\n\n${numbered(f.steps.map(s => `${s.title} — ${s.detail}`))}\n\n- **Success:** ${f.success}\n- **Failure:** ${f.failure}`).join('\n\n')}`,
  'business/requirements': (p) => `## Scope for the first release\n${p.sections.filter(s => s.priority === 'MVP').map(s => `### ${s.name}\n${s.purpose}\n\n${table(['ID', 'Requirement', 'Priority'], s.requirements.map(r => [r.id, r.text, r.priority]))}`).join('\n\n')}\n\n## Later\n${bullets(p.sections.filter(s => s.priority !== 'MVP').map(s => `${s.name} (${s.priority}) — ${s.purpose}`))}\n\n## Explicitly out of scope\n${bullets([...p.brief.nonGoals, ...p.sections.flatMap(s => s.outOfScope)])}\n\n## Acceptance\n${bullets(p.sections.flatMap(s => s.screens.flatMap(sc => sc.acceptance)).slice(0, 12))}`,
  'business/data': (p) => `## Entities\n${p.data.entities.map(e => `### ${e.name}\n${e.description}\n\n${table(['Field', 'Type', 'Required', 'Note'], e.fields.map(fieldRow))}`).join('\n\n')}\n\n## Relationships\n${table(['From', 'To', 'Kind', 'Meaning'], p.data.relationships.map(r => [r.from, r.to, r.kind, r.label]))}\n\n## Business rules\n${bullets(p.data.notes)}\n\n## Status journeys\n${bullets(p.data.entities.filter(e => e.statusField).map(e => `**${e.name}** moves through: ${(e.fields.find(f => f.name === e.statusField)?.options ?? []).join(' → ')}`))}`,
  'business/roadmap': (p) => `${p.roadmap.sequencingNote}\n\n${p.roadmap.phases.map(ph => `## ${ph.name} · ${ph.horizon}\n**Goal:** ${ph.goal}\n\n${bullets(ph.outcomes)}\n\n**Main risk:** ${ph.risk}`).join('\n\n')}`,
  'business/handoff': (p, brief) => `## Decisions to confirm before design starts\n${bullets(p.sections.map(s => `Is **${s.name}** in the first release? (${s.priority})`))}\n\n## Unresolved questions\n- Which personas are validated and which are assumptions?\n- Which integrations are confirmed: ${p.brief.integrations.join(', ') || 'none listed'}?\n\n## Brief at handoff\n${quote(brief)}`,

  'design/research': (p) => `## What we think we know\n${bullets(p.brief.problems.map(x => x.title + ': ' + x.detail))}\n\n## What we need to learn\n${bullets(p.brief.personas.map(x => `Does “${x.pain}” match what ${x.role.toLowerCase()}s actually experience?`))}\n\n## Touchpoints\n${bullets(p.flows.map(f => `${f.name} — ${f.trigger}`))}\n\n## Plan\n- 3–5 short interviews per persona\n- One usability pass on the first journey`,
  'design/personas': (p) => BODY['business/users'](p, ''),
  'design/journeys': (p) => `${p.flows.map(f => `## ${f.name}\n**Persona:** ${f.persona} · **Goal:** ${f.goal}\n\n${table(['#', 'Step', 'Kind', 'Screen'], f.steps.map((s, i) => [String(i + 1), `${s.title} — ${s.detail}`, s.kind, s.screenId ?? '']))}\n\n**Edge case to design:** ${f.failure}`).join('\n\n')}`,
  'design/architecture': (p) => `## Navigation\n${bullets(p.design.layout.nav)}\n\n## Shell\n${p.design.layout.shell} layout, ${p.design.layout.density} density, content width ${p.design.layout.contentWidth}px.\n\n## Sections and routes\n${table(['Section', 'Screen', 'Route', 'Kind'], p.sections.flatMap(s => s.screens.map(sc => [s.name, sc.name, sc.route, sc.kind])))}`,
  'design/system': (p) => `## Direction\n${p.design.rationale}\n\n**Mood:** ${p.design.mood.join(', ')}\n\n## Colour\n${table(['Role', 'Base', 'Text on it'], p.design.colors.map(c => [c.name, c.base, c.contrastText]))}\n\n## Type\n${table(['Role', 'Family', 'Size', 'Use'], p.design.typography.map(t => [t.role, t.family, t.size, t.usage]))}\n\n## Shape and space\n- Radii: ${Object.entries(p.design.radii).map(([k, v]) => `${k} ${v}px`).join(', ')}\n- Cards: ${p.design.layout.cardStyle}; grid: ${p.design.layout.grid}\n\n## Components\n${bullets(p.design.components)}\n\n> Edit the live tokens in the Design system editor above; this file records the reasoning.`,
  'design/screens': (p) => p.sections.map(s => `## ${s.name}\n${s.screens.map(sc => `### ${sc.name} (${sc.route})\n${sc.intent}\n\n**Blocks:** ${sc.blocks.map(b => b.type).join(', ')}\n\n**States:** ${sc.states.map(x => `${x.name} — ${x.detail}`).join('; ')}\n\n**Acceptance**\n${bullets(sc.acceptance)}`).join('\n\n')}`).join('\n\n'),
  'design/validation': (p) => `## Tasks to test\n${p.flows.map((f, i) => `${i + 1}. ${f.persona}: ${f.goal}. Pass when: ${f.success}`).join('\n')}\n\n## Measures\n- Task success without help\n- Time on task\n- Where people hesitate\n\n## Participants\nThree people per persona; recruit outside the team.`,
  'design/handoff': (p) => `## Components to build\n${bullets(p.design.components)}\n\n## States every screen must show\n- Loading, empty, error, partial and success\n\n## Accessibility\n- Text contrast at least 4.5:1, focus visible, keyboard reachable, labels on every input\n\n## Responsive\n${table(['Breakpoint', 'Width'], p.design.breakpoints.map(b => [b.name, `${b.px}px`]))}`,

  'development/standards': (p) => `## Stack\n${table(['Layer', 'Choice', 'Why'], p.system.stack.map(s => [s.layer, `${s.choice} ${s.version}`, s.reason]))}\n\n## Standards to agree\n- Naming, folder layout and formatting\n- Test runner and coverage expectations\n- Review rules and branch policy\n\n> Record real existing patterns under references; do not invent them.`,
  'development/architecture': (p) => `## Stack\n${table(['Layer', 'Choice'], p.system.stack.map(s => [s.layer, `${s.choice} ${s.version}`]))}\n\n## Data layer\n${p.system.dataLayer.pattern}\n\n${bullets(p.system.dataLayer.separation)}\n\n## Modules\n${bullets(p.sections.map(s => `**${s.name}** — ${s.purpose}`))}`,
  'development/specification': (p) => p.sections.map(s => `## ${s.name}\n${s.purpose}\n\n${bullets(s.requirements.map(r => `\`${r.id}\` ${r.text} (${r.priority})`))}\n\n**Out of scope:** ${s.outOfScope.join('; ') || 'nothing recorded'}`).join('\n\n'),
  'development/database': (p) => `## Schema (PostgreSQL)\n\`\`\`sql\n${p.data.sql.trim()}\n\`\`\`\n\n## Migration notes\n- Create tables in dependency order; seed from the sample rows in the data step\n- Add indexes for every foreign key and every searched column\n- Plan reversible migrations`,
  'development/tasks': (p) => p.roadmap.phases.map(ph => `## ${ph.name}\n${ph.sectionIds.map(id => p.sections.find(s => s.id === id)).filter(Boolean).map(s => `- [ ] **${s!.name}** — build, wire data, write tests (${s!.tests.length} case(s) listed)`).join('\n')}\n${ph.outcomes.map(o => `- [ ] ${o}`).join('\n')}`).join('\n\n'),
  'development/implementation': (p) => `## Build order\n${numbered(['Foundation: tokens, shell, routing', ...p.sections.map(s => `${s.name}: screens, data, tests`)])}\n\n## Definition of done for each piece\n- Matches the design spec and tokens\n- Tests written first for success and failure paths\n- Reviewed and demoed`,
  'development/verification': (p) => `## Checks per section\n${p.sections.map(s => `### ${s.name}\n${bullets(s.tests)}`).join('\n\n')}\n\n## Release gate\n- Tests green, accessibility pass, no placeholder content`,
  'development/handoff': (p) => `## What is ready\n${bullets(p.sections.map(s => s.name))}\n\n## Known gaps\n- List anything not built, with the reason\n\n## Run it\n- Setup, test and deploy commands go here`,

  'quality/strategy': (p) => `## Risk-based focus\n${table(['Risk', 'Test emphasis'], p.brief.risks.map(r => [r.risk, r.mitigation]))}\n\n## Levels\n- Unit for rules and calculations, integration for data, end-to-end for the journeys below\n\n## Entry and exit\n- Entry: requirements approved. Exit: no open failures on must-have requirements.`,
  'quality/cases': (p) => p.sections.map(s => `## ${s.name}\n${table(['#', 'Case', 'Type'], [...s.tests.map((t, i) => [String(i + 1), t, 'happy']), ...s.screens.flatMap(sc => sc.states.map(st => ['—', `${sc.name}: ${st.name} — ${st.detail}`, 'state']))])}`).join('\n\n') + `\n\n## Failure paths\n${bullets(p.flows.map(f => `${f.name}: ${f.failure}`))}`,
  'quality/regression': (p) => `## Always re-run\n${bullets(p.flows.map(f => `${f.name} (${f.persona})`))}\n\n## Triggers\n- Any change to ${p.data.entities.slice(0, 3).map(e => e.name).join(', ')}\n- Any change to shared components or tokens`,
  'quality/execution': (p) => `## Run sheet\n${table(['Flow', 'Pass criteria', 'Result', 'Notes'], p.flows.map(f => [f.name, f.success, '', '']))}`,
  'quality/release': () => `## Release checklist\n- [ ] Must-have requirements verified\n- [ ] Failure paths verified\n- [ ] Accessibility checked\n- [ ] Known issues listed with owners\n- [ ] Rollback tested`,

  'delivery/planning': (p) => `## Releases\n${table(['Phase', 'Horizon', 'Goal'], p.roadmap.phases.map(x => [x.name, x.horizon, x.goal]))}\n\n## Dependencies\n${bullets(p.brief.integrations.map(i => `Access to ${i}`))}`,
  'delivery/risks': (p) => `${table(['Risk', 'Mitigation', 'Owner'], [...p.brief.risks.map(r => [r.risk, r.mitigation, '']), ...p.roadmap.phases.map(x => [x.risk, 'Review at phase start', ''])])}`,
  'delivery/release': () => `## Release plan\n1. Freeze scope and tag the build\n2. Run the quality release checklist\n3. Deploy to a staging environment and smoke-test\n4. Release gradually, watching the measures\n\n## Rollback\n- Keep the previous build deployable; revert on any must-have regression\n\n## Communication\n- Tell users what changed and who to contact`,
  'delivery/operations': () => `## Run\n- Monitoring and alerting for errors, latency and failed jobs\n- On-call owner and escalation path\n- Backups and restore tested\n\n## Support\n- Where users report problems and the target response time`,
  'delivery/measure': (p) => `## Success measures\n${table(['Measure', 'Target', 'Why'], p.brief.metrics.map(m => [m.label, m.target, m.why]))}\n\n## Review\n- Look at the measures two weeks and two months after release; feed what you learn into the next iteration brief`,
}

const UPSTREAM: Record<Role, string> = {
  business: 'the shared brief',
  design: 'the business requirements and the shared brief',
  development: 'the business requirements, the design requirements and the shared brief',
  quality: 'the business and functional requirements and the design requirements',
  delivery: 'the roadmap, the quality release checklist and the shared brief',
}

/** Files for one step. Throws if the brief is empty. */
export function draftFiles(project: StudioProject, compiled: Project, role: Role, stepId: string): FileItem[] {
  const brief = project.spec.trim()
  if (!brief) throw new Error('Add a brief or project context first; the draft is built from it.')
  const step = workflows[role].find(s => s.id === stepId)
  if (!step) throw new Error('Unknown step.')
  const prefix = specPrefix(role, stepId)
  const build = BODY[`${role}/${stepId}`]
  const body = build ? build(compiled, brief) : `## Purpose\n${step.purpose}\n\n## From the brief\n${quote(brief)}`
  const pattern = `Suggested from the **${compiled.archetypeLabel}** pattern. If entities, sections or personas below do not fit your product, rename or delete them; pick a different pattern if the match is wrong.`
  const files: FileItem[] = [
    { path: prefix + 'shape.md', content: `# ${step.label}\n\n${DRAFT_NOTE}\n\n${pattern}\n\n${body}\n` },
    { path: prefix + 'references.md', content: `# References\n\n${DRAFT_NOTE}\n\n- Shared brief (project context)\n- ${UPSTREAM[role]}\n- Compiler pattern: ${compiled.archetypeLabel}\n${project.references.filter(r => r.role === role && r.step === stepId).map(r => `- Attached: ${r.name}`).join('\n')}\n` },
    { path: prefix + 'standards.md', content: `# Standards\n\n${DRAFT_NOTE}\n\n${bullets([...compiled.brief.principles, 'Accessibility: contrast at least 4.5:1, keyboard reachable, labelled inputs', 'Write requirements as testable statements', 'Mark assumptions as assumptions'])}\n` },
    { path: prefix + 'plan.md', content: `# ${step.label} plan\n\n${DRAFT_NOTE}\n\n1. Read ${UPSTREAM[role]}.\n2. Answer: ${step.question}\n3. Edit \`shape.md\` until every line is true for your product.\n4. Check the readiness report in the Lab, then approve or request a revisit.\n\n> Suggestion: ${step.suggestion}\n` },
  ]
  if (role === 'business' && stepId === 'requirements') {
    const must = compiled.sections.flatMap(s => s.requirements.filter(r => r.priority === 'must').map(r => `${r.text} (${s.name})`))
    files.push(
      { path: 'specs/business/requirements/business-requirements.md', content: `# Business requirements\n\n${DRAFT_NOTE}\n\n${bullets(compiled.brief.jobs.map(j => `The product must help people ${j.charAt(0).toLowerCase()}${j.slice(1)}`))}\n` },
      { path: 'specs/business/requirements/functional-requirements.md', content: `# Functional requirements\n\n${DRAFT_NOTE}\n\n${numbered(must.length ? must : compiled.sections.flatMap(s => s.requirements.map(r => `${r.text} (${s.name})`)))}\n` },
    )
  }
  if (role === 'design' && stepId === 'screens') {
    files.push({ path: 'specs/design/screens/design-requirements.md', content: `# Design requirements\n\n${DRAFT_NOTE}\n\n${bullets(compiled.sections.flatMap(s => s.screens.flatMap(sc => sc.acceptance.map(a => `${sc.name}: ${a}`))).slice(0, 24))}\n` })
  }
  return files.map(f => (f.content.length > 49000 ? { ...f, content: f.content.slice(0, 49000) + '\n\n_Truncated to fit the file limit._\n' } : f))
}

/** Compile and draft in one call. */
export async function offlineDraft(project: StudioProject, role: Role, stepId: string, options: DraftOptions = {}): Promise<FileItem[]> {
  if (!project.spec.trim()) throw new Error('Add a brief or project context first; the draft is built from it.')
  const compiled = await compileBrief(project.spec, options)
  return draftFiles(project, compiled, role, stepId)
}
