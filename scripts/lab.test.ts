import test from 'node:test'
import assert from 'node:assert/strict'
import JSZip from 'jszip'
import { freshProject } from '../src/studio/history'
import { workflows, type Role } from '../src/studio/workflows'
import { isSafeFile, roleOf, type StudioProject } from '../src/studio/model'
import { analyse, extractRequirements, keywords, placeholderCount } from '../src/studio/lab/readiness'
import { compare, diffLines, impact, iterationBrief, loadVersions, saveVersions, takeSnapshot, VERSIONS_KEY } from '../src/studio/lab/versions'
import { compileBrief, draftFiles, DRAFT_NOTE } from '../src/studio/lab/offline'
import { buildAgentPack } from '../src/studio/lab/agentpack'
import { applyDrafts } from '../src/studio/lab/apply'
import { contrast } from '../src/studio/lab/color'

const BRIEF = 'A booking app for township barbershops where customers reserve slots, pay a deposit and get reminders. Owners see the day at a glance and no-shows drop.'
const project = (): StudioProject => ({ ...freshProject(), name: 'Cut Queue', spec: BRIEF })
const memory = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } }

test('contrast follows WCAG', () => {
  assert.equal(contrast('#000000', '#ffffff').toFixed(1), '21.0')
  assert.equal(contrast('#777777', '#777777'), 1)
})

test('every step of every role drafts safe, labelled spec files, with no model and no network', async () => {
  const p = project()
  const compiled = await compileBrief(p.spec)
  let steps = 0
  for (const role of Object.keys(workflows) as Role[]) {
    for (const step of workflows[role]) {
      const files = draftFiles(p, compiled, role, step.id)
      steps++
      assert.ok(files.length >= 4, `${role}/${step.id}`)
      for (const f of files) {
        assert.ok(isSafeFile(f), `unsafe path ${f.path}`)
        assert.equal(roleOf(f.path), role)
        assert.ok(f.content.includes(DRAFT_NOTE.slice(0, 40)), `${f.path} is labelled as a template draft`)
        assert.ok(f.content.length < 50000)
      }
      assert.ok(files[0].content.length > 300, `${role}/${step.id} has real content`)
    }
  }
  assert.equal(steps, Object.values(workflows).reduce((n, s) => n + s.length, 0))
})

test('a draft needs a brief and the same brief gives the same draft', async () => {
  const empty = { ...project(), spec: '' }
  const compiled = await compileBrief(BRIEF)
  assert.throws(() => draftFiles(empty, compiled, 'business', 'vision'), /brief/)
  const again = await compileBrief(BRIEF)
  assert.deepEqual(draftFiles(project(), compiled, 'design', 'screens'), draftFiles(project(), again, 'design', 'screens'))
  assert.match(draftFiles(project(), compiled, 'business', 'vision')[0].content, /booking app for township barbershops/)
})

test('drafting keeps existing files unless told to replace them, and marks steps in progress', async () => {
  const p = project()
  const compiled = await compileBrief(BRIEF)
  const drafts = [{ role: 'business' as Role, stepId: 'vision', files: draftFiles(p, compiled, 'business', 'vision') }]
  const first = applyDrafts(p, drafts, false)
  assert.equal(first.written, 4)
  assert.equal(first.project.stepDecisions['business/vision'].status, 'in_progress')
  const edited = { ...first.project, files: first.project.files.map(f => f.path.endsWith('vision/shape.md') ? { ...f, content: 'MY OWN WORDS' } : f) }
  const second = applyDrafts(edited, drafts, false)
  assert.equal(second.written, 0)
  assert.equal(second.kept, 4)
  assert.equal(second.project.files.find(f => f.path.endsWith('vision/shape.md'))!.content, 'MY OWN WORDS')
  assert.notEqual(applyDrafts(edited, drafts, true).project.files.find(f => f.path.endsWith('vision/shape.md'))!.content, 'MY OWN WORDS')
})

