import { useEffect, useMemo, useState } from 'react'
import JSZip from 'jszip'
import type { StudioProject } from '../model'
import { listCommands, listSkills, loadInstallFiles, upstreamPaths, type CommandInfo, type SkillInfo } from '../skills'
import { SKILL_GUIDE } from './agentpack'
import { extractRequirements } from './readiness'

interface Props { project: StudioProject; notify: (m: string) => void; save: (text: string, name: string) => void }

const WHEN = new Map(SKILL_GUIDE)
const SOURCES = [
  ['bm-skills', 'https://github.com/buildermethods/bm-skills'],
  ['agent-os', 'https://github.com/buildermethods/agent-os'],
  ['design-os', 'https://github.com/buildermethods/design-os'],
  ['agentcanon', 'https://github.com/buildermethods/agentcanon'],
  ['build-new', 'https://github.com/buildermethods/build-new'],
] as const

/** Which skills help right now, from what the project already has. */
export function suggestedSkills(project: StudioProject): string[] {
  const out: string[] = []
  const brief = project.spec.trim().length
  if (brief < 120 || !extractRequirements(project).length) out.push('bm-prd-creator', 'prodops-product-workflow')
  if (!project.files.some(f => f.path === 'design/design-system.md')) out.push('bm-design-system')
  out.push('prodops-handoff')
  return out
}

export function Skills({ project, notify }: Props) {
  const [skills, setSkills] = useState<SkillInfo[] | null>(null)
  const [commands, setCommands] = useState<CommandInfo[]>([])
  const [busy, setBusy] = useState(false)
  useEffect(() => { void listSkills().then(setSkills).catch(() => setSkills([])); void listCommands().then(setCommands).catch(() => setCommands([])) }, [])
  const suggested = useMemo(() => suggestedSkills(project), [project])
  async function copy(name: string) {
    const text = `Use the ${name} skill. ${WHEN.get(name) ?? ''}`.trim()
    try { await navigator.clipboard.writeText(text); notify(`Copied a prompt for ${name}. Paste it into your coding agent.`) } catch { notify(`Could not copy. Write: “${text}”`) }
  }
  async function download() {
    setBusy(true)
    try {
      const zip = new JSZip(); for (const [p, c] of Object.entries(await loadInstallFiles())) zip.file(p, c)
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'prodops-agent-skills.zip'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
      notify('Skills downloaded. Copy .agents/skills/* into ~/.agents/skills/ to use them in every project.')
    } catch { notify('Could not create the skills download.') } finally { setBusy(false) }
  }
  const groups = [...new Set(commands.map(c => c.group))]
  return <div className="lab-pane">
    <p>Skills are folders of plain Markdown that a coding agent reads before it does a kind of work. They are <b>installed in every agent pack and project download</b>, so they travel with your idea or codebase, and they work in any agent that reads <code>AGENTS.md</code> or <code>.agents/skills</code>.</p>
    <div className="lab-card"><b>Suggested for this project right now</b><div className="lab-chips">{suggested.map(n => <button key={n} className="button outline small" onClick={() => void copy(n)}>Copy prompt: {n}</button>)}</div>
      <p className="lab-fine">Paste the prompt into your coding agent, opened in the folder from your pack.</p></div>
    <div className="lab-actions"><button className="button accent" disabled={busy} onClick={() => void download()}>{busy ? 'Preparing…' : 'Download all skills and commands'}</button></div>
    <p className="lab-fine">To use them in every project on your computer, unzip and copy <code>.agents/skills/*</code> into <code>~/.agents/skills/</code>. For Claude Code, link it once: <code>ln -s ../.agents/skills .claude/skills</code>.</p>
    <h3 className="lab-h">Skills ({skills?.length ?? '…'})</h3>
    {skills === null && <p className="lab-fine">Loading…</p>}
    {skills?.map(s => <div key={s.name} className="lab-card"><div className="lab-name"><b>{s.name}</b><small>{s.origin === 'prodops' ? 'Written for ProdOps' : 'Open source, MIT'} · {s.files} file{s.files === 1 ? '' : 's'}</small></div>
      <p>{s.description}</p><div className="lab-actions"><button className="button outline small" onClick={() => void copy(s.name)}>Copy prompt</button></div></div>)}
    <h3 className="lab-h">Commands ({commands.length})</h3>
    {groups.map(g => <details key={g} className="lab-group"><summary>{g} ({commands.filter(c => c.group === g).length})</summary>
      <ul className="lab-list">{commands.filter(c => c.group === g).map(c => <li key={c.path}><code>{c.name}</code>: {c.title}</li>)}</ul></details>)}
    <h3 className="lab-h">Reference documents ({upstreamPaths.filter(p => p.endsWith('.md')).length})</h3>
    <p className="lab-fine">Every Markdown file from the five buildermethods repositories (README, AGENTS, CLAUDE, CHANGELOG, Design OS docs, Agent OS profile) is in <code>.agents/upstream/</code> and in every download. Their AGENTS.md and CLAUDE.md describe how to work inside those repositories, so they are reference, not rules for your project.</p>
    <p className="lab-fine">Copied unchanged from open-source repositories (build-new states “free to use, fork, and adapt”), with their licence texts and commit versions in <code>.agents/UPSTREAM.md</code>: {SOURCES.map(([n, u], i) => <span key={n}>{i ? ', ' : ''}<a className="lab-link inline" href={u} target="_blank" rel="noreferrer noopener">{n}</a></span>)}. The <code>prodops-*</code> skills are original to ProdOps.</p>
  </div>
}
