/** The installed skills and commands under `.agents/`, loaded only when something needs them. */
/// <reference types="vite/client" />
const skillLoaders = import.meta.glob('../../.agents/skills/**/*', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>
const commandLoaders = import.meta.glob('../../.agents/commands/**/*', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>
const upstreamLoaders = import.meta.glob('../../.agents/{UPSTREAM.md,upstream/**/*}', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>

const rel = (path: string) => path.replace('../../', '')
async function load(loaders: Record<string, () => Promise<string>>): Promise<Record<string, string>> {
  const entries = await Promise.all(Object.entries(loaders).map(async ([path, fn]) => [rel(path), await fn()] as const))
  return Object.fromEntries(entries)
}

export const upstreamPaths = Object.keys(upstreamLoaders).map(rel).filter(p => p !== '.agents/UPSTREAM.md')
export const skillPaths = Object.keys(skillLoaders).map(rel)
export const commandPaths = Object.keys(commandLoaders).map(rel)
export const loadSkillFiles = () => load(skillLoaders)
export const loadCommandFiles = () => load(commandLoaders)
/** Skills, commands, the upstream notice and licences: everything an install needs. */
export async function loadInstallFiles(): Promise<Record<string, string>> {
  return { ...(await load(skillLoaders)), ...(await load(commandLoaders)), ...(await load(upstreamLoaders)) }
}

export interface SkillInfo { name: string; description: string; files: number; origin: 'upstream' | 'prodops' }
export interface CommandInfo { path: string; group: string; name: string; title: string }

export function parseFrontmatter(text: string): { name: string; description: string } {
  const m = /^---\n([\s\S]*?)\n---/.exec(text)
  const field = (key: string) => { const line = m?.[1].split('\n').find(l => l.startsWith(`${key}:`)); return line ? line.slice(key.length + 1).trim().replace(/^["']|["']$/g, '') : '' }
  return { name: field('name'), description: field('description') }
}

export async function listSkills(): Promise<SkillInfo[]> {
  const out: SkillInfo[] = []
  for (const [path, fn] of Object.entries(skillLoaders)) {
    const m = /\.agents\/skills\/([^/]+)\/SKILL\.md$/.exec(path); if (!m) continue
    const { name, description } = parseFrontmatter(await fn())
    out.push({ name: name || m[1], description, files: skillPaths.filter(p => p.startsWith(`.agents/skills/${m[1]}/`)).length, origin: m[1].startsWith('prodops-') ? 'prodops' : 'upstream' })
  }
  return out.sort((a, b) => a.origin.localeCompare(b.origin) || a.name.localeCompare(b.name))
}

export async function listCommands(): Promise<CommandInfo[]> {
  const out: CommandInfo[] = []
  for (const [path, fn] of Object.entries(commandLoaders)) {
    const m = /\.agents\/commands\/([^/]+)\/([^/]+)\.md$/.exec(path); if (!m) continue
    const title = /^#\s+(.+)$/m.exec(await fn())?.[1] ?? m[2]
    out.push({ path: rel(path), group: m[1], name: m[2], title })
  }
  return out.sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name))
}
