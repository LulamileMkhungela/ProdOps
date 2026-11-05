/** The worked example's finished application, exercised through its real HTML in jsdom. */
import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'

const dir = 'examples/clinic-front-desk/project/solution/'
const html = readFileSync(dir + 'index.html', 'utf8')
const css = readFileSync(dir + 'styles.css', 'utf8')
const js = readFileSync(dir + 'app.js', 'utf8')

function app() {
  const page = html.replace(/<link[^>]*>/, `<style>${css}</style>`).replace(/<script src="app.js"><\/script>/, `<script>${js}</script>`)
  const dom = new JSDOM(page, { runScripts: 'dangerously', url: 'http://localhost/' })
  const w = dom.window as unknown as Window & { ClinicDesk: any; document: Document }
  return { w, d: w.document, api: w.ClinicDesk, text: () => w.document.body.textContent ?? '' }
}
const fill = (d: Document, name: string, value: string) => { const el = d.querySelector(`[name="${name}"]`) as HTMLInputElement; el.value = value }
const submit = (w: any, d: Document, form: string) => click(w, d.querySelector(`form[data-form="${form}"] [data-action="submit"]`))
const click = (w: any, el: Element | null) => el!.dispatchEvent(new w.MouseEvent('click', { bubbles: true }))
const tab = (w: any, d: Document, name: string) => click(w, d.querySelector(`[data-action="tab"][data-tab="${name}"]`))
const good = { name: 'Thandi Nkosi', phone: '082 555 0100', email: 'thandi@example.com', cover: 'Self-pay' }

test('patient rules: required fields, formats, unique email', () => {
  const { api } = app()
  assert.deepEqual(Object.keys(api.validatePatient({}, []).errors).sort(), ['cover', 'email', 'name', 'phone'])
  assert.ok(api.validatePatient({ ...good, phone: '12' }, []).errors.phone)
  assert.ok(api.validatePatient({ ...good, email: 'nope' }, []).errors.email)
  assert.equal(api.validatePatient({ ...good, name: '  Thandi Nkosi ' }, []).value.name, 'Thandi Nkosi')
  assert.ok(api.register(good).ok)
  assert.match(api.register({ ...good, name: 'Other', email: 'THANDI@example.com' }).errors.email, /already registered/)
})

test('booking rules: no double-booking, opening hours, valid choices', () => {
  const { api } = app()
  const a = api.register(good).value.id, b = api.register({ ...good, name: 'Sipho Dlamini', email: 'sipho@example.com' }).value.id
  const slot = { patientId: a, clinicianId: 'c1', date: '2030-01-07', time: '09:00', duration: '60', kind: 'Consult' }
  assert.ok(api.book(slot).ok)
  assert.match(api.book({ ...slot, patientId: b, time: '09:30' }).errors.time, /already booked 09:00 to 10:00/)
  assert.ok(api.book({ ...slot, patientId: b, time: '10:00' }).ok, 'back to back is fine')
  assert.ok(api.book({ ...slot, patientId: a, clinicianId: 'c2', time: '09:30' }).errors.time, 'the same patient cannot be in two rooms')
  assert.ok(api.book({ ...slot, patientId: b, clinicianId: 'c2', time: '16:30', duration: '60' }).errors.time, 'must end by closing time')
  assert.ok(api.book({ ...slot, patientId: '', kind: 'Dance' }).errors.patientId)
  assert.equal(api.nextFree('c1', '2030-01-07', 30, api.state.appointments), 8 * 60, 'the first free slot is before the 09:00 booking')
  assert.equal(api.nextFree('c1', '2030-01-07', 60, api.state.appointments), 8 * 60, 'a 60-minute gap exists at 08:00')
  assert.equal(api.nextFree('c1', '2030-01-07', 120, api.state.appointments), 11 * 60, 'a two-hour gap starts after the bookings')
})

test('status and note rules: complete only after a signed note, signed notes are final', () => {
  const { api } = app()
  const p = api.register(good).value.id
  const id = api.book({ patientId: p, clinicianId: 'c1', date: '2030-01-07', time: '09:00', duration: '30', kind: 'Consult' }).value.id
  assert.ok(!api.canMove('Completed', 'Arrived') && !api.canMove('Cancelled', 'Confirmed'))
  assert.ok(!api.move(id, 'Completed').ok, 'cannot skip arrival')
  assert.ok(api.move(id, 'Confirmed').ok && api.move(id, 'Arrived').ok)
  assert.match(api.move(id, 'Completed').error, /Sign the visit note/)
  assert.ok(!api.saveNote(id, '   ').ok, 'a summary is required')
  assert.ok(api.saveNote(id, 'Lower back pain, improving. Exercises given.').ok)
  assert.ok(api.signNote(id).ok && api.move(id, 'Completed').ok)
  assert.equal(api.state.patients[0].status, 'Active')
  assert.equal(api.state.patients[0].visits, 1)
  assert.match(api.saveNote(id, 'changed').error, /signed note cannot be changed/)
})

