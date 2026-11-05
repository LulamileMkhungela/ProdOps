import { applyGenerated, roleOf, type FileItem, type StudioProject } from '../model'
import type { Role } from '../workflows'

/** Adds drafted files for the given steps, one role at a time, and marks those steps in progress. */
export function applyDrafts(project: StudioProject, drafts: { role: Role; stepId: string; files: FileItem[] }[], overwrite: boolean | ((path: string) => boolean)): { project: StudioProject; written: number; kept: number } {
  let next = project, written = 0, kept = 0
  for (const role of [...new Set(drafts.map(d => d.role))]) {
    const incoming: FileItem[] = []
    for (const d of drafts.filter(x => x.role === role)) {
      for (const f of d.files) {
        if (next.files.some(e => e.path === f.path) && !(typeof overwrite === 'function' ? overwrite(f.path) : overwrite)) { kept++; continue }
        if (!incoming.some(i => i.path === f.path)) incoming.push(f)
      }
    }
    if (!incoming.length) continue
    next = applyGenerated(next, role, incoming)
    written += incoming.length
    const decisions = { ...next.stepDecisions }
    for (const d of drafts.filter(x => x.role === role)) {
      const key = `${role}/${d.stepId}`
      if (!decisions[key] || decisions[key].status === 'not_started') decisions[key] = { status: 'in_progress', note: decisions[key]?.note ?? '' }
    }
    next = { ...next, stepDecisions: decisions }
  }
  return { project: next, written, kept }
}

/** Adds or replaces files of any roles, one role at a time, keeping the stale flags honest. */
export function upsertFiles(project: StudioProject, files: FileItem[]): StudioProject {
  let next = project
  for (const role of [...new Set(files.map(f => roleOfPath(f.path)))]) next = applyGenerated(next, role, files.filter(f => roleOfPath(f.path) === role))
  return next
}
function roleOfPath(path: string): Role {
  const r = roleOf(path)
  if (!r) throw new Error(`Not a project path: ${path}`)
  return r
}
