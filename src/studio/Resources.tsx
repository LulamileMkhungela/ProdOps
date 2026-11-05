import { ExternalLink, LockKeyhole } from 'lucide-react'
import { skillPaths } from './skills'

export const RESOURCES_URL = 'https://90n.ai/resources'

const pretty = (name: string) => name.replace(/^(bm|prodops)-/, '').replace(/-/g, ' ').replace(/^./, c => c.toUpperCase()).replace(/\bPrd\b/, 'PRD')

/** The paid library: skills and guides that go beyond what is built into ProdOps. */
export function Resources() {
  const skills = [...new Set(skillPaths.filter(p => p.endsWith('/SKILL.md')).map(p => p.split('/').slice(-2)[0]))].sort()
  return <div className="resources">
    <div className="resources-box">
      <b><LockKeyhole size={14}/> Paid library</b>
      <p>Skills, standards and guides for your team, all in one place.</p>
      <a className="button accent small" href={RESOURCES_URL} target="_blank" rel="noopener noreferrer">See plans <ExternalLink size={13}/></a>
    </div>
    <h3>What the library covers</h3>
    <ul className="resources-list">
      {skills.map(name => <li key={name}><span>{pretty(name)}</span><em>Pro</em></li>)}
    </ul>
    <p className="resources-note">Opens 90n.ai/resources in a new tab.</p>
  </div>
}