test('drafting every role fits the project file limit', async () => {
  const p = project()
  const compiled = await compileBrief(BRIEF)
  const drafts = (Object.keys(workflows) as Role[]).flatMap(r => workflows[r].map(s => ({ role: r, stepId: s.id, files: draftFiles(p, compiled, r, s.id) })))
  const all = applyDrafts(p, drafts, true)
  assert.ok(all.project.files.length <= 300, `${all.project.files.length} files`)
  assert.ok(all.written > 100, String(all.written))
})

test('readiness flags approvals built on placeholders and rewards real work', async () => {
  const p = project()
  assert.equal(analyse(p).checks.find(c => c.id === 'approved-real')!.level, 'pass')
  const approved = { ...p, stepDecisions: { 'business/vision': { status: 'approved' as const, note: '' } }, files: [...p.files, { path: 'specs/business/vision/shape.md', content: '# Vision\n\n> Example template — replace before approval.' }] }
  assert.equal(analyse(approved).checks.find(c => c.id === 'approved-real')!.level, 'fail')
  assert.equal(placeholderCount('TODO and lorem ipsum and Example template'), 3)
  assert.equal(analyse({ ...p, spec: '' }).checks.find(c => c.id === 'brief')!.level, 'fail')
})

test('traceability links requirements to design and tests by vocabulary, and names the gaps', () => {
  const p = project()
  const files = [
    { path: 'specs/business/requirements/functional-requirements.md', content: '# FR\n\n1. Customers reserve appointment slots with a barber\n2. Owners export payroll summaries monthly' },
    { path: 'specs/design/screens/design-requirements.md', content: '# D\n\n- A calendar where customers reserve an appointment slot' },
    { path: 'specs/quality/cases/shape.md', content: '# Q\n\n- Customer can reserve a slot; appointment appears for the barber' },
  ]
  const report = analyse({ ...p, files: [...p.files, ...files] })
  assert.equal(report.requirements.length, 2)
  assert.equal(report.requirements[0].design && report.requirements[0].tests, true)
  assert.equal(report.requirements[1].design || report.requirements[1].tests, false)
  assert.equal(report.designCoverage, 50)
  assert.ok(extractRequirements({ ...p, files }).length === 2)
  assert.ok(keywords('Customers reserve appointment slots').includes('appointment'))
})

test('the default palette and headline are called out; a specific one passes', () => {
  const tokens = (primary: string, heading: string) => JSON.stringify({ primary, background: '#ffffff', text: '#111111', radius: 8, heading, button: 'Book', colors: {} })
  const withTokens = (content: string) => ({ ...project(), files: [{ path: 'design/design-tokens.json', content }] })
  const generic = analyse(withTokens(tokens('#6366f1', 'Your product, beautifully simple.')))
  assert.equal(generic.checks.find(c => c.id === 'palette')!.level, 'warn')
  assert.equal(generic.checks.find(c => c.id === 'copy')!.level, 'warn')
  const own = analyse(withTokens(tokens('#a3401f', 'Book your chair before the queue forms.')))
  assert.equal(own.checks.find(c => c.id === 'palette')!.level, 'pass')
  assert.equal(own.checks.find(c => c.id === 'copy')!.level, 'pass')
  assert.equal(analyse(withTokens(tokens('#f5f5f5', 'Hi'))).checks.find(c => c.id === 'contrast-primary')!.level, 'fail')
})

test('line diffs, file changes and the roles that must look again', () => {
  const ops = diffLines('a\nb\nc', 'a\nc\nd')
  assert.deepEqual(ops.filter(o => o.op !== ' ').map(o => o.op + o.text), ['-b', '+d'])
  const p = project()
  const snap = takeSnapshot({ ...p, files: [{ path: 'specs/design/screens/shape.md', content: 'one' }, { path: 'specs/quality/cases/shape.md', content: 'q' }] }, 'v1')
  const now = { ...p, spec: p.spec + ' Now with loyalty points.', files: [{ path: 'specs/design/screens/shape.md', content: 'two' }, { path: 'specs/delivery/release/shape.md', content: 'new' }], stepDecisions: { 'design/screens': { status: 'approved' as const, note: '' } } }
  const diff = compare(snap, now)
  assert.deepEqual(diff.files.map(f => `${f.change}:${f.path}`), ['added:specs/delivery/release/shape.md', 'modified:specs/design/screens/shape.md', 'removed:specs/quality/cases/shape.md'])
  assert.equal(diff.specChanged, true)
  assert.deepEqual(diff.decisionChanges, [{ key: 'design/screens', from: 'not_started', to: 'approved' }])
  const roles = impact(diff).map(i => i.role).sort()
  assert.deepEqual(roles, ['business', 'delivery', 'design', 'development', 'quality'])
  const brief = iterationBrief(now, 'v1', diff)
  assert.match(brief, /Apply \*\*only\*\* the changes listed above/)
  assert.match(brief, /loyalty points/)
})

