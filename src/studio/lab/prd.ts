/**
 * Scope, PRD and buildable milestones.
 *
 * Deciding what is out of scope matters as much as what is in: an agent given only a list of
 * features invents extras. The scope file is plain Markdown you edit; the PRD and the milestone
 * folders are generated from it, so they never disagree.
 */
import type { FileItem, StudioProject } from '../model'
import { PLATFORMS, type Platform } from './agentpack'
import { extractRequirements, keywords } from './readiness'
import { injectMarkdown, listStandards, suggestStandards } from './standards'

export const SCOPE_PATH = 'specs/business/requirements/scope.md'
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'item'
const title = (text: string) => { const t = text.split(/[:—–]|\. /)[0].trim(); return (t.length > 64 ? `${t.slice(0, 61).trim()}…` : t) || text.slice(0, 64) }

export interface Feature { name: string; text: string; inScope: string[]; outScope: string[] }
export interface Scope { inScope: string[]; outScope: string[]; features: Feature[] }

const OUT_SUGGESTIONS = [
  'Settings screens for custom fields or custom pipeline stages (hard-code them for version one)',
  'Accounts, roles and permissions beyond the people named in the brief',
  'Integrations with other services, imports and exports',
  'Payments and billing, unless the brief says money changes hands in the product',
  'Admin dashboards and reports beyond what each feature needs',
]

