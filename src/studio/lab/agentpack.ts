/**
 * An agent-agnostic handoff pack.
 *
 * The same specs, instructions and prompts are written in the formats that
 * Claude Code, Codex, Cursor, Gemini CLI and Copilot read, so changing tool
 * does not mean re-explaining the project. Nothing here runs an agent.
 */
import JSZip from 'jszip'
import { workflows, type Role } from '../workflows'
import { roleOf, type StudioProject } from '../model'
import { analyse, reportMarkdown, traceabilityMarkdown } from './readiness'
import { designRules, designSystemFiles } from './designsystem'
import { buildPlanFiles } from './prd'
import { INDEX_PATH, indexYaml, injectMarkdown, listStandards } from './standards'

export type Platform = 'web' | 'mobile' | 'both'
export const PLATFORMS: { id: Platform; label: string }[] = [
  { id: 'web', label: 'Web app (React)' },
  { id: 'mobile', label: 'Mobile app (Expo / React Native)' },
  { id: 'both', label: 'Web and mobile' },
]

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project'

const platformRules = (platform: Platform) => platform === 'web'
  ? ['Build a responsive React web app. Use the design tokens as CSS variables.', 'Support light and dark themes if the tokens define both.']
  : platform === 'mobile'
    ? ['Build with Expo and React Native. Map each design token to a theme object; do not use CSS.', 'Use React Navigation (or Expo Router) for the routes in the architecture spec.', 'Design for touch: 44pt targets, safe areas, one-handed reach, offline-tolerant states.', 'Treat every “hover” interaction in the specs as a press or long-press.']
    : ['Share the data layer and business rules between a React web app and an Expo / React Native app.', 'Keep screens separate per platform; map tokens to CSS variables on web and a theme object on mobile.', 'Touch targets 44pt on mobile; responsive layout on web.']

export function agentsMarkdown(project: StudioProject, platform: Platform): string {
  const standards = listStandards(project)
  const hasDesign = project.files.some(f => f.path === 'design/design-tokens.json' || f.path === 'design/design-system.md')
  const approved = Object.entries(project.stepDecisions).filter(([, d]) => d.status === 'approved').map(([k]) => k)
  return `# ${project.name} — instructions for coding agents

This file is read by Claude Code, Codex, Cursor, Gemini CLI, Copilot and any tool that supports \`AGENTS.md\`.

## Source of truth
Everything about *what* to build is in \`specs/\`. Read, in this order:
1. \`brief.md\` — the shared brief
2. \`specs/business/requirements/\` — business and functional requirements
3. \`specs/design/\` and \`design/\` — design requirements and tokens
4. \`specs/development/\` — architecture, data and tasks
5. \`specs/quality/\` — the cases your tests must cover

Specs marked "Local template draft" were generated from a template and are unverified. Ask before relying on them.
Approved steps: ${approved.length ? approved.join(', ') : 'none yet — treat all specs as drafts.'}

## How to work
- Plan before coding. Propose milestones and ask about anything the specs leave open.
- One milestone at a time. Write tests first for the success path **and** the failure path.
- Do not invent requirements. If a spec is silent, ask.
- Use the named design tokens; do not hard-code colours, sizes or fonts.
- Keep \`READINESS.md\` and \`TRACEABILITY.md\` in mind: every requirement should end up with a screen and a test.

## When something is unclear
Ask, and explain the trade-offs of each option in plain language (cost, risk, what it rules out) before recommending one. Typical questions: where search and sorting happen, whether fields are fixed or configurable, who can see what, whether deleted things are kept.

${hasDesign ? designRules(platform) + '\n' : ''}${standards.length ? injectMarkdown(standards, 'reference').replace('## Standards to follow', `## Standards to follow\n\nThe index is \`${INDEX_PATH}\`: read it first, and open a standard only when its description fits the task.`) + '\n' : ''}## Target platform
${platformRules(platform).map(r => `- ${r}`).join('\n')}

## Definition of done
- Behaviour matches the spec and passes its tests
- Loading, empty, error and success states exist
- Accessible: contrast 4.5:1, keyboard or screen-reader reachable, labelled inputs
- No placeholder text or lorem ipsum
- Notes added for anything that deviates from the spec

## Iterating
When requirements change, use \`prompts/iterate.md\` with an iteration brief. Change only what the brief lists.
`
}

const milestonePrompt = (project: StudioProject, platform: Platform, n: number, label: string, folder: string) =>
  `# Milestone ${String(n).padStart(2, '0')} — ${label}

Read \`AGENTS.md\` first, then \`brief.md\` and every file in \`${folder}\`.
Start in plan mode: summarise what you will build, list questions about anything unclear, and wait for answers.

Then implement **${label}** for ${project.name} (${PLATFORMS.find(p => p.id === platform)?.label}).
- Write the tests first (see \`specs/quality/\`).
- Stop at the end of this milestone and report: what was built, what was skipped, and which spec lines you were unsure about.
`

