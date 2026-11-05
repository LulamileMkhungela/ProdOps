/** The worked example under `examples/clinic-front-desk/`, loaded only when someone opens it. */
/// <reference types="vite/client" />
import { initialProject, readProject, type StudioProject } from './model'

const loaders = import.meta.glob('../../examples/clinic-front-desk/{example.json,project/**/*}', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>
const ROOT = '../../examples/clinic-front-desk/'

export const EXAMPLE_FILE_COUNT = Object.keys(loaders).filter(p => p.startsWith(ROOT + 'project/')).length

/** Builds the saved project from the example folder: example.json holds the brief and review decisions, `project/` holds every file. */
export async function loadExample(): Promise<StudioProject> {
  const meta = JSON.parse(await loaders[ROOT + 'example.json']()) as Partial<StudioProject>
  const files = await Promise.all(Object.entries(loaders).filter(([p]) => p.startsWith(ROOT + 'project/')).map(async ([p, fn]) => ({ path: p.slice((ROOT + 'project/').length), content: await fn() })))
  files.sort((a, b) => a.path.localeCompare(b.path))
  const project = readProject({ ...initialProject, ...meta, files, references: [] })
  if (!project) throw new Error('The worked example is not a valid project')
  return project
}