/** A first scope from the requirements. Everything here is yours to cut. */
export function scopeDraft(project: StudioProject): string {
  const reqs = [...new Map(extractRequirements(project).map(r => [r.text, r])).values()].slice(0, 12)
  const lines = (arr: string[]) => (arr.length ? arr.map(a => `- ${a}`).join('\n') : '- _Nothing listed yet._')
  return `# Scope (version one)

> Suggested from the requirements. Delete anything you are not building now, and move it to Out of scope. The list order is the build order.

## In scope

${lines(reqs.map(r => r.text))}

## Out of scope

> Suggestions. Keep the ones that are true for you and add your own.

${lines(OUT_SUGGESTIONS)}

${reqs.map(r => `## Feature: ${title(r.text)}\n\n- In: ${r.text}\n- Out: _What this feature will not do in version one._`).join('\n\n')}
`
}

export function parseScope(content: string): Scope {
  const scope: Scope = { inScope: [], outScope: [], features: [] }
  let section: 'in' | 'out' | 'feature' | '' = '', current: Feature | null = null
  for (const raw of content.split('\n')) {
    const line = raw.trimEnd()
    const h = /^##\s+(.*)$/.exec(line)
    if (h) {
      const name = h[1].trim()
      if (/^in scope/i.test(name)) { section = 'in'; current = null } else if (/^out of scope/i.test(name)) { section = 'out'; current = null } else if (/^feature:\s*(.+)/i.test(name)) { section = 'feature'; current = { name: name.replace(/^feature:\s*/i, ''), text: '', inScope: [], outScope: [] }; scope.features.push(current) } else { section = ''; current = null }
      continue
    }
    const item = /^\s*[-*]\s+(.+)$/.exec(line)
    if (!item || /^_.*_$/.test(item[1]) || item[1].startsWith('>')) continue
    const text = item[1].trim()
    if (section === 'in') scope.inScope.push(text)
    else if (section === 'out') scope.outScope.push(text)
    else if (section === 'feature' && current) {
      const kind = /^(in|out):\s*(.*)$/i.exec(text)
      if (!kind || /^_.*_$/.test(kind[2]) || !kind[2]) continue
      if (kind[1].toLowerCase() === 'in') current.inScope.push(kind[2]); else current.outScope.push(kind[2])
    }
  }
  for (const f of scope.features) f.text = [f.name, ...f.inScope].join(' ')
  return scope
}

export interface Milestone { n: number; slug: string; title: string; goal: string; features: Feature[]; dependsOn: number[] }
export interface Plan { source: 'scope' | 'requirements' | 'none'; scope: Scope; milestones: Milestone[]; notes: string[] }

/** Puts a feature after the features whose main word it mentions. Falls back to the written order. */
export function orderFeatures(features: Feature[]): Feature[] {
  const head = features.map(f => keywords(f.name)[0] ?? '')
  const needs = features.map((f, j) => features.map((_, i) => i !== j && head[i] && keywords(f.text).includes(head[i]) && !keywords(features[i].text).includes(head[j] || '\u0000')))
  const out: number[] = [], done = new Set<number>()
  for (let guard = 0; out.length < features.length && guard < features.length + 1; guard++) {
    let progressed = false
    for (let j = 0; j < features.length; j++) {
      if (done.has(j) || !needs[j].every((n, i) => !n || done.has(i))) continue
      done.add(j); out.push(j); progressed = true
    }
    if (!progressed) return features
  }
  return out.map(i => features[i])
}

export function buildPlan(project: StudioProject): Plan {
  const file = project.files.find(f => f.path === SCOPE_PATH)
  let scope = file ? parseScope(file.content) : { inScope: [], outScope: [], features: [] }
  let source: Plan['source'] = file && (scope.inScope.length || scope.features.length) ? 'scope' : 'none'
  const notes: string[] = []
  if (scope.inScope.length && !scope.features.length) scope.features = scope.inScope.map(t => ({ name: title(t), text: t, inScope: [t], outScope: [] }))
  if (!scope.features.length) {
    const reqs = [...new Map(extractRequirements(project).map(r => [r.text, r])).values()].slice(0, 12)
    if (reqs.length) { scope = { inScope: reqs.map(r => r.text), outScope: [], features: reqs.map(r => ({ name: title(r.text), text: r.text, inScope: [r.text], outScope: [] })) }; source = 'requirements'; notes.push('No scope file yet: features come straight from the requirements, and nothing is listed as out of scope. Draft the scope to fix that.') }
  }
  if (source !== 'none' && !scope.outScope.length) notes.push('Nothing is listed as out of scope. Agents will add features that were not asked for.')
  if (source === 'none') return { source, scope, milestones: [], notes: ['No requirements or scope were found, so there is nothing to plan yet.'] }
  const ordered = orderFeatures(scope.features)
  const per = ordered.length > 8 ? 2 : 1
  const groups: Feature[][] = []
  for (let i = 0; i < ordered.length; i += per) groups.push(ordered.slice(i, i + per))
  const milestones: Milestone[] = [{ n: 1, slug: 'foundation', title: 'Foundation', goal: 'Design tokens, the app shell and navigation, the data model with sample data, and the test setup. No features yet.', features: [], dependsOn: [] }]
  groups.forEach((g, i) => milestones.push({ n: i + 2, slug: slug(g.map(f => f.name).join('-')), title: g.map(f => f.name).join(' and '), goal: `Build ${g.map(f => f.name).join(' and ')} as described in the PRD, and nothing beyond it.`, features: g, dependsOn: [i + 1] }))
  milestones.push({ n: milestones.length + 1, slug: 'verify-and-hand-off', title: 'Verify and hand off', goal: 'Run the whole suite, walk every flow on a phone-sized screen, fix paper cuts, and update the PRD to match what was built.', features: [], dependsOn: [milestones.length] })
  return { source, scope, milestones, notes }
}

const num = (n: number) => String(n).padStart(2, '0')
const folder = (m: Milestone) => `build-plan/milestones/${num(m.n)}-${m.slug}`

export function milestonePrompt(project: StudioProject, plan: Plan, m: Milestone, platform: Platform): string {
  const standards = listStandards(project)
  const text = `${m.title} ${m.features.map(f => f.text).join(' ')}`
  const chosen = standards.length <= 3 ? standards : suggestStandards(text, standards).slice(0, 5)
  const prior = plan.milestones.filter(p => p.n < m.n).map(p => `- \`${folder(p)}/milestone-log.md\``)
  const hasDs = project.files.some(f => f.path === 'design/design-system.md')
  return `# Milestone ${num(m.n)} — ${m.title}

Enter plan mode first. Do not write code until the plan is agreed.

## Read
- \`AGENTS.md\`
- \`build-plan/prd.md\` — focus **only** on milestone ${m.n}
${hasDs ? '- `design/design-system.md` — reuse its components\n' : ''}${prior.length ? `- The logs from earlier milestones, they hold decisions the PRD does not:\n${prior.join('\n')}\n` : ''}
## Build
${m.goal}
${m.features.length ? `\n${m.features.map(f => `**${f.name}**\n${f.inScope.map(i => `- In: ${i}`).join('\n') || '- In: see the PRD'}\n${f.outScope.map(o => `- Out: ${o}`).join('\n')}`).join('\n\n')}\n` : ''}
Target: ${PLATFORMS.find(p => p.id === platform)?.label}. Ask clarifying questions about anything the PRD leaves open (for example search, sorting, deletion and who can see what) and explain the trade-offs when you ask.

${plan.scope.outScope.length ? `## Do not build\n${plan.scope.outScope.map(o => `- ${o}`).join('\n')}\n\n` : ''}${injectMarkdown(chosen, 'reference')}${chosen.length ? '\n' : ''}## Finish
1. Run the whole test suite, not only the new tests.
2. Write \`${folder(m)}/milestone-log.md\` using the template beside this file. The first section must be a plain list of what is new, so a person knows what to check.
3. Stop. Do not start the next milestone.
`
}