test('versions persist per project and shed the oldest when the quota is hit', () => {
  const storage = memory()
  const p = project()
  let list = [takeSnapshot(p, 'one', 1), takeSnapshot(p, 'two', 2)]
  list = saveVersions(storage, 'proj-a', list)
  assert.equal(loadVersions(storage, 'proj-a').length, 2)
  assert.equal(loadVersions(storage, 'proj-b').length, 0)
  const big = { ...p, files: [{ path: 'specs/business/vision/shape.md', content: 'x'.repeat(1_400_000) }] }
  const crowded = saveVersions(storage, 'proj-a', [takeSnapshot(big, 'a', 1), takeSnapshot(big, 'b', 2), takeSnapshot(big, 'c', 3)])
  assert.ok(crowded.length < 3 && crowded.length >= 1)
  assert.equal(JSON.parse(storage.getItem(VERSIONS_KEY)!)['proj-a'].length, crowded.length)
  assert.deepEqual(loadVersions({ getItem: () => '{broken' }, 'x'), [])
})

test('the agent pack carries the same instructions for every tool, the specs and the prompts', async () => {
  const p = project()
  const compiled = await compileBrief(BRIEF)
  const drafts = ['specification', 'database', 'tasks'].map(id => ({ role: 'development' as Role, stepId: id, files: draftFiles(p, compiled, 'development', id) }))
  const withSpecs = applyDrafts(p, drafts, true).project
  for (const platform of ['web', 'mobile', 'both'] as const) {
    const zip = await buildAgentPack(withSpecs, { platform, now: new Date('2026-01-01') })
    const names = Object.keys(zip.files)
    for (const must of ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md', '.cursor/rules/prodops.mdc', '.github/copilot-instructions.md', 'brief.md', 'READINESS.md', 'TRACEABILITY.md', 'prompts/one-shot.md', 'prompts/iterate.md', 'prompts/review.md', 'README.md']) assert.ok(names.includes(must), `${platform}: ${must}`)
    assert.ok(names.some(n => /^prompts\/\d\d-/.test(n)))
    assert.ok(names.includes('specs/development/database/shape.md'))
    const agents = await zip.file('AGENTS.md')!.async('string')
    assert.match(agents, platform === 'web' ? /React web app/ : /Expo|React Native/)
    assert.match(agents, /Local template draft/)
    assert.equal(await zip.file('CLAUDE.md')!.async('string').then(t => t.startsWith('@AGENTS.md')), true)
  }
  assert.ok((await JSZip.loadAsync(await (await buildAgentPack(withSpecs, { platform: 'web' })).generateAsync({ type: 'uint8array' }))).file('AGENTS.md'))
})

test('the lab and the offline draft make no network calls and name no third party', async () => {
  const sources = await Promise.all(['Lab.tsx', 'offline.ts', 'readiness.ts', 'versions.ts', 'agentpack.ts'].map(f => import('node:fs/promises').then(fs => fs.readFile(`src/studio/lab/${f}`, 'utf8'))))
  for (const text of sources) {
    assert.doesNotMatch(text, /\bfetch\(|XMLHttpRequest|https?:\/\//)
    assert.doesNotMatch(text, new RegExp(['build' + 'er\\s?meth' + 'ods', 'brian ' + 'casel'].join('|'), 'i'))
  }
})
