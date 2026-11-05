/** Role-based workspace orchestration: project history, handoffs, editing, preview and export. */
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode, type Dispatch, type SetStateAction } from 'react'
import JSZip from 'jszip'
import { ArrowDownToLine, ArrowLeft, ArrowRight, Bot, Check, ChevronDown, ChevronRight, CircleAlert, CircleHelp, Code2, Columns2, FileCode2, FilePlus, FileText, FolderPlus, Folder, LayoutGrid, Library, ListPlus, LoaderCircle, LockKeyhole, Menu, MoreHorizontal, PanelBottom, PanelLeft, PanelRight, Paperclip, PenTool, Pencil, Plus, TriangleAlert, Users, X, Trash2, CheckCircle2 } from 'lucide-react'
import { applyGenerated, contextFor, fileName, isSafeFile, readProject, reconcileStepChanges, roleOf, stepName, updateFile, type FileItem, type Role, type StepStatus, type StudioProject } from './model'
import { loadInstallFiles } from './skills'
import { apiFetch, NO_SERVER_MESSAGE, STATIC_HOST } from './api'
import { Lab, type LabTab } from './lab/Lab'
import { analyse, type Check as ReadinessCheck } from './lab/readiness'
import { starterDesignFiles } from './tokens'
import { ExplorerTree } from './ExplorerTree'
import { Guide } from './Guide'
import { Resources } from './Resources'
import { roleHelp, stepLine } from './plain'
import { buildEntries, extraBases, moveEntry, renameEntry, safeName, visibleFiles, KEEP, type DropPosition, type TreeEntry } from './tree'
import { getPattern } from './lab/quick'
import { workflows, specPrefix } from './workflows'
import { References } from './References'
import { DesignEditor } from './DesignEditor'
import { addFigmaReference, fetchFigmaReference } from './figma'
import { findFigmaLink, parseFigmaLink } from './figma-link'
import { staticPreview } from './static-preview'
import { deliverableFiles, deliverablesFor } from './deliverables'
import { loadExample } from './example'
import { Connections, type ClaudeConnection, type FigmaConnection } from './Connections'
import { HISTORY_KEY, LEGACY_KEY, blankProject, loadHistory, makeEntry } from './history'

