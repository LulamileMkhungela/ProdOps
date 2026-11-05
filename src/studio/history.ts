/** Browser-local project history. */
import { starterDesignFiles } from './tokens'
import { starterRequirements } from './templates'
import { initialProject, readProject, type StudioProject } from './model'
export const HISTORY_KEY = 'prodops.role-studio.projects.v2'
const RETIRED_EXAMPLE_ID = 'example-orbit-dashboard-v1'
/** Drops the fictional example that earlier versions seeded, and keeps any other project exactly as saved. */
function withoutExamples(history: History): History {
  const projects = history.projects.filter(entry => entry.id !== RETIRED_EXAMPLE_ID).map(entry => entry.id === 'example-casa-v1' ? { ...entry, project: { ...entry.project, name: entry.project.name } } : entry)
  if (!projects.length) { const entry = makeEntry(); return { ...history, activeId: entry.id, projects: [entry] } }
  return { ...history, activeId: projects.some(p => p.id === history.activeId) ? history.activeId : projects[0].id, projects }
}
export const LEGACY_KEY = 'prodops.role-studio.v1'
export interface History { version: 2; activeId: string; projects: { id: string; project: StudioProject }[] }
export const freshProject = (): StudioProject => ({ ...initialProject, files: [...starterDesignFiles(), ...starterRequirements()], references: [], answers: {}, stepDecisions: {} })
const id = () => globalThis.crypto?.randomUUID?.() ?? `p-${Date.now()}-${Math.random().toString(36).slice(2)}`
/** A brand-new project: no name, no files, no text. Nothing is pre-filled. */
export const blankProject = (): StudioProject => ({ ...initialProject, name: '', files: [], references: [], answers: {}, stepDecisions: {} })
export function makeEntry(project = blankProject()) { return { id: id(), project } }
export function loadHistory(storage: Storage): History {
  try {
    const raw = storage.getItem(HISTORY_KEY)
    if (raw) {
      const data = JSON.parse(raw) as History
      if (data.version === 2 && Array.isArray(data.projects) && data.projects.length > 0 && data.projects.length <= 100 && typeof data.activeId === 'string') {
        const projects = data.projects.map(e => ({ id: typeof e.id === 'string' ? e.id : '', project: readProject(e.project) })).filter((e): e is { id: string; project: StudioProject } => !!e.id && e.project !== null)
        if (projects.length === data.projects.length && new Set(projects.map(p => p.id)).size === projects.length && projects.some(p => p.id === data.activeId)) return withoutExamples({ version: 2, activeId: data.activeId, projects })
      }
      // Preserve an invalid history rather than silently replacing it with a fresh one.
      throw new Error('Project history could not be read')
    }
    const legacyRaw = storage.getItem(LEGACY_KEY)
    const legacy = legacyRaw ? readProject(JSON.parse(legacyRaw)) : null
    if (legacyRaw && !legacy) throw new Error('Previous project could not be read')
    const entry = makeEntry(legacy ?? blankProject())
    return withoutExamples({ version: 2, activeId: entry.id, projects: [entry] })
  } catch (error) {
    if (storage.getItem(HISTORY_KEY) || storage.getItem(LEGACY_KEY)) throw error
    const entry = makeEntry(); return { version: 2, activeId: entry.id, projects: [entry] }
  }
}
