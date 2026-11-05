/**
 * Standards: short, opinionated rules with the reason behind them.
 *
 * Discover candidates from code you give it, write them down with a "why", keep a
 * one-line-per-standard index so an agent need not read every file, and inject only
 * the relevant ones into a prompt, a spec or a handoff pack. Profiles are saved sets
 * of standards you can apply to another project.
 */
import type { FileItem, StudioProject } from '../model'

export interface Standard { slug: string; name: string; description: string; body: string }
import { INDEX_PATH, STANDARDS_DIR } from './paths'
export { INDEX_PATH, STANDARDS_DIR }
export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'standard'

// ---- files ----------------------------------------------------------------
export function standardFile(s: Standard): FileItem {
  return { path: `${STANDARDS_DIR}${s.slug}.md`, content: `---\nname: ${JSON.stringify(s.name)}\ndescription: ${JSON.stringify(s.description)}\n---\n\n${s.body.trim()}\n` }
}
export function parseStandard(file: FileItem): Standard | null {
  if (!file.path.startsWith(STANDARDS_DIR) || !file.path.endsWith('.md')) return null
  const slug = file.path.slice(STANDARDS_DIR.length, -3)
  if (!slug || slug.includes('/')) return null
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(file.content)
  const field = (key: string) => {
    const line = m?.[1].split('\n').find(l => l.startsWith(`${key}:`))
    if (!line) return ''
    const raw = line.slice(key.length + 1).trim()
    try { return String(JSON.parse(raw)) } catch { return raw }
  }
  return { slug, name: field('name') || slug, description: field('description'), body: (m ? m[2] : file.content).trim() }
}
export const listStandards = (project: StudioProject): Standard[] =>
  project.files.map(parseStandard).filter((s): s is Standard => s !== null).sort((a, b) => a.name.localeCompare(b.name))

/** The index lists each standard once, with one line, so a reader can choose without opening every file. */
export function indexYaml(standards: Standard[]): string {
  const rows = standards.map(s => `  - file: ${JSON.stringify(`${s.slug}.md`)}\n    name: ${JSON.stringify(s.name)}\n    description: ${JSON.stringify(s.description.replace(/\s+/g, ' ').trim())}`)
  return `# Standards index. Read this first; open a standard only when its description fits the task.\nstandards:${rows.length ? '\n' + rows.join('\n') : ' []'}\n`
}
export function withStandards(project: StudioProject, upserts: Standard[], removeSlugs: string[] = []): { files: FileItem[]; remove: string[] } {
  const remaining = listStandards(project).filter(s => !removeSlugs.includes(s.slug) && !upserts.some(u => u.slug === s.slug))
  const all = [...remaining, ...upserts].sort((a, b) => a.name.localeCompare(b.name))
  return { files: [...upserts.map(standardFile), { path: INDEX_PATH, content: indexYaml(all) }], remove: removeSlugs.map(s => `${STANDARDS_DIR}${s}.md`) }
}

// ---- injection ------------------------------------------------------------
const STOP = new Set('the a an and or of to in on for with is are be use using this that it as at by from we our your when how what into not no do does should must can will all any more most each per via'.split(' '))
const tokens = (s: string) => [...new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)).map(w => w.replace(/(ing|ed|es|s)$/, '')))]

/** Standards whose name or description share words with the task, best match first. */
export function suggestStandards(task: string, standards: Standard[]): Standard[] {
  const t = new Set(tokens(task))
  return standards
    .map(s => ({ s, score: tokens(`${s.name} ${s.description}`).filter(w => t.has(w)).length }))
    .filter(x => x.score > 0).sort((a, b) => b.score - a.score || a.s.name.localeCompare(b.s.name)).map(x => x.s)
}
export type InjectMode = 'reference' | 'copy'
/** Reference keeps one source of truth; copy makes the output stand alone. */
export function injectMarkdown(standards: Standard[], mode: InjectMode): string {
  if (!standards.length) return ''
  if (mode === 'reference') return `## Standards to follow\n\nRead these before writing code. They are the source of truth.\n\n${standards.map(s => `- @${STANDARDS_DIR}${s.slug}.md — ${s.description}`).join('\n')}\n`
  return `## Standards to follow\n\n${standards.map(s => `### ${s.name}\n\n_${s.description}_\n\n${s.body.trim()}`).join('\n\n')}\n`
}

