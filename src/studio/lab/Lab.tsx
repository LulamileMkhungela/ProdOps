/** ProdOps Lab: a guided path from brief to agent handoff, plus versions and a decision guide. */
import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { Check, X } from 'lucide-react'
import './lab.css'
import type { StudioProject } from '../model'
import { workflows, type Role } from '../workflows'
import { analyse, reportMarkdown, traceabilityMarkdown, type Level } from './readiness'
import { compare, iterationBrief, impact, loadVersions, saveVersions, takeSnapshot, type Snapshot } from './versions'
import { buildAgentPack, PLATFORMS, type Platform } from './agentpack'
import { patterns, type Pattern } from './offline'
import { detectPattern, getPattern, runDraft, setPattern, targetsFor, type Scope } from './quick'
import { journey, type Tab } from './journey'
import { buildPlanFiles } from './prd'
import { Standards } from './Standards'
import { BuildPlan, Decisions, DesignSystem } from './Build'

export type LabTab = Tab
interface Props {
  project: StudioProject
  setProject: Dispatch<SetStateAction<StudioProject>>
  projectId: string
  role: Role
  stepId: string
  initialTab?: LabTab
  notify: (message: string) => void
  /** Close the Lab and show a step in the workspace. */
  onGo: (role: Role, stepId: string) => void
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
const ROLES: Role[] = ['business', 'design', 'development', 'quality', 'delivery']
const ROLE_LABEL: Record<Role, string> = { business: 'Business analysis', design: 'Design', development: 'Development', quality: 'Quality assurance', delivery: 'Delivery' }
const PACKED_KEY = 'prodops.lab.packed.v1'
const wasPacked = (id: string) => { try { return Boolean((JSON.parse(localStorage.getItem(PACKED_KEY) ?? '{}') as Record<string, boolean>)[id]) } catch { return false } }
const markPacked = (id: string) => { try { const all = JSON.parse(localStorage.getItem(PACKED_KEY) ?? '{}') as Record<string, boolean>; all[id] = true; localStorage.setItem(PACKED_KEY, JSON.stringify(all)) } catch { /* storage blocked */ } }

/** Where to go to fix a check, for the checks that have an obvious place. */
const FIX: Record<string, { label: string; tab?: Tab; go?: [Role, string] }> = {
  brief: { label: 'Write the brief', go: ['business', 'vision'] }, 'scope-out': { label: 'Set the scope', tab: 'plan' }, standards: { label: 'Add standards', tab: 'standards' },
  'design-system': { label: 'Generate it', tab: 'design' }, tokens: { label: 'Open design', go: ['design', 'system'] }, palette: { label: 'Open design', go: ['design', 'system'] }, copy: { label: 'Open design', go: ['design', 'system'] },
  'contrast-text': { label: 'Open design', go: ['design', 'system'] }, 'contrast-primary': { label: 'Open design', go: ['design', 'system'] }, 'contrast-button': { label: 'Open design', go: ['design', 'system'] },
  placeholders: { label: 'Draft or edit', tab: 'draft' }, 'req-none': { label: 'Draft the specs', tab: 'draft' }, 'req-design': { label: 'Draft design', tab: 'draft' }, 'req-tests': { label: 'Draft tests', tab: 'draft' }, 
}

export function Lab({ project, setProject, projectId, role, stepId, initialTab = 'guide', notify, onGo, onClose }: Props) {
  const [tab, setTab] = useState<LabTab>(initialTab)
  const [packed, setPacked] = useState(() => wasPacked(projectId))
  const report = useMemo(() => analyse(project), [project])
  const path = useMemo(() => journey(project, report, packed), [project, report, packed])
  const stepLabel = workflows[role].find(s => s.id === stepId)?.label ?? stepId
  const dialog = useRef<HTMLElement>(null)
  useEffect(() => {
    dialog.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const go = (r: Role, s: string) => { onClose(); onGo(r, s) }

  // ---- draft -----------------------------------------------------------
  const [options, setOptions] = useState<Pattern[]>([])
  const [pattern, setPatternState] = useState(() => getPattern(localStorage, projectId))
  const [detected, setDetected] = useState('')
  const [working, setWorking] = useState(false)
  const [last, setLast] = useState<{ pattern: string; written: number; kept: number; roles: Role[] } | null>(null)
  useEffect(() => { void patterns().then(setOptions).catch(() => setOptions([])) }, [])
  useEffect(() => {
    let live = true
    if (project.spec.trim().length < 10) { setDetected(''); return }
    void detectPattern(project.spec, pattern).then(l => { if (live) setDetected(l) }).catch(() => { if (live) setDetected('') })
    return () => { live = false }
  }, [project.spec, pattern])
  const choosePattern = (id: string) => { setPatternState(id); setPattern(localStorage, projectId, id) }
  async function draft(scope: Scope, only?: Role) {
    setWorking(true)
    try {
      const r = await runDraft(project, targetsFor(scope, only ?? role, stepId), pattern, () => window.confirm('Some of these files already exist. OK replaces them with the new draft; Cancel keeps your files and only adds the missing ones.'))
      setProject(r.project)
      setLast({ pattern: r.pattern, written: r.written, kept: r.kept, roles: [...new Set(r.drafted.map(d => d.role))] })
      notify(`Drafted ${r.written} file(s) from “${r.pattern}”${r.kept ? `; kept ${r.kept} existing` : ''}. Review before approving.`)
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
  const shared = { project, setProject, notify, save: saveText, platform }
  const plan = useMemo(() => buildPlanFiles(project, platform).plan, [project, platform])
  async function pack() {
    try {
      const zip = await buildAgentPack(project, { platform })
      download(await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }), `${slug(project.name)}-agent-pack.zip`)
      markPacked(projectId); setPacked(true)
      notify('Agent pack downloaded. The steps below say what to do with it.')
    } catch { notify('Could not create the agent pack.') }
  }

  const nav: { id: LabTab; label: string; n?: string }[] = [
    { id: 'guide', label: 'Overview' },
    { id: 'draft', label: 'Draft specs', n: '2' }, { id: 'standards', label: 'Standards', n: '4' }, { id: 'design', label: 'Design system', n: '5' },
    { id: 'plan', label: 'Scope & milestones', n: '6' }, { id: 'readiness', label: 'Readiness', n: '7' }, { id: 'pack', label: 'Hand off', n: '8' },
  ]
  const tools: { id: LabTab; label: string }[] = [{ id: 'versions', label: 'Versions' }, { id: 'decisions', label: 'Decisions guide' }]
  const stepFor = (id: LabTab) => path.steps.find(s => s.tab === id)
  const groups = [...new Set(report.checks.map(c => c.group))]
  const heading = [...nav, ...tools].find(n => n.id === tab)?.label ?? ''

  return <div className="modal-backdrop"><section ref={dialog} tabIndex={-1} className="studio-modal lab-modal" role="dialog" aria-modal="true" aria-labelledby="lab-title">
    <div className="modal-title"><div><span className="small-kicker">PRODOPS LAB · {path.done} OF {path.steps.length} STEPS DONE</span><h2 id="lab-title">{project.name}</h2></div><button className="plain-icon" onClick={onClose} aria-label="Close Lab"><X size={18}/></button></div>
    <div className="lab-body">
      <nav className="lab-nav" aria-label="Lab sections">
        {nav.map(n => { const s = stepFor(n.id); return <button key={n.id} aria-current={tab === n.id ? 'page' : undefined} className={tab === n.id ? 'active' : ''} onClick={() => setTab(n.id)}>
          <span className={`dot ${s?.done ? 'done' : s && path.next?.key === s.key ? 'next' : ''}`}>{s?.done ? <Check size={11}/> : n.n ?? ''}</span>{n.label}</button> })}
        <small>Tools</small>
        {tools.map(n => <button key={n.id} aria-current={tab === n.id ? 'page' : undefined} className={tab === n.id ? 'active' : ''} onClick={() => setTab(n.id)}><span className="dot"/>{n.label}</button>)}
      </nav>
      <div className="lab-content" role="region" aria-label={heading}>

    {tab === 'guide' && <div className="lab-pane">
      <p>This takes you from an idea to files a coding agent can build from. Work down the list; each step says why it matters and what is needed first. Everything runs in your browser.</p>
      <div className="lab-progress" aria-hidden="true"><i style={{ width: `${(path.done / path.steps.length) * 100}%` }}/></div>
      <ol className="lab-steps">{path.steps.map((s, i) => <li key={s.key} className={`${s.done ? 'done' : ''} ${path.next?.key === s.key ? 'next' : ''} ${s.blocked ? 'blocked' : ''}`}>
        <span className="num">{s.done ? <Check size={13}/> : i + 1}</span>
        <div><b>{s.title}</b><p>{s.why}</p><small>{s.detail}</small></div>
        <button className={`button ${path.next?.key === s.key ? 'accent' : 'outline'} small`} disabled={s.blocked}
          onClick={() => s.tab ? setTab(s.tab) : go(...(s.key === 'brief' ? ['business', 'vision'] : ['business', 'requirements']) as [Role, string])}>{s.done ? 'Open' : s.action}</button></li>)}</ol>
      <p className="lab-fine">Not sure about a choice a coding agent will ask you? Open the Decisions guide. Changing your mind later? Save a version first.</p>
    </div>}

    {tab === 'draft' && <div className="lab-pane">
      <p>Writes the spec files for a step <b>on this device</b>, from your brief, with no AI model and no server. The ProdOps compiler proposes entities, screens, flows and a roadmap; you edit them into your own.</p>
      <p className="lab-caution">These are template drafts, labelled as such in every file. They are a faster start than a blank page, not validated work.</p>
      {!project.spec.trim() ? <div className="lab-card"><b>Write your brief first</b><p>The draft is built from it.</p><div className="lab-actions"><button className="button accent small" onClick={() => go('business', 'vision')}>Open the brief</button></div></div> : <>
        <div className="lab-card"><small>Starting pattern for your brief</small><p><b>{detected || 'Working it out…'}</b>{pattern ? ' (your choice)' : ' (best guess from your wording)'}</p>
          <p className="lab-fine">Check this before you draft. The guess is based on keywords and can be wrong (for example, a booking app for barbers can read as a clinic). If it is off, choose the closest pattern below. You can edit every file afterwards.</p>
          <label htmlFor="lab-pattern">Change starting pattern</label>
          <select id="lab-pattern" value={pattern} onChange={e => choosePattern(e.target.value)}><option value="">Best guess from my brief</option>{options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select></div>
        <div className="lab-roles">{ROLES.map(r => { const st = report.steps.filter(x => x.role === r); const done = st.filter(x => x.files > 0 && x.placeholders === 0).length
          return <div key={r} className="lab-role"><div><b>{ROLE_LABEL[r]}</b><small>{done} of {st.length} steps drafted{done === st.length ? ' ✓' : ''}</small></div>
            <button className={done === st.length ? 'button outline small' : 'button accent small'} disabled={working} onClick={() => void draft('role', r)}>{done === 0 ? 'Draft' : done === st.length ? 'Redraft' : 'Draft the rest'}</button></div> })}</div>
        <div className="lab-actions"><button className="button accent" disabled={working} onClick={() => void draft('all')}>{working ? 'Drafting…' : 'Draft all five roles'}</button>
          <button className="button outline" disabled={working} onClick={() => void draft('step')}>Only “{stepLabel}” (open step)</button></div>
        <p className="lab-fine">Drafting all five roles takes a moment and writes about 150 files. Start with Business analysis if you would rather review in order. Existing files of yours are kept unless you agree to replace them.</p></>}
      {last && <div className="lab-result" role="status"><b>Drafted {last.written} file(s) from “{last.pattern}”.</b>{last.kept > 0 && <> Kept {last.kept} you already had.</>}
        <p>Next: read them and fix what is wrong, then approve each step.</p>
        <div className="lab-actions">{last.roles.map(r => <button key={r} className="button outline small" onClick={() => go(r, workflows[r][0].id)}>Review {ROLE_LABEL[r]}</button>)}</div></div>}
    </div>}

    {tab === 'readiness' && <div className="lab-pane">
      <div className="lab-score"><b className={report.score >= 80 ? 'good' : report.score >= 50 ? 'mid' : 'bad'}>{report.score}</b><div><b>Handoff readiness</b><p>{report.checks.filter(c => c.level === 'fail').length} failing · {report.checks.filter(c => c.level === 'warn').length} to review · {report.checks.filter(c => c.level === 'pass').length} passing</p></div></div>
      {report.score < 30 && <p className="lab-caution">A low score this early is normal. Work through Draft, Standards and Design system, then come back.</p>}
      {groups.map(g => <div key={g} className="lab-group"><h3>{g}</h3>{report.checks.filter(c => c.group === g).map(c => { const rv = report.steps.find(x => x.status === 'revisit' || x.status === 'rejected'); const fix = c.id === 'stale' ? { label: 'Redraft', tab: 'draft' as Tab } : c.id === 'revisit' && rv ? { label: `Open ${rv.label}`, go: [rv.role, rv.step] as [Role, string] } : FIX[c.id]; return <div key={c.id} className={`lab-check ${c.level}`}><span aria-label={c.level}>{ICON[c.level]}</span><div><b>{c.title}</b><p>{c.detail}</p></div>
        {c.id === 'stale' && c.level !== 'pass' && <button className="button accent small" onClick={() => { setProject(p => ({ ...p, designStale: false, developmentStale: false })); notify('Marked as reviewed. Edit again and it will flag the work that follows.') }}>I have reviewed them</button>}
        {c.level !== 'pass' && fix && <button className="button outline small" onClick={() => fix.tab ? setTab(fix.tab) : go(...fix.go!)}>{fix.label}</button>}</div> })}</div>)}
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
              const p2 = `specs/business/iterations/${new Date().toISOString().slice(0, 10)}-${slug(base.name)}.md`
              setProject(p => p.files.some(f => f.path === p2) || p.files.length >= 300 ? p : { ...p, files: [...p.files, { path: p2, content: iterationBrief(p, base.name, diff).slice(0, 49000) }] })
              notify(`Saved ${p2} in the project.`)
            }}>Save brief into the project</button>
          </div></div>}
      </>}
    </div>}

