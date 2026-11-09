/** One guide behind the ? button: this role, step by step with a video, or the whole project at a glance. */
import { useEffect, useState } from 'react'
import { CheckCircle2, Circle, ExternalLink, PlayCircle, X } from 'lucide-react'
import { asset } from './api'
import { roleHelp, stepLine } from './plain'
import { stepName, type StudioProject } from './model'
import { workflows, type Role } from './workflows'

interface Props {
  role: Role
  stepId: string
  project: StudioProject
  onGo: (role: Role, step: string) => void
  onExample: () => void
  onWorkspaceGuide: () => void
  onClose: () => void
}

const ROLES: Role[] = ['business', 'design', 'development', 'quality', 'delivery']

export function Guide({ role, stepId, project, onGo, onExample, onWorkspaceGuide, onClose }: Props) {
  const [tab, setTab] = useState<'role' | 'project'>('role')
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  const help = roleHelp[role]
  const steps = workflows[role]
  const status = (r: Role, id: string) => project.stepDecisions[`${r}/${id}`]?.status ?? 'not_started'
  const next = steps.find(s => status(role, s.id) !== 'approved')
  const done = steps.filter(s => status(role, s.id) === 'approved').length
  const roleDone = (r: Role) => workflows[r].filter(s => status(r, s.id) === 'approved').length
  const allDone = ROLES.every(r => roleDone(r) === workflows[r].length)
  const nextRole = ROLES.find(r => roleDone(r) < workflows[r].length) ?? role

  return <div className="modal-backdrop" onClick={onClose}>
    <section className="studio-modal guide-modal" role="dialog" aria-modal="true" aria-labelledby="guide-title" onClick={e => e.stopPropagation()}>
      <div className="modal-title">
        <div><span className="small-kicker">GUIDE</span><h2 id="guide-title">{help.name}</h2></div>
        <button className="plain-icon" aria-label="Close guide" onClick={onClose}><X size={19}/></button>
      </div>
      <div className="guide-tabs" role="tablist" aria-label="Guide scope">
        <button role="tab" aria-selected={tab === 'role'} className={tab === 'role' ? 'active' : ''} onClick={() => setTab('role')}>This role</button>
        <button role="tab" aria-selected={tab === 'project'} className={tab === 'project' ? 'active' : ''} onClick={() => setTab('project')}>Whole project</button>
      </div>

      {tab === 'role' ? <>
        <p className="guide-lead">{help.short} <b>You finish with:</b> {help.result}</p>
        <div className="guide-video">
          <video key={role} controls preload="none" playsInline aria-label={`${help.name}: video walkthrough`} src={asset(`walkthrough/${help.video}.mp4`)}/>
          <small><PlayCircle size={13}/> {help.name} — start to finish</small>
        </div>
        <div className="guide-progress-row">
          <b>{done} of {steps.length} steps done</b>
          <span>{next ? <>Next: <b>{stepName(project, role, next.id, next.label)}</b></> : 'This role is complete.'}</span>
        </div>
        <ol className="guide-steps">
          {steps.map((s, i) => {
            const st = status(role, s.id)
            const label = stepName(project, role, s.id, s.label)
            return <li key={s.id} className={`${st === 'approved' ? 'done' : ''}${s.id === stepId ? ' current' : ''}${next?.id === s.id ? ' next' : ''}`}>
              <span className="guide-mark">{st === 'approved' ? <CheckCircle2 size={16}/> : <Circle size={16}/>}</span>
              <div><b>{i + 1}. {label}</b><span>{stepLine(role, s.id, s.purpose)}</span></div>
              <button className="button outline small" onClick={() => { onGo(role, s.id); onClose() }}>{s.id === stepId ? 'You are here' : st === 'approved' ? 'Open' : next?.id === s.id ? 'Start' : 'Open'}</button>
            </li>
          })}
        </ol>
      </> : <>
        <p className="guide-lead">Five roles, in order. Each one hands its work to the next. <b>You finish with:</b> a plan and code the team can build from.</p>
        <ol className="guide-roles">
          {ROLES.map(r => {
            const total = workflows[r].length
            const n = roleDone(r)
            const left = workflows[r].filter(s => status(r, s.id) !== 'approved')
            return <li key={r} className={n === total ? 'done' : r === nextRole ? 'next' : ''}>
              <div className="guide-role-head">
                <b>{roleHelp[r].name}</b>
                <span>{n} of {total} done</span>
                <button className="button outline small" onClick={() => { onGo(r, left[0]?.id ?? workflows[r][0].id); onClose() }}>Open</button>
              </div>
              <p>{left.length ? `Still to do: ${left.slice(0, 3).map(s => stepName(project, r, s.id, s.label)).join(', ')}${left.length > 3 ? ` and ${left.length - 3} more` : ''}.` : 'Every step is done.'}</p>
            </li>
          })}
        </ol>
        {allDone && <p className="guide-done-note"><CheckCircle2 size={14}/> Everything is done. Open Project options and choose Save a copy.</p>}
      </>}

      <div className="guide-foot">
        <div className="guide-links">
          <button onClick={onExample}>See a finished example</button>
          <button onClick={onWorkspaceGuide}>Workspace review</button>
          <a href="https://90n.ai/resources" target="_blank" rel="noopener noreferrer">Resources (paid) <ExternalLink size={11}/></a>
        </div>
        <button className="button accent small" onClick={onClose}>Close</button>
      </div>
    </section>
  </div>
}
