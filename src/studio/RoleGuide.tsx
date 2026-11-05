import { CheckCircle2, Circle, X } from 'lucide-react'
import { asset } from './api'
import { roleHelp, stepLine } from './plain'
import type { StudioProject } from './model'
import { workflows, type Role } from './workflows'

interface Props { role: Role; stepId: string; project: StudioProject; onGo: (role: Role, step: string) => void; onWhole: () => void; onClose: () => void }

/** A short guide for one role: what it is for, a video of the whole role, and its steps in order. */
export function RoleGuide({ role, stepId, project, onGo, onWhole, onClose }: Props) {
  const help = roleHelp[role]
  const steps = workflows[role]
  const status = (id: string) => project.stepDecisions[`${role}/${id}`]?.status ?? 'not_started'
  const next = steps.find(s => status(s.id) !== 'approved')
  const done = steps.filter(s => status(s.id) === 'approved').length
  return <div className="modal-backdrop" onClick={onClose}>
    <section className="studio-modal role-guide" role="dialog" aria-modal="true" aria-labelledby="role-guide-title" onClick={e => e.stopPropagation()}>
      <div className="modal-title"><div><span className="small-kicker">GUIDE</span><h2 id="role-guide-title">{help.name}</h2></div><button className="plain-icon" aria-label="Close" onClick={onClose}><X size={19}/></button></div>
      <p className="guide-lead">{help.short} <b>You will end with:</b> {help.result}</p>
      <div className="guide-video">
        <video controls preload="none" playsInline aria-label={`${help.name}: video from start to finish`} src={asset(`walkthrough/${help.video}.mp4`)}/>
        <small>Video: {help.name}, start to finish.</small>
      </div>
      <p className="guide-progress">{done} of {steps.length} steps done{next ? <> · Next: <b>{next.label}</b></> : ' · All done'}</p>
      <ol className="guide-steps">
        {steps.map((s, i) => {
          const st = status(s.id)
          return <li key={s.id} className={`${st === 'approved' ? 'done' : ''}${s.id === stepId ? ' current' : ''}${next?.id === s.id ? ' next' : ''}`}>
            <span className="guide-mark">{st === 'approved' ? <CheckCircle2 size={16}/> : <Circle size={16}/>}</span>
            <div><b>{i + 1}. {s.label}</b><span>{stepLine(role, s.id, s.purpose)}</span></div>
            <button className="button outline small" onClick={() => { onGo(role, s.id); onClose() }}>{st === 'approved' ? 'Open' : next?.id === s.id ? 'Start' : 'Open'}</button>
          </li>
        })}
      </ol>
      <div className="guide-foot"><button className="button outline small" onClick={onWhole}>Whole-project guide</button><button className="button accent small" onClick={onClose}>Close</button></div>
    </section>
  </div>
}
