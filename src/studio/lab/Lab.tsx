/** ProdOps Lab: instant drafts, readiness, versions and the agent handoff pack. */
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { X } from 'lucide-react'
import './lab.css'
import type { StudioProject } from '../model'
import { applyDrafts } from './apply'
import { workflows, type Role } from '../workflows'
import { analyse, reportMarkdown, traceabilityMarkdown, type Level } from './readiness'
import { compare, iterationBrief, impact, loadVersions, saveVersions, takeSnapshot, type Snapshot } from './versions'
import { buildAgentPack, PLATFORMS, type Platform } from './agentpack'
import { compileBrief, draftFiles, patterns, type Pattern } from './offline'

export type LabTab = 'draft' | 'readiness' | 'versions' | 'pack'
interface Props {
  project: StudioProject
  setProject: Dispatch<SetStateAction<StudioProject>>
  projectId: string
  role: Role
  stepId: string
  initialTab?: LabTab
  notify: (message: string) => void
  onClose: () => void
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
const saveText = (text: string, name: string) => download(new Blob([text], { type: 'text/markdown' }), name)
const ICON: Record<Level, string> = { pass: '✓', warn: '!', fail: '✕' }
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project'
const when = (t: number) => new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function Lab({ project, setProject, projectId, role, stepId, initialTab = 'readiness', notify, onClose }: Props) {
  const [tab, setTab] = useState<LabTab>(initialTab)
  const report = useMemo(() => analyse(project), [project])
  const stepLabel = workflows[role].find(s => s.id === stepId)?.label ?? stepId

  // ---- draft -----------------------------------------------------------
  const [options, setOptions] = useState<Pattern[]>([])
  const [pattern, setPattern] = useState('')
  const [working, setWorking] = useState(false)
  useEffect(() => { void patterns().then(setOptions).catch(() => setOptions([])) }, [])
  async function draft(scope: 'step' | 'role' | 'all') {
    if (!project.spec.trim()) { notify('Add a brief or project context first; the draft is built from it.'); return }
    setWorking(true)
    try {
      const compiled = await compileBrief(project.spec, { archetypeId: pattern || undefined })
      const targets: { role: Role; stepId: string }[] = scope === 'step' ? [{ role, stepId }]
        : (scope === 'role' ? [role] : (Object.keys(workflows) as Role[])).flatMap(r => workflows[r].map(s => ({ role: r, stepId: s.id })))
      const drafts = targets.map(t => ({ ...t, files: draftFiles(project, compiled, t.role, t.stepId) }))
      const existing = drafts.some(d => d.files.some(f => project.files.some(e => e.path === f.path)))
      const overwrite = existing && window.confirm('Some of these files already exist. OK replaces them with the new draft; Cancel keeps your files and only adds the missing ones.')
      const result = applyDrafts(project, drafts, overwrite)
      setProject(result.project)
      notify(`Drafted ${result.written} file(s) from ${compiled.archetypeLabel}${result.kept ? `; kept ${result.kept} existing` : ''}. Review before approving.`)
    } catch (e) { notify(e instanceof Error ? e.message : 'Could not draft these files.') } finally { setWorking(false) }
  }

  // ---- versions --------------------------------------------------------
  const [versions, setVersions] = useState<Snapshot[]>(() => loadVersions(localStorage, projectId))
  const [versionName, setVersionName] = useState('')
  const [baseId, setBaseId] = useState('')
  const [open, setOpen] = useState('')
  const base = versions.find(v => v.id === baseId) ?? versions[versions.length - 1]
  const diff = useMemo(() => (base ? compare(base, project) : null), [base, project])
  function persist(list: Snapshot[]) {
    const kept = saveVersions(localStorage, projectId, list)
    setVersions(kept)
    if (kept.length < list.length) notify('Browser storage is limited, so the oldest version was dropped.')
  }
  function save() { persist([...versions, takeSnapshot(project, versionName)]); setVersionName(''); notify('Version saved in this browser.') }
  function restore(v: Snapshot) {
    if (!window.confirm(`Replace the current files and brief with "${v.name}"? Save a version first if you want to keep the current state.`)) return
    setProject(p => ({ ...p, spec: v.spec, files: v.files.map(f => ({ ...f })), stepDecisions: JSON.parse(JSON.stringify(v.decisions)), businessApproved: false, designStale: true, developmentStale: true }))
    notify(`Restored "${v.name}". Approvals were kept as saved; downstream work is flagged for review.`)
  }

  // ---- pack ------------------------------------------------------------
  const [platform, setPlatform] = useState<Platform>('web')
  async function pack() {
    try {
      const zip = await buildAgentPack(project, { platform })
      download(await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }), `${slug(project.name)}-agent-pack.zip`)
      notify('Agent pack downloaded.')
    } catch { notify('Could not create the agent pack.') }
  }

  const tabs: { id: LabTab; label: string }[] = [{ id: 'draft', label: 'Instant draft' }, { id: 'readiness', label: 'Readiness' }, { id: 'versions', label: 'Versions' }, { id: 'pack', label: 'Agent pack' }]
  const groups = [...new Set(report.checks.map(c => c.group))]

  return <div className="modal-backdrop" onClick={onClose}><section className="studio-modal lab-modal" role="dialog" aria-modal="true" aria-labelledby="lab-title" onClick={e => e.stopPropagation()}>
    <div className="modal-title"><div><span className="small-kicker">PRODOPS LAB</span><h2 id="lab-title">{project.name}</h2></div><button className="plain-icon" onClick={onClose} aria-label="Close Lab"><X size={18}/></button></div>
    <div className="lab-tabs" role="tablist">{tabs.map(t => <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>{t.label}</button>)}</div>

    {tab === 'draft' && <div className="lab-pane">
      <p>Write the spec files for a step <b>on this device</b>, from your brief, with no AI model and no server. The ProdOps compiler proposes entities, flows, screens, tokens and a roadmap; you edit them into your own.</p>
      <p className="lab-caution">These are template drafts, labelled as such in every file. They are a faster start than a blank page, not validated work.</p>
      <label htmlFor="lab-pattern">Starting pattern</label>
      <select id="lab-pattern" value={pattern} onChange={e => setPattern(e.target.value)}><option value="">Choose from my brief</option>{options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
      <div className="lab-actions">
        <button className="button accent" disabled={working} onClick={() => void draft('step')}>Draft “{stepLabel}”</button>
        <button className="button outline" disabled={working} onClick={() => void draft('role')}>Draft this whole role</button>
        <button className="button outline" disabled={working} onClick={() => void draft('all')}>Draft every role</button>
      </div>
      {!project.spec.trim() && <p className="lab-caution">The brief is empty. Add it under Business analysis → Shared project context.</p>}
    </div>}

    {tab === 'readiness' && <div className="lab-pane">
      <div className="lab-score"><b className={report.score >= 80 ? 'good' : report.score >= 50 ? 'mid' : 'bad'}>{report.score}</b><div><b>Handoff readiness</b><p>{report.checks.filter(c => c.level === 'fail').length} failing · {report.checks.filter(c => c.level === 'warn').length} to review · {report.checks.filter(c => c.level === 'pass').length} passing</p></div></div>
      {groups.map(g => <div key={g} className="lab-group"><h3>{g}</h3>{report.checks.filter(c => c.group === g).map(c => <div key={c.id} className={`lab-check ${c.level}`}><span aria-label={c.level}>{ICON[c.level]}</span><div><b>{c.title}</b><p>{c.detail}</p></div></div>)}</div>)}
      {report.requirements.length > 0 && <details className="lab-group"><summary>Traceability — {report.requirements.length} requirements ({report.designCoverage}% design, {report.testCoverage}% tests)</summary>
        <table className="lab-table"><thead><tr><th>Requirement</th><th>Design</th><th>Tests</th></tr></thead><tbody>{report.requirements.slice(0, 60).map((r, i) => <tr key={i}><td>{r.text}</td><td>{r.design ? '✓' : '✕'}</td><td>{r.tests ? '✓' : '✕'}</td></tr>)}</tbody></table></details>}
      <details className="lab-group"><summary>Steps</summary><table className="lab-table"><thead><tr><th>Step</th><th>Status</th><th>Words</th><th>Placeholders</th></tr></thead><tbody>{report.steps.map(s => <tr key={`${s.role}/${s.step}`}><td>{s.role} › {s.label}</td><td>{s.status.replace('_', ' ')}</td><td>{s.words}</td><td>{s.placeholders}</td></tr>)}</tbody></table></details>
      <div className="lab-actions"><button className="button outline" onClick={() => saveText(reportMarkdown(project, report), 'READINESS.md')}>Download readiness report</button><button className="button outline" onClick={() => saveText(traceabilityMarkdown(project, report), 'TRACEABILITY.md')}>Download traceability</button></div>
      <p className="lab-fine">Traceability and distinctiveness checks compare wording and colours. They point at places to look; they cannot judge quality.</p>
    </div>}

    {tab === 'versions' && <div className="lab-pane">
      <p>Save a version before a big change. Comparing it with the current work gives you an <b>iteration brief</b>: what changed, who must look again, and a prompt that asks an agent for only the difference.</p>
      <div className="lab-row"><input aria-label="Version name" value={versionName} maxLength={80} placeholder="Name, e.g. v1 shipped" onChange={e => setVersionName(e.target.value)}/><button className="button accent" onClick={save}>Save version</button></div>
      {!versions.length && <p className="lab-fine">No versions saved for this project yet.</p>}
      {versions.length > 0 && <>
        <div className="lab-versions">{[...versions].reverse().map(v => <div key={v.id} className={`lab-version ${base?.id === v.id ? 'selected' : ''}`}><div><b>{v.name}</b><small>{when(v.createdAt)} · {v.files.length} files</small></div><button className="button outline small" onClick={() => setBaseId(v.id)}>Compare</button><button className="button outline small" onClick={() => restore(v)}>Restore</button><button className="button outline small" aria-label={`Delete ${v.name}`} onClick={() => persist(versions.filter(x => x.id !== v.id))}>Delete</button></div>)}</div>
        {base && diff && <div className="lab-diff"><h3>Current work compared with “{base.name}”</h3>
          <p>{diff.files.length} file(s) changed{diff.specChanged ? ', brief changed' : ''}{diff.decisionChanges.length ? `, ${diff.decisionChanges.length} approval change(s)` : ''}.</p>
          {impact(diff).length > 0 && <p><b>Look again:</b> {impact(diff).map(i => `${i.role} (${i.reason})`).join('; ')}</p>}
          {diff.files.map(f => <div key={f.path} className="lab-file"><button onClick={() => setOpen(open === f.path ? '' : f.path)}><span className={`chg ${f.change}`}>{f.change}</span> {f.path} <small>+{f.added} −{f.removed}</small></button>
            {open === f.path && <pre className="lab-lines">{f.lines.filter(l => l.op !== ' ').slice(0, 120).map((l, i) => <div key={i} className={l.op === '+' ? 'add' : 'del'}>{l.op} {l.text}</div>)}</pre>}</div>)}
          <div className="lab-actions">
            <button className="button accent" disabled={!diff.files.length && !diff.specChanged} onClick={() => saveText(iterationBrief(project, base.name, diff), `iteration-brief-${slug(base.name)}.md`)}>Download iteration brief</button>
            <button className="button outline" disabled={!diff.files.length && !diff.specChanged} onClick={() => {
              const path = `specs/business/iterations/${new Date().toISOString().slice(0, 10)}-${slug(base.name)}.md`
              setProject(p => p.files.some(f => f.path === path) || p.files.length >= 300 ? p : { ...p, files: [...p.files, { path, content: iterationBrief(p, base.name, diff).slice(0, 49000) }] })
              notify(`Saved ${path} in the project.`)
            }}>Save brief into the project</button>
          </div></div>}
      </>}
    </div>}

    {tab === 'pack' && <div className="lab-pane">
      <p>One download that works in <b>Claude Code, Codex, Cursor, Gemini CLI and Copilot</b>: the same instructions in each tool’s own file, your specs, milestone prompts, and the readiness and traceability reports.</p>
      <label htmlFor="lab-platform">Target</label>
      <select id="lab-platform" value={platform} onChange={e => setPlatform(e.target.value as Platform)}>{PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
      <ul className="lab-list"><li><code>AGENTS.md</code>, <code>CLAUDE.md</code>, <code>GEMINI.md</code>, <code>.cursor/rules</code>, <code>.github/copilot-instructions.md</code></li><li><code>prompts/</code> — milestones, one-shot, iterate, review</li><li><code>specs/</code>, <code>design/</code>, <code>brief.md</code>, <code>READINESS.md</code>, <code>TRACEABILITY.md</code></li></ul>
      <div className="lab-actions"><button className="button accent" onClick={() => void pack()}>Download agent pack</button></div>
      <p className="lab-fine">The pack contains instructions only. It does not run an agent, and any “Local template draft” inside it still needs human review.</p>
    </div>}
  </section></div>
}
