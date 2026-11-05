import { useRef, useState, type DragEvent } from 'react'
import { ArrowDown, ArrowUp, ChevronRight, Columns2, FileCode2, FileText, FilePlus, Folder, FolderOpen, GripVertical } from 'lucide-react'
import { isKeep, numberLabel, type DropPosition, type TreeEntry } from './tree'

interface Props {
  entries: TreeEntry[]
  selected: string
  onOpen: (path: string) => void
  onMove: (dragged: TreeEntry, target: TreeEntry, position: DropPosition) => void
  onAddIn: (folderPath: string) => void
  onDropFiles: (files: FileList) => void
  onSide: (path: string) => void
}

const icon = (path: string) => path.endsWith('.md') ? <FileText size={14}/> : <FileCode2 size={14}/>

/** An IDE-style file tree: numbered rows, folders you can open, and drag-and-drop to reorder or move into a folder. */
export function ExplorerTree({ entries, selected, onOpen, onMove, onAddIn, onDropFiles, onSide }: Props) {
  const dragging = useRef<TreeEntry | null>(null)
  const [closed, setClosed] = useState<Set<string>>(new Set())
  const [mark, setMark] = useState<{ path: string; position: DropPosition } | null>(null)
  const toggle = (path: string) => setClosed(c => { const n = new Set(c); if (n.has(path)) n.delete(path); else n.add(path); return n })

  function position(e: DragEvent<HTMLElement>, entry: TreeEntry): DropPosition {
    const box = e.currentTarget.getBoundingClientRect()
    const ratio = box.height ? (e.clientY - box.top) / box.height : .5
    if (entry.kind === 'folder') return ratio < .25 ? 'before' : ratio > .8 && closed.has(entry.path) ? 'after' : 'into'
    return ratio < .5 ? 'before' : 'after'
  }
  function over(e: DragEvent<HTMLElement>, entry: TreeEntry) {
    if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); return }
    if (!dragging.current) return
    e.preventDefault(); e.stopPropagation()
    setMark({ path: entry.path, position: position(e, entry) })
  }
  function drop(e: DragEvent<HTMLElement>, entry: TreeEntry) {
    if (e.dataTransfer.files.length) { e.preventDefault(); e.stopPropagation(); onDropFiles(e.dataTransfer.files); return }
    const dragged = dragging.current; dragging.current = null; setMark(null)
    if (!dragged) return
    e.preventDefault(); e.stopPropagation()
    onMove(dragged, entry, position(e, entry))
  }
  function nudge(list: TreeEntry[], index: number, direction: -1 | 1) {
    const target = list[index + direction]; if (target) onMove(list[index], target, direction < 0 ? 'before' : 'after')
  }
  function render(raw: TreeEntry[], depth: number) {
    const list = raw.filter(e => !(e.kind === 'file' && isKeep(e.path)))
    return list.map((entry, i) => {
      const cls = `tree-row${entry.kind === 'file' && selected === entry.path ? ' selected' : ''}${mark?.path === entry.path ? ` drop-${mark.position}` : ''}`
      const open = !closed.has(entry.path)
      return <div key={entry.path} role="treeitem" aria-expanded={entry.kind === 'folder' ? open : undefined} aria-selected={entry.path === selected}>
        <div className={cls} style={{ paddingLeft: 6 + depth * 14 }} draggable
          onDragStart={e => { dragging.current = entry; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', entry.path) }}
          onDragEnd={() => { dragging.current = null; setMark(null) }}
          onDragOver={e => over(e, entry)} onDragLeave={() => setMark(m => m?.path === entry.path ? null : m)} onDrop={e => drop(e, entry)}>
          <GripVertical size={12} className="grip" aria-hidden="true"/>
          <span className="tree-no">{numberLabel(i)}</span>
          {entry.kind === 'folder'
            ? <button className="tree-main" onClick={() => toggle(entry.path)} aria-label={`${open ? 'Close' : 'Open'} folder ${entry.name}`}>{open ? <FolderOpen size={14}/> : <Folder size={14}/>}<span>{entry.name}</span><ChevronRight size={12} className={`tree-chev${open ? ' open' : ''}`}/></button>
            : <button className="tree-main" onClick={() => onOpen(entry.path)} title={entry.path}>{icon(entry.path)}<span>{entry.name}</span></button>}
          <span className="tree-actions">
            {entry.kind === 'folder' && <button aria-label={`Add a file to ${entry.name}`} title="Add a file here" onClick={() => onAddIn(entry.path)}><FilePlus size={12}/></button>}
            {entry.kind === 'file' && <button aria-label={`Open ${entry.name} to the side`} title="Open to the side" onClick={() => onSide(entry.path)}><Columns2 size={12}/></button>}
            <button aria-label={`Move ${entry.name} up`} title="Move up" disabled={i === 0} onClick={() => nudge(list, i, -1)}><ArrowUp size={12}/></button>
            <button aria-label={`Move ${entry.name} down`} title="Move down" disabled={i === list.length - 1} onClick={() => nudge(list, i, 1)}><ArrowDown size={12}/></button>
          </span>
        </div>
        {entry.kind === 'folder' && open && <div role="group">{render(entry.children, depth + 1)}</div>}
      </div>
    })
  }
  return <div className="file-list" role="tree" aria-label="Files in this step" onDragOver={e => { if (e.dataTransfer.types.includes('Files')) e.preventDefault() }} onDrop={e => { if (e.dataTransfer.files.length) { e.preventDefault(); onDropFiles(e.dataTransfer.files) } }}>{render(entries, 0)}</div>
}
