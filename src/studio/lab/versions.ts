/**
 * Versions and iteration.
 *
 * A snapshot is a named copy of a project's files, brief and decisions. Two
 * snapshots (or a snapshot and the live project) can be compared file by file
 * and line by line, and the difference becomes an iteration brief: what changed,
 * which roles must look again, and a prompt that asks an agent to apply only
 * the delta. That is the "how do I build v2 after v1" step.
 */
import { workflows, type Role } from '../workflows'
import { roleOf, type FileItem, type StudioProject } from '../model'

export interface Snapshot { id: string; name: string; createdAt: number; spec: string; files: FileItem[]; decisions: StudioProject['stepDecisions'] }
export const VERSIONS_KEY = 'prodops.lab.versions.v1'
const MAX_PER_PROJECT = 20
const MAX_BYTES = 3_000_000

export const takeSnapshot = (project: StudioProject, name: string, now = Date.now()): Snapshot => ({
  id: `v-${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
  name: name.trim().slice(0, 80) || `Version ${new Date(now).toISOString().slice(0, 16).replace('T', ' ')}`,
  createdAt: now,
  spec: project.spec,
  files: project.files.map(f => ({ ...f })),
  decisions: JSON.parse(JSON.stringify(project.stepDecisions)),
})

export function loadVersions(storage: Pick<Storage, 'getItem'>, projectId: string): Snapshot[] {
  try {
    const all = JSON.parse(storage.getItem(VERSIONS_KEY) ?? '{}') as Record<string, Snapshot[]>
    const list = all[projectId]
    return Array.isArray(list) ? list.filter(s => s && typeof s.id === 'string' && Array.isArray(s.files)) : []
  } catch { return [] }
}

/** Saves the list, dropping the oldest snapshots first if the browser quota would be exceeded. */
export function saveVersions(storage: Pick<Storage, 'getItem' | 'setItem'>, projectId: string, list: Snapshot[]): Snapshot[] {
  let next = list.slice(-MAX_PER_PROJECT)
  let all: Record<string, Snapshot[]> = {}
  try { all = JSON.parse(storage.getItem(VERSIONS_KEY) ?? '{}') } catch { all = {} }
  while (next.length) {
    const body = JSON.stringify({ ...all, [projectId]: next })
    if (body.length <= MAX_BYTES) {
      try { storage.setItem(VERSIONS_KEY, body); return next } catch { /* quota: drop the oldest and retry */ }
    }
    next = next.slice(1)
  }
  return next
}

export type Change = 'added' | 'removed' | 'modified'
export interface LineOp { op: ' ' | '+' | '-'; text: string }
export interface FileChange { path: string; change: Change; added: number; removed: number; lines: LineOp[] }
export interface Diff { files: FileChange[]; specChanged: boolean; specLines: LineOp[]; decisionChanges: { key: string; from: string; to: string }[] }

/** Line diff by longest common subsequence; large inputs fall back to a whole-file replace. */
export function diffLines(a: string, b: string): LineOp[] {
  const x = a.split('\n'), y = b.split('\n')
  if (x.length * y.length > 4_000_000) return [...x.map(text => ({ op: '-' as const, text })), ...y.map(text => ({ op: '+' as const, text }))]
  const n = x.length, m = y.length
  const table: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) table[i][j] = x[i] === y[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1])
  const out: LineOp[] = []
  let i = 0, j = 0
  while (i < n && j < m) {
    if (x[i] === y[j]) { out.push({ op: ' ', text: x[i] }); i++; j++ }
    else if (table[i + 1][j] >= table[i][j + 1]) out.push({ op: '-', text: x[i++] })
    else out.push({ op: '+', text: y[j++] })
  }
  while (i < n) out.push({ op: '-', text: x[i++] })
  while (j < m) out.push({ op: '+', text: y[j++] })
  return out
}

type Side = Pick<StudioProject, 'spec' | 'files' | 'stepDecisions'> | Snapshot
const decisionsOf = (s: Side) => ('decisions' in s ? s.decisions : s.stepDecisions)

export function compare(from: Side, to: Side): Diff {
  const before = new Map(from.files.map(f => [f.path, f.content]))
  const after = new Map(to.files.map(f => [f.path, f.content]))
  const files: FileChange[] = []
  for (const path of [...new Set([...before.keys(), ...after.keys()])].sort()) {
    const a = before.get(path), b = after.get(path)
    if (a === b) continue
    const change: Change = a === undefined ? 'added' : b === undefined ? 'removed' : 'modified'
    const lines = diffLines(a ?? '', b ?? '')
    files.push({ path, change, added: lines.filter(l => l.op === '+').length, removed: lines.filter(l => l.op === '-').length, lines })
  }
  const decisionChanges: Diff['decisionChanges'] = []
  const d1 = decisionsOf(from), d2 = decisionsOf(to)
  for (const key of [...new Set([...Object.keys(d1), ...Object.keys(d2)])].sort()) {
    const f = d1[key]?.status ?? 'not_started', t = d2[key]?.status ?? 'not_started'
    if (f !== t) decisionChanges.push({ key, from: f, to: t })
  }
  return { files, specChanged: from.spec !== to.spec, specLines: from.spec === to.spec ? [] : diffLines(from.spec, to.spec), decisionChanges }
}

const DOWNSTREAM: Record<Role, Role[]> = {
  business: ['design', 'development', 'quality', 'delivery'],
  design: ['development', 'quality'],
  development: ['quality', 'delivery'],
  quality: ['delivery'],
  delivery: [],
}

export interface Impact { role: Role; reason: string }

/** Which roles must look again, given what changed. */
export function impact(diff: Diff): Impact[] {
  const changed = new Set<Role>()
  if (diff.specChanged) changed.add('business')
  for (const f of diff.files) { const role = roleOf(f.path); if (role) changed.add(role) }
  const out = new Map<Role, string>()
  for (const role of changed) {
    out.set(role, out.get(role) ?? 'its own files changed')
    for (const down of DOWNSTREAM[role]) if (!changed.has(down) && !out.has(down)) out.set(down, `depends on ${role}, which changed`)
  }
  return [...out].map(([role, reason]) => ({ role, reason }))
}

const STEP_OF = /^specs\/([a-z]+)\/([a-z-]+)\//
export function iterationBrief(project: StudioProject, baseName: string, diff: Diff): string {
  const roles = impact(diff)
  const touched = new Set<string>()
  for (const f of diff.files) { const m = STEP_OF.exec(f.path); if (m) touched.add(`${m[1]}/${m[2]}`) }
  const label = (key: string) => { const [r, s] = key.split('/'); return `${r} › ${workflows[r as Role]?.find(x => x.id === s)?.label ?? s}` }
  const out = [`# Iteration brief — ${project.name}`, '', `Changes since **${baseName}**.`, '']
  out.push('## Summary', '', `- ${diff.files.filter(f => f.change === 'added').length} file(s) added, ${diff.files.filter(f => f.change === 'modified').length} modified, ${diff.files.filter(f => f.change === 'removed').length} removed`)
  out.push(`- Shared brief ${diff.specChanged ? '**changed**' : 'unchanged'}`, `- ${diff.decisionChanges.length} approval status change(s)`, '')
  if (diff.specChanged) {
    out.push('## Brief changes', '', '```diff')
    for (const l of diff.specLines.filter(l => l.op !== ' ').slice(0, 60)) out.push(`${l.op} ${l.text}`)
    out.push('```', '')
  }
  out.push('## Files', '')
  for (const f of diff.files) out.push(`- \`${f.path}\` — ${f.change} (+${f.added} −${f.removed})`)
  if (!diff.files.length) out.push('- No file changes.')
  out.push('', '## Who needs to look again', '')
  for (const r of roles) out.push(`- **${r.role}** — ${r.reason}`)
  if (!roles.length) out.push('- Nothing changed.')
  if (touched.size) out.push('', '## Steps touched', '', ...[...touched].sort().map(k => `- ${label(k)}`))
  out.push('', '## Prompt for your coding agent', '',
    'Read `AGENTS.md`, then this brief. Treat the specs as the source of truth.',
    'Apply **only** the changes listed above; do not rebuild areas that did not change.',
    'For each changed file, update the implementation and its tests, then list anything in the unchanged specs that now conflicts.',
    'Stop and ask before changing data models or public interfaces.', '')
  return out.join('\n')
}