const roles: { id: Role; label: string; detail: string; icon: typeof Users; number: string }[] = [
  { id: 'business', label: 'Business analysis', detail: 'Shape the requirements', icon: Users, number: '01' },
  { id: 'design', label: 'Design', detail: 'Create the experience', icon: PenTool, number: '02' },
  { id: 'development', label: 'Development', detail: 'Plan and build', icon: Code2, number: '03' },
  { id: 'quality', label: 'Quality assurance', detail: 'Verify the experience', icon: CheckCircle2, number: '04' },
  { id: 'delivery', label: 'Delivery & operations', detail: 'Release and improve', icon: LayoutGrid, number: '05' },
]
/** Work each role needs from an earlier role. Shown, never forced: a team can carry on without it. */
const needsFrom: Partial<Record<Role, { role: Role; step: string }[]>> = {
  design: [{ role: 'business', step: 'vision' }],
  development: [{ role: 'business', step: 'requirements' }, { role: 'design', step: 'handoff' }],
  quality: [{ role: 'business', step: 'requirements' }, { role: 'development', step: 'verification' }],
  delivery: [{ role: 'quality', step: 'release' }],
}
function download(blob: Blob, name: string) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
const canRunNow = (files: FileItem[]) => files.some(f => f.path === 'solution/index.html') && files.some(f => f.path === 'solution/app.js')
function safeSlug(name: string) { return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'product' }
function saveZip(zip: JSZip, name: string) { return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }).then(blob => download(blob, name)) }
function prdHtml(markdown: string): string {
  const escaped = markdown.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const blocks = escaped.split('\n').map(line => {
    const heading = /^(#{1,3})\s+(.+)$/.exec(line)
    if (heading) return `<h${heading[1].length}>${heading[2]}</h${heading[1].length}>`
    if (/^[-*]\s/.test(line)) return `<p class="bullet">• ${line.slice(2)}</p>`
    return line ? `<p>${line}</p>` : ''
  }).join('\n')
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Product requirements</title><style>body{font:16px/1.7 system-ui;color:#263b32;max-width:800px;margin:3rem auto;padding:0 1.5rem}h1,h2,h3{line-height:1.2;margin-top:2rem}p{white-space:pre-wrap}.bullet{padding-left:1rem}</style><main>${blocks}</main></html>`
}
async function projectZip(project: StudioProject, mode: 'all' | 'skills' | 'code') {
  const zip = new JSZip()
  if (mode !== 'code') for (const [path, content] of Object.entries(await loadInstallFiles())) zip.file(path, content)
  if (mode === 'all') {
    zip.file('.prodops/project.json', JSON.stringify(project, null, 2))
    zip.file('business/original-spec.md', project.spec)
    for (const r of roles) { const notes = project.answers[`context/${r.id}`]; if (notes?.trim()) zip.file(`handoff/${r.id}-context.md`, `# ${r.label} context\n\n${notes}\n`) }
    for (const file of project.files) { zip.file(file.path, file.content); if (file.path.startsWith('specs/') && file.path.endsWith('/shape.md')) zip.file(file.path.replace(/shape\.md$/, 'shape.html'), prdHtml(file.content)) }
    for (const [key, decision] of Object.entries(project.stepDecisions)) { const [r, step] = key.split('/'); const path = `specs/${r}/${step}/review.md`; if (!project.files.some(f => f.path === path)) zip.file(path, `# Review decision\n\nStatus: ${decision.status}\n\n${decision.note || 'No note added.'}\n`) }
    for (const ref of project.references) zip.file(`${specPrefix(ref.role, ref.step)}${ref.mime.startsWith('image/') ? 'visuals' : 'references'}/${ref.id}-${ref.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`, ref.data, { base64: true })
    const prd = project.files.find(f => f.path.toLowerCase() === 'business/prd.md')
    if (prd && !project.files.some(f => f.path.toLowerCase() === 'business/prd.html')) zip.file('business/PRD.html', prdHtml(prd.content))
    zip.file('README.md', `# ${project.name}\n\nStart with business/original-spec.md and the reviewed business files. Design and development files may be drafts; review and test all generated code. The .agents/skills folder contains skill instructions and references for your coding agent. Import this ZIP into ProdOps to continue editing.\n`)
  }
  if (mode === 'code') {
    for (const file of project.files.filter(f => f.path.startsWith('solution/'))) zip.file(file.path.slice('solution/'.length), file.content)
  }
  return zip
}
const fileIcon = (path: string) => path.endsWith('.md') ? <FileText size={15}/> : <FileCode2 size={15}/>
/** A collapsible sidebar section, like the headers in an IDE explorer. */
function Section({ title, badge, open = true, children }: { title: string; badge?: string; open?: boolean; children: ReactNode }) {
  return <details className="ide-section" open={open}><summary><ChevronRight size={14} className="chev"/><span>{title}</span>{badge && <em>{badge}</em>}</summary><div className="ide-section-body">{children}</div></details>
}
function Tag({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) { return <span className={`studio-tag ${tone}`}>{children}</span> }

export function Studio() {
  const [historyLoadError] = useState(() => { try { loadHistory(localStorage); return false } catch { return true } })
  const [history, setHistory] = useState(() => { try { return loadHistory(localStorage) } catch { const entry = makeEntry(); return { version: 2 as const, activeId: entry.id, projects: [entry] } } })
  const activeId = history.activeId
  const project = history.projects.find(p => p.id === activeId)!.project
  const setProject: Dispatch<SetStateAction<StudioProject>> = useCallback(update => setHistory(h => ({ ...h, projects: h.projects.map(entry => {
    if (entry.id !== activeId) return entry
    const next = typeof update === 'function' ? update(entry.project) : update
    return { ...entry, project: reconcileStepChanges(entry.project, next) }
  }) })), [activeId])
  const [role, setRole] = useState<Role>('business')
  const [stepId, setStepId] = useState(workflows.business[0].id)
  const latest = useRef({ project, role, stepId, activeId })
  latest.current = { project, role, stepId, activeId }
  const [selected, setSelected] = useState('business/original-spec.md')
  const [instruction, setInstruction] = useState('')
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [provider, setProvider] = useState<string | null>(null)
  const [claude, setClaude] = useState<ClaudeConnection | null>(null)
  const [figma, setFigma] = useState<FigmaConnection | null>(null)
  const markFigmaVerified = (token: string) => setFigma(current => current?.token === token ? { ...current, verified: true } : current)
  const [showStaticPreview, setShowStaticPreview] = useState(false)
  const [previewImageId, setPreviewImageId] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [showExport, setShowExport] = useState(false)
  const [lab, setLab] = useState<LabTab | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showEditorPreview, setShowEditorPreview] = useState(true)
  const [clarification, setClarification] = useState<{ projectId: string; role: Role; step: string; question: string; snapshot: StudioProject } | null>(null)
  const [clarificationAnswer, setClarificationAnswer] = useState('')
  const [resume, setResume] = useState<{ projectId: string; role: Role; step: string } | null>(null)
  const [mobileNav, setMobileNav] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newPath, setNewPath] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolder, setNewFolder] = useState('')
  const [folderBase, setFolderBase] = useState('')
  const [saved, setSaved] = useState(true)
  // The helper is a drawer you open when you want it, so it never narrows the editor.
  const [agentOpen, setAgentOpen] = useState(false)
  const [sideHidden, setSideHidden] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelTab, setPanelTab] = useState<'review' | 'context' | 'problems' | 'output'>('review')
  const [openTabs, setOpenTabs] = useState<string[]>([])
  const [outputLog, setOutputLog] = useState<{ at: string; text: string }[]>([])
  const [view, setView] = useState<'role' | 'resources'>('role')
  const [guideOpen, setGuideOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  // Any open popup closes when you click away from it, or press Esc.
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (event: PointerEvent) => {
      const node = event.target as HTMLElement | null
      if (!node?.closest?.('.ide-project-menu')) setMenuOpen(false)
    }
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey) }
  }, [menuOpen])
  const [split, setSplit] = useState<string | null>(null)
  const [renamingStep, setRenamingStep] = useState('')
  const [stepDraft, setStepDraft] = useState('')
  const [renamingFile, setRenamingFile] = useState('')
  const [fileDraft, setFileDraft] = useState('')
  const [ignoredWaiting, setIgnoredWaiting] = useState<string[]>([])
  const [designOpenFor, setDesignOpenFor] = useState('')
  const [problems, setProblems] = useState<ReadinessCheck[]>([])
  const nameRef = useRef<HTMLInputElement>(null)
  const stage = workflows[role].find(s => s.id === stepId) ?? workflows[role][0]
  const deferredProject = useDeferredValue(project)
  const answerKey = `${role}/${stage.id}`
  const answer = project.answers[answerKey] ?? ''
  const files = project.files.filter(f => roleOf(f.path) === role)
  const allCount = visibleFiles(project.files).length + (project.spec.trim() ? 1 : 0)
  const selectedFile = project.files.find(f => f.path === selected)
  const stale = role === 'design' ? project.designStale : role === 'development' ? project.developmentStale : false
  const stepIndex = workflows[role].findIndex(s => s.id === stage.id)
  const nextStep = workflows[role][stepIndex + 1]
  const previousStep = workflows[role][stepIndex - 1]
  const roleIds = roles.map(r => r.id)
  const nextRoleId = roleIds[roleIds.indexOf(role) + 1]
  const previousRoleId = roleIds[roleIds.indexOf(role) - 1]
  const statusLabel: Record<StepStatus, string> = { approved: 'Done', rejected: 'Rejected', revisit: 'Revisit', in_progress: 'In progress', not_started: 'Not started' }
  const doneCount = workflows[role].filter(item => project.stepDecisions[`${role}/${item.id}`]?.status === 'approved').length
  const stepPrefix = specPrefix(role, stage.id)
  const stepBase = role === 'design' && stage.id === 'system' ? 'design/' : role === 'development' && stage.id === 'implementation' ? 'solution/' : stepPrefix
  const title = (item: { id: string; label: string }) => stepName(project, role, item.id, item.label)
  const hasTokens = project.files.some(f => f.path === 'design/design-tokens.json')
  // A side-by-side view needs the width: put the helper away while it is open.
  useEffect(() => {
    if (split !== null && typeof window !== 'undefined' && window.innerWidth < 1600) setAgentOpen(false)
  }, [split])
  const stepDeliverables = deliverablesFor(role, stage.id, stepPrefix, title(stage), stage.purpose)
  const missingDeliverables = stepDeliverables.filter(item => !project.files.some(file => file.path === item.path))
  const hasStepContent = Boolean((role === 'business' && stage.id === 'vision' && project.spec.trim()) || visibleFiles(project.files).some(f => f.path.startsWith(stepPrefix)) || (role === 'design' && stage.id === 'system' && hasTokens))
  const projectStarted = Boolean(project.spec.trim() || visibleFiles(project.files).some(file => file.content.trim().length > 0))
  const stepEntries = useMemo(() => {
    const own = buildEntries(project.files, stepPrefix)
    const extra = extraBases(role, stage.id).flatMap((base): TreeEntry[] => { const inside = project.files.filter(f => f.path.startsWith(base)); return inside.length ? [{ kind: 'folder', name: base.replace(/\/$/, ''), path: base.replace(/\/$/, ''), files: inside, children: buildEntries(inside, base) }] : [] })
    const at = (e: TreeEntry) => project.files.findIndex(f => f.path === e.files[0].path)
    return [...own, ...extra].sort((a, b) => at(a) - at(b))
  }, [project.files, stepPrefix, role, stage.id])
  const stepCount = stepEntries.reduce((n, e) => n + visibleFiles(e.files).length, 0)
  const backTarget = previousStep ? { role, step: previousStep.id, label: previousStep.label } : previousRoleId ? { role: previousRoleId, step: workflows[previousRoleId][workflows[previousRoleId].length - 1].id, label: workflows[previousRoleId][workflows[previousRoleId].length - 1].label } : null
  const nextLabel = nextStep ? `Next: ${title(nextStep)}` : nextRoleId ? `Next role: ${roles.find(r => r.id === nextRoleId)?.label}` : 'Finish & download'
  const sideFile = split && split !== '__preview__' && split !== 'business/original-spec.md' ? project.files.find(f => f.path === split) : undefined
  const sidePreview = split === '__preview__' ? staticPreview(project.files, canRunNow(project.files)) : null
  const showDesignEditor = hasTokens || designOpenFor === activeId
  const showWelcome = !selected && !creating && !(role === 'design' && stage.id === 'system' && showDesignEditor)
  const currentQuestion = clarification && clarification.projectId === activeId && clarification.role === role && clarification.step === stage.id && clarification.snapshot === project ? clarification.question : null
  const decision = project.stepDecisions[answerKey] ?? { status: 'not_started' as StepStatus, note: '' }
  const hint = decision.status === 'approved' ? 'Done. Go on when you are ready.' : !hasStepContent ? (role === 'business' && stage.id === 'vision' ? 'Start by writing your brief.' : 'Add a file, an outline or an attachment.') : 'Happy with it? Mark it done, then go on.'
  const previewAvailable = project.files.some(f => f.path === 'solution/index.html' || f.path === 'design/components/preview.html')
  const framework = project.answers['preferences/stack'] || 'existing'
  const codeCount = project.files.filter(f => f.path.startsWith('solution/')).length
  const selectedIsHtml = Boolean(selectedFile && /\.html$/i.test(selectedFile.path) && /^(solution|design\/components)\//.test(selectedFile.path))
  const selectedIsPreviewable = Boolean(selectedFile && (/^solution\/.*\.(html|css|js)$/i.test(selectedFile.path) || /^design\/.*\.(html|css|json)$/i.test(selectedFile.path)))
  const editorPreview = (role === 'design' || role === 'development') && selectedIsPreviewable ? staticPreview(project.files, false, selectedIsHtml ? selected : undefined) : null
  const handoffPaths = role === 'development' || role === 'quality' ? ['specs/business/requirements/business-requirements.md', 'specs/business/requirements/functional-requirements.md', 'specs/design/screens/design-requirements.md'] : ['specs/business/requirements/business-requirements.md', 'specs/business/requirements/functional-requirements.md']
  const stepRefs = project.references.filter(r => r.role === role && r.step === stage.id)
  const waiting = (needsFrom[role] ?? []).map(d => ({ ...d, status: project.stepDecisions[`${d.role}/${d.step}`]?.status ?? 'not_started' })).filter(d => d.status !== 'approved' && !ignoredWaiting.includes(`${answerKey}:${d.role}/${d.step}`))
  const waitingNow = waiting[0]
  const stepDone = decision.status === 'approved'

  useEffect(() => { if (historyLoadError) { setSaved(false); return } try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); localStorage.removeItem(LEGACY_KEY); setSaved(true) } catch { setSaved(false) } }, [history, historyLoadError])
  useEffect(() => { apiFetch('/api/studio').then(r => { if (!r.ok) throw new Error(); return r.json() }).then(d => { setConfigured(d.configured === true); setProvider(typeof d.provider === 'string' ? d.provider : null) }).catch(() => setConfigured(false)) }, [])
  useEffect(() => { if (!message) return; const timer = window.setTimeout(() => setMessage(''), 6500); return () => window.clearTimeout(timer) }, [message])
  useEffect(() => { if (message) setOutputLog(log => [...log.slice(-49), { at: new Date().toLocaleTimeString(), text: message }]) }, [message])
  useEffect(() => { if (selected) setOpenTabs(tabs => tabs.includes(selected) ? tabs : [...tabs, selected].slice(-12)) }, [selected])
  useEffect(() => { setOpenTabs(tabs => { const kept = tabs.filter(path => path === 'business/original-spec.md' || project.files.some(f => f.path === path)); return kept.length === tabs.length ? tabs : kept }) }, [project.files])
  useEffect(() => { setOpenTabs(selected ? [selected] : []) }, [activeId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const timer = window.setTimeout(() => { try { setProblems(analyse(deferredProject).checks.filter(c => c.level !== 'pass')) } catch { setProblems([]) } }, 300)
    return () => window.clearTimeout(timer)
  }, [deferredProject])

  function firstSelection(r: Role, step: string) {
    if (r === 'business' && step === 'vision') return 'business/original-spec.md'
    const prefix = specPrefix(r, step)
    const inStep = visibleFiles(project.files).filter(f => f.path.startsWith(prefix))
    return (inStep.find(f => f.path === prefix + 'shape.md') ?? inStep[0])?.path ?? ''
  }
  function goTo(nextRole: Role, nextStep: string) {
    setView('role'); setRole(nextRole); setStepId(nextStep); setSelected(firstSelection(nextRole, nextStep)); setInstruction(''); setMobileNav(false); setCreating(false); setCreatingFolder(false); setRenamingStep(''); setMenuOpen(false)
    setTimeout(() => document.getElementById('file-workspace')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }), 50)
  }
  function goNext() {
    if (nextStep) { goTo(role, nextStep.id); return }
    if (nextRoleId) { goTo(nextRoleId, workflows[nextRoleId][0].id); setMessage(`${roleHelp[role].name} is finished. Now ${roleHelp[nextRoleId].name}.`); return }
    setMessage('Every role is finished. Download your project.'); setShowExport(true)
  }
  function goBack() { if (backTarget) goTo(backTarget.role, backTarget.step) }
  function setDecision(status: StepStatus) {
    if (status === 'approved' && waitingNow) { setMessage(`Finish “${stepName(project, waitingNow.role, waitingNow.step, workflows[waitingNow.role].find(s => s.id === waitingNow.step)?.label ?? waitingNow.step)}” first, or choose Continue without it above.`); return }
    if (status === 'approved' && !hasStepContent) { setMessage('Add a file or write your brief first, then mark the step done.'); return }
    setProject(p => ({ ...p, stepDecisions: { ...p.stepDecisions, [answerKey]: { status, note: p.stepDecisions[answerKey]?.note ?? '' } } }))
    setMessage(status === 'rejected' ? 'Rejected. Fix the work, then review it again.' : status === 'revisit' ? 'Saved. Come back to it later; you can go on.' : status === 'approved' ? (nextStep ? `Done. Next: ${title(nextStep)}.` : 'Done. Go on to the next role.') : 'Marked as in progress.')
  }
  function newProject() {
    if (history.projects.length >= 100) { setMessage('Too many projects. Download a backup first.'); return }
    const entry = makeEntry(blankProject()); setHistory(h => ({ ...h, activeId: entry.id, projects: [...h.projects, entry] }))
    setView('role'); setRole('business'); setStepId(workflows.business[0].id); setSelected('business/original-spec.md'); setInstruction(''); setSplit(null); setCreating(false); setCreatingFolder(false); setMobileNav(false); setMenuOpen(false)
    setMessage('New project. Give it a name, then write the brief.')
    window.setTimeout(() => { nameRef.current?.focus(); nameRef.current?.select() }, 0)
  }
  function deleteProject() {
    setMenuOpen(false)
    if (!window.confirm(`Delete “${project.name || 'Untitled project'}”? It is removed from this browser. Save a copy first if you need it.`)) return
    setHistory(h => {
      const rest = h.projects.filter(entry => entry.id !== activeId)
      if (!rest.length) { const entry = makeEntry(blankProject()); return { ...h, activeId: entry.id, projects: [entry] } }
      return { ...h, activeId: rest[0].id, projects: rest }
    })
    setRole('business'); setStepId(workflows.business[0].id); setSelected('business/original-spec.md'); setSplit(null); setMobileNav(false)
    setMessage('Project deleted.')
  }
  function openFile(path: string) { setSelected(path); setMobileNav(false) }
  function defaultSplit() { return previewAvailable || canRunNow(project.files) ? '__preview__' : openTabs.find(p => p !== selected) ?? 'business/original-spec.md' }
  function remapPaths(from: string, to: string) {
    const map = (p: string) => p === from ? to : p.startsWith(from + '/') ? to + p.slice(from.length) : p
    setSelected(s => s ? map(s) : s)
    setSplit(s => s ? map(s) : s)
    setOpenTabs(tabs => [...new Set(tabs.map(map))])
  }
  function moveAction(dragged: TreeEntry, target: TreeEntry, position: DropPosition) {
    const next = moveEntry(project.files, dragged, target, position)
    if (!next) { setMessage('It cannot go there.'); return }
    setProject(p => { const n = moveEntry(p.files, dragged, target, position); return n ? { ...p, files: n } : p })
    if (position === 'into') {
      const to = target.path + '/' + dragged.name
      if (dragged.kind === 'file' && selected === dragged.path) setSelected(to)
      else if (dragged.kind === 'folder' && selected.startsWith(dragged.path + '/')) setSelected(to + selected.slice(dragged.path.length))
      setMessage(`Moved ${dragged.name} into ${target.name}.`)
    }
  }
  function renameItem(entry: TreeEntry, name: string) {
    const parent = entry.path.slice(0, entry.path.length - entry.name.length)
    const to = parent + safeName(name, entry.kind === 'folder' ? '' : '.md')
    const next = renameEntry(project.files, entry, name)
    if (!next) { setMessage('That name cannot be used here. Use letters, numbers, - or _.'); return }
    setProject(p => { const n = renameEntry(p.files, entry, name); return n ? { ...p, files: n } : p })
    remapPaths(entry.path, to)
    setMessage(`Renamed to ${to.split('/').pop()}.`)
  }
  function startNewFile(folder?: string) {
    const base = folder ? folder.replace(/\/$/, '') + '/' : stepBase
    setSideHidden(false); setCreatingFolder(false); setCreating(true); setNewPath(base); setMobileNav(true); setRenamingFile('')
  }
  function startNewFolder(parent?: string) {
    setSideHidden(false); setCreating(false); setCreatingFolder(true); setFolderBase(parent ? parent.replace(/\/$/, '') + '/' : stepBase); setNewFolder(''); setMobileNav(true)
  }
  function addFolder() {
    const name = safeName(newFolder, '')
    if (!name) { setMessage('Use letters, numbers, - or _ for a folder name.'); return }
    const base = folderBase || stepBase
    const item = { path: `${base}${name}/${KEEP}`, content: '' }
    if (!isSafeFile(item) || project.files.length >= 300) { setMessage('Could not add the folder.'); return }
    if (project.files.some(f => f.path.startsWith(`${base}${name}/`))) { setMessage('That folder already exists.'); return }
    setProject(p => ({ ...p, files: [...p.files, item] })); setCreatingFolder(false); setNewFolder(''); setMessage(`Folder ${name} added.`)
  }
  function startDesignSystem() { setDesignOpenFor(activeId); const add = starterDesignFiles().filter(f => !project.files.some(x => x.path === f.path)); if (add.length) setProject(applyGenerated(project, 'design', add)) }
  async function quickDraft() {
    if (!project.spec.trim()) { setMessage('Write your brief first. The draft is built from it.'); if (role !== 'business' || stage.id !== 'vision') goTo('business', 'vision'); return }
    setBusy(true)
    try {
      const { runDraft } = await import('./lab/quick')
      const r = await runDraft(project, [{ role, stepId: stage.id }], getPattern(localStorage, activeId), () => window.confirm('This step already has files. OK replaces them with a new draft; Cancel keeps them and adds only what is missing.'))
      setProject(r.project)
      setMessage(`Drafted ${r.written} file(s) for “${title(stage)}” from the pattern “${r.pattern}”${r.kept ? `; kept ${r.kept} you already had` : ''}. Read and edit them, then mark the step done.`)
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not draft this step.') } finally { setBusy(false) }
  }
  async function generate() {
    if (!project.spec.trim()) { setMessage('Add a brief or project context before asking the AI.'); return }
    if (STATIC_HOST) { setMessage(NO_SERVER_MESSAGE); return }
    if (!configured && !claude) { setMessage('Connect Claude above, or ask your administrator to configure an AI provider.'); return }
    const link = findFigmaLink(`${instruction}\n${project.spec}`)
    if (link) {
      const parsed = parseFigmaLink(link)
      if (!parsed) { setMessage('Use a Figma frame link containing a node-id, or remove the link before generating.'); return }
      if (!project.references.some(r => r.source === parsed.source)) {
        setBusy(true); setMessage('Reading your Figma frame…')
        try {
          const frame = await fetchFigmaReference(link, role, stage.id, figma?.token)
          if (latest.current.project !== project || latest.current.role !== role || latest.current.stepId !== stage.id || latest.current.activeId !== activeId) throw new Error('The project changed while importing. Please try again.')
          if (figma) markFigmaVerified(figma.token)
          const updated = addFigmaReference(project, frame)
          setProject(updated); setResume({ projectId: activeId, role, step: stage.id }); setMessage('Figma frame imported. Creating your draft…')
        } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not read the Figma frame.') } finally { setBusy(false) }
        return
      }
    }
    const refs = project.references.filter(r => r.role === role && r.step === stage.id)
    const context = `PROJECT TYPE: ${project.mode === 'existing' ? 'Existing product or change' : 'New product'}\n` + contextFor(project, role) + refs.filter(r => r.mime.startsWith('image/')).map(r => `\n--- Image reference: ${r.name} ---\nImage attached to this request.`).join('')
    const images = refs.filter(r => r.mime.startsWith('image/')).map(r => `data:${r.mime};base64,${r.data}`)
    if (context.length > 120000) { setMessage('Your handoff is too large. Shorten the earlier files before generating.'); return }
    setBusy(true); setMessage('')
    try {
      const res = await apiFetch('/api/studio', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(claude ? { 'X-ProdOps-Claude-Key': claude.key, 'X-ProdOps-Claude-Model': claude.model } : {}) }, body: JSON.stringify({ role, step: stage.id, answer, spec: project.spec, context, instruction: `${framework === 'existing' ? 'Follow the supplied component files and existing stack.' : `Target frontend framework: ${framework}. Respect provided component styles and conventions.`}\n${instruction}`, images }) })
      const data = await res.json() as { files?: FileItem[]; question?: string; error?: string }
      if (!res.ok) throw new Error(data.error || 'Could not generate files.')
      if (latest.current.project !== project || latest.current.role !== role || latest.current.stepId !== stage.id || latest.current.activeId !== activeId) throw new Error('The project changed while generating. The response was not applied; please try again.')
      if (typeof data.question === 'string' && data.question.trim()) { setClarification({ projectId: activeId, role, step: stage.id, question: data.question, snapshot: project }); setClarificationAnswer(''); return }
      if (!Array.isArray(data.files)) throw new Error('The AI response did not contain files.')
      const generated = data.files
      if (generated.some(f => project.files.some(existing => existing.path === f.path)) && !window.confirm('Replace the existing files with this new draft? Choose Cancel to keep the current files.')) { setMessage('Your existing files were kept.'); return }
      const nextProject = applyGenerated(project, role, generated)
      setProject({ ...nextProject, stepDecisions: { ...nextProject.stepDecisions, [answerKey]: { status: 'in_progress', note: nextProject.stepDecisions[answerKey]?.note ?? '' } } })
      setSelected(generated[0]?.path ?? '')
      setMessage('Draft files are ready. Review and edit them before continuing.')
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Generation failed. Your files were not changed.') } finally { setBusy(false) }
  }
  useEffect(() => { if (!resume) return; setResume(null); if (resume.projectId === activeId && resume.role === role && resume.step === stage.id) void generate() }, [resume])
  function answerQuestion() {
    if (!currentQuestion || !clarificationAnswer.trim()) { setMessage('Add an answer, or say you are not sure yet.'); return }
    const transcript = `${answer ? answer + '\n' : ''}Q: ${currentQuestion}\nA: ${clarificationAnswer.trim()}`
    if (transcript.length > 4000) { setMessage('The clarification history is too long. Start a new step or shorten the answer.'); return }
    setProject(p => ({ ...p, answers: { ...p.answers, [answerKey]: transcript } }))
    setClarification(null); setClarificationAnswer(''); setResume({ projectId: activeId, role, step: stage.id })
  }
  async function exportZip(mode: 'all' | 'skills' | 'code') {
    if (mode === 'code' && !codeCount) { setMessage('There are no solution files yet. Generate or add code files first.'); return }
    try { await saveZip(await projectZip(project, mode), `${safeSlug(project.name)}-${mode === 'all' ? 'workspace' : mode}.zip`); setMessage('Your download is ready.') } catch { setMessage('Could not create the download. Please try again.') }
  }
  async function importZip(file: File) {
    try { if (file.size > 10_000_000) throw new Error(); const zip = await JSZip.loadAsync(file); const entry = zip.file('.prodops/project.json'); if (!entry) throw new Error(); const raw = await entry.async('string'); if (raw.length > 5_000_000) throw new Error(); const data = readProject(JSON.parse(raw)); if (!data) throw new Error(); if (history.projects.length >= 100) throw new Error('Project history is full.'); const imported = makeEntry(data); setHistory(h => ({ ...h, activeId: imported.id, projects: [...h.projects, imported] })); setRole('business'); setStepId(workflows.business[0].id); setSelected('business/original-spec.md'); setMessage('Project opened as a separate copy.'); } catch { setMessage('Could not open this file. Choose a ZIP exported from ProdOps.') }
  }
  function removeFile(path: string) {
    if (!window.confirm(`Delete ${path}? This cannot be undone.`)) return
    setProject(p => ({ ...p, files: p.files.filter(f => f.path !== path), businessApproved: role === 'business' ? false : p.businessApproved, designStale: role === 'business' ? true : p.designStale, developmentStale: role === 'business' || role === 'design' ? true : p.developmentStale }))
    setSelected(role === 'business' ? 'business/original-spec.md' : project.files.find(f => roleOf(f.path) === role && f.path !== path)?.path ?? '')
  }
  async function importFiles(input: FileList) {
    const chosen = Array.from(input)
    if (!chosen.length) return
    const base = stepBase
    try {
      if (chosen.length > 30 || chosen.some(f => f.size > 50000 || !/\.(md|txt|json|html|css|scss|js|ts|jsx|tsx|csv|ya?ml)$/i.test(f.name))) throw new Error('Pick up to 30 text files under 50 KB: md, txt, json, html, css, js, ts, csv or yml.')
      const incoming = await Promise.all(chosen.map(async file => ({ path: base + file.name.replace(/[^a-zA-Z0-9_.-]/g, '-'), content: await file.text() })))
      if (latest.current.activeId !== activeId) throw new Error('The project changed. Try again.')
      if (!incoming.every(isSafeFile) || new Set(incoming.map(f => f.path)).size !== incoming.length) throw new Error('Those file names cannot be used.')
      if (incoming.some(f => project.files.some(x => x.path === f.path)) && !window.confirm('Replace the files that have the same names?')) return
      setProject(applyGenerated(project, role, incoming)); setSelected(incoming[0].path); setSideHidden(false)
      setMessage(`${incoming.length} file${incoming.length === 1 ? '' : 's'} added to this step.`)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not import these files.') }
  }
  function createStepTemplates() {
    const prefix = specPrefix(role, stage.id)
    const candidates = deliverableFiles(role, stage.id, prefix, title(stage), stage.purpose).filter(f => !project.files.some(existing => existing.path === f.path))
    if (!candidates.length) { setMessage('This step already has its files. Pick one on the left, or add a new file.'); return }
    try { setProject(applyGenerated(project, role, candidates)); setSelected(candidates[0].path); setSideHidden(false); setMessage('Files added for this step. Write under each heading.') } catch { setMessage('Could not add the files: the project may have reached its file limit.') }
  }
  function addFile() {
    if (project.files.length >= 300) { setMessage('The project has reached its file limit.'); return }
    let typed = newPath.trim().replace(/\/+$/, '')
    // A bare name is added to the step you are in, so nobody needs to know the folder layout.
    if (typed && !/\.[a-zA-Z0-9]{1,8}$/.test(typed.split('/').pop() ?? '')) typed += '.md'
    const path = !typed ? '' : typed.includes('/') ? typed : stepBase + safeName(typed, '.md')
    const item = { path, content: '' }
    if (!path || !isSafeFile(item) || roleOf(path) !== role || path === 'business/original-spec.md') { setMessage(`Type a file name, for example ${stepBase}notes.md`); return }
    if (project.files.some(f => f.path === path)) { setMessage('A file with that name already exists.'); return }
    setProject(p => ({ ...p, files: [...p.files, item], businessApproved: role === 'business' ? false : p.businessApproved, designStale: role === 'business' ? true : p.designStale, developmentStale: role === 'business' || role === 'design' ? true : p.developmentStale }))
    setSelected(path); setCreating(false); setNewPath('')
    setMessage('File added. Type in the editor, then mark the step done.')
  }
  function commitStepRename() {
    const key = renamingStep
    const custom = stepDraft.trim().slice(0, 80)
    setRenamingStep(''); setStepDraft('')
    if (!key) return
    const item = workflows[role].find(s => `${role}/${s.id}` === key)
    if (!item) return
    setProject(p => {
      const labels = { ...p.labels }
      if (!custom || custom === item.label) delete labels[`step/${key}`]
      else labels[`step/${key}`] = custom
      return { ...p, labels }
    })
    if (custom) setMessage(`Step renamed to “${custom}”.`)
  }
  function startStepRename(item: { id: string; label: string }) { setRenamingStep(`${role}/${item.id}`); setStepDraft(title(item)) }
  function commitFileRename(path: string) {
    const entry = stepEntries.flatMap(e => [e, ...e.children]).find(e => e.path === path || e.files.some(f => f.path === path))
    const file = project.files.find(f => f.path === path)
    const value = fileDraft.trim()
    setRenamingFile(''); setFileDraft('')
    if (!file || !value || value === (path.split('/').pop() ?? path)) return
    const single: TreeEntry = { kind: 'file', name: path.split('/').pop() ?? path, path, files: [file], children: [] }
    const target = entry && entry.kind === 'file' ? entry : single
    renameItem(target, value)
  }
  const openExample = async () => {
    try {
      const ex = await loadExample()
      const found = history.projects.find(p => p.project.name === ex.name)
      if (!found && history.projects.length >= 100) { setMessage('The project history is full. Save a copy before adding more.'); return }
      const entry = found ?? makeEntry(ex)
      setHistory(h => ({ ...h, activeId: entry.id, projects: found ? h.projects : [...h.projects, entry] }))
      setRole('development'); setStepId('implementation'); setSelected('solution/index.html'); setInstruction(''); setMobileNav(false); setGuideOpen(false)
      setMessage(found ? 'Switched to the finished example.' : 'Finished example opened. Choose “Run current preview” to use it.')
    } catch { setMessage('The example could not be loaded.') }
  }
  const canRun = project.files.some(f => f.path === 'solution/index.html') && project.files.some(f => f.path === 'solution/app.js')
  const panelTabNow = panelTab === 'context' && role === 'business' ? 'review' : panelTab
  function closeTab(path: string) {
    const index = openTabs.indexOf(path); const rest = openTabs.filter(p => p !== path)
    setOpenTabs(rest)
    if (selected === path) { const next = rest[Math.min(index, rest.length - 1)]; if (next) openDeliverable(next); else setSelected('') }
  }
  function openDeliverable(path: string) {
    if (path === 'business/original-spec.md') { setView('role'); setRole('business'); setStepId('vision'); setSelected(path); return }
    const nextRole = roleOf(path)
    if (!nextRole) return
    const parts = path.split('/')
    const named = parts[0] === 'specs' ? parts[2] : undefined
    const nextStep = named && workflows[nextRole].some(x => x.id === named) ? named : parts[0] === 'specs' ? (nextRole === role ? stage.id : workflows[nextRole][0].id) : nextRole === 'design' ? 'system' : nextRole === 'development' ? 'implementation' : 'requirements'
    setView('role'); setRole(nextRole); setStepId(nextStep); setSelected(path); setInstruction(''); setMobileNav(false)
    document.getElementById('file-workspace')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }

  return <div className={`ide${agentOpen ? ' agent-open' : ''}${sideHidden ? ' side-hidden' : ''}${panelOpen ? '' : ' panel-closed'}`}>{historyLoadError && <div className="history-error" role="alert">Your saved project history could not be read. It has not been overwritten; export any work in this temporary session and restore from a backup.</div>}
    <header className="ide-title">
      <button className="menu-toggle" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={19}/></button>
      <span className="ide-brand"><span className="studio-mark"><LayoutGrid size={14}/></span><b>ProdOps</b></span>
      <div className="ide-command">
        <label htmlFor="project-name" className="sr-only">Project name</label>
        <input id="project-name" ref={nameRef} className="ide-name" value={project.name} maxLength={120} placeholder="Name your project" onChange={e => setProject(p => ({ ...p, name: e.target.value }))}/>
        <span className="ide-switch"><select id="project-picker" aria-label="Choose project" title="Choose project" value={activeId} onChange={e => { const id = e.target.value; setHistory(h => ({ ...h, activeId: id })); setRole('business'); setStepId(workflows.business[0].id); setSelected('business/original-spec.md'); setInstruction(''); setMobileNav(false); setSplit(null) }}>{history.projects.map(p => <option value={p.id} key={p.id}>{p.project.name || 'Untitled project'}</option>)}</select><ChevronDown size={14}/></span>
        <div className="ide-project-menu">
          <button className={`ide-icon${menuOpen ? ' on' : ''}`} aria-label="Project options" aria-expanded={menuOpen} title="Project options" onClick={() => setMenuOpen(v => !v)}><MoreHorizontal size={16}/></button>
          {menuOpen && <><button className="ide-menu-scrim" aria-label="Close project options" onClick={() => setMenuOpen(false)}/>
            <div className="ide-menu" role="menu">
              <button role="menuitem" onClick={() => { setMenuOpen(false); nameRef.current?.focus(); nameRef.current?.select() }}>Rename project<small>Type the new name at the top</small></button>
              <button role="menuitem" onClick={() => { setMenuOpen(false); setShowExport(true) }}>Save a copy<small>Download the whole project as a ZIP</small></button>
              <label role="menuitem" className="import-label">Load a saved copy<small>Restore a project file you saved earlier</small><input type="file" accept=".zip,application/zip" onChange={e => { const file = e.target.files?.[0]; setMenuOpen(false); if (file) void importZip(file); e.target.value = '' }}/></label>
              <hr/>
              <button role="menuitem" className="danger" onClick={deleteProject}>Delete project<small>Removes it from this browser</small></button>
            </div></>}
        </div>
        <button aria-label="New project" title="New project" onClick={newProject}><Plus size={16}/></button>
      </div>
      <div className="ide-title-actions">
        <span className={`ide-save${saved ? '' : ' warn'}`} title={saved ? 'Saved in this browser' : 'This browser could not save'}>{saved ? 'Saved' : 'Not saved'}</span>
        <button className={`ide-icon${guideOpen ? ' on' : ''}`} aria-label="Guide" aria-expanded={guideOpen} title="Guide: steps, video and what comes next" onClick={() => setGuideOpen(true)}><CircleHelp size={17}/></button>
        <button className={`ide-icon${sideHidden ? '' : ' on'}`} onClick={() => setSideHidden(v => !v)} aria-label="Toggle sidebar" aria-pressed={!sideHidden} title="Show or hide the left panel"><PanelLeft size={16}/></button>
        <button className={`ide-icon${panelOpen ? ' on' : ''}`} onClick={() => setPanelOpen(v => !v)} aria-label="Toggle panel" aria-pressed={panelOpen} title="Show or hide the bottom panel"><PanelBottom size={16}/></button>
        <button className={`ide-icon${agentOpen ? ' on' : ''}`} onClick={() => setAgentOpen(v => !v)} aria-label="Toggle agent" aria-pressed={agentOpen} title="Show or hide the AI helper"><PanelRight size={16}/></button>
      </div>
    </header>
    <div className="ide-body">
      <div className="ide-activity">
        <nav aria-label="Choose your role">{roles.map(r => { const done = workflows[r.id].filter(item => project.stepDecisions[`${r.id}/${item.id}`]?.status === 'approved').length; return <button key={r.id} className={view === 'role' && role === r.id ? 'active' : ''} aria-current={view === 'role' && role === r.id ? 'page' : undefined} title={`${r.label}: ${done} of ${workflows[r.id].length} steps done`} onClick={() => { setView('role'); goTo(r.id, workflows[r.id][0].id) }}><r.icon size={22}/><span className="sr-only">{r.label}</span>{done > 0 && <i className={done === workflows[r.id].length ? 'full' : ''}>{done === workflows[r.id].length ? '✓' : done}</i>}</button> })}
        </nav>
        <nav aria-label="Library" className="ide-activity-lib"><button className={view === 'resources' ? 'active' : ''} aria-current={view === 'resources' ? 'page' : undefined} title="Resources — paid library" onClick={() => { setView('resources'); setSideHidden(false); setMobileNav(true) }}><Library size={22}/><span className="sr-only">Resources</span></button></nav>
        <div className="ide-activity-bottom">
          <button className={agentOpen ? 'active' : ''} onClick={() => setAgentOpen(v => !v)} title="AI helper" aria-pressed={agentOpen}><Bot size={22}/><span className="sr-only">AI helper</span></button>
        </div>
      </div>
      <aside className={`ide-side ${mobileNav ? 'show' : ''}`} aria-label={view === 'resources' ? 'Resources' : 'Explorer'}>
        {view === 'resources' ? <>
          <div className="ide-side-head"><span>RESOURCES</span><div className="ide-tools"><button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={15}/></button></div></div>
          <Resources/>
        </> : <>
          <div className="ide-side-head"><span>{roles.find(r => r.id === role)?.label.toUpperCase()}</span><div className="ide-tools"><button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={15}/></button></div></div>
          <p className="ide-role-line">{roleHelp[role].short}</p>
          <Section title="Steps" badge={`${doneCount} of ${workflows[role].length} done`}>
            <div className="ide-progress" aria-hidden="true"><span style={{ width: `${doneCount / workflows[role].length * 100}%` }}/></div>
            <nav className="process-nav" aria-label="Process steps">{workflows[role].map((item, i) => {
              const st = project.stepDecisions[`${role}/${item.id}`]?.status ?? 'not_started'
              const key = `${role}/${item.id}`
              return <div key={item.id} className={`step-row${stage.id === item.id ? ' active' : ''} ${st}`}>
                {renamingStep === key
                  ? <input className="step-rename" aria-label={`Rename step ${title(item)}`} value={stepDraft} autoFocus maxLength={80} onChange={e => setStepDraft(e.target.value)} onBlur={commitStepRename} onKeyDown={e => { if (e.key === 'Enter') commitStepRename(); if (e.key === 'Escape') { setRenamingStep(''); setStepDraft('') } }}/>
                  : <button className={`step-main ${st}${stage.id === item.id ? ' active' : ''}`} aria-current={stage.id === item.id ? 'step' : undefined} title={stepLine(role, item.id, item.purpose)} onClick={() => goTo(role, item.id)}><span className="step-no">{st === 'approved' ? <Check size={12}/> : String(i + 1).padStart(2, '0')}</span><em>{title(item)}</em><small className={`process-state ${st}`}>{st === 'not_started' ? '' : statusLabel[st]}</small></button>}
                {renamingStep !== key && <button className="step-edit" aria-label={`Rename ${title(item)}`} title="Rename this step" onClick={() => startStepRename(item)}><Pencil size={11}/></button>}
              </div>
            })}</nav>
          </Section>
          <Section title="Files in this step" badge={String(stepCount)}>
            <div className="ide-toolbar" role="toolbar" aria-label="File actions">
              <button onClick={() => startNewFile()} title="New file in this step"><FilePlus size={14}/> File</button>
              <button onClick={() => startNewFolder()} title="New folder in this step"><FolderPlus size={14}/> Folder</button>
              <button aria-label="Add step outline" onClick={createStepTemplates} title="Add headings for this step"><ListPlus size={14}/> Outline</button>
              <label className="tb-btn" title="Import files from your computer"><Paperclip size={14}/> Attach<input type="file" multiple hidden aria-label="Import files" onChange={e => { if (e.target.files) void importFiles(e.target.files); e.target.value = '' }}/></label>
            </div>
            {creating && <div className="create-file" id="new-file-form"><input aria-label="New file path" placeholder="notes.md" value={newPath} autoFocus onChange={e => setNewPath(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addFile(); if (e.key === 'Escape') setCreating(false) }}/><button className="button outline small" onClick={addFile}>Add</button><button className="plain-icon" aria-label="Cancel" onClick={() => setCreating(false)}><X size={15}/></button></div>}
            {creatingFolder && <div className="create-file" id="new-folder-form"><input aria-label="New folder name" placeholder="Folder name" value={newFolder} autoFocus onChange={e => setNewFolder(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addFolder(); if (e.key === 'Escape') setCreatingFolder(false) }}/><button className="button outline small" onClick={addFolder}>Add</button><button className="plain-icon" aria-label="Cancel" onClick={() => setCreatingFolder(false)}><X size={15}/></button></div>}
            <ExplorerTree entries={stepEntries} selected={selected} onOpen={openFile} onMove={moveAction}
              onAddIn={folder => startNewFile(folder)} onAddFolderIn={folder => startNewFolder(folder)} onDropFiles={files => void importFiles(files)} onSide={path => setSplit(path)} onRename={renameItem}/>
            {stepCount === 0 && !(role === 'business' && stage.id === 'vision') && <p className="ide-empty">Nothing here yet. Add the files for this step above, or drop one here.</p>}
          </Section>
        </>}
      </aside>
      {mobileNav && <button className="studio-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)}/>}
      <main className="ide-main">
        <div className="ide-tabs" role="tablist" aria-label="Open files">
          {openTabs.map(path => { const base = path.split('/').pop() ?? path; const name = path === 'business/original-spec.md' ? 'Your brief' : openTabs.filter(p => p.split('/').pop() === base).length > 1 ? path.split('/').slice(-2).join('/') : fileName(project, path); return <div key={path} className={`ide-tab${selected === path ? ' active' : ''}`}><button role="tab" aria-selected={selected === path} title={path} onClick={() => openDeliverable(path)}>{fileIcon(path)}<span>{name}</span></button><button className="ide-tab-close" aria-label={`Close ${name}`} onClick={() => closeTab(path)}><X size={12}/></button></div> })}
          <div className="ide-tabs-fill"/>
          <div className="ide-tabs-tools">
            {previewAvailable && <button className="button outline small" onClick={() => setSplit('__preview__')} title="Show a file and the running output together">Code &amp; output</button>}
            {previewAvailable && <button className="button outline small" onClick={() => setShowStaticPreview(true)} title="Compare the UI with an uploaded screenshot">Compare</button>}
            {canRun && <button className="button outline small" onClick={() => setShowPreview(true)} title="Run the code in an isolated frame">Run current preview</button>}
            <button className={`ide-icon${split !== null ? ' on' : ''}`} aria-label="Split editor" aria-pressed={split !== null} title={split === null ? 'View two things side by side' : 'Close the side view'} onClick={() => setSplit(split === null ? defaultSplit() : null)}><Columns2 size={16}/></button>
          </div>
        </div>
        <div className="ide-crumbs"><span>{roles.find(r => r.id === role)?.label}</span><ChevronRight size={12}/><span>{title(stage)}</span>{selected && <><ChevronRight size={12}/><b>{selected === 'business/original-spec.md' ? 'Your brief' : fileName(project, selected)}</b></>}<Tag tone={stepDone ? 'green' : 'peach'}>{statusLabel[decision.status].toUpperCase()}</Tag></div>
        {waitingNow && <div className="waiting-bar">
          <CircleAlert size={15}/>
          <p><b>Waiting on earlier roles</b> · {roleHelp[waitingNow.role].name} “{stepName(project, waitingNow.role, waitingNow.step, workflows[waitingNow.role].find(s => s.id === waitingNow.step)?.label ?? waitingNow.step)}” is {statusLabel[waitingNow.status].toLowerCase()}{waiting.length > 1 ? ` · plus ${waiting.length - 1} more` : ''}. Mark as done and AI drafting stay locked until it is finished — or continue without it.</p>
          <div className="waiting-actions">
            <button className="button outline small" onClick={() => goTo(waitingNow.role, waitingNow.step)}>Open it</button>
            <button className="button ghost small" onClick={() => setIgnoredWaiting(list => [...list, `${answerKey}:${waitingNow.role}/${waitingNow.step}`])}>Continue without it</button>
          </div>
        </div>}
        <div className={`ide-groups${split !== null ? ' split' : ''}`}>
          <div className="ide-editor" id="file-workspace">
            {stale && files.length > 0 && <div className="stale-alert"><CircleHelp size={16}/><span>Earlier work changed. Check these files. Your edits are kept.</span><button className="button outline small" onClick={() => setProject(p => ({ ...p, designStale: role === 'design' ? false : p.designStale, developmentStale: role === 'development' ? false : p.developmentStale }))}>I have reviewed this</button></div>}
            {role === 'design' && stage.id === 'system' && !showDesignEditor && !showWelcome && <div className="start-ds"><span>No colours or text styles yet. Start with a simple set you can edit.</span><button className="button accent small" onClick={startDesignSystem}>Start the design system</button></div>}
            {role === 'design' && stage.id === 'system' && showDesignEditor && <DesignEditor key={activeId} project={project} setProject={setProject}/>}
            {showWelcome && <div className="ide-welcome">
              <h1>{title(stage)}</h1>
              <p>{stepLine(role, stage.id, stage.purpose)}</p>
              <p className="ide-needs-head">What this step makes</p>
              <ul className="role-needs">{stepDeliverables.map(item => <li key={item.path}><FileText size={13}/><span>{item.label}</span></li>)}</ul>
              <div className="ide-welcome-actions">
                {role === 'design' && stage.id === 'system' && <button className="button accent" onClick={startDesignSystem}>Start the design system</button>}
                <button className={`button ${role === 'design' && stage.id === 'system' ? 'outline' : 'accent'}`} onClick={createStepTemplates} disabled={!missingDeliverables.length}>{missingDeliverables.length ? `Add ${missingDeliverables.length} file${missingDeliverables.length === 1 ? '' : 's'} for this step` : 'Files already added'}</button>
                <button className="button outline" onClick={() => startNewFile()}>New file</button>
                <button className="button outline" onClick={() => setAgentOpen(true)}>Ask the AI helper</button>
              </div>
            </div>}
            {selected === 'business/original-spec.md' && !project.name.trim() && <div className="start-name"><label htmlFor="start-project-name">Name your project</label><input id="start-project-name" value={project.name} maxLength={120} placeholder="For example: Customer portal" onChange={e => setProject(p => ({ ...p, name: e.target.value }))}/><p>You can change it any time.</p></div>}
            {selected && <div className="editor-heading">
              <div>
                {selected === 'business/original-spec.md'
                  ? <b>Your brief</b>
                  : renamingFile === selected
                    ? <input className="file-rename" aria-label="Rename file" value={fileDraft} autoFocus maxLength={80} onChange={e => setFileDraft(e.target.value)} onBlur={() => commitFileRename(selected)} onKeyDown={e => { if (e.key === 'Enter') commitFileRename(selected); if (e.key === 'Escape') { setRenamingFile(''); setFileDraft('') } }}/>
                    : <b>{fileName(project, selected)}</b>}
                <p>{selected === 'business/original-spec.md' ? (project.mode === 'existing' ? 'Describe the current product and the change you want.' : 'Write what you are building, who it is for, and why.') : selectedFile?.path}</p>
              </div>
              <div className="editor-actions">
                {selectedFile && <button className="plain-icon" aria-label={`Rename ${selectedFile.path}`} title="Rename this file" onClick={() => { setRenamingFile(selected); setFileDraft(selectedFile.path.split('/').pop() ?? '') }}><Pencil size={14}/></button>}
                {selectedFile && <button className="delete-file" onClick={() => removeFile(selectedFile.path)} aria-label={`Delete ${selectedFile.path}`}><Trash2 size={14}/> Delete</button>}
              </div>
            </div>}
            {selected === 'business/original-spec.md' && role === 'business' && <div className="template-actions"><button onClick={() => setProject(p => ({ ...p, spec: '', businessApproved: false, designStale: true, developmentStale: true }))}>Clear the brief</button></div>}
            {editorPreview && <div className="editor-preview-toggle"><button onClick={() => setShowEditorPreview(!showEditorPreview)}>{showEditorPreview ? 'Hide live preview' : 'Show live preview'}</button><span>{selectedFile?.path.endsWith('.js') ? 'Shows the related page; scripts are off' : 'Updates as you type · scripts off'}</span></div>}
            <div className={editorPreview && showEditorPreview ? 'editor-with-preview' : undefined}><div>{selected === 'business/original-spec.md' ? <textarea className="studio-editor spec-editor" aria-label="Your brief" maxLength={30000} placeholder="What are you building, who is it for, and what must it do? A few sentences is enough." value={project.spec} onChange={e => setProject(p => ({ ...p, spec: e.target.value, businessApproved: false, designStale: true, developmentStale: true }))}/> : selectedFile ? <textarea className="studio-editor file-editor" maxLength={50000} aria-label={`Edit ${selectedFile.path}`} value={selectedFile.content} onChange={e => setProject(p => updateFile(p, selectedFile.path, e.target.value))}/> : (!showWelcome ? <div className="editor-empty"><Folder size={22}/><p>Nothing selected yet.</p><span>Pick a file on the left, or add one.</span></div> : null)}</div>{editorPreview && showEditorPreview && <div className="inline-preview"><b>{selectedIsHtml ? `PREVIEW · ${selected.split('/').pop()}` : 'LIVE HTML/CSS PREVIEW'}</b><iframe title="Live HTML and CSS preview" sandbox="" srcDoc={editorPreview}/></div>}</div>
            {selectedFile && /\.(ts|tsx|jsx|scss)$/i.test(selectedFile.path) && role === 'development' && <p className="preview-limitation">This file needs a framework compiler or preprocessor; it cannot be rendered here. Open an HTML file for a preview.</p>}
            <details className="attach-box" open={stepRefs.length > 0}>
              <summary><Paperclip size={13}/> Attachments {stepRefs.length > 0 && <em>{stepRefs.length}</em>}</summary>
              <References project={project} setProject={setProject} role={role} step={stage.id} figmaToken={figma?.token} onFigmaVerified={markFigmaVerified} showFigma={role === 'design'} showGithub={role === 'development'}/>
            </details>
            <div className="editor-footer"><span><span className="saved-dot"/> {saved ? 'Saved in this browser' : 'Could not save — download a copy'}</span><span>{selected === 'business/original-spec.md' ? `${project.spec.length.toLocaleString()} / 30,000 characters` : selectedFile ? `${selectedFile.content.length.toLocaleString()} characters` : ''}</span></div>
          </div>
          {split !== null && <div className="ide-editor side-pane" aria-label="Side by side view">
            <div className="side-pane-head">
              <label htmlFor="split-target" className="sr-only">Show beside</label>
              <select id="split-target" value={split} onChange={e => setSplit(e.target.value)}>
                {(previewAvailable || canRunNow(project.files)) && <option value="__preview__">Output (live preview)</option>}
                <option value="business/original-spec.md">Your brief</option>
                {visibleFiles(project.files).map(f => <option key={f.path} value={f.path}>{f.path.replace(/^specs\//, '')}</option>)}
              </select>
              <button className="ide-icon" aria-label="Close side view" title="Close side view" onClick={() => setSplit(null)}><X size={14}/></button>
            </div>
            {split === '__preview__'
              ? (sidePreview ? <iframe className="side-preview" title="Side-by-side output" sandbox={canRun ? 'allow-scripts' : ''} srcDoc={sidePreview}/> : <p className="ide-empty">Nothing to show yet. Add solution/index.html in Development → Implementation.</p>)
              : split === 'business/original-spec.md'
                ? <textarea className="studio-editor" aria-label="Side editor: your brief" maxLength={30000} value={project.spec} onChange={e => setProject(p => ({ ...p, spec: e.target.value, businessApproved: false, designStale: true, developmentStale: true }))}/>
                : sideFile ? <textarea className="studio-editor" aria-label={`Side editor: ${sideFile.path}`} maxLength={50000} value={sideFile.content} onChange={e => setProject(p => updateFile(p, sideFile.path, e.target.value))}/> : <p className="ide-empty">That file no longer exists.</p>}
          </div>}
        </div>
        <div className="ide-stepbar" role="group" aria-label="Step navigation">
          {backTarget && <button className="button outline small" onClick={goBack}><ArrowLeft size={14}/> Back</button>}
          <div className="stepbar-mid"><b>Step {stepIndex + 1} of {workflows[role].length}: {title(stage)}</b><span>{hint}</span></div>
          {stepDone ? <span className="done-chip"><Check size={14}/> Done</span> : <button className="button outline small" onClick={() => setDecision('approved')} disabled={Boolean(waitingNow)} title={waitingNow ? 'Finish the earlier role item first, or choose Continue without it' : 'Mark this step done'}><Check size={14}/> Mark as done</button>}
          <button className={`button small ${stepDone || !hasStepContent ? 'outline' : 'accent'}`} onClick={goNext}>{nextLabel} <ArrowRight size={14}/></button>
        </div>
        <section className="ide-panel" aria-label="Panel">
          <div className="ide-panel-tabs" role="tablist">
            <button role="tab" aria-selected={panelTabNow === 'review'} className={panelTabNow === 'review' ? 'active' : ''} onClick={() => { setPanelTab('review'); setPanelOpen(true) }}>Review</button>
            {role !== 'business' && <button role="tab" aria-selected={panelTabNow === 'context'} className={panelTabNow === 'context' ? 'active' : ''} onClick={() => { setPanelTab('context'); setPanelOpen(true) }}>From earlier roles</button>}
            <button role="tab" aria-selected={panelTabNow === 'problems'} className={panelTabNow === 'problems' ? 'active' : ''} onClick={() => { setPanelTab('problems'); setPanelOpen(true) }}>Problems{projectStarted && problems.length > 0 && <i>{problems.length}</i>}</button>
            <button role="tab" aria-selected={panelTabNow === 'output'} className={panelTabNow === 'output' ? 'active' : ''} onClick={() => { setPanelTab('output'); setPanelOpen(true) }}>Activity</button>
            <div className="ide-tabs-fill"/>
            <button className="ide-icon" aria-label="Close panel" title="Close panel" onClick={() => setPanelOpen(false)}><X size={14}/></button>
          </div>
          <div className="ide-panel-body">
            <div hidden={panelTabNow !== 'review'}><div className="step-review">
              <div className="review-title"><div><h3>{title(stage)}</h3><p>Check your work, then pick an outcome.</p></div></div>
              <label htmlFor="decision-note">Note <span>OPTIONAL</span></label>
              <textarea id="decision-note" maxLength={2000} value={decision.note} placeholder="For example: checked with the team." onChange={e => { const note = e.target.value; setProject(p => ({ ...p, stepDecisions: { ...p.stepDecisions, [answerKey]: { status: p.stepDecisions[answerKey]?.status ?? 'not_started', note } } })) }}/>
              <div className="decision-actions">{([['approved', 'Done'], ['in_progress', 'In progress'], ['revisit', 'Revisit later'], ['rejected', 'Rejected']] as const).map(([status, label]) => <button key={status} className={decision.status === status ? 'selected' : ''} onClick={() => setDecision(status)} disabled={Boolean(waitingNow) && status === 'approved'} title={waitingNow && status === 'approved' ? 'Finish the earlier role item first, or choose Continue without it' : undefined}>{label}</button>)}</div>
            </div></div>
            <div hidden={panelTabNow !== 'context'}>{role !== 'business' && <section className="role-handoff"><div className="handoff-header"><div><span className="small-kicker">FROM BUSINESS ANALYSIS</span><h3>Shared project context</h3></div><Tag>{`VISION: ${(project.stepDecisions['business/vision']?.status ?? 'not_started').replace('_', ' ').toUpperCase()}`}</Tag></div><p className="handoff-copy">{project.spec || 'No shared context yet. Business analysis can add it at Vision & outcomes.'}</p><p className="handoff-hint">These are the current source files, including drafts. Approval belongs to its own step; changes appear here automatically.</p>{handoffPaths.map(path => { const file = project.files.find(f => f.path === path); if (!file) return null; const design = path.startsWith('specs/design/'); return <details className="handoff-document" key={path} open><summary>{path.split('/').pop()?.replace('.md', '').replaceAll('-', ' ')} <span>{(project.stepDecisions[design ? 'design/screens' : 'business/requirements']?.status ?? 'not_started').replace('_', ' ')}</span></summary><pre>{file.content}</pre></details> })}<label htmlFor="role-context">Anything else this role should know <span>OPTIONAL</span></label><textarea id="role-context" maxLength={4000} value={project.answers[`context/${role}`] ?? ''} placeholder="Only if it is missing from the shared context." onChange={e => setProject(p => ({ ...p, answers: { ...p.answers, [`context/${role}`]: e.target.value } }))}/><div className="template-actions"><button onClick={() => setProject(p => ({ ...p, answers: { ...p.answers, [`context/${role}`]: '' } }))}>Clear</button></div></section>}</div>
            <div hidden={panelTabNow !== 'problems'} className="ide-problems">{!projectStarted ? <p>Nothing to check yet. Start writing and ProdOps will point out gaps here.</p> : problems.length ? <ul>{problems.map(c => <li key={c.id} className={c.level}>{c.level === 'fail' ? <CircleAlert size={14}/> : <TriangleAlert size={14}/>}<div><b>{c.title}</b><span>{c.detail}</span></div><em>{c.group}</em></li>)}</ul> : <p>No problems found.</p>}</div>
            <div hidden={panelTabNow !== 'output'} className="ide-output">{outputLog.length ? outputLog.map((o, i) => <p key={i}><time>{o.at}</time> {o.text}</p>) : <p>Nothing yet. What ProdOps does for you shows up here.</p>}</div>
          </div>
        </section>
      </main>
      <aside className={`ide-agent${agentOpen ? ' open' : ''}`} aria-label="AI helper">
        <div className="ide-side-head"><span>AI HELPER</span><div className="ide-tools"><button aria-label="Close the AI helper" title="Close" onClick={() => setAgentOpen(false)}><X size={15}/></button></div></div>
        <div className="ide-agent-body">
          {!STATIC_HOST && <Connections claude={claude} setClaude={setClaude} figma={figma} setFigma={setFigma} serverConfigured={configured} serverProvider={provider}/>}
          <div className="ai-card">
            <div className="ai-card-top agent-state"><Tag tone={STATIC_HOST || claude || configured ? 'green' : 'neutral'}>{STATIC_HOST ? 'WORKS OFFLINE' : claude ? 'CLAUDE CONNECTED' : configured ? (provider === 'anthropic' ? 'CLAUDE CONFIGURED' : 'AI CONFIGURED') : configured === null ? 'CHECKING' : 'NOT CONNECTED'}</Tag></div>
            <div className="small-kicker">STEP {stepIndex + 1} OF {workflows[role].length}</div>
            <h3>{title(stage)}</h3>
            <p>{stepLine(role, stage.id, stage.purpose)}</p>
            {currentQuestion ? <div className="clarification"><div className="small-kicker">ONE MORE DETAIL</div><label htmlFor="clarifying-answer">{currentQuestion}</label><textarea id="clarifying-answer" maxLength={2000} placeholder="Your answer, or say you are not sure yet…" value={clarificationAnswer} onChange={e => setClarificationAnswer(e.target.value)}/><button className="button accent full" disabled={busy} onClick={answerQuestion}>Send answer <ArrowRight size={14}/></button></div>
              : <p className="assistant-explain">{STATIC_HOST ? 'Two ways to fill this step: the ready-made outline, or write it yourself. Read it, edit it, then mark the step done.' : 'The outline comes from ProdOps. The AI writes from your brief. Both only touch this step.'}</p>}
            {(role === 'design' || role === 'development') && <label className="framework-picker" htmlFor="target-framework">Frontend style<select id="target-framework" value={framework} onChange={e => { const value = e.target.value; setProject(p => ({ ...p, answers: { ...p.answers, 'preferences/stack': value } })) }}><option value="existing">Follow imported components</option><option value="Angular">Angular</option><option value="React">React</option><option value="HTML and CSS">HTML and CSS</option></select></label>}
            {!STATIC_HOST && <><label htmlFor="extra-direction">What do you need? <span>OPTIONAL</span></label><textarea id="extra-direction" maxLength={3600} placeholder="For example: keep it short and use our existing colours." value={instruction} onChange={e => setInstruction(e.target.value)}/><div className="template-actions"><button onClick={() => setInstruction('')}>Clear</button></div></>}
            {!currentQuestion && <div className="ai-choices">
              {!showWelcome && <div className="ai-choice">
                <b>Outline, no AI</b>
                <span>ProdOps adds the files and headings for this step. Works offline.</span>
                <button className="button outline small full" onClick={createStepTemplates} disabled={busy || !missingDeliverables.length}>{missingDeliverables.length ? `Add ${missingDeliverables.length} file${missingDeliverables.length === 1 ? '' : 's'}` : 'Files already added'}</button>
              </div>}
              <div className="ai-choice">
                <b>{STATIC_HOST ? 'Starter draft, no AI' : 'Write it with AI'}</b>
                <span>{STATIC_HOST ? 'A short starter for this step from your brief. You write the rest.' : 'The AI writes this step from your brief and files. You can edit everything it writes.'}</span>
                <button className="button accent small full" onClick={() => void (STATIC_HOST ? quickDraft() : generate())} disabled={busy || (!STATIC_HOST && Boolean(waitingNow))} title={!STATIC_HOST && waitingNow ? 'Finish the earlier role item first, or choose Continue without it' : undefined}>{busy ? <LoaderCircle className="spin" size={16}/> : null} {busy ? 'Working…' : STATIC_HOST ? 'Make a starter' : 'Draft with AI'}</button>
              </div>
            </div>}
            {waitingNow && <p className="ai-locked"><LockKeyhole size={12}/><span>Locked until “{stepName(project, waitingNow.role, waitingNow.step, workflows[waitingNow.role].find(s => s.id === waitingNow.step)?.label ?? waitingNow.step)}” is done, or choose Continue without it above.</span></p>}
            {STATIC_HOST ? <p className="ai-unavailable">{NO_SERVER_MESSAGE}</p> : configured === false && !claude && <p className="ai-unavailable">Connect Claude above with your API key, or keep editing without AI.</p>}
            {!STATIC_HOST && <div className="ai-note"><LockKeyhole size={13}/><span>Drafting sends your brief, project files, skills and this step’s attachments to your AI provider.</span></div>}
          </div>
        </div>
      </aside>
    </div>
    <footer className="ide-status">
      <button onClick={() => { setPanelTab('problems'); setPanelOpen(true) }} title="Show problems"><CircleAlert size={12}/> {projectStarted ? problems.filter(c => c.level === 'fail').length : 0} <TriangleAlert size={12}/> {projectStarted ? problems.filter(c => c.level === 'warn').length : 0}</button>
      <span>{project.name || 'Untitled project'}</span>
      <span>{roles.find(r => r.id === role)?.label} › {title(stage)}</span>
      <span className="ide-status-fill"/>
      {selected === 'business/original-spec.md' ? <span>{project.spec.length.toLocaleString()} characters</span> : selectedFile && <span>{selectedFile.content.length.toLocaleString()} characters</span>}
      <span>{allCount} file{allCount === 1 ? '' : 's'}</span>
    </footer>
    {guideOpen && <Guide role={role} stepId={stage.id} project={project} onGo={goTo} onExample={() => void openExample()} onWorkspaceGuide={() => { setGuideOpen(false); setLab('guide') }} onClose={() => setGuideOpen(false)}/>}
    {showExport && <div className="modal-backdrop" onClick={() => setShowExport(false)}><section className="studio-modal download-modal" role="dialog" aria-modal="true" aria-labelledby="download-title" onClick={e => e.stopPropagation()}>
      <div className="modal-title"><div><span className="small-kicker">FINISH</span><h2 id="download-title">Download the project</h2></div><button className="plain-icon" aria-label="Close" onClick={() => setShowExport(false)}><X size={19}/></button></div>
      <p>One ZIP with the brief, {project.files.length} files, decisions, attachments and the AI instructions. You can open it in ProdOps again.</p>
      <button className="download-main" onClick={() => { void exportZip('all'); setShowExport(false) }}><ArrowDownToLine size={16}/> Download everything</button>
      <details className="download-more"><summary>Other formats</summary>
        <button className="download-choice" disabled={!codeCount} onClick={() => { void exportZip('code'); setShowExport(false) }}><b>Application code only</b><span>{codeCount ? `${codeCount} code files, ready for an editor.` : 'No application code yet.'}</span></button>
        <button className="download-choice" onClick={() => { void exportZip('skills'); setShowExport(false) }}><b>AI skills only</b><span>Markdown instructions for a coding agent. No project information.</span></button>
      </details>
    </section></div>}
    {showStaticPreview && previewAvailable && <div className="modal-backdrop" onClick={() => setShowStaticPreview(false)}><section className="studio-modal preview-modal compare-modal" role="dialog" aria-modal="true" aria-labelledby="ui-preview-title" onClick={e => e.stopPropagation()}><div className="modal-title"><div><span className="small-kicker">VISUAL REVIEW</span><h2 id="ui-preview-title">Preview the interface</h2></div><button className="plain-icon" aria-label="Close" onClick={() => setShowStaticPreview(false)}><X size={19}/></button></div><p>Static HTML and CSS only. JavaScript, external assets and Figma rendering are not run here; upload a screenshot to compare.</p><div className="compare-content"><div><b>Current UI</b><iframe title="Static UI preview" sandbox="" srcDoc={staticPreview(project.files) ?? ''}/></div><div><b>Reference screenshot</b>{project.references.some(r => r.mime.startsWith('image/')) ? <><label className="preview-image-choice">Choose screenshot<select value={project.references.some(r => r.id === previewImageId && r.mime.startsWith('image/')) ? previewImageId : project.references.find(r => r.mime.startsWith('image/'))!.id} onChange={e => setPreviewImageId(e.target.value)}>{project.references.filter(r => r.mime.startsWith('image/')).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>{(() => { const image = project.references.find(r => r.id === previewImageId && r.mime.startsWith('image/')) ?? project.references.find(r => r.mime.startsWith('image/'))!; return <img alt={`Uploaded design reference ${image.name}`} src={`data:${image.mime};base64,${image.data}`}/> })()}</> : <p>Add a screenshot under “Attachments” to compare it here.</p>}</div></div></section></div>}
    {showPreview && canRun && <div className="modal-backdrop" onClick={() => setShowPreview(false)}><section className="studio-modal preview-modal" role="dialog" aria-modal="true" aria-labelledby="preview-title" onClick={e => e.stopPropagation()}><div className="modal-title"><div><span className="small-kicker">INTERACTIVE PREVIEW</span><h2 id="preview-title">Try the current application</h2></div><button className="plain-icon" aria-label="Close" onClick={() => setShowPreview(false)}><X size={19}/></button></div><p>This runs your current index.html, styles.css and app.js in an isolated frame. Only run code you trust. External resources are blocked, browser storage is unavailable and the preview resets when closed.</p><iframe title="Interactive application preview" sandbox="allow-scripts" srcDoc={staticPreview(project.files, true) ?? ''}/></section></div>}
    {lab && <Lab key={activeId} project={project} setProject={setProject} projectId={activeId} role={role} stepId={stage.id} initialTab={lab} notify={setMessage} onGo={goTo} onClose={() => setLab(null)}/>}
    {message && <div className="studio-toast" role="status">{message}</div>}
  </div>
}
