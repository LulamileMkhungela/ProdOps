import { useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import JSZip from 'jszip'
import type { StudioProject } from '../model'
import { upsertFiles } from './apply'
import type { Platform } from './agentpack'
import { designSystemFiles, designSystemHtml } from './designsystem'
import { buildPlanFiles, scopeDraft, SCOPE_PATH } from './prd'
import { matchTradeoffs, TRADEOFFS, tradeoffMarkdown } from './tradeoffs'

interface Props { project: StudioProject; setProject: Dispatch<SetStateAction<StudioProject>>; notify: (m: string) => void; save: (text: string, name: string) => void; platform: Platform }

export function DesignSystem({ project, setProject, notify, platform }: Props) {
  const html = useMemo(() => designSystemHtml(project), [project])
  const has = project.files.some(f => f.path === 'design/design-system.md')
  return <div className="lab-pane">
    <p>A reference page for your colours, type, buttons, forms, badges, listings and modals, with when to use each, when not to, and sample markup. It is generated from <code>design/design-tokens.json</code> and written into the project with agent rules that stop <b>design drift</b>: an agent that has no shared sense of the interface reinvents it every session.</p>
    <iframe className="lab-frame" title="Design system preview" sandbox="" srcDoc={html} />
    <div className="lab-actions"><button className="button accent" onClick={() => { setProject(p => upsertFiles(p, designSystemFiles(p, platform))); notify(has ? 'Design system regenerated from the tokens.' : 'Design system written into design/. Open it under Design.') }}>{has ? 'Regenerate from tokens' : 'Add to project'}</button></div>
    <p className="lab-fine">Change a colour in Design → tokens, then regenerate. The page documents component shapes as guidance; it does not generate component code.</p>
  </div>
}

export function BuildPlan({ project, setProject, notify, save, platform }: Props) {
  const { plan, files } = useMemo(() => buildPlanFiles(project, platform), [project, platform])
  const hasScope = project.files.some(f => f.path === SCOPE_PATH)
  async function downloadZip() {
    const zip = new JSZip(); for (const f of files) zip.file(f.path, f.content)
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'build-plan.zip'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <div className="lab-pane">
    <p>Decide what is <b>out</b> of scope as carefully as what is in, then break the build into milestones. Each milestone gets a prompt that says: plan first, read the PRD, build only this, write a log. The log is how one milestone hands over to the next.</p>
    <div className="lab-actions"><button className="button accent" onClick={() => {
      if (hasScope && !window.confirm('Replace your scope file with a fresh draft?')) return
      setProject(p => upsertFiles(p, [{ path: SCOPE_PATH, content: scopeDraft(p) }])); notify('Scope drafted in specs/business/requirements/scope.md. Cut what you are not building and keep the out-of-scope list honest.')
    }}>{hasScope ? 'Redraft scope' : 'Draft scope from requirements'}</button></div>
    {plan.notes.map((n, i) => <p key={i} className="lab-caution">{n}</p>)}
    {plan.milestones.length > 0 && <>
      <div className="lab-versions">{plan.milestones.map(m => <div key={m.n} className="lab-version"><div><b>{String(m.n).padStart(2, '0')} · {m.title}</b><small>{m.goal}</small></div></div>)}</div>
      <div className="lab-actions"><button className="button outline" onClick={() => save(files.find(f => f.path === 'build-plan/prd.html')!.content, 'prd.html')}>Download PRD (HTML)</button><button className="button outline" onClick={() => void downloadZip()}>Download PRD and milestones (zip)</button></div>
      <p className="lab-fine">The same files are in the Agent pack. The order follows your In-scope list, nudged so a feature comes after the one it mentions (for example a board after the deals it shows).</p>
    </>}
  </div>
}

export function Decisions() {
  const [q, setQ] = useState('')
  const hits = q.trim() ? matchTradeoffs(q, 4) : []
  const [open, setOpen] = useState('')
  const show = q.trim() ? hits : TRADEOFFS
  return <div className="lab-pane">
    <p>When a question like “client-side or server-side search?” comes up, here is what it means, what each choice costs, and a default for a small first version. This is a written guide, not an AI; it does not know your product.</p>
    <input className="lab-input" aria-label="Describe the question" placeholder="Paste the question you were asked, e.g. should search be server side?" value={q} onChange={e => setQ(e.target.value)} />
    {q.trim() && !hits.length && <p className="lab-fine">Nothing in the guide matches. Browse the list by clearing the box.</p>}
    {show.map(t => <div key={t.id} className="lab-card"><button className="lab-link" aria-expanded={q.trim() ? true : open === t.id} onClick={() => setOpen(open === t.id ? '' : t.id)}><b>{t.title}</b></button>
      {(q.trim() || open === t.id) && <div><p>{t.asks}</p>{t.options.map(o => <p key={o.name}><b>{o.name}</b><br />Good: {o.good}<br />Cost: {o.bad}</p>)}<p className="lab-pick"><b>For a small first version:</b> {t.defaultFor}</p><button className="button outline small" onClick={() => { void navigator.clipboard?.writeText(tradeoffMarkdown(t)) }}>Copy as text</button></div>}</div>)}
  </div>
}
