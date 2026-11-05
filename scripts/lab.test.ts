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
import { candidateToStandard, discoverPatterns, splitPasted, indexYaml, injectMarkdown, listStandards, loadProfiles, makeProfile, parseStandard, saveProfiles, standardFile, STARTER_PROFILES, suggestStandards, withStandards, PROFILES_KEY, type Standard } from '../src/studio/lab/standards'
import { designSystemFiles, designSystemHtml, readTokens } from '../src/studio/lab/designsystem'
import { buildPlan, buildPlanFiles, orderFeatures, parseScope, scopeDraft, SCOPE_PATH } from '../src/studio/lab/prd'
import { matchTradeoffs, TRADEOFFS } from '../src/studio/lab/tradeoffs'
import { upsertFiles } from '../src/studio/lab/apply'

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
  const sources = await Promise.all(['Lab.tsx', 'Standards.tsx', 'Build.tsx', 'offline.ts', 'readiness.ts', 'versions.ts', 'agentpack.ts', 'standards.ts', 'designsystem.ts', 'prd.ts', 'tradeoffs.ts'].map(f => import('node:fs/promises').then(fs => fs.readFile(`src/studio/lab/${f}`, 'utf8'))))
  for (const text of sources) {
    assert.doesNotMatch(text, /\bfetch\(|XMLHttpRequest|https?:\/\//)
    assert.doesNotMatch(text, new RegExp(['build' + 'er\\s?meth' + 'ods', 'brian ' + 'casel'].join('|'), 'i'))
  }
})

// ---- standards -----------------------------------------------------------
const STD: Standard = { slug: 'api-shape', name: 'API "responses" shape', description: 'Every endpoint returns { data, error }: never a bare array.', body: '# Shape\n\nReturn `{ data, error }`.\n\n## Why\n\nClients branch on one shape.' }