    {tab === 'standards' && <Standards project={project} setProject={setProject} notify={notify} save={saveText} />}
    {tab === 'design' && <DesignSystem {...shared} onGo={go} />}
    {tab === 'plan' && <BuildPlan {...shared} patternId={pattern} />}
    {tab === 'decisions' && <Decisions />}

    {tab === 'pack' && <div className="lab-pane">
      <p>One download that works in <b>Claude Code, Codex, Cursor, Gemini CLI and Copilot</b>: the same instructions in each tool’s own file, your specs, standards, design system, PRD and milestone prompts.</p>
      {path.steps.filter(s => !s.done && s.key !== 'pack' && s.key !== 'review').length > 0 && <p className="lab-caution">Not everything is done yet: {path.steps.filter(s => !s.done && s.key !== 'pack' && s.key !== 'review').map(s => s.title.toLowerCase()).join(', ')}. You can still download; the pack contains what exists now.</p>}
      <label htmlFor="lab-platform">What are you building?</label>
      <select id="lab-platform" value={platform} onChange={e => setPlatform(e.target.value as Platform)}>{PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
      <div className="lab-actions"><button className="button accent" onClick={() => void pack()}>Download agent pack</button></div>
      <h3 className="lab-h">After you download</h3>
      <ol className="lab-list">
        <li>Unzip it into an empty folder (or the root of your repository).</li>
        <li>Open your coding agent in that folder. It reads <code>AGENTS.md</code> (or <code>CLAUDE.md</code> / <code>GEMINI.md</code>) by itself.</li>
        <li>{plan.milestones.length ? <>Give it <code>build-plan/milestones/01-foundation/prompt.md</code>. It will plan first and wait for you.</> : <>Give it <code>prompts/one-shot.md</code>. Tip: draft the specs and scope first, so you get one prompt per milestone.</>}</li>
        <li>After each milestone, read its <code>milestone-log.md</code>, check what is new in the running product, then start the next prompt in a fresh session.</li>
      </ol>
      <p className="lab-fine">This is different from <b>Download project</b> in the top bar, which saves the whole workspace so you can import it back. The pack contains instructions only; it does not run an agent, and any “Local template draft” inside it still needs human review.</p>
    </div>}
      </div>
    </div>
  </section></div>
}
