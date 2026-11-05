/** jsdom walk through the Lab on a static host: no server, no network. */
import { JSDOM } from 'jsdom'
import { strict as assert } from 'node:assert'
import { createServer } from 'vite'
import JSZip from 'jszip'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost:5173/', pretendToBeVisual: true })
const win = dom.window
Object.assign(globalThis, { window: win, document: win.document, HTMLElement: win.HTMLElement, Element: win.Element, Node: win.Node, DOMParser: win.DOMParser, localStorage: win.localStorage, IS_REACT_ACT_ENVIRONMENT: true })
win.confirm = () => true
const oldFetch = globalThis.fetch
const requests: string[] = []
globalThis.fetch = async input => { requests.push(String(input)); throw new Error('network is not available') }
let exported: Blob | undefined
URL.createObjectURL = blob => { exported = blob as Blob; return 'blob:test' }
URL.revokeObjectURL = () => {}
win.HTMLAnchorElement.prototype.click = function () {}

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { Studio } = await vite.ssrLoadModule('/src/studio/Studio.tsx')
const { createRoot } = await import('react-dom/client')
const { act, createElement } = await import('react')
const root = createRoot(win.document.getElementById('root')!)
await act(async () => { root.render(createElement(Studio)); await new Promise(r => setTimeout(r, 0)) })
const startup = () => requests.splice(0).length
const tick = (ms = 30) => new Promise(r => setTimeout(r, ms))
async function click(text: string, within: ParentNode = win.document) {
  const b = Array.from(within.querySelectorAll('button')).find(x => x.textContent?.includes(text) && !x.disabled)
  assert.ok(b, `Missing enabled button: ${text}`)
  await act(async () => { b.click(); await tick() })
}
async function type(el: Element | null, value: string) {
  assert.ok(el)
  const proto = el.tagName === 'TEXTAREA' ? win.HTMLTextAreaElement.prototype : win.HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value)
  await act(async () => { el.dispatchEvent(new win.Event('input', { bubbles: true })); await tick(0) })
}
const lab = () => win.document.querySelector('.lab-modal') as HTMLElement
try {
  const text = () => win.document.body.textContent!
  startup() // the studio checks for an optional server on load; everything after this is the Lab
  // Start a blank project, write the brief, then open the Lab from the sidebar.
  await act(async () => { (win.document.querySelector('button[aria-label="New project"]') as HTMLElement).click(); await tick() })
  await type(win.document.querySelector('textarea[aria-label="Project context"]'), 'A booking app for township barbershops where customers reserve slots, pay a deposit and get reminders. Owners see the day at a glance.')
  assert.ok(Array.from(win.document.querySelectorAll('a')).some(a => a.getAttribute('href') === './design.html'), 'link to the five-stage flow')
  await click('ProdOps Lab')
  assert.ok(lab(), 'Lab opens')
  assert.match(lab().textContent!, /Handoff readiness/)
  assert.ok(lab().querySelectorAll('.lab-check').length >= 5, 'readiness checks are listed')

  // Instant draft
  await click('Instant draft', lab())
  assert.match(lab().textContent!, /on this device/)
  await act(async () => { await tick(500) })
  const options = lab().querySelectorAll('#lab-pattern option')
  assert.ok(options.length >= 5, 'starting patterns are listed')
  await click('Draft this whole role', lab())
  assert.match(text(), /Drafted \d+ file/)
  await click('Close Lab').catch(() => undefined)
  if (lab()) await act(async () => { (lab().querySelector('[aria-label="Close Lab"]') as HTMLElement).click(); await tick() })
  assert.ok(!lab(), 'Lab closes')
  assert.match(win.localStorage.getItem('prodops.role-studio.projects.v2') ?? '', /Local template draft/, 'drafted files are labelled')

  // Save a version, edit, compare, download an iteration brief
  await click('ProdOps Lab')
  await click('Versions', lab())
  await type(lab().querySelector('input[aria-label="Version name"]'), 'first pass')
  await click('Save version', lab())
  assert.match(lab().textContent!, /first pass/)
  assert.ok(win.localStorage.getItem('prodops.lab.versions.v1'), 'versions stored in this browser')
  await act(async () => { (lab().querySelector('[aria-label="Close Lab"]') as HTMLElement).click(); await tick() })
  await type(win.document.querySelector('textarea[aria-label="Project context"]'), 'A booking app for township barbershops where customers reserve slots, pay a deposit and get reminders. Owners see the day at a glance. Add loyalty points.')
  await click('ProdOps Lab')
  await click('Versions', lab())
  assert.match(lab().textContent!, /brief changed/)
  await click('Download iteration brief', lab())
  assert.ok(exported && (await exported.text()).includes('loyalty points'))

  // Agent pack
  await click('Agent pack', lab())
  await click('Download agent pack', lab())
  await tick(200)
  const zip = await JSZip.loadAsync(await exported!.arrayBuffer())
  for (const name of ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md', '.cursor/rules/prodops.mdc', 'prompts/iterate.md']) assert.ok(zip.file(name), name)
  assert.deepEqual(requests, [], 'the Lab made no network requests')
  console.log('Lab smoke passed: readiness, instant draft, versions, iteration brief and agent pack, with no network.')
} finally { await act(async () => root.unmount()); await vite.close(); globalThis.fetch = oldFetch }
