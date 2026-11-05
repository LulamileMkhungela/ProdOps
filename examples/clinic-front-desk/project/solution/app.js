/* Clinic front desk. Plain HTML, CSS and JavaScript so it runs in the ProdOps preview.
   Data lives in memory: the preview has no browser storage, so it resets when closed. */
(function () {
  'use strict'

  // Clinicians are fixed for version one (adding clinicians is out of scope).
  var CLINICIANS = [
    { id: 'c1', name: 'Therapist A', room: 'Room 1' },
    { id: 'c2', name: 'Therapist B', room: 'Room 2' }
  ]
  var KINDS = ['Consult', 'Follow-up', 'Procedure', 'Telehealth']
  var COVER = ['Self-pay', 'Medical aid']
  var DAY_START = 8 * 60, DAY_END = 17 * 60, STEP = 30
  // Status moves that are allowed. Anything else is refused by the rules, not just hidden.
  var NEXT = {
    Unconfirmed: ['Confirmed', 'Arrived', 'Cancelled'],
    Confirmed: ['Arrived', 'No-show', 'Cancelled'],
    Arrived: ['Completed'],
    Completed: [], 'No-show': [], Cancelled: []
  }
  var ACTIVE = { Unconfirmed: 1, Confirmed: 1, Arrived: 1, Completed: 1 }

  var state = { patients: [], appointments: [], notes: {}, seq: 0, tab: 'desk', search: '', filter: 'All', date: today(), errors: {}, draft: {} }

  function today() { var d = new Date(); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) }
  function p2(n) { return (n < 10 ? '0' : '') + n }
  function id(prefix) { state.seq += 1; return prefix + state.seq }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] }) }
  function mins(t) { var m = /^(\d{2}):(\d{2})$/.exec(t); return m ? +m[1] * 60 + +m[2] : NaN }
  function hhmm(n) { return p2(Math.floor(n / 60)) + ':' + p2(n % 60) }
  function clinician(cid) { return CLINICIANS.filter(function (c) { return c.id === cid })[0] }
  function patient(pid) { return state.patients.filter(function (p) { return p.id === pid })[0] }
  function appt(aid) { return state.appointments.filter(function (a) { return a.id === aid })[0] }

  // ---------- Rules (pure; also used by the tests) ----------
  function validatePatient(input, existing) {
    var e = {}, name = String(input.name || '').trim(), phone = String(input.phone || '').trim(), email = String(input.email || '').trim()
    if (!name) e.name = 'Enter the patient’s name.'
    else if (name.length > 120) e.name = 'Use 120 characters or fewer.'
    if (!phone) e.phone = 'Enter a phone number.'
    else if (!/^\+?[0-9 ()-]+$/.test(phone) || phone.replace(/\D/g, '').length < 7) e.phone = 'Use digits only, at least 7, for example 082 555 0100.'
    if (!email) e.email = 'Enter an email address.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter an email address like name@example.com.'
    else if ((existing || []).some(function (p) { return p.email.toLowerCase() === email.toLowerCase() })) e.email = 'A patient with this email is already registered.'
    if (COVER.indexOf(input.cover) < 0) e.cover = 'Choose how the patient pays.'
    return { ok: !Object.keys(e).length, errors: e, value: { name: name, phone: phone, email: email, cover: input.cover } }
  }

  function overlaps(a, b) { return a.date === b.date && a.start < b.start + b.duration && b.start < a.start + a.duration }

  function validateBooking(input, existing) {
    var e = {}, start = mins(input.time), duration = +input.duration
    if (!input.patientId || !patient(input.patientId)) e.patientId = 'Choose a patient.'
    if (!input.clinicianId || !clinician(input.clinicianId)) e.clinicianId = 'Choose a clinician.'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date || '')) e.date = 'Choose a date.'
    if (isNaN(start)) e.time = 'Choose a start time.'
    else if (start < DAY_START || start + duration > DAY_END) e.time = 'The clinic is open ' + hhmm(DAY_START) + ' to ' + hhmm(DAY_END) + '. Pick a time that ends by then.'
    if ([30, 45, 60].indexOf(duration) < 0) e.duration = 'Choose 30, 45 or 60 minutes.'
    if (KINDS.indexOf(input.kind) < 0) e.kind = 'Choose the kind of visit.'
    if (!Object.keys(e).length) {
      var candidate = { date: input.date, start: start, duration: duration }
      var clash = (existing || []).filter(function (a) { return ACTIVE[a.status] && overlaps(a, candidate) })
      var sameClin = clash.filter(function (a) { return a.clinicianId === input.clinicianId })[0]
      var samePat = clash.filter(function (a) { return a.patientId === input.patientId })[0]
      if (sameClin) e.time = clinician(input.clinicianId).name + ' is already booked ' + hhmm(sameClin.start) + ' to ' + hhmm(sameClin.start + sameClin.duration) + '. Choose another time.'
      else if (samePat) e.time = 'This patient already has a booking at ' + hhmm(samePat.start) + ' that overlaps.'
    }
    return { ok: !Object.keys(e).length, errors: e, value: { patientId: input.patientId, clinicianId: input.clinicianId, date: input.date, start: start, duration: duration, kind: input.kind } }
  }

  function canMove(from, to) { return (NEXT[from] || []).indexOf(to) >= 0 }

  function nextFree(cid, date, duration, existing) {
    for (var s = DAY_START; s + duration <= DAY_END; s += STEP) {
      var c = { date: date, start: s, duration: duration }
      if (!(existing || []).some(function (a) { return a.clinicianId === cid && a.status !== 'Cancelled' && a.status !== 'No-show' && overlaps(a, c) })) return s
    }
    return null
  }

  // ---------- Actions ----------
  function register(input) {
    var r = validatePatient(input, state.patients)
    if (!r.ok) return r
    r.value.id = id('p'); r.value.status = 'New'; r.value.visits = 0
    state.patients.push(r.value)
    return r
  }
  function book(input) {
    var r = validateBooking(input, state.appointments)
    if (!r.ok) return r
    r.value.id = id('a'); r.value.status = 'Unconfirmed'
    state.appointments.push(r.value)
    return r
  }
  function move(aid, to) {
    var a = appt(aid)
    if (!a) return { ok: false, error: 'Appointment not found.' }
    if (!canMove(a.status, to)) return { ok: false, error: 'An appointment that is ' + a.status.toLowerCase() + ' cannot become ' + to.toLowerCase() + '.' }
    if (to === 'Completed' && !(state.notes[aid] && state.notes[aid].status === 'Signed')) return { ok: false, error: 'Sign the visit note before completing the appointment.' }
    a.status = to
    if (to === 'Completed') { var p = patient(a.patientId); p.visits += 1; p.status = 'Active'; p.lastVisit = a.date }
    return { ok: true }
  }
  function saveNote(aid, summary) {
    var a = appt(aid), text = String(summary || '').trim()
    if (!a) return { ok: false, error: 'Appointment not found.' }
    if (a.status !== 'Arrived' && a.status !== 'Completed') return { ok: false, error: 'Notes can be written once the patient has arrived.' }
    if (state.notes[aid] && state.notes[aid].status === 'Signed') return { ok: false, error: 'A signed note cannot be changed.' }
    if (!text) return { ok: false, error: 'Write a short summary of the visit.' }
    if (text.length > 2000) return { ok: false, error: 'Use 2000 characters or fewer.' }
    state.notes[aid] = { summary: text, status: 'Draft' }
    return { ok: true }
  }
  function signNote(aid) {
    var n = state.notes[aid]
    if (!n || !n.summary) return { ok: false, error: 'Write and save the note first.' }
    n.status = 'Signed'; n.signedAt = new Date().toISOString()
    return { ok: true }
  }

  // ---------- Views ----------
  var TABS = [['desk', 'Front desk'], ['patients', 'Patients'], ['appointments', 'Appointments'], ['notes', 'Visit notes']]

  function fieldErr(k) { return state.errors[k] ? '<p class="error" id="err-' + k + '">' + esc(state.errors[k]) + '</p>' : '' }
  function field(k, label, control) { return '<div class="field"><label for="f-' + k + '">' + label + '</label>' + control + fieldErr(k) + '</div>' }
  function dv(k, dflt) { return Object.prototype.hasOwnProperty.call(state.draft, k) ? state.draft[k] : dflt }
  function input(k, type, extra, dflt) { return '<input class="input" id="f-' + k + '" name="' + k + '" type="' + type + '" value="' + esc(dv(k, dflt || '')) + '" ' + (extra || '') + (state.errors[k] ? ' aria-invalid="true" aria-describedby="err-' + k + '"' : '') + '>' }
  function select(k, opts, current) {
    return '<select class="input" id="f-' + k + '" name="' + k + '"' + (state.errors[k] ? ' aria-invalid="true" aria-describedby="err-' + k + '"' : '') + '>' +
      opts.map(function (o) { var v = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(v) + '"' + (v === dv(k, current) ? ' selected' : '') + '>' + esc(l) + '</option>' }).join('') + '</select>'
  }
  function badge(s) { return '<span class="badge badge-' + String(s).toLowerCase().replace(/[^a-z]/g, '') + '">' + esc(s) + '</span>' }
  function empty(msg) { return '<p class="empty">' + esc(msg) + '</p>' }

  function appointmentRow(a, withActions) {
    var p = patient(a.patientId), c = clinician(a.clinicianId)
    var actions = withActions ? NEXT[a.status].map(function (to) {
      var label = to === 'Arrived' ? 'Mark arrived' : to === 'Completed' ? 'Complete' : to === 'Confirmed' ? 'Confirm' : to === 'No-show' ? 'No-show' : 'Cancel'
      return '<button class="button ' + (to === 'Cancelled' || to === 'No-show' ? 'button-quiet' : 'button-small') + '" data-action="move" data-id="' + a.id + '" data-to="' + to + '" aria-label="' + label + ' for ' + esc(p.name) + ' at ' + hhmm(a.start) + '">' + label + '</button>'
    }).join('') : ''
    return '<li class="row"><div class="time">' + hhmm(a.start) + '<small>' + a.duration + ' min</small></div><div class="grow"><strong>' + esc(p.name) + '</strong><span>' + esc(a.kind) + ' · ' + esc(c.name) + ' · ' + esc(c.room) + '</span></div>' + badge(a.status) + (actions ? '<div class="actions">' + actions + '</div>' : '') + '</li>'
  }

  function viewDesk() {
    var day = state.appointments.filter(function (a) { return a.date === state.date }).sort(function (x, y) { return x.start - y.start })
    var n = function (s) { return day.filter(function (a) { return a.status === s }).length }
    var booked = day.filter(function (a) { return a.status !== 'Cancelled' }).length
    var cards = [['Booked', booked, 'appointments'], ['Waiting to confirm', n('Unconfirmed'), 'appointments'], ['Arrived', n('Arrived'), 'in the building'], ['Completed', n('Completed'), 'visits'], ['No-shows', n('No-show'), 'today']]
    var gaps = CLINICIANS.map(function (c) { var s = nextFree(c.id, state.date, 30, state.appointments); return '<li><strong>' + esc(c.name) + '</strong> next free 30-minute slot: ' + (s === null ? 'none today' : hhmm(s)) + '</li>' }).join('')
    return '<section aria-labelledby="h-desk"><div class="head"><h2 id="h-desk">Front desk</h2><div class="field inline"><label for="f-date">Day</label><input class="input" id="f-date" type="date" value="' + state.date + '" data-action="day"></div></div>' +
      '<ul class="cards">' + cards.map(function (c) { return '<li class="card"><b>' + c[1] + '</b><span>' + c[0] + '</span><small>' + c[2] + '</small></li>' }).join('') + '</ul>' +
      '<h3>Today’s diary</h3>' + (day.length ? '<ul class="list">' + day.map(function (a) { return appointmentRow(a, true) }).join('') + '</ul>' : empty('Nothing is booked for this day. Open Appointments to book a visit.')) +
      '<h3>Gaps</h3><ul class="plain">' + gaps + '</ul></section>'
  }

  function viewPatients() {
    var q = state.search.trim().toLowerCase()
    var list = state.patients.filter(function (p) { return (state.filter === 'All' || p.status === state.filter) && (!q || (p.name + ' ' + p.phone + ' ' + p.email).toLowerCase().indexOf(q) >= 0) })
    var form = '<form class="card form" data-form="patient" novalidate><h3>Register a patient</h3>' +
      field('name', 'Full name', input('name', 'text', 'autocomplete="off" maxlength="120"')) +
      field('phone', 'Phone', input('phone', 'tel', 'autocomplete="off"')) +
      field('email', 'Email', input('email', 'email', 'autocomplete="off"')) +
      field('cover', 'How do they pay?', select('cover', COVER, 'Self-pay')) +
      '<button class="button" type="button" data-action="submit">Register patient</button></form>'
    var rows = list.map(function (p) { return '<li class="row"><div class="grow"><strong>' + esc(p.name) + '</strong><span>' + esc(p.phone) + ' · ' + esc(p.email) + ' · ' + esc(p.cover) + '</span></div><span class="muted">' + p.visits + ' visit' + (p.visits === 1 ? '' : 's') + (p.lastVisit ? ', last ' + esc(p.lastVisit) : '') + '</span>' + badge(p.status) + '</li>' }).join('')
    return '<section aria-labelledby="h-pat"><h2 id="h-pat">Patients</h2><div class="split">' + form + '<div><div class="tools"><div class="field"><label for="f-search">Search</label><input class="input" id="f-search" type="search" value="' + esc(state.search) + '" placeholder="Name, phone or email" data-action="search"></div><div class="field"><label for="f-filter">Status</label>' +
      '<select class="input" id="f-filter" data-action="filter">' + ['All', 'New', 'Active'].map(function (s) { return '<option' + (s === state.filter ? ' selected' : '') + '>' + s + '</option>' }).join('') + '</select></div></div>' +
      (list.length ? '<ul class="list">' + rows + '</ul>' : empty(state.patients.length ? 'No patient matches. Clear the search or the status filter.' : 'No patients yet. Register the first one on the left.')) + '</div></div></section>'
  }

  function viewAppointments() {
    var pats = [['', 'Choose a patient']].concat(state.patients.map(function (p) { return [p.id, p.name] }))
    var form = state.patients.length ? '<form class="card form" data-form="booking" novalidate><h3>Book a visit</h3>' +
      field('patientId', 'Patient', select('patientId', pats, '')) +
      field('clinicianId', 'Clinician', select('clinicianId', CLINICIANS.map(function (c) { return [c.id, c.name + ' · ' + c.room] }), 'c1')) +
      field('date', 'Date', input('date', 'date', '', state.date)) +
      field('time', 'Start time', input('time', 'time', 'step="900"', '09:00')) +
      field('duration', 'Length', select('duration', [['30', '30 minutes'], ['45', '45 minutes'], ['60', '60 minutes']], '30')) +
      field('kind', 'Kind of visit', select('kind', KINDS, 'Consult')) +
      '<button class="button" type="button" data-action="submit">Book visit</button></form>' : '<div class="card">' + empty('Register a patient first, then book their visit.') + '<button class="button" data-action="tab" data-tab="patients">Go to Patients</button></div>'
    var all = state.appointments.slice().sort(function (x, y) { return x.date < y.date ? -1 : x.date > y.date ? 1 : x.start - y.start })
    return '<section aria-labelledby="h-app"><h2 id="h-app">Appointments</h2><div class="split">' + form + '<div>' +
      (all.length ? '<ul class="list">' + all.map(function (a) { return appointmentRow(a, true).replace('<div class="time">', '<div class="time"><small>' + a.date + '</small>') }).join('') + '</ul>' : empty('No appointments yet.')) + '</div></div></section>'
  }

  function viewNotes() {
    var eligible = state.appointments.filter(function (a) { return a.status === 'Arrived' || a.status === 'Completed' })
    var cards = eligible.map(function (a) {
      var p = patient(a.patientId), n = state.notes[a.id], signed = n && n.status === 'Signed'
      return '<li class="card form" data-note="' + a.id + '"><div class="head"><div><strong>' + esc(p.name) + '</strong><span class="muted"> ' + a.date + ' ' + hhmm(a.start) + ' · ' + esc(a.kind) + '</span></div>' + badge(n ? n.status : 'No note') + '</div>' +
        (signed ? '<p class="note">' + esc(n.summary) + '</p><p class="muted">Signed. A signed note cannot be changed.</p>' :
          '<div class="field"><label for="n-' + a.id + '">Visit summary</label><textarea class="input" id="n-' + a.id + '" rows="4" maxlength="2000">' + esc(dv('n-' + a.id, n ? n.summary : '')) + '</textarea>' + (state.errors['n-' + a.id] ? '<p class="error">' + esc(state.errors['n-' + a.id]) + '</p>' : '') + '</div>' +
          '<div class="actions"><button class="button button-small" data-action="save-note" data-id="' + a.id + '">Save draft</button><button class="button" data-action="sign-note" data-id="' + a.id + '"' + (n ? '' : ' disabled') + '>Sign note</button></div>') + '</li>'
    }).join('')
    return '<section aria-labelledby="h-notes"><h2 id="h-notes">Visit notes</h2>' + (eligible.length ? '<ul class="stack">' + cards + '</ul>' : empty('Notes appear here once a patient is marked arrived.')) + '</section>'
  }

  function render(focusSel) {
    var nav = document.getElementById('nav')
    nav.innerHTML = TABS.map(function (t) { return '<button class="tab" data-action="tab" data-tab="' + t[0] + '"' + (state.tab === t[0] ? ' aria-current="page"' : '') + '>' + t[1] + '</button>' }).join('')
    document.getElementById('main').innerHTML = state.tab === 'patients' ? viewPatients() : state.tab === 'appointments' ? viewAppointments() : state.tab === 'notes' ? viewNotes() : viewDesk()
    var f = focusSel && document.querySelector(focusSel)
    if (f) { f.focus(); if (f.setSelectionRange && f.type === 'search') f.setSelectionRange(f.value.length, f.value.length) }
  }
  function toast(msg) { var t = document.getElementById('toast'); t.textContent = msg; t.className = 'show'; clearTimeout(toast.t); toast.t = setTimeout(function () { t.className = '' }, 3500) }
  function formData(form) { var o = {}; Array.prototype.forEach.call(form.elements, function (el) { if (el.name) o[el.name] = el.value }); return o }

  // ---------- Events ----------
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest && ev.target.closest('[data-action]'); if (!el) return
    var act = el.getAttribute('data-action'), aid = el.getAttribute('data-id'), r
    if (act === 'submit') { submitForm(el.form || el.closest('form')); return }
    if (act === 'tab') { state.tab = el.getAttribute('data-tab'); state.errors = {}; state.draft = {}; render(); return }
    if (act === 'move') { r = move(aid, el.getAttribute('data-to')); toast(r.ok ? 'Updated.' : r.error); render(); return }
    if (act === 'save-note' || act === 'sign-note') {
      var ta = document.getElementById('n-' + aid), text = ta ? ta.value : ''
      r = saveNote(aid, text); state.errors = {}; state.draft = {}; state.draft['n-' + aid] = text
      if (r.ok && act === 'sign-note') r = signNote(aid)
      if (!r.ok) state.errors['n-' + aid] = r.error
      else { state.draft = {}; toast(act === 'sign-note' ? 'Note signed.' : 'Draft saved.') }
      render(); return
    }
  })
  document.addEventListener('input', function (ev) {
    var el = ev.target, act = el.getAttribute && el.getAttribute('data-action')
    if (act === 'search') { state.search = el.value; render('#f-search') }
  })
  document.addEventListener('change', function (ev) {
    var el = ev.target, act = el.getAttribute && el.getAttribute('data-action')
    if (act === 'filter') { state.filter = el.value; render('#f-filter') }
    if (act === 'day' && /^\d{4}-\d{2}-\d{2}$/.test(el.value)) { state.date = el.value; render('#f-date') }
  })
  // The preview frame does not allow form submission, so forms are submitted by the button and the Enter key.
  function submitForm(form) {
    var kind = form.getAttribute('data-form'), r
    if (kind === 'patient') { r = register(formData(form)); state.errors = r.errors || {}; state.draft = r.ok ? {} : formData(form); if (r.ok) toast(r.value.name + ' registered.'); render(r.ok ? '#f-name' : '[aria-invalid="true"]') }
    if (kind === 'booking') {
      r = book(formData(form)); state.errors = r.errors || {}; state.draft = r.ok ? {} : formData(form)
      if (r.ok) { state.date = r.value.date; toast('Visit booked.') }
      render(r.ok ? '#f-patientId' : '[aria-invalid="true"]')
    }
  }
  document.addEventListener('keydown', function (ev) {
    var el = ev.target
    if (ev.key === 'Enter' && el.tagName === 'INPUT' && el.form && el.form.getAttribute('data-form')) { ev.preventDefault(); submitForm(el.form) }
  })

  window.ClinicDesk = { state: state, validatePatient: validatePatient, validateBooking: validateBooking, canMove: canMove, nextFree: nextFree, register: register, book: book, move: move, saveNote: saveNote, signNote: signNote }
  render()
})()
