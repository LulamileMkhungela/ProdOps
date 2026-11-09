/** File and folder ordering for the explorer. Pure functions, so they can be tested without a browser. */
import { isSafeFile, roleOf, type FileItem } from './model'

export const KEEP = '.gitkeep'
export interface TreeEntry { kind: 'file' | 'folder'; name: string; path: string; files: FileItem[]; children: TreeEntry[] }
export type DropPosition = 'before' | 'after' | 'into'

/** Folders exist only because a file lives in them. An empty folder is kept alive by a .gitkeep file, which is never shown. */
export const isKeep = (path: string) => path.endsWith('/' + KEEP)
export const visibleFiles = (files: FileItem[]) => files.filter(f => !isKeep(f.path))

/** Builds the entries under `base` (for example "specs/design/system/"), in the order the files appear in the project. */
export function buildEntries(files: FileItem[], base: string): TreeEntry[] {
  const out: TreeEntry[] = []
  const folders = new Map<string, TreeEntry>()
  for (const file of files) {
    if (!file.path.startsWith(base)) continue
    const parts = file.path.slice(base.length).split('/')
    if (parts.length === 1) { out.push({ kind: 'file', name: parts[0], path: file.path, files: [file], children: [] }); continue }
    const path = base + parts[0]
    let folder = folders.get(path)
    if (!folder) { folder = { kind: 'folder', name: parts[0], path, files: [], children: [] }; folders.set(path, folder); out.push(folder) }
    folder.files.push(file)
  }
  for (const folder of folders.values()) folder.children = buildEntries(folder.files, folder.path + '/')
  return out
}

/** Which folders of the project belong to the selected step, besides its own spec folder. */
export function extraBases(role: string, step: string): string[] {
  if (role === 'design' && step === 'system') return ['design/']
  if (role === 'development' && step === 'implementation') return ['solution/', 'implementation/']
  if (role === 'business' && step === 'requirements') return ['business/']
  return []
}

const firstIndex = (files: FileItem[], paths: Set<string>) => files.findIndex(f => paths.has(f.path))
const lastIndex = (files: FileItem[], paths: Set<string>) => { let last = -1; files.forEach((f, i) => { if (paths.has(f.path)) last = i }); return last }

/** Moves one entry (a file, or a folder with everything in it) before, after or into another entry. Returns null when the move is not allowed. */
export function moveEntry(files: FileItem[], dragged: TreeEntry, target: TreeEntry, position: DropPosition): FileItem[] | null {
  if (dragged.path === target.path) return null
  if (target.path.startsWith(dragged.path + '/')) return null
  const moving = new Set(dragged.files.map(f => f.path))
  if (position === 'into') {
    if (target.kind !== 'folder') return null
    const targetName = dragged.name
    const prefix = dragged.kind === 'folder' ? dragged.path + '/' : dragged.path
    const renamed = dragged.files.map(f => ({ ...f, path: target.path + '/' + targetName + (dragged.kind === 'folder' ? f.path.slice(prefix.length - 1) : '') }))
    const rest = files.filter(f => !moving.has(f.path))
    if (renamed.some(f => rest.some(r => r.path === f.path) || !isSafeFile(f) || roleOf(f.path) !== roleOf(dragged.path))) return null
    const targetPaths = new Set(target.files.map(f => f.path))
    const at = lastIndex(rest, targetPaths)
    return [...rest.slice(0, at + 1), ...renamed, ...rest.slice(at + 1)]
  }
  const rest = files.filter(f => !moving.has(f.path))
  const targetPaths = new Set(target.files.map(f => f.path))
  const at = position === 'before' ? firstIndex(rest, targetPaths) : lastIndex(rest, targetPaths) + 1
  if (at < 0) return null
  return [...rest.slice(0, at), ...dragged.files.map(f => files.find(x => x.path === f.path)!), ...rest.slice(at)]
}

export const sameOrder = (a: FileItem[], b: FileItem[]) => a.length === b.length && a.every((f, i) => f === b[i])

/** "01", "02" ... for a list position. */
export const numberLabel = (index: number) => String(index + 1).padStart(2, '0')

/** Turns "my notes" into a safe file name that keeps its extension when it has one. */
export function safeName(input: string, fallbackExt = '.md'): string {
  const trimmed = input.trim().replace(/[^a-zA-Z0-9._ -]/g, '-').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^[-.]+|[-.]+$/g, '')
  if (!trimmed) return ''
  return /\.[a-zA-Z0-9]{1,8}$/.test(trimmed) ? trimmed : trimmed + fallbackExt
}

/** Renames a file, or a folder and everything inside it. Returns null when the name is not allowed. */
export function renameEntry(files: FileItem[], entry: TreeEntry, name: string): FileItem[] | null {
  const cleaned = safeName(name, entry.kind === 'folder' ? '' : '.md')
  if (!cleaned || cleaned === '.' || cleaned === '..') return null
  const parent = entry.path.slice(0, entry.path.length - entry.name.length)
  const nextPath = parent + cleaned
  const moving = new Set(entry.files.map(f => f.path))
  const renamedInOrder = entry.files.map(f => ({ ...f, path: nextPath + f.path.slice(entry.path.length) }))
  const rest = files.filter(f => !moving.has(f.path))
  if (renamedInOrder.some(f => !isSafeFile(f) || rest.some(r => r.path === f.path) || roleOf(f.path) !== roleOf(entry.path))) return null
  const byOld = new Map(entry.files.map((f, i) => [f.path, renamedInOrder[i]] as const))
  // Keep each renamed file exactly where it was in the project order.
  return files.map(f => byOld.get(f.path) ?? f)
}
