/**
 * Handoff readiness, traceability and distinctiveness.
 *
 * Everything here is a pure function of the project, computed in the browser.
 * The traceability and distinctiveness results are heuristics and are labelled
 * as such: they point at places to look, they do not prove a design is good.
 */
import { INDEX_PATH, SCOPE_PATH, STANDARDS_DIR } from './paths'
import { workflows, type Role } from '../workflows'
import { roleOf, type StudioProject } from '../model'
import { contrast, hsl, isHex } from './color'

export type Level = 'pass' | 'warn' | 'fail'
export interface Check { id: string; group: string; level: Level; title: string; detail: string }
export interface Requirement { text: string; source: string; keywords: string[]; design: boolean; tests: boolean }
export interface StepRow { role: Role; step: string; label: string; status: string; files: number; words: number; placeholders: number }
export interface Report {
  score: number
  checks: Check[]
  steps: StepRow[]
  requirements: Requirement[]
  designCoverage: number
  testCoverage: number
}

const STOP = new Set('about above after again against allow allows also always and any are because been before being between both build can cannot could does done each either else ensure every from have into must need needs only other should shall some such than that their them then there these they this those through under until upon using very want when where which while will with within without would your user users system page pages'.split(' '))
const PLACEHOLDER = /outline — write under|example template|replace before approval|lorem ipsum|\bTODO\b|\bTBD\b|\bXXX\b|\[replace|\[insert|<your /gi
export const PLACEHOLDER_HELP = 'Placeholders found: an unfilled outline, TODO, TBD, lorem ipsum or bracketed fill-ins.'

export const words = (text: string) => (text.match(/[\p{L}\p{N}'’-]+/gu) ?? []).length
export const placeholderCount = (text: string) => (text.match(PLACEHOLDER) ?? []).length

export function keywords(text: string): string[] {
  const seen = new Set<string>()
  for (const raw of text.toLowerCase().match(/[a-z][a-z-]{3,}/g) ?? []) {
    const w = raw.replace(/(ing|ed|es|s)$/, '')
    if (w.length >= 4 && !STOP.has(raw) && !STOP.has(w)) seen.add(w)
  }
  return [...seen]
}

const REQUIREMENT_FILES = /^specs\/business\/requirements\/(prd|business-requirements|functional-requirements)\.md$|^business\/PRD\.md$/i

/** Requirement-like lines: list items and numbered lines in the business requirement files. */
export function extractRequirements(project: StudioProject): { text: string; source: string }[] {
  const out: { text: string; source: string }[] = []
  for (const file of project.files.filter(f => REQUIREMENT_FILES.test(f.path))) {
    for (const line of file.content.split('\n')) {
      const m = /^\s*(?:[-*]|\d+[.)])\s+(?:\*\*)?(.{12,})$/.exec(line)
      if (!m) continue
      const text = m[1].replace(/\*\*/g, '').trim()
      if (/^example[: ]/i.test(text)) continue
      out.push({ text, source: file.path })
    }
  }
  return out
}

function covered(req: string[], corpus: Set<string>): boolean {
  if (!req.length) return true
  const hits = req.filter(k => corpus.has(k)).length
  return hits >= Math.min(2, req.length)
}

const corpusOf = (files: { content: string }[]) => new Set(files.flatMap(f => keywords(f.content)))

// Stock palette colours that most generated interfaces reach for first.
const STOCK = new Set(['#6366f1', '#4f46e5', '#3b82f6', '#2563eb', '#8b5cf6', '#7c3aed', '#10b981', '#059669', '#0f172a', '#1e293b', '#14b8a6', '#06b6d4', '#ec4899'])

export function analyse(project: StudioProject): Report {
  const checks: Check[] = []
  const add = (group: string, id: string, level: Level, title: string, detail: string) => checks.push({ group, id, level, title, detail })

  // ---- steps -----------------------------------------------------------
  const steps: StepRow[] = []
  for (const role of Object.keys(workflows) as Role[]) {
    for (const step of workflows[role]) {
      const prefix = `specs/${role}/${step.id}/`
      const files = project.files.filter(f => f.path.startsWith(prefix))
      const text = files.map(f => f.content).join('\n')
      steps.push({ role, step: step.id, label: step.label, status: project.stepDecisions[`${role}/${step.id}`]?.status ?? 'not_started', files: files.length, words: words(text), placeholders: placeholderCount(text) })
    }
  }
  const approved = steps.filter(s => s.status === 'approved')
  const started = steps.filter(s => s.files > 0)

  // ---- process ---------------------------------------------------------
  const brief = project.spec.trim()
  add('Process', 'brief', brief.length >= 120 ? 'pass' : brief.length ? 'warn' : 'fail', 'Shared brief',
    brief.length >= 120 ? `${words(brief)} words of shared context.` : brief.length ? 'The brief is very short; later steps will be guesswork.' : 'There is no brief yet. Every role starts from it.')
  const fakeApproved = approved.filter(s => s.placeholders > 0 || s.words < 40)
  add('Process', 'approved-real', fakeApproved.length ? 'fail' : 'pass', 'Approvals rest on real content',
    fakeApproved.length ? `Approved but still placeholder or near-empty: ${fakeApproved.map(s => `${s.role}/${s.step}`).join(', ')}.` : approved.length ? `${approved.length} approved step(s), none with placeholders.` : 'No steps are approved yet.')
  const revisit = steps.filter(s => s.status === 'revisit' || s.status === 'rejected')
  add('Process', 'revisit', revisit.length ? 'warn' : 'pass', 'Nothing waiting for a revisit',
    revisit.length ? `Needs attention: ${revisit.map(s => `${s.role}/${s.step}`).join(', ')}.` : 'No step is marked revisit or rejected.')
  const stale = [project.designStale && 'design', project.developmentStale && 'development'].filter(Boolean)
  add('Process', 'stale', stale.length ? 'warn' : 'pass', 'Downstream work is current', stale.length ? `Earlier changes have not been carried into: ${stale.join(' and ')}.` : 'No downstream role is flagged out of date.')
  const left = started.reduce((n, s) => n + s.placeholders, 0)
  add('Process', 'placeholders', left ? 'warn' : started.length ? 'pass' : 'warn', 'No leftover placeholders',
    left ? `${left} placeholder marker(s) across ${started.filter(s => s.placeholders).length} step(s). ${PLACEHOLDER_HELP}` : started.length ? 'No placeholder markers in any step.' : 'No step has files yet.')

  // ---- traceability ----------------------------------------------------
  const reqs = extractRequirements(project)
  const designCorpus = corpusOf(project.files.filter(f => roleOf(f.path) === 'design'))
  const testCorpus = corpusOf(project.files.filter(f => f.path.startsWith('specs/quality/') || /(^|\/)(tests?|cases)[^/]*\.md$/i.test(f.path)))
  const requirements: Requirement[] = reqs.map(r => {
    const k = keywords(r.text)
    return { ...r, keywords: k, design: covered(k, designCorpus), tests: covered(k, testCorpus) }
  })
  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0)
  const designCoverage = pct(requirements.filter(r => r.design).length, requirements.length)
  const testCoverage = pct(requirements.filter(r => r.tests).length, requirements.length)
  if (!requirements.length) {
    add('Traceability', 'req-none', 'warn', 'Requirements are listed', 'No requirement lines were found in the business requirement files, so nothing can be traced.')
  } else {
    add('Traceability', 'req-design', designCoverage >= 80 ? 'pass' : designCoverage >= 50 ? 'warn' : 'fail', 'Requirements reach the design',
      `${designCoverage}% of ${requirements.length} requirements share vocabulary with design work. Heuristic: it checks wording, not intent.`)
    add('Traceability', 'req-tests', testCoverage >= 80 ? 'pass' : testCoverage >= 50 ? 'warn' : 'fail', 'Requirements reach the tests',
      `${testCoverage}% of requirements share vocabulary with quality cases. Heuristic: it checks wording, not intent.`)
  }

  // ---- build plan, standards and design system ------------------------
  const scopeFile = project.files.find(f => f.path === SCOPE_PATH)
  if (requirements.length || scopeFile) {
    const outItems = scopeFile ? (/##\s+Out of scope([\s\S]*?)(?=\n##\s|$)/i.exec(scopeFile.content)?.[1] ?? '').split('\n').filter(l => /^\s*[-*]\s+(?!_)/.test(l) && !/^\s*[-*]\s+>/.test(l)).length : 0
    add('Build plan', 'scope-out', outItems ? 'pass' : 'warn', 'Out of scope is written down', outItems ? `${outItems} item(s) listed as out of scope.` : 'No out-of-scope list. Agents fill that gap with features nobody asked for. Use PRD & milestones to draft one.')
  }
  const standardsCount = project.files.filter(f => f.path.startsWith(STANDARDS_DIR) && f.path.endsWith('.md') && f.path !== INDEX_PATH).length
  add('Build plan', 'standards', standardsCount ? 'pass' : 'warn', 'Standards are written down', standardsCount ? `${standardsCount} standard(s), indexed for agents.` : 'No standards yet. Agents will rediscover your conventions every session.')
  if (project.files.some(f => f.path === 'design/design-tokens.json')) {
    const hasSystem = project.files.some(f => f.path === 'design/design-system.md')
    add('Build plan', 'design-system', hasSystem ? 'pass' : 'warn', 'Design system is documented', hasSystem ? 'A design-system reference and agent rules are in the project.' : 'Tokens exist but there is no component reference, so screens can drift apart. Generate it under Design system.')
  }

  // ---- design tokens and distinctiveness -------------------------------
  const tokenFile = project.files.find(f => f.path === 'design/design-tokens.json')
  let tokens: Record<string, unknown> | null = null
  try { tokens = tokenFile ? JSON.parse(tokenFile.content) : null } catch { tokens = null }
  if (!tokens) {
    add('Design', 'tokens', 'warn', 'Design tokens are readable', tokenFile ? 'design/design-tokens.json is not valid JSON.' : 'There is no design/design-tokens.json.')
  } else {
    const { primary, background, text } = tokens as Record<string, unknown>
    if (isHex(text) && isHex(background)) {
      const ratio = contrast(text, background)
      add('Design', 'contrast-text', ratio >= 7 ? 'pass' : ratio >= 4.5 ? 'pass' : 'fail', 'Body text contrast', `Text on background is ${ratio.toFixed(2)}:1 (WCAG AA needs 4.5:1).`)
    }
    if (isHex(primary) && isHex(background)) {
      const ratio = contrast(primary, background)
      add('Design', 'contrast-primary', ratio >= 3 ? 'pass' : 'fail', 'Primary colour is visible', `Primary on background is ${ratio.toFixed(2)}:1 (interface components need 3:1).`)
    }
    if (isHex(primary)) {
      const onWhite = contrast('#ffffff', primary)
      add('Design', 'contrast-button', onWhite >= 4.5 ? 'pass' : 'warn', 'White text on the primary colour', `${onWhite.toFixed(2)}:1. ${onWhite >= 4.5 ? 'Primary buttons can carry white labels.' : 'Use dark labels on primary buttons, or darken the primary colour.'}`)
      const { h, s } = hsl(primary)
      const stock = STOCK.has(primary.toLowerCase()) || (h >= 225 && h <= 262 && s > 0.55)
      add('Distinctiveness', 'palette', stock ? 'warn' : 'pass', 'Palette is not the generic default', stock ? `${primary} sits in the indigo/blue family most generated interfaces default to. Pick a colour that comes from your brand or users.` : `${primary} is not one of the stock palette colours.`)
    }
    if (typeof tokens.heading === 'string') {
      const generic = /beautifully simple|welcome to|your (product|app|business)|lorem/i.test(tokens.heading)
      add('Distinctiveness', 'copy', generic ? 'warn' : 'pass', 'Headline says something specific', generic ? `"${tokens.heading}" could belong to any product. Say what this product does for whom.` : 'The sample headline is specific.')
    }
  }
  const lorem = project.files.filter(f => /lorem ipsum/i.test(f.content)).map(f => f.path)
  add('Distinctiveness', 'lorem', lorem.length ? 'fail' : 'pass', 'Realistic content, not filler', lorem.length ? `Lorem ipsum in: ${lorem.slice(0, 4).join(', ')}.` : 'No filler text found.')

  // ---- delivery --------------------------------------------------------
  const delivery = project.files.filter(f => roleOf(f.path) === 'delivery').map(f => f.content.toLowerCase()).join('\n')
  const quality = project.files.filter(f => roleOf(f.path) === 'quality').map(f => f.content.toLowerCase()).join('\n')
  if (delivery.trim()) {
    const rollback = /roll ?back|revert/.test(delivery), monitor = /monitor|alert|observab|dashboard/.test(delivery)
    add('Delivery', 'rollback', rollback ? 'pass' : 'warn', 'A way back is described', rollback ? 'Rollback or revert is mentioned in delivery work.' : 'Delivery work does not mention rollback.')
    add('Delivery', 'monitor', monitor ? 'pass' : 'warn', 'Release is observable', monitor ? 'Monitoring or alerting is mentioned.' : 'Delivery work does not say how the release will be watched.')
  }
  if (quality.trim()) {
    const neg = /fail|error|invalid|denied|empty state|edge/.test(quality)
    add('Quality', 'negative', neg ? 'pass' : 'warn', 'Failure paths are tested', neg ? 'Quality work covers failure or edge cases.' : 'Quality cases only describe the happy path.')
  }

  const weight = { pass: 1, warn: 0.5, fail: 0 }
  const score = checks.length ? Math.round((checks.reduce((n, c) => n + weight[c.level], 0) / checks.length) * 100) : 0
  return { score, checks, steps, requirements, designCoverage, testCoverage }
}

const ICON: Record<Level, string> = { pass: '✅', warn: '⚠️', fail: '❌' }

export function reportMarkdown(project: StudioProject, report: Report): string {
  const lines = [`# Handoff readiness — ${project.name}`, '', `**Score: ${report.score}/100.** Computed in the browser from the project files. Traceability and distinctiveness are heuristics that point at places to look.`, '']
  for (const group of [...new Set(report.checks.map(c => c.group))]) {
    lines.push(`## ${group}`, '')
    for (const c of report.checks.filter(x => x.group === group)) lines.push(`- ${ICON[c.level]} **${c.title}** — ${c.detail}`)
    lines.push('')
  }
  lines.push('## Steps', '', '| Role | Step | Status | Files | Words | Placeholders |', '| --- | --- | --- | ---: | ---: | ---: |')
  for (const s of report.steps) lines.push(`| ${s.role} | ${s.label} | ${s.status.replace('_', ' ')} | ${s.files} | ${s.words} | ${s.placeholders} |`)
  return lines.join('\n') + '\n'
}

export function traceabilityMarkdown(project: StudioProject, report: Report): string {
  const lines = [`# Traceability — ${project.name}`, '', `Requirement → design → quality. ${report.designCoverage}% reach design, ${report.testCoverage}% reach tests. Matching is by shared vocabulary, so treat gaps as questions, not verdicts.`, '']
  if (!report.requirements.length) return lines.concat('No requirement lines were found in the business requirement files.', '').join('\n')
  lines.push('| # | Requirement | Design | Tests | Source |', '| ---: | --- | :---: | :---: | --- |')
  report.requirements.forEach((r, i) => lines.push(`| ${i + 1} | ${r.text.replace(/\|/g, '\\|').slice(0, 140)} | ${r.design ? '✅' : '❌'} | ${r.tests ? '✅' : '❌'} | ${r.source} |`))
  return lines.join('\n') + '\n'
}