export interface PackOptions { platform: Platform; now?: Date }

export async function buildAgentPack(project: StudioProject, options: PackOptions): Promise<JSZip> {
  const zip = new JSZip()
  const { platform } = options
  const report = analyse(project)
  const agents = agentsMarkdown(project, platform)

  zip.file('AGENTS.md', agents)
  zip.file('CLAUDE.md', `@AGENTS.md\n\n# Claude Code notes\n- Start in plan mode (Shift+Tab) for each milestone prompt in \`prompts/\`.\n`)
  zip.file('GEMINI.md', `@AGENTS.md\n`)
  zip.file('.github/copilot-instructions.md', agents)
  zip.file('.cursor/rules/prodops.mdc', `---\ndescription: ${project.name} project rules\nalwaysApply: true\n---\n\n${agents}`)
  zip.file('brief.md', `# ${project.name}\n\n${project.spec.trim() || '_No brief written yet._'}\n`)
  zip.file('READINESS.md', reportMarkdown(project, report))
  zip.file('TRACEABILITY.md', traceabilityMarkdown(project, report))

  const present = new Set(project.files.map(f => f.path))
  for (const f of designSystemFiles(project, platform)) if (project.files.some(x => x.path === 'design/design-tokens.json') && !present.has(f.path)) zip.file(f.path, f.content)
  const standards = listStandards(project)
  if (standards.length) zip.file(INDEX_PATH, indexYaml(standards))
  const { plan, files: planFiles } = buildPlanFiles(project, platform)
  for (const f of planFiles) zip.file(f.path, f.content)
  zip.file('prompts/inject-standards.md', `# Inject standards into any task\n\nRead \`${INDEX_PATH}\`${standards.length ? '' : ' (none written yet)'}. Choose the standards whose descriptions fit the task and read only those. Reference them by path in any spec, prompt or skill you write, so they stay the single source of truth; copy their text only when the output must stand alone.\n`)

  for (const file of project.files) zip.file(file.path.startsWith('specs/') || file.path.startsWith('design/') ? file.path : `specs-extra/${file.path}`, file.content)

  const devSteps = workflows.development.filter(step => project.files.some(f => f.path.startsWith(`specs/development/${step.id}/`)))
  const milestones = [
    { label: 'Foundation — tokens, shell and routing', folder: 'specs/design/' },
    ...devSteps.filter(s => ['specification', 'database', 'tasks'].includes(s.id)).map(s => ({ label: s.label, folder: `specs/development/${s.id}/` })),
  ]
  if (!plan.milestones.length) milestones.forEach((m, i) => zip.file(`prompts/${String(i + 1).padStart(2, '0')}-${slug(m.label)}.md`, milestonePrompt(project, platform, i + 1, m.label, m.folder)))
  zip.file('prompts/one-shot.md', `# One-shot build\n\nRead \`AGENTS.md\`, \`brief.md\` and everything under \`specs/\`. In plan mode, list your questions about data, authentication and anything the specs leave open. After answers, build the whole product milestone by milestone, writing tests first. Report gaps at the end.\n`)
  zip.file('prompts/iterate.md', `# Iterate on an existing build\n\nRead \`AGENTS.md\` and the attached iteration brief. Apply **only** the listed changes. Update tests with the code. List any unchanged spec that now conflicts, and ask before changing data models or public interfaces.\n`)
  zip.file('prompts/review.md', `# Review against the specs\n\nCompare the implementation with \`specs/\`. For each requirement in \`TRACEABILITY.md\`, say whether it is built, tested, or missing. Do not fix anything yet; produce a list.\n`)

  const roles = [...new Set(project.files.map(f => roleOf(f.path)).filter(Boolean))] as Role[]
  zip.file('README.md', `# ${project.name} — handoff pack\n\nGenerated ${(options.now ?? new Date()).toISOString().slice(0, 10)} by ProdOps.\n\n- \`AGENTS.md\`, \`CLAUDE.md\`, \`GEMINI.md\`, \`.cursor/rules/\`, \`.github/copilot-instructions.md\` — the same instructions for each tool\n- \`brief.md\`, \`specs/\`, \`design/\` — what to build (${roles.join(', ') || 'no roles yet'})\n- \`build-plan/\` — ${plan.milestones.length ? `the PRD (html and md) and ${plan.milestones.length} milestones, each with a prompt and a log template` : 'not generated: no requirements or scope were found'}
- \`prompts/\` — ${plan.milestones.length ? '' : `${milestones.length} milestone prompt(s), `}one-shot, iterate, review and inject-standards\n- \`READINESS.md\`, \`TRACEABILITY.md\` — how ready the specs are (score ${report.score}/100)\n\nThis pack contains instructions. It does not run an agent, and generated specs need human review.\n`)
  return zip
}