export const logTemplate = (m: Milestone) => `# Milestone ${num(m.n)} log — ${m.title}

## What is new (plain language)
- _One bullet per thing a person can now see or do. This is what the reviewer will check._

## What was built
- Front end:
- Back end / data:
- Tests added, and the result of the full suite:

## Decisions the PRD did not cover
- _Anything chosen along the way, with the reason._

## Open issues and paper cuts
-

## For the next milestone
- _What the next agent must know before it starts._
`

export function prdMarkdown(project: StudioProject, plan: Plan): string {
  const f = (x: Feature) => `### ${x.name}\n\n${x.inScope.map(i => `- In: ${i}`).join('\n') || '- In: _not detailed_'}\n${x.outScope.map(o => `- Out: ${o}`).join('\n')}`
  return `# ${project.name} — product requirements

## Overview

${project.spec.trim() || '_No brief written yet._'}

## In scope (version one)

${plan.scope.inScope.map(i => `- ${i}`).join('\n') || '- _Nothing listed._'}

## Out of scope (version one)

${plan.scope.outScope.map(o => `- ${o}`).join('\n') || '- _Nothing listed. Agents will fill the gap with extras._'}

## Features

${plan.scope.features.map(f).join('\n\n')}

## Milestones

${plan.milestones.map(m => `${m.n}. **${m.title}** — ${m.goal}${m.dependsOn.length ? ` (after milestone ${m.dependsOn.join(', ')})` : ''}`).join('\n')}

## Definition of done

Behaviour matches this document, tests pass (success and failure paths), nothing outside "In scope" was added, and the milestone log is written.
`
}

export function prdHtml(project: StudioProject, plan: Plan): string {
  const list = (a: string[], empty: string) => (a.length ? `<ul>${a.map(i => `<li>${esc(i)}</li>`).join('')}</ul>` : `<p class="empty">${empty}</p>`)
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(project.name)} — PRD</title><style>
body{margin:0;font:16px/1.6 system-ui,sans-serif;color:#241e1a;background:#fcf8f2}main{max-width:820px;margin:0 auto;padding:40px 24px 80px}h1{margin:0 0 4px}h2{margin:40px 0 8px;padding-top:18px;border-top:1px solid #e6ddd2}h3{margin:18px 0 4px}
.in,.out{padding:14px 16px;border-radius:10px;margin:8px 0}.in{background:#e9f5ee}.out{background:#fbece8}.empty{color:#a2402f}.card{border:1px solid #e6ddd2;border-radius:10px;padding:12px 16px;margin:10px 0;background:#fff}.n{display:inline-block;min-width:28px;font-weight:700;color:#c25a1f}small{color:#7a6d64}@media print{body{background:#fff}}</style></head><body><main>
<h1>${esc(project.name)}</h1><p><small>Product requirements · version one</small></p>
<h2>Overview</h2><p>${esc(project.spec.trim() || 'No brief written yet.').replace(/\n/g, '<br>')}</p>
<h2>What is in and what is out</h2><div class="in"><b>In scope</b>${list(plan.scope.inScope, 'Nothing listed.')}</div><div class="out"><b>Out of scope</b>${list(plan.scope.outScope, 'Nothing listed. Without this list, agents add features nobody asked for.')}</div>
<h2>Features</h2>${plan.scope.features.map(x => `<div class="card"><h3>${esc(x.name)}</h3>${x.inScope.map(i => `<p><b>In:</b> ${esc(i)}</p>`).join('')}${x.outScope.map(o => `<p><b>Out:</b> ${esc(o)}</p>`).join('')}</div>`).join('') || '<p class="empty">No features.</p>'}
<h2>Milestones</h2>${plan.milestones.map(m => `<div class="card"><span class="n">${num(m.n)}</span><b>${esc(m.title)}</b><p>${esc(m.goal)}</p>${m.dependsOn.length ? `<small>After milestone ${m.dependsOn.join(', ')}</small>` : ''}</div>`).join('')}
<h2>How each milestone runs</h2><ol><li>Open the milestone's <code>prompt.md</code> in a clean session and enter plan mode.</li><li>Agree the plan, then build only that milestone.</li><li>Read the milestone log's "What is new" list and check it in the running product.</li><li>Fix small things in the same session, commit, then start the next milestone with a clean context.</li></ol>
</main></body></html>`
}

export function buildPlanFiles(project: StudioProject, platform: Platform): { plan: Plan; files: FileItem[] } {
  const plan = buildPlan(project)
  if (plan.source === 'none') return { plan, files: [] }
  const files: FileItem[] = [
    { path: 'build-plan/prd.html', content: prdHtml(project, plan) },
    { path: 'build-plan/prd.md', content: prdMarkdown(project, plan) },
  ]
  for (const m of plan.milestones) {
    files.push({ path: `${folder(m)}/prompt.md`, content: milestonePrompt(project, plan, m, platform) }, { path: `${folder(m)}/milestone-log.md`, content: logTemplate(m) })
  }
  return { plan, files }
}
