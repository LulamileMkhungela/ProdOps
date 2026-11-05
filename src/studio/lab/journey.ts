/**
 * The guided path through the Lab: what to do, in what order, and why.
 * Status is computed from the project, so it is never out of date.
 */
import type { StudioProject } from '../model'
import { analyse, placeholderCount, type Report } from './readiness'
import { SCOPE_PATH } from './paths'
import { listStandards } from './standards'

export type StepKey = 'brief' | 'draft' | 'review' | 'standards' | 'design' | 'plan' | 'readiness' | 'pack'
export type Tab = 'guide' | 'draft' | 'standards' | 'design' | 'plan' | 'readiness' | 'pack' | 'versions' | 'decisions'
export interface JourneyStep { key: StepKey; title: string; why: string; done: boolean; detail: string; blocked: boolean; tab: Tab | null; action: string }
export interface Journey { steps: JourneyStep[]; done: number; next: JourneyStep | null }

const words = (s: string) => (s.match(/\S+/g) ?? []).length

export function journey(project: StudioProject, report: Report = analyse(project), packed = false): Journey {
  const briefDone = project.spec.trim().length >= 120
  const reqText = project.files.filter(f => f.path.startsWith('specs/business/requirements/')).map(f => f.content).join('\n')
  // The starter files are example templates; they only count once drafted or rewritten.
  const labDraft = reqText.includes('Local template draft')
  const draftDone = words(reqText) >= 60 && (labDraft || placeholderCount(reqText) === 0)
  const roles = ['business', 'design', 'development', 'quality', 'delivery'] as const
  const draftedRoles = roles.filter(r => report.steps.some(x => x.role === r && x.files > 0 && x.placeholders === 0)).length
  const starterOnly = placeholderCount(reqText) > 0 && !labDraft
  const reviewed = project.stepDecisions['business/requirements']?.status === 'approved'
  const standards = listStandards(project).length
  const hasDs = project.files.some(f => f.path === 'design/design-system.md')
  const scope = project.files.find(f => f.path === SCOPE_PATH)
  const outCount = scope ? (/##\s+Out of scope([\s\S]*?)(?=\n##\s|$)/i.exec(scope.content)?.[1] ?? '').split('\n').filter(l => /^\s*[-*]\s+(?!_)/.test(l) && !/^\s*[-*]\s+>/.test(l)).length : 0
  const fails = report.checks.filter(c => c.level === 'fail').length
  const warns = report.checks.filter(c => c.level === 'warn').length

  const steps: JourneyStep[] = [
    { key: 'brief', title: 'Write your brief', why: 'Everything else is built from it. A paragraph on who it is for, the problem, and what success looks like.', done: briefDone, blocked: false, tab: null,
      detail: briefDone ? `${words(project.spec)} words written.` : project.spec.trim() ? 'Too short to build from. Aim for a paragraph (120+ characters).' : 'Nothing written yet.', action: 'Write it' },
    { key: 'draft', title: 'Draft the specs', why: 'Writes labelled template drafts for every step from your brief, with no AI and no server. Pick the starting pattern first.', done: draftDone && draftedRoles === roles.length, blocked: !briefDone, tab: 'draft',
      detail: draftDone ? `${draftedRoles} of ${roles.length} roles drafted${draftedRoles < roles.length ? '. Draft the rest so design, build and tests are covered.' : '.'}` : !briefDone ? 'Write the brief first.' : starterOnly ? 'Only the example templates are in place so far.' : 'Ready to draft.', action: 'Draft' },
    { key: 'review', title: 'Review and edit the drafts', why: 'Drafts are a start, not an answer. Read the requirements, fix what is wrong, then approve the step.', done: reviewed, blocked: !draftDone, tab: null,
      detail: reviewed ? 'Requirements approved.' : draftDone ? 'Open Requirements & scope, edit, then press Approve.' : 'Draft first.', action: 'Open requirements' },
    { key: 'standards', title: 'Write down your standards', why: 'The conventions an agent cannot guess, with the reason for each. Discover them from code, or start from a profile.', done: standards > 0, blocked: false, tab: 'standards',
      detail: standards ? `${standards} standard(s), indexed.` : 'None yet. Optional but strongly advised.', action: 'Standards' },
    { key: 'design', title: 'Document the design system', why: 'Stops screens drifting apart. Generated from your colours and style settings; change them first if the defaults are not yours.', done: hasDs, blocked: false, tab: 'design',
      detail: hasDs ? 'Page and agent rules added.' : 'Not generated yet.', action: 'Design system' },
    { key: 'plan', title: 'Set the scope and milestones', why: 'Decide what is out as well as what is in, then split the build into milestones. Do this after standards and the design system so each milestone prompt can point at them.', done: outCount > 0, blocked: !draftDone, tab: 'plan',
      detail: outCount ? `${outCount} item(s) out of scope.` : draftDone ? 'No scope file yet.' : 'Draft the specs first so there are requirements to scope.', action: 'Scope' },
    { key: 'readiness', title: 'Check readiness', why: 'Finds placeholders behind approvals, weak contrast, a default palette, and requirements nothing covers.', done: draftDone && fails === 0, blocked: !draftDone, tab: 'readiness',
      detail: !draftDone ? 'Nothing to check yet.' : fails ? `${fails} failing, ${warns} to review. Score ${report.score}.` : `Nothing failing${warns ? `, ${warns} to review` : ''}. Score ${report.score}.`, action: 'Check' },
    { key: 'pack', title: 'Hand off to a coding agent', why: 'One download for Claude Code, Cursor, Codex, Gemini CLI or Copilot: instructions, specs, PRD and milestone prompts.', done: packed, blocked: !draftDone, tab: 'pack',
      detail: packed ? 'Pack downloaded.' : draftDone ? 'Ready when you are.' : 'Draft the specs first.', action: 'Get the pack' },
  ]
  return { steps, done: steps.filter(s => s.done).length, next: steps.find(s => !s.done && !s.blocked) ?? steps.find(s => !s.done) ?? null }
}
