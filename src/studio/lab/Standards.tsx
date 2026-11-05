import { useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import type { StudioProject } from '../model'
import { upsertFiles } from './apply'
import { candidateToStandard, discoverPatterns, splitPasted, injectMarkdown, listStandards, loadProfiles, makeProfile, saveProfiles, slugify, STARTER_PROFILES, STANDARDS_DIR, suggestStandards, withStandards, type Candidate, type InjectMode, type Profile, type Source, type Standard } from './standards'

interface Props { project: StudioProject; setProject: Dispatch<SetStateAction<StudioProject>>; notify: (m: string) => void; save: (text: string, name: string) => void }
const CODE = /\.(tsx?|jsx?|css|scss|rb|erb|py|php|vue|svelte|html|go|java|kt|swift|md)$/i
const SKIP = /(^|\/)(node_modules|dist|build|\.git|vendor|coverage)\//

export function Standards({ project, setProject, notify, save }: Props) {
  const standards = useMemo(() => listStandards(project), [project])
  const write = (upserts: Standard[], remove: string[] = []) => setProject(p => {
    const { files, remove: gone } = withStandards(p, upserts, remove)
    const next = upsertFiles(p, files)
    return gone.length ? { ...next, files: next.files.filter(f => !gone.includes(f.path)) } : next
  })

  // add by hand
  const [draft, setDraft] = useState({ name: '', description: '', body: '', why: '' })
  function add() {
    if (!draft.name.trim() || !draft.description.trim() || !draft.body.trim()) { notify('A standard needs a name, a one-line description and the rule itself.'); return }
    write([{ slug: slugify(draft.name), name: draft.name.trim(), description: draft.description.trim(), body: `${draft.body.trim()}${draft.why.trim() ? `\n\n## Why\n\n${draft.why.trim()}` : ''}` }])
    setDraft({ name: '', description: '', body: '', why: '' }); notify('Standard saved and indexed.')
  }

  // discover
  const [pasted, setPasted] = useState('')
  const [sources, setSources] = useState<Source[]>([])
  const [found, setFound] = useState<Candidate[] | null>(null)
  const [why, setWhy] = useState<Record<string, string>>({})
  async function pick(files: FileList | null) {
    if (!files) return
    const list = Array.from(files).filter(f => CODE.test(f.name) && !SKIP.test((f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name) && f.size < 150_000).slice(0, 400)
    const read = await Promise.all(list.map(async f => ({ name: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name, text: await f.text() })))
    setSources(read); notify(`Read ${read.length} file(s) in your browser. Nothing is uploaded.`)
  }
  function scan() {
    const all = [...sources, ...splitPasted(pasted)]
    if (!all.length) { notify('Choose a folder of code or paste some first.'); return }
    setFound(discoverPatterns(all))
  }
  function accept(c: Candidate) {
    write([candidateToStandard(c, why[c.id] ?? '')]); setFound(f => f && f.filter(x => x.id !== c.id)); notify(`Wrote “${c.title}”${why[c.id]?.trim() ? '' : ' without a reason; add one so agents can apply it with judgement'}.`)
  }

  // profiles
  const [saved, setSaved] = useState<Profile[]>(() => loadProfiles(localStorage))
  const profiles = [...STARTER_PROFILES, ...saved]
  const [profileId, setProfileId] = useState(STARTER_PROFILES[0].id)
  const [profileName, setProfileName] = useState('')
  const profile = profiles.find(p => p.id === profileId) ?? profiles[0]
  function applyProfile() {
    const fresh = profile.standards.filter(s => !standards.some(e => e.slug === s.slug))
    if (!fresh.length) { notify('This project already has all of those standards.'); return }
    write(fresh); notify(`Added ${fresh.length} standard(s) from “${profile.name}”. Edit them to fit.`)
  }
  function saveProfile() {
    if (!standards.length) { notify('Write some standards first.'); return }
    const next = [...saved.filter(p => p.name !== profileName.trim()), makeProfile(profileName, standards)]
    saveProfiles(localStorage, next); setSaved(next); setProfileName(''); notify('Profile saved in this browser. Apply it to any project.')
  }

  // inject
  const [task, setTask] = useState('')
  const [mode, setMode] = useState<InjectMode>('reference')
  const [chosen, setChosen] = useState<string[] | null>(null)
  const suggested = useMemo(() => suggestStandards(task, standards), [task, standards])
  const selection = standards.filter(s => (chosen ?? suggested.map(x => x.slug)).includes(s.slug))
  const output = `${task.trim() ? `# Task\n\n${task.trim()}\n\n` : ''}${injectMarkdown(selection, mode)}`

  return <div className="lab-pane">
    <p>Standards are short rules with the reason behind them. An index lets an agent read one line per standard and open only what fits the task.</p>
    <div className="lab-group"><h3>Your standards ({standards.length})</h3>
      {!standards.length && <p className="lab-fine">None yet. Discover them from code, add one by hand, or apply a starter profile below.</p>}
      {standards.map(s => <div key={s.slug} className="lab-version"><div><b>{s.name}</b><small>{s.description}</small></div><button className="button outline small" aria-label={`Remove ${s.name}`} onClick={() => { write([], [s.slug]); notify('Standard removed.') }}>Remove</button></div>)}
      {standards.length > 0 && <p className="lab-fine">Files live in <code>{STANDARDS_DIR}</code> with an <code>index.yaml</code>; edit them under Development.</p>}
    </div>

    <details className="lab-group" open><summary>Discover from your code</summary>
      <p>Choose a folder or paste code. ProdOps looks for conventions that repeat (file naming, tokens vs raw colours, shared libraries, repeated idioms, test layout). It reads text in your browser and uploads nothing. It finds <i>what</i> repeats; only you know <i>why</i>, so it asks.</p>
      <input type="file" aria-label="Choose a code folder" multiple {...{ webkitdirectory: '' }} onChange={e => void pick(e.target.files)} />
      <textarea className="lab-text" aria-label="Paste code" rows={4} placeholder="Or paste code here. To paste several files, start each with a line like // file: deal-list.tsx" value={pasted} onChange={e => setPasted(e.target.value)} />
      <div className="lab-actions"><button className="button accent" onClick={scan}>Find patterns{sources.length ? ` in ${sources.length} files` : ''}</button></div>
      {found && !found.length && <p className="lab-fine">No repeated conventions found. Try more files, or add a standard by hand.</p>}
      {found?.map(c => <div key={c.id} className="lab-card"><b>{c.title}</b><ul>{c.evidence.map((e, i) => <li key={i}>{e}</li>)}</ul><label htmlFor={`why-${c.id}`}>{c.question}</label><textarea id={`why-${c.id}`} className="lab-text" rows={2} value={why[c.id] ?? ''} onChange={e => setWhy(w => ({ ...w, [c.id]: e.target.value }))} /><div className="lab-actions"><button className="button accent small" onClick={() => accept(c)}>Write this standard</button><button className="button outline small" onClick={() => setFound(f => f && f.filter(x => x.id !== c.id))}>Skip</button></div></div>)}
    </details>

    <details className="lab-group"><summary>Add one by hand</summary>
      <label htmlFor="std-name">Name</label><input id="std-name" className="lab-input" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
      <label htmlFor="std-desc">One-line description (this is what the index shows)</label><input id="std-desc" className="lab-input" value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} />
      <label htmlFor="std-body">The rule</label><textarea id="std-body" className="lab-text" rows={3} value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} />
      <label htmlFor="std-why">Why</label><textarea id="std-why" className="lab-text" rows={2} value={draft.why} onChange={e => setDraft({ ...draft, why: e.target.value })} />
      <div className="lab-actions"><button className="button accent" onClick={add}>Save standard</button></div>
    </details>

    <details className="lab-group"><summary>Profiles</summary>
      <p>A profile is a saved set of standards for a type of project. Apply one when you start something new.</p>
      <label htmlFor="profile">Profile</label>
      <select id="profile" value={profile.id} onChange={e => setProfileId(e.target.value)}>{profiles.map(p => <option key={p.id} value={p.id}>{p.name} ({p.standards.length})</option>)}</select>
      <div className="lab-actions"><button className="button accent" onClick={applyProfile}>Apply to this project</button></div>
      <div className="lab-row"><input className="lab-input" aria-label="Profile name" placeholder="Name for the current standards" value={profileName} onChange={e => setProfileName(e.target.value)} /><button className="button outline" onClick={saveProfile}>Save as profile</button></div>
    </details>

    <details className="lab-group"><summary>Inject into a task</summary>
      <p>Describe the task. ProdOps picks the standards whose descriptions fit; paste the result into any agent, spec or skill.</p>
      <textarea className="lab-text" aria-label="Task" rows={3} placeholder="e.g. Add a search box to the bookings list" value={task} onChange={e => { setTask(e.target.value); setChosen(null) }} />
      {standards.length > 0 && <div className="lab-chips">{standards.map(s => <label key={s.slug} className="check"><input type="checkbox" checked={selection.some(x => x.slug === s.slug)} onChange={e => setChosen((chosen ?? suggested.map(x => x.slug)).filter(x => x !== s.slug).concat(e.target.checked ? [s.slug] : []))} /> {s.name}</label>)}</div>}
      <div className="lab-row"><label className="check"><input type="radio" name="inject-mode" checked={mode === 'reference'} onChange={() => setMode('reference')} /> Reference (stays up to date)</label><label className="check"><input type="radio" name="inject-mode" checked={mode === 'copy'} onChange={() => setMode('copy')} /> Copy the text (stands alone)</label></div>
      <textarea className="lab-text" aria-label="Prompt with standards" rows={6} readOnly value={output} />
      <div className="lab-actions"><button className="button accent" disabled={!selection.length} onClick={() => { void navigator.clipboard?.writeText(output).then(() => notify('Copied.')).catch(() => notify('Copy is blocked here; use Download.')) }}>Copy</button><button className="button outline" disabled={!selection.length} onClick={() => save(output, 'task-with-standards.md')}>Download</button></div>
    </details>
  </div>
}
