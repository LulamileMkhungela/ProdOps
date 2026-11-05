/** Rebuilds `examples/clinic-front-desk/handoff-pack/` from the example project, the way the app's "Agent pack" does.
 *  Hand-written milestone logs are never overwritten. Run: npm run example:build */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { buildAgentPack } from '../src/studio/lab/agentpack'
import { initialProject, readProject, type StudioProject } from '../src/studio/model'

export const EXAMPLE = 'examples/clinic-front-desk/'
const walk = (dir: string, base = dir): string[] => readdirSync(dir).flatMap(n => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p, base) : [p.slice(base.length)] })

export function exampleProject(): StudioProject {
  const meta = JSON.parse(readFileSync(EXAMPLE + 'example.json', 'utf8'))
  const files = walk(EXAMPLE + 'project/').sort().map(path => ({ path, content: readFileSync(EXAMPLE + 'project/' + path, 'utf8') }))
  const project = readProject({ ...initialProject, ...meta, files, references: [] })
  if (!project) throw new Error('example.json is not a valid project')
  return project
}

/** The pack files that are not already in `project/` (specs, design and solution live there). */
export async function packFiles(): Promise<Record<string, string>> {
  const zip = await buildAgentPack(exampleProject(), { platform: 'web', now: new Date('2026-11-05T00:00:00Z') })
  const out: Record<string, string> = {}
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir || path.startsWith('specs/') || path.startsWith('design/') || path.startsWith('specs-extra/')) continue
    out[path] = await entry.async('string')
  }
  return out
}

if (process.argv[1]?.endsWith('build-example.ts')) {
  const files = await packFiles(); let written = 0, kept = 0
  for (const [path, content] of Object.entries(files)) {
    const dest = EXAMPLE + 'handoff-pack/' + path
    if (path.endsWith('milestone-log.md') && existsSync(dest)) { kept++; continue }
    mkdirSync(dirname(dest), { recursive: true }); writeFileSync(dest, content); written++
  }
  console.log(`handoff-pack: ${written} written, ${kept} hand-written logs kept`)
}