// ---- discovery ------------------------------------------------------------
export interface Source { name: string; text: string }
/** Pasted text may hold several files, each starting with a line such as `// file: deal-list.tsx`. */
export function splitPasted(text: string): Source[] {
  const parts = text.split(/^[ \t]*(?:\/\/|#|\/\*)[ \t]*file:[ \t]*(\S+?)[ \t]*(?:\*\/)?[ \t]*$/m)
  if (parts.length === 1) return text.trim() ? [{ name: 'pasted.txt', text }] : []
  const out: Source[] = []
  if (parts[0].trim()) out.push({ name: 'pasted.txt', text: parts[0] })
  for (let i = 1; i < parts.length; i += 2) if (parts[i + 1]?.trim()) out.push({ name: parts[i], text: parts[i + 1] })
  return out
}
export interface Candidate { id: string; title: string; description: string; evidence: string[]; question: string; body: string }
const stem = (name: string) => (name.split('/').pop() ?? name).replace(/\.[a-z0-9]+$/i, '').replace(/\.(test|spec|stories)$/i, '')
const caseOf = (s: string) => /^[a-z0-9]+(-[a-z0-9]+)+$/.test(s) ? 'kebab-case' : /^[a-z0-9]+(_[a-z0-9]+)+$/.test(s) ? 'snake_case' : /^[A-Z][a-zA-Z0-9]*[a-z][a-zA-Z0-9]*$/.test(s) && /[a-z][A-Z]/.test(s) || /^[A-Z][a-z0-9]+$/.test(s) ? 'PascalCase' : /^[a-z][a-z0-9]*[A-Z][a-zA-Z0-9]*$/.test(s) ? 'camelCase' : ''
const norm = (line: string) => line.trim().replace(/\s+/g, ' ')

/**
 * Looks for conventions that repeat in the given source text. It reads text only:
 * it proposes candidates and asks why; it cannot know your reasoning.
 */
export function discoverPatterns(sources: Source[]): Candidate[] {
  const out: Candidate[] = []
  const code = sources.filter(s => s.text.length > 0)
  if (!code.length) return out

  // 1. file naming
  const cases = new Map<string, string[]>()
  for (const s of code) { const c = caseOf(stem(s.name)); if (c) cases.set(c, [...(cases.get(c) ?? []), s.name]) }
  const total = [...cases.values()].reduce((n, a) => n + a.length, 0)
  const top = [...cases.entries()].sort((a, b) => b[1].length - a[1].length)[0]
  if (top && total >= 3 && top[1].length / total >= 0.7) out.push({
    id: 'file-naming', title: `Files are named in ${top[0]}`, description: `Name new files in ${top[0]}, matching the existing ones.`,
    evidence: [`${top[1].length} of ${total} multi-word file names use ${top[0]}`, ...top[1].slice(0, 3)],
    question: 'Is this a deliberate rule? What goes wrong if someone names a file differently?',
    body: `# File naming\n\nName files in **${top[0]}**.\n\nExamples from this codebase: ${top[1].slice(0, 3).map(n => `\`${n}\``).join(', ')}.`,
  })

  // 2. design tokens versus raw colours
  const hexes = code.reduce((n, s) => n + (s.text.match(/#[0-9a-f]{6}\b/gi)?.length ?? 0), 0)
  const vars = code.reduce((n, s) => n + (s.text.match(/var\(--[a-z0-9-]+\)/gi)?.length ?? 0), 0)
  if (vars >= 3 && vars >= hexes) out.push({
    id: 'colour-tokens', title: 'Colours come from named tokens', description: 'Use the named colour variables for every colour; never write a raw hex value in components.',
    evidence: [`${vars} uses of CSS variables`, `${hexes} raw hex colours`], question: 'Why tokens: theming, dark mode, or a brand swap per app?',
    body: '# Colour tokens\n\nUse the named CSS variables for every colour. Do not write raw hex values in components or styles.\n\nChanging a token must change the whole product in one place.',
  })

  // 3. preferred libraries
  const libs = new Map<string, Set<string>>()
  for (const s of code) for (const m of s.text.matchAll(/(?:from\s+|require\()\s*['"]([^./'"][^'"]*)['"]/g)) {
    const pkg = m[1].startsWith('@') ? m[1].split('/').slice(0, 2).join('/') : m[1].split('/')[0]
    libs.set(pkg, (libs.get(pkg) ?? new Set()).add(s.name))
  }
  const common = [...libs.entries()].filter(([p, f]) => f.size >= 3 && !['react', 'react-dom', 'fs', 'path'].includes(p) && !p.startsWith('node:')).sort((a, b) => b[1].size - a[1].size).slice(0, 4)
  if (common.length) out.push({
    id: 'libraries', title: `Shared libraries: ${common.map(c => c[0]).join(', ')}`, description: `Reuse ${common.map(c => c[0]).join(', ')} for the jobs they already do instead of adding alternatives.`,
    evidence: common.map(([p, f]) => `${p} is imported in ${f.size} files`), question: 'What does each library do here, and what should be used for new needs instead of a new dependency?',
    body: `# Libraries already in use\n\n${common.map(([p]) => `- \`${p}\``).join('\n')}\n\nBefore adding a dependency, check whether one of these already does the job.`,
  })

  // 4. repeated idioms: identical lines in several files
  const seen = new Map<string, Set<string>>()
  for (const s of code) for (const line of new Set(s.text.split('\n').map(norm))) {
    if (line.length < 28 || line.length > 140 || /^(import|export \{|\/\/|\*|\/\*|<\/?[a-z])/i.test(line) || /^[)}\]{;,]*$/.test(line)) continue
    seen.set(line, (seen.get(line) ?? new Set()).add(s.name))
  }
  const idioms = [...seen.entries()].filter(([, f]) => f.size >= 3).sort((a, b) => b[1].size - a[1].size).slice(0, 5)
  if (idioms.length) out.push({
    id: 'idioms', title: 'A repeated code idiom', description: 'Keep using the repeated idiom below when you write the same kind of code.',
    evidence: idioms.map(([l, f]) => `${f.size} files: ${l.slice(0, 80)}`), question: 'Is this repetition intentional, and what problem does this exact form solve?',
    body: `# Repeated idiom\n\nThese lines appear in several files and are probably a convention:\n\n\`\`\`\n${idioms.map(([l]) => l).join('\n')}\n\`\`\``,
  })

  // 5. where tests live
  const tests = code.filter(s => /(\.|_)(test|spec)\.[a-z]+$/i.test(s.name) || /(^|\/)(tests?|__tests__|spec)\//i.test(s.name))
  if (tests.length >= 2) {
    const beside = tests.filter(s => /\.(test|spec)\./.test(s.name)).length
    out.push({
      id: 'tests', title: beside === tests.length ? 'Tests sit beside the code they cover' : 'Tests live in a tests folder', description: 'Put new tests where the existing ones are, and cover the failure path as well as the success path.',
      evidence: [`${tests.length} test files`, ...tests.slice(0, 3).map(t => t.name)], question: 'What must a test cover before a change is accepted?',
      body: `# Tests\n\nPlace new tests where the existing ones are (${tests[0].name}).\n\nCover the success path and the failure path.`,
    })
  }
  return out
}
export const candidateToStandard = (c: Candidate, why: string): Standard => ({
  slug: slugify(c.id), name: c.title, description: c.description,
  body: `${c.body}${why.trim() ? `\n\n## Why\n\n${why.trim()}` : '\n\n## Why\n\n_Add the reason behind this rule so an agent can apply it with judgement._'}`,
})