test('a standard round-trips through its file, even with quotes, and the index has one line each', () => {
  const file = standardFile(STD)
  assert.ok(isSafeFile(file))
  assert.deepEqual(parseStandard(file), STD)
  const p = upsertFiles(project(), [file])
  assert.equal(listStandards(p).length, 1)
  const yaml = indexYaml(listStandards(p))
  assert.match(yaml, /file: "api-shape.md"/)
  assert.match(yaml, /description: "Every endpoint returns/)
  assert.equal(indexYaml([]).includes('standards: []'), true)
  const { files, remove } = withStandards(p, [], ['api-shape'])
  assert.deepEqual(remove, ['specs/development/code-standards/api-shape.md'])
  assert.doesNotMatch(files[0].content, /api-shape/)
})

test('standards are suggested by task and injected by reference or by copy', () => {
  const colours: Standard = { slug: 'colour-tokens', name: 'Colour tokens', description: 'Use named colour variables, never raw hex values.', body: 'Use variables.' }
  assert.deepEqual(suggestStandards('tweak the brand colours on the pricing page', [STD, colours]).map(s => s.slug), ['colour-tokens'])
  assert.deepEqual(suggestStandards('unrelated words here', [STD, colours]), [])
  const ref = injectMarkdown([colours], 'reference')
  assert.match(ref, /@specs\/development\/code-standards\/colour-tokens.md/)
  assert.doesNotMatch(ref, /Use variables\./)
  assert.match(injectMarkdown([colours], 'copy'), /Use variables\./)
  assert.equal(injectMarkdown([], 'copy'), '')
})

test('discovery finds repeating conventions, and nothing in noise', () => {
  const src = (name: string, text: string) => ({ name, text })
  const line = 'const response = { ok: false, error: message }'
  const sources = [
    src('src/user-card.tsx', `import { Icon } from 'lucide-react'\nimport x from 'zod'\n${line}\ncolor: var(--color-primary); border: var(--color-line); background: var(--color-bg)`),
    src('src/deal-list.tsx', `import { Icon } from 'lucide-react'\nimport x from 'zod'\n${line}`),
    src('src/task-board.tsx', `import { Icon } from 'lucide-react'\nimport x from 'zod'\n${line}`),
    src('src/task-board.test.tsx', 'it("works", () => {})'),
    src('src/deal-list.test.tsx', 'it("works", () => {})'),
  ]
  const ids = discoverPatterns(sources).map(c => c.id)
  for (const id of ['file-naming', 'colour-tokens', 'libraries', 'idioms', 'tests']) assert.ok(ids.includes(id), id)
  const c = discoverPatterns(sources).find(x => x.id === 'file-naming')!
  assert.match(c.title, /kebab-case/)
  assert.match(candidateToStandard(c, 'Greppable on every OS').body, /## Why\n\nGreppable/)
  assert.match(candidateToStandard(c, '').body, /Add the reason/)
  assert.ok(isSafeFile(standardFile(candidateToStandard(c, ''))))
  assert.deepEqual(discoverPatterns([{ name: 'a.txt', text: 'hello' }]), [])
  assert.deepEqual(discoverPatterns([]), [])
})

test('pasted code is split into files by marker lines', () => {
  const files = splitPasted('// file: a-b.tsx\nconst a = 1\n# file: c.rb\nputs 1\n/* file: d.css */\nbody{}')
  assert.deepEqual(files.map(f => f.name), ['a-b.tsx', 'c.rb', 'd.css'])
  assert.deepEqual(splitPasted('just text').map(f => f.name), ['pasted.txt'])
  assert.deepEqual(splitPasted('   '), [])
})

test('profiles persist (without the built-in ones) and starter profiles are valid files', () => {
  const storage = memory()
  const saved = makeProfile('Mine', [STD])
  saveProfiles(storage, [saved, ...STARTER_PROFILES])
  assert.deepEqual(loadProfiles(storage).map(p => p.name), ['Mine'])
  assert.deepEqual(loadProfiles({ getItem: () => '[{"broken":1}]' }), [])
  assert.equal(storage.getItem(PROFILES_KEY) !== null, true)
  for (const profile of STARTER_PROFILES) for (const standard of profile.standards) { assert.ok(isSafeFile(standardFile(standard))); assert.ok(standard.body.includes('## Why')) }
})

// ---- design system -------------------------------------------------------
test('the design system page is built from the tokens, escapes content and passes its own contrast rule', () => {
  const tokens = { primary: '#a3401f', background: '#fffaf5', text: '#201a17', radius: 6, heading: '<script>alert(1)</script> Book your chair', button: 'Book', colors: { sand: '#e8d8c4', 'bad name!': '#123456', also: 'red' } }
  const p = { ...project(), files: [{ path: 'design/design-tokens.json', content: JSON.stringify(tokens) }] }
  const html = designSystemHtml(p)
  assert.match(html, /--color-primary:#a3401f/)
  assert.match(html, /--radius:6px/)
  assert.match(html, /--color-sand:#e8d8c4/)
  assert.doesNotMatch(html, /<script>alert/)
  assert.doesNotMatch(html, /bad name|also/)
  for (const part of ['Buttons', 'Form fields', 'Badges', 'Listings', 'Modal', 'Use when', 'Do not use when']) assert.ok(html.includes(part), part)
  const files = designSystemFiles(p, 'mobile')
  assert.deepEqual(files.map(f => f.path), ['design/design-system.html', 'design/design-system.md', 'design/design-rules.md'])
  assert.ok(files.every(isSafeFile))
  assert.match(files[1].content, /raw hex value/)
  assert.match(files[1].content, /theme object/)
  assert.deepEqual(readTokens({ ...project(), files: [{ path: 'design/design-tokens.json', content: '{broken' }] }).primary, readTokens(project()).primary)
})

// ---- scope, PRD, milestones ----------------------------------------------
const withRequirements = (lines: string[]): StudioProject => ({ ...project(), files: [{ path: 'specs/business/requirements/functional-requirements.md', content: '# FR\n\n' + lines.map((l, i) => `${i + 1}. ${l}`).join('\n') }] })
const CRM = ['Kanban board: drag deals across the pipeline stages', 'Deals: track a value and a status for every deal', 'Contacts: store names, companies and emails for each person', 'Follow-ups: a to-do list that reminds you of the next action on every deal']

test('scope is drafted from requirements, parsed back, and survives edits', () => {
  const p = withRequirements(CRM)
  const draft = scopeDraft(p)
  assert.match(draft, /## In scope/)
  assert.match(draft, /## Out of scope/)
  const scope = parseScope(draft)
  assert.equal(scope.inScope.length, 4)
  assert.ok(scope.outScope.length >= 4)
  assert.equal(scope.features.length, 4)
  assert.equal(scope.features[0].inScope.length, 1)
  assert.equal(scope.features[0].outScope.length, 0, 'placeholder out-lines are not content')
  const edited = parseScope(draft.replace('- Out: _What this feature will not do in version one._', '- Out: no swim-lanes'))
  assert.deepEqual(edited.features[0].outScope, ['no swim-lanes'])
})

test('milestones come after what they depend on, and the plan is honest about gaps', () => {
  const p = withRequirements(CRM)
  const plan = buildPlan(p)
  assert.equal(plan.source, 'requirements')
  assert.ok(plan.notes.some(n => /out of scope/i.test(n)))
  const titles = plan.milestones.map(m => m.title)
  assert.equal(titles[0], 'Foundation')
  assert.equal(titles.at(-1), 'Verify and hand off')
  assert.ok(titles.findIndex(t => /Deals/.test(t)) < titles.findIndex(t => /Kanban/.test(t)), titles.join(' | '))
  assert.ok(plan.milestones.every((m, i) => i === 0 || m.dependsOn.length > 0))
  assert.equal(buildPlan(project()).source, 'none')
  assert.deepEqual(buildPlanFiles(project(), 'web').files, [])
  const cyc = [{ name: 'Alpha thing', text: 'Alpha thing uses beta', inScope: [], outScope: [] }, { name: 'Beta thing', text: 'Beta thing uses alpha', inScope: [], outScope: [] }]
  assert.deepEqual(orderFeatures(cyc).map(f => f.name), ['Alpha thing', 'Beta thing'])
})

test('milestone files tell the agent to plan first, stay in scope and write a log', () => {
  const p = upsertFiles(withRequirements(CRM), [{ path: SCOPE_PATH, content: scopeDraft(withRequirements(CRM)) }, standardFile({ slug: 'plan', name: 'Plan before code', description: 'Plan each milestone before writing code for the deals.', body: 'Plan first.' })])
  const { plan, files } = buildPlanFiles(p, 'mobile')
  assert.equal(plan.source, 'scope')
  assert.equal(plan.notes.length, 0)
  const paths = files.map(f => f.path)
  assert.ok(paths.includes('build-plan/prd.html') && paths.includes('build-plan/prd.md'))
  assert.equal(paths.filter(x => x.endsWith('/prompt.md')).length, plan.milestones.length)
  assert.equal(paths.filter(x => x.endsWith('/milestone-log.md')).length, plan.milestones.length)
  const second = files.find(f => f.path.includes('/02-') && f.path.endsWith('prompt.md'))!.content
  assert.match(second, /Enter plan mode first/)
  assert.match(second, /milestone-log\.md/)
  assert.match(second, /Do not build/)
  assert.match(second, /Expo/)
  assert.match(second, /@specs\/development\/code-standards\/plan\.md/)
  assert.match(files.find(f => f.path.includes('/01-') && f.path.endsWith('milestone-log.md'))!.content, /What is new \(plain language\)/)
  const html = files.find(f => f.path === 'build-plan/prd.html')!.content
  assert.match(html, /Out of scope/)
  assert.doesNotMatch(buildPlanFiles({ ...p, name: '<img onerror=x>' }, 'web').files[0].content, /<img onerror/)
})

// ---- decisions -----------------------------------------------------------
test('the decision guide answers the question that was asked', () => {
  assert.equal(matchTradeoffs('Should search be server side or client side?')[0].id, 'search-where')
  assert.equal(matchTradeoffs('do we need custom fields or hardcoded stages')[0].id, 'custom-fields')
  assert.deepEqual(matchTradeoffs('zzz qqq'), [])
  for (const t of TRADEOFFS) { assert.ok(t.options.length >= 2 && t.defaultFor.length > 20, t.id) }
  assert.equal(new Set(TRADEOFFS.map(t => t.id)).size, TRADEOFFS.length)
})

test('the pack carries standards, design system, PRD and milestones, and drops the generic prompts when a plan exists', async () => {
  const base = withRequirements(CRM)
  const p = upsertFiles(base, [
    { path: 'design/design-tokens.json', content: JSON.stringify({ primary: '#a3401f', background: '#fffaf5', text: '#201a17', radius: 6, heading: 'Book your chair', button: 'Book' }) },
    standardFile(STD),
  ])
  const zip = await buildAgentPack(p, { platform: 'web' })
  const names = Object.keys(zip.files)
  for (const must of ['build-plan/prd.html', 'build-plan/prd.md', 'design/design-system.html', 'design/design-system.md', 'specs/development/code-standards/index.yaml', 'prompts/inject-standards.md']) assert.ok(names.includes(must), must)
  assert.ok(names.some(n => /^build-plan\/milestones\/02-.*\/prompt\.md$/.test(n)))
  assert.ok(!names.some(n => /^prompts\/\d\d-/.test(n)), 'generic numbered prompts are replaced by the plan')
  const agents = await zip.file('AGENTS.md')!.async('string')
  assert.match(agents, /Design system rules/)
  assert.match(agents, /Never write a raw hex value/)
  assert.match(agents, /Standards to follow/)
  assert.match(agents, /explain the trade-offs/)
  assert.match(await zip.file('README.md')!.async('string'), /build-plan/)
  const bare = await buildAgentPack(project(), { platform: 'web' })
  assert.ok(!Object.keys(bare.files).some(n => n.startsWith('build-plan/')))
  assert.doesNotMatch(await bare.file('AGENTS.md')!.async('string'), /Standards to follow/)
})

// ---- guided journey ----------------------------------------------------------
import { journey } from '../src/studio/lab/journey'
import { runDraft, targetsFor } from '../src/studio/lab/quick'
import { scopeFromCompiled } from '../src/studio/lab/offline'
import { STANDARDS_DIR } from '../src/studio/lab/standards'

test('a fresh project is not reported as drafted just because it has starter templates', () => {
  const j = journey({ ...freshProject(), spec: BRIEF })
  assert.equal(j.steps.find(s => s.key === 'brief')!.done, true)
  assert.equal(j.steps.find(s => s.key === 'draft')!.done, false)
  assert.equal(j.next!.key, 'draft')
  assert.equal(journey(freshProject()).next!.key, 'brief')
})

test('drafting every role replaces starter templates silently, covers all roles and reaches the review step', async () => {
  let asked = 0
  const r = await runDraft(project(), targetsFor('all', 'business', 'vision'), '', () => { asked++; return true })
  assert.equal(asked, 0, 'no confirmation for example templates')
  assert.ok(r.project.files.length <= 300)
  const j = journey(r.project)
  assert.equal(j.steps.find(s => s.key === 'draft')!.done, true)
  assert.equal(j.next!.key, 'review')
  assert.ok(r.project.files.some(f => f.path === SCOPE_PATH), 'scope is written with the requirements')
})

test('scope comes from the compiled sections, so milestones have readable names', async () => {
  const compiled = await compileBrief(BRIEF)
  const scope = parseScope(scopeFromCompiled(compiled))
  assert.ok(scope.features.length >= 2 && scope.outScope.length >= 2)
  const r = await runDraft(project(), targetsFor('all', 'business', 'vision'), '', () => true)
  const files = buildPlanFiles(r.project, 'web').files
  for (const f of files.filter(x => x.path.endsWith('/prompt.md'))) assert.ok(!/the-product-must|-i-fini/.test(f.path) && f.path.length < 70, f.path)
})

test('editing the scope or adding standards never reopens an approved requirements step', async () => {
  const r = await runDraft(project(), targetsFor('all', 'business', 'vision'), '', () => true)
  const approved = { ...r.project, stepDecisions: { ...r.project.stepDecisions, 'business/requirements': { status: 'approved' as const, note: '' } } }
  const edited = upsertFiles(approved, [{ path: SCOPE_PATH, content: '# Scope\n\n## In scope\n- One\n\n## Out of scope\n- Two\n' }, { path: `${STANDARDS_DIR}x.md`, content: '---\nname: "X"\ndescription: "y"\n---\nz' }])
  assert.equal(edited.stepDecisions['business/requirements'].status, 'approved')
  assert.equal(listStandards(r.project).length, 0, 'workflow step files are not standards')
})

test('the brief length rule is the same in the guide and the readiness check', () => {
  const brief = 'x'.repeat(150)
  const p = { ...freshProject(), spec: brief }
  assert.equal(journey(p).steps[0].done, true)
  assert.equal(analyse(p).checks.find(c => c.id === 'brief')!.level, 'pass')
})

test('the pack installs the given skills and tells the agent when to use each', async () => {
  const p = project()
  const zip = await buildAgentPack(p, { platform: 'web', installFiles: { '.agents/skills/bm-prd-creator/SKILL.md': '---\nname: bm-prd-creator\n---', '.agents/UPSTREAM.md': 'x' } })
  assert.ok(zip.file('.agents/skills/bm-prd-creator/SKILL.md') && zip.file('.agents/UPSTREAM.md'))
  const agents = await zip.file('AGENTS.md')!.async('string')
  assert.match(agents, /Skills installed in/); assert.match(agents, /bm-prd-creator/); assert.match(agents, /prodops-handoff/)
  assert.doesNotMatch(await (await buildAgentPack(p, { platform: 'web' })).file('AGENTS.md')!.async('string'), /Skills installed in/)
})
