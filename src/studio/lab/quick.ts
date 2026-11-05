/** One-call drafting shared by the step card and the Lab, so both behave the same way. */
import { workflows, type Role } from '../workflows'
import type { StudioProject } from '../model'
import { applyDrafts } from './apply'
import { compileBrief, draftFiles } from './offline'
import { placeholderCount } from './readiness'

export type Scope = 'step' | 'role' | 'all'
export const targetsFor = (scope: Scope, role: Role, stepId: string): { role: Role; stepId: string }[] =>
  scope === 'step' ? [{ role, stepId }] : (scope === 'role' ? [role] : (Object.keys(workflows) as Role[])).flatMap(r => workflows[r].map(s => ({ role: r, stepId: s.id })))

const PATTERN_KEY = 'prodops.lab.pattern.v1'
type Store = Pick<Storage, 'getItem' | 'setItem'>
export function getPattern(store: Store, projectId: string): string {
  try { return (JSON.parse(store.getItem(PATTERN_KEY) ?? '{}') as Record<string, string>)[projectId] ?? '' } catch { return '' }
}
export function setPattern(store: Store, projectId: string, patternId: string) {
  try { const all = JSON.parse(store.getItem(PATTERN_KEY) ?? '{}') as Record<string, string>; if (patternId) all[projectId] = patternId; else delete all[projectId]; store.setItem(PATTERN_KEY, JSON.stringify(all)) } catch { /* storage blocked */ }
}

/** Which pattern the compiler would use for this brief, so the user can correct it before anything is written. */
export async function detectPattern(brief: string, patternId = ''): Promise<string> {
  return (await compileBrief(brief, { archetypeId: patternId || undefined })).archetypeLabel
}

export interface DraftResult { project: StudioProject; written: number; kept: number; pattern: string; drafted: { role: Role; stepId: string }[] }
export const NEEDS_BRIEF = 'Write your brief first, under “Shared project context” on Business analysis → Vision & outcomes. The draft is built from it.'

/** Drafts the chosen steps. `confirmOverwrite` is only asked when a file already exists. */
export async function runDraft(project: StudioProject, targets: { role: Role; stepId: string }[], patternId: string, confirmOverwrite: () => boolean): Promise<DraftResult> {
  if (!project.spec.trim()) throw new Error(NEEDS_BRIEF)
  const compiled = await compileBrief(project.spec, { archetypeId: patternId || undefined })
  const drafts = targets.map(t => ({ ...t, files: draftFiles(project, compiled, t.role, t.stepId) }))
  // Example templates (marked as such) are replaced without asking; only files with your own words need consent.
  const isExample = (path: string) => placeholderCount(project.files.find(e => e.path === path)?.content ?? '') > 0
  const yours = drafts.some(d => d.files.some(f => project.files.some(e => e.path === f.path) && !isExample(f.path)))
  const replaceYours = yours && confirmOverwrite()
  const result = applyDrafts(project, drafts, path => isExample(path) || replaceYours)
  return { ...result, pattern: compiled.archetypeLabel, drafted: targets }
}