// ---- profiles -------------------------------------------------------------
export interface Profile { id: string; name: string; builtin?: boolean; standards: Standard[] }
export const PROFILES_KEY = 'prodops.lab.profiles.v1'
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>
export function loadProfiles(storage: Pick<Storage, 'getItem'>): Profile[] {
  try {
    const raw = JSON.parse(storage.getItem(PROFILES_KEY) ?? '[]')
    return Array.isArray(raw) ? raw.filter((p: Profile) => p && typeof p.id === 'string' && typeof p.name === 'string' && Array.isArray(p.standards) && p.standards.every((s: Standard) => typeof s.slug === 'string' && typeof s.body === 'string')) : []
  } catch { return [] }
}
export function saveProfiles(storage: Storage, profiles: Profile[]) { try { storage.setItem(PROFILES_KEY, JSON.stringify(profiles.filter(p => !p.builtin))) } catch { /* storage full or blocked */ } }
export const makeProfile = (name: string, standards: Standard[]): Profile => ({ id: `${slugify(name)}-${standards.length}-${standards.reduce((n, s) => n + s.body.length, 0)}`, name: name.trim() || 'Untitled profile', standards: standards.map(s => ({ ...s })) })

const std = (name: string, description: string, body: string): Standard => ({ slug: slugify(name), name, description, body })
export const STARTER_PROFILES: Profile[] = [
  { id: 'starter-ui-consistency', name: 'Starter: consistent UI', builtin: true, standards: [
    std('Design system first', 'Check the design system before writing any markup or styles; reuse its components for buttons, forms, listings and modals.', '# Design system first\n\nBefore writing UI, read `design/design-system.md`. Reuse the existing component pattern. If none fits, add one to the design system first, then use it.\n\n## Why\n\nAgents reinvent the interface each session. A single source of truth keeps screens looking like one product.'),
    std('Tokens, not raw values', 'Use named colour, spacing, radius and type tokens; never raw hex values or pixel sizes in components.', '# Tokens, not raw values\n\nUse the named tokens. Do not write raw hex colours or one-off font sizes.\n\n## Why\n\nChanging one token should change the whole product.'),
    std('Semantic HTML for text', 'Use plain semantic elements (h1, h2, p, label) and the base styles; do not restyle each heading with ad hoc classes.', '# Semantic HTML for text\n\nUse bare `h1`–`h3`, `p`, `label`, `button`. Put typography in the base styles.\n\n## Why\n\nPer-element utility classes drift apart between screens.'),
  ] },
  { id: 'starter-accessible', name: 'Starter: accessible interfaces', builtin: true, standards: [
    std('Contrast and focus', 'Text meets 4.5:1 contrast; every interactive element shows a visible focus state.', '# Contrast and focus\n\n- Body text 4.5:1 or better; large text 3:1.\n- Never remove the focus outline without replacing it.\n\n## Why\n\nPeople with low vision or keyboard-only use must be able to see where they are.'),
    std('Labelled inputs and errors', 'Every input has a visible label; errors say what happened and how to fix it, next to the field.', '# Labelled inputs and errors\n\nUse `label` elements. Show the error beside the field, in words, and keep what the user typed.\n\n## Why\n\nPlaceholder-only labels vanish while typing; vague errors cause abandonment.'),
    std('Touch targets', 'Controls on touch screens are at least 44 by 44 points with space between them.', '# Touch targets\n\nMinimum 44×44 points; keep primary actions reachable with one hand.\n\n## Why\n\nSmall targets cause missed taps and accidental actions.'),
  ] },
  { id: 'starter-spec-driven', name: 'Starter: spec-driven build', builtin: true, standards: [
    std('Plan before code', 'Plan each milestone first and ask about anything the specs leave open before writing code.', '# Plan before code\n\nStart in plan mode. List questions about unclear requirements, wait for answers, then build.\n\n## Why\n\nA few minutes of planning avoids rebuilding the wrong thing.'),
    std('Tests with the code', 'Write tests with each change: the success path, the failure path, and a re-run of the existing suite.', '# Tests with the code\n\nAdd tests for new behaviour, including failure cases. Run the full suite before finishing.\n\n## Why\n\nRegressions appear when earlier milestones are changed.'),
    std('Milestone log', 'At the end of each milestone, write a log of what is new, decisions made that the spec did not cover, and open issues.', '# Milestone log\n\nWrite `milestone-log.md`: a plain-language list of what is new (so a person knows what to check), then technical notes, decisions not in the spec, and open issues.\n\n## Why\n\nThe next milestone starts with a clean context; the log passes the baton.'),
  ] },
]