test('the screens work end to end through the page', () => {
  const { w, d, api, text } = app()
  assert.match(text(), /Nothing is booked/)
  tab(w, d, 'patients'); assert.match(text(), /No patients yet/)
  fill(d, 'name', 'Thandi Nkosi'); fill(d, 'phone', '12'); fill(d, 'email', 'thandi@example.com'); submit(w, d, 'patient')
  assert.equal(d.querySelector('#f-phone')!.getAttribute('aria-invalid'), 'true')
  assert.equal((d.querySelector('#f-name') as HTMLInputElement).value, 'Thandi Nkosi', 'a failed submit keeps what was typed')
  assert.match(text(), /at least 7/)
  fill(d, 'phone', '082 555 0100'); submit(w, d, 'patient')
  assert.match(text(), /Thandi Nkosi/); assert.equal(api.state.patients.length, 1)
  tab(w, d, 'appointments')
  const pid = api.state.patients[0].id
  fill(d, 'patientId', pid); fill(d, 'date', '2030-01-07'); fill(d, 'time', '09:00'); submit(w, d, 'booking')
  assert.equal(api.state.appointments.length, 1)
  fill(d, 'patientId', pid); fill(d, 'clinicianId', 'c1'); fill(d, 'date', '2030-01-07'); fill(d, 'time', '09:00'); submit(w, d, 'booking')
  assert.match(text(), /already booked|already has a booking/)
  tab(w, d, 'desk'); const day = d.querySelector('#f-day, #f-date') as HTMLInputElement
  day.value = '2030-01-07'; day.dispatchEvent(new w.Event('change', { bubbles: true }))
  assert.match(text(), /Thandi Nkosi/)
  click(w, d.querySelector('[data-action="move"][data-to="Arrived"]'))
  tab(w, d, 'notes'); assert.match(text(), /Visit summary/)
  const ta = d.querySelector('textarea') as HTMLTextAreaElement
  ta.value = ''; click(w, d.querySelector('[data-action="save-note"]')); assert.match(text(), /Write a short summary/)
  ;(d.querySelector('textarea') as HTMLTextAreaElement).value = 'Seen and treated.'
  click(w, d.querySelector('[data-action="save-note"]')); click(w, d.querySelector('[data-action="sign-note"]'))
  assert.match(text(), /A signed note cannot be changed/)
  tab(w, d, 'desk'); click(w, d.querySelector('[data-action="move"][data-to="Completed"]'))
  assert.match(text(), /Completed/); assert.equal(api.state.appointments[0].status, 'Completed')
})

test('forms also submit with the Enter key, and never rely on the browser submitting them', () => {
  const { w, d, api } = app()
  assert.equal(d.querySelectorAll('button[type="submit"]').length, 0, 'the preview frame blocks form submission, so no submit buttons')
  tab(w, d, 'patients')
  fill(d, 'name', 'Thandi Nkosi'); fill(d, 'phone', '082 555 0100'); fill(d, 'email', 'thandi@example.com')
  d.querySelector('#f-email')!.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
  assert.equal(api.state.patients.length, 1)
})

test('the stylesheet carries the project design tokens', () => {
  const tokens = readFileSync('examples/clinic-front-desk/project/design/design-tokens.css', 'utf8').trim()
  assert.ok(css.startsWith(tokens), 'solution/styles.css starts with design/design-tokens.css')
})

test('a completed visit still holds its slot', () => {
  const { api } = app()
  const p = api.register(good).value.id, q = api.register({ ...good, name: 'Sipho', email: 's@example.com' }).value.id
  const id = api.book({ patientId: p, clinicianId: 'c1', date: '2030-01-07', time: '09:00', duration: '30', kind: 'Consult' }).value.id
  api.move(id, 'Arrived'); api.saveNote(id, 'Seen.'); api.signNote(id); api.move(id, 'Completed')
  assert.match(api.book({ patientId: q, clinicianId: 'c1', date: '2030-01-07', time: '09:00', duration: '30', kind: 'Consult' }).errors.time, /already booked/)
  api.move(api.book({ patientId: q, clinicianId: 'c2', date: '2030-01-07', time: '09:00', duration: '30', kind: 'Consult' }).value.id, 'Cancelled')
  assert.ok(api.book({ patientId: q, clinicianId: 'c2', date: '2030-01-07', time: '09:00', duration: '30', kind: 'Consult' }).ok, 'a cancelled booking frees its slot')
})

import { existsSync } from 'node:fs'
import { exampleProject, packFiles, EXAMPLE } from './build-example'
import { analyse } from '../src/studio/lab/readiness'

test('the worked example is a valid project that passes its own readiness check', () => {
  const project = exampleProject()
  assert.equal(project.name, 'Clinic front desk (worked example)')
  assert.ok(project.files.length > 100 && project.files.length <= 300, `${project.files.length} files`)
  for (const path of ['specs/business/scope/scope.md', 'specs/business/data/shape.md', 'design/design-system.md', 'specs/development/code-standards/index.yaml', 'solution/index.html', 'solution/app.js', 'solution/styles.css']) assert.ok(project.files.some(f => f.path === path), path)
  const report = analyse(project)
  assert.equal(report.checks.filter(c => c.level === 'fail').length, 0)
  assert.equal(report.checks.filter(c => c.level === 'warn').length, 0)
})

test('the example hand-off pack is current, and every milestone has a hand-written log', async () => {
  const files = await packFiles()
  for (const [path, content] of Object.entries(files)) {
    if (path.endsWith('milestone-log.md')) {
      const log = readFileSync(EXAMPLE + 'handoff-pack/' + path, 'utf8')
      assert.ok(!log.includes('_One bullet per thing a person can now see or do._'), `${path} is still the empty template`)
      continue
    }
    assert.ok(existsSync(EXAMPLE + 'handoff-pack/' + path), `${path} is missing: run npm run example:build`)
    assert.equal(readFileSync(EXAMPLE + 'handoff-pack/' + path, 'utf8'), content, `${path} is out of date: run npm run example:build`)
  }
})
