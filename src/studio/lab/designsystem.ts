/**
 * A design-system reference page and agent rules, generated from the project's tokens.
 *
 * The page documents each component with when to use it, when not to, and sample markup,
 * and the markdown twin is what a coding agent reads. The rules exist to stop design drift:
 * an agent that has no shared sense of the interface reinvents it every session.
 */
import { defaultTokens, type Tokens } from '../tokens'
import type { FileItem, StudioProject } from '../model'
import { contrast, isHex } from './color'
import type { Platform } from './agentpack'

export function readTokens(project: StudioProject): Tokens {
  const file = project.files.find(f => f.path === 'design/design-tokens.json')
  try {
    const t = { ...defaultTokens, ...JSON.parse(file?.content ?? '{}') } as Tokens
    return {
      ...t,
      primary: isHex(t.primary) ? t.primary : defaultTokens.primary, background: isHex(t.background) ? t.background : defaultTokens.background, text: isHex(t.text) ? t.text : defaultTokens.text,
      radius: Number.isFinite(t.radius) ? Math.min(40, Math.max(0, Number(t.radius))) : defaultTokens.radius,
      colors: Object.fromEntries(Object.entries(t.colors ?? {}).filter(([k, v]) => /^[a-z][a-z0-9-]{0,39}$/.test(k) && isHex(String(v))).map(([k, v]) => [k, String(v)])),
    }
  } catch { return defaultTokens }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const onColour = (bg: string) => (contrast(bg, '#ffffff') >= contrast(bg, '#111111') ? '#ffffff' : '#111111')

interface Part { id: string; title: string; when: string; whenNot: string; html: string; code: string }
const parts = (): Part[] => [
  { id: 'buttons', title: 'Buttons', when: 'One primary button per view for the main action; secondary for alternatives; ghost for low-emphasis actions; danger for destructive actions.', whenNot: 'Do not use a button to navigate (use a link) or put two primary buttons side by side.',
    html: '<div class="row"><button class="btn btn-primary">Save</button><button class="btn btn-secondary">Cancel</button><button class="btn btn-ghost">Learn more</button><button class="btn btn-danger">Delete</button><button class="btn btn-primary btn-sm">Small</button></div>',
    code: '<button class="btn btn-primary">Save</button>\n<button class="btn btn-secondary">Cancel</button>\n<button class="btn btn-ghost">Learn more</button>\n<button class="btn btn-danger">Delete</button>' },
  { id: 'forms', title: 'Form fields', when: 'Every input has a visible label above it; show errors in words beside the field and keep what the user typed.', whenNot: 'Do not use placeholder text instead of a label.',
    html: '<div class="stack"><label class="field">Name<input class="input" value="Ada Lovelace"></label><label class="field">Plan<select class="input"><option>Starter</option><option>Team</option></select></label><label class="check"><input type="checkbox" checked> Send me reminders</label><label class="field">Email<input class="input is-error" value="ada@"><span class="error">Enter a full email address, such as ada@example.com.</span></label></div>',
    code: '<label class="field">Name\n  <input class="input">\n</label>\n<label class="field">Email\n  <input class="input is-error">\n  <span class="error">Enter a full email address.</span>\n</label>' },
  { id: 'badges', title: 'Badges', when: 'A short status or count next to a title (Open, Paid, 3 new).', whenNot: 'Do not use badges for long text or as buttons.',
    html: '<div class="row"><span class="badge">Draft</span><span class="badge badge-primary">Active</span><span class="badge badge-danger">Overdue</span></div>', code: '<span class="badge badge-primary">Active</span>' },
  { id: 'listings', title: 'Listings', when: 'Any collection (contacts, invoices, tasks): a main title, one line of detail, an optional badge, and actions on the right.', whenNot: 'Do not build a table for fewer than three columns of real data.',
    html: '<ul class="list"><li><div><b>Thandi Dlamini</b><small>Cut and fade · Saturday 10:00</small></div><span class="badge badge-primary">Deposit paid</span></li><li><div><b>Sipho Nkosi</b><small>Beard trim · Saturday 11:00</small></div><span class="badge">Awaiting deposit</span></li></ul>',
    code: '<ul class="list">\n  <li>\n    <div><b>Title</b><small>Detail line</small></div>\n    <span class="badge">Status</span>\n  </li>\n</ul>' },
  { id: 'modal', title: 'Modal', when: 'A short, focused task that returns to the same screen (up to about five fields, or a confirmation).', whenNot: 'Do not use a modal for long forms or content people may want to link to.',
    html: '<div class="modal"><h3>Delete this booking?</h3><p>This cannot be undone.</p><div class="row end"><button class="btn btn-secondary">Keep it</button><button class="btn btn-danger">Delete</button></div></div>',
    code: '<div class="modal" role="dialog" aria-modal="true">\n  <h3>Title</h3>\n  <p>One sentence of detail.</p>\n  <div class="row end">…buttons…</div>\n</div>' },
]

function css(t: Tokens): string {
  const extras = Object.entries(t.colors ?? {}).map(([k, v]) => `--color-${k}:${v};`).join('')
  return `:root{--color-primary:${t.primary};--color-on-primary:${onColour(t.primary)};--color-background:${t.background};--color-text:${t.text};--radius:${t.radius}px;${extras}--muted:color-mix(in srgb,var(--color-text) 62%,var(--color-background));--line:color-mix(in srgb,var(--color-text) 14%,var(--color-background));--surface:color-mix(in srgb,var(--color-text) 4%,var(--color-background));--danger:#b3261e}
*{box-sizing:border-box}body{margin:0;background:var(--color-background);color:var(--color-text);font:16px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
main{max-width:860px;margin:0 auto;padding:40px 24px 80px}h1{font-size:2rem;margin:0 0 4px}h2{font-size:1.25rem;margin:44px 0 6px;padding-top:20px;border-top:1px solid var(--line)}h3{margin:0 0 4px}p{margin:6px 0}small{display:block;color:var(--muted)}
.lead{color:var(--muted)}.guide{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:10px 0}.guide div{font-size:.88rem;padding:10px 12px;border-radius:var(--radius);background:var(--surface)}.guide b{display:block;font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.demo{padding:20px;border:1px solid var(--line);border-radius:var(--radius);margin:10px 0}pre{margin:8px 0;padding:12px;background:var(--surface);border-radius:var(--radius);overflow:auto;font-size:.8rem}
.row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}.row.end{justify-content:flex-end;margin-top:14px}.stack{display:grid;gap:14px;max-width:340px}
.swatches{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}.sw{border:1px solid var(--line);border-radius:var(--radius);overflow:hidden}.sw i{display:block;height:64px}.sw div{padding:8px 10px;font-size:.82rem}
.btn{font:inherit;font-weight:600;padding:10px 18px;border-radius:var(--radius);border:2px solid transparent;cursor:pointer}.btn:focus-visible,.input:focus-visible{outline:3px solid var(--color-primary);outline-offset:2px}.btn-sm{padding:6px 12px;font-size:.85rem}
.btn-primary{background:var(--color-primary);color:var(--color-on-primary)}.btn-secondary{background:transparent;border-color:var(--line);color:var(--color-text)}.btn-ghost{background:transparent;color:var(--color-primary)}.btn-danger{background:var(--danger);color:#fff}
.field{display:grid;gap:6px;font-weight:600;font-size:.9rem}.input{font:inherit;font-weight:400;padding:10px 12px;border-radius:var(--radius);border:2px solid var(--line);background:var(--surface);color:var(--color-text)}.input:focus{border-color:var(--color-primary)}.input.is-error{border-color:var(--danger)}.error{color:var(--danger);font-weight:400;font-size:.85rem}.check{display:flex;gap:8px;align-items:center}
.badge{display:inline-block;font-size:.75rem;font-weight:600;padding:2px 10px;border-radius:999px;background:var(--surface);border:1px solid var(--line)}.badge-primary{background:var(--color-primary);color:var(--color-on-primary);border-color:transparent}.badge-danger{background:var(--danger);color:#fff;border-color:transparent}
.list{list-style:none;margin:0;padding:0;border:1px solid var(--line);border-radius:var(--radius)}.list li{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 14px}.list li+li{border-top:1px solid var(--line)}
.modal{max-width:380px;padding:20px;border-radius:calc(var(--radius) * 1.5);background:var(--color-background);box-shadow:0 12px 40px rgba(0,0,0,.18);border:1px solid var(--line)}@media(max-width:600px){.guide{grid-template-columns:1fr}}`
}

function swatches(t: Tokens) {
  const rows: { name: string; value: string; role: string }[] = [
    { name: 'primary', value: t.primary, role: 'Main actions, links, focus rings' },
    { name: 'background', value: t.background, role: 'Page background' },
    { name: 'text', value: t.text, role: 'Body text and headings' },
    ...Object.entries(t.colors ?? {}).filter(([k]) => !['primary', 'background', 'text'].includes(k)).map(([name, value]) => ({ name, value, role: 'Supporting colour' })),
  ]
  return rows.map(r => ({ ...r, onBackground: contrast(r.value, t.background) }))
}

export function designSystemHtml(project: StudioProject): string {
  const t = readTokens(project)
  const sw = swatches(t)
  const section = (p: Part) => `<h2 id="${p.id}">${p.title}</h2><div class="guide"><div><b>Use when</b>${esc(p.when)}</div><div><b>Do not use when</b>${esc(p.whenNot)}</div></div><div class="demo">${p.html}</div><pre>${esc(p.code)}</pre>`
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(project.name)} design system</title><style>${css(t)}</style></head><body><main>
<h1>${esc(project.name)} design system</h1><p class="lead">The decisions made once, so every screen is built from the same pieces. Generated from design/design-tokens.json; change the tokens and regenerate. The sample markup is guidance for the shape of each component, not code to paste.</p>
<h2 id="colours">Colours</h2><div class="guide"><div><b>Use when</b>Always refer to colours by name (primary, text, background), never by value.</div><div><b>Do not use when</b>Never write a raw hex value in a component.</div></div><div class="swatches">${sw.map(s => `<div class="sw"><i style="background:${s.value}"></i><div><b>${esc(s.name)}</b> ${s.value}<small>${esc(s.role)}</small><small>${s.onBackground.toFixed(1)}:1 on the background</small></div></div>`).join('')}</div>
<h2 id="typography">Typography</h2><div class="demo"><h1 style="margin:0">${esc(t.heading)}</h1><p>Body text uses the system font stack at 16px with a 1.55 line height. Headings use the same family. Use plain h1, h2, h3 and p elements and style them once, here.</p></div>
<h2 id="shape">Shape</h2><p>Corner radius: <b>${t.radius}px</b> on buttons, fields and cards; modals use 1.5×. Spacing steps: 4, 8, 12, 16, 24, 40.</p>
${parts().map(section).join('')}</main></body></html>`
}

export function designRules(platform: Platform = 'web'): string {
  const native = platform !== 'web'
  return `## Design system rules

The design system is documented in \`design/design-system.md\` (humans: \`design/design-system.html\`).

- Before writing any UI, read it and reuse the matching component. If none fits, add one to the design system first, then use it.
- Refer to colours, radius and type by token name. Never write a raw hex value, a raw font size or a one-off radius in a component.
- Use plain semantic elements for text (\`h1\`–\`h3\`, \`p\`, \`label\`, \`button\`) and put typography in the base styles. Do not restyle each heading with a stack of utility classes.
- One primary button per view. Every input has a visible label. Errors appear beside the field, in words.
- Every interactive element has a visible focus state and meets 4.5:1 text contrast.
- Never reach for a new colour, shadow or spacing value to fix one screen. Change the token and every screen follows.
${native ? '- On mobile, map each token to a theme object and keep the same component names; touch targets are at least 44×44 points.\n' : ''}- When asked for UI, say which design-system component you used.
`
}

export function designSystemMarkdown(project: StudioProject, platform: Platform = 'web'): string {
  const t = readTokens(project)
  return `# ${project.name} design system

Generated from \`design/design-tokens.json\`. Refer to tokens by name.

## Colours

| Token | Value | Use | Contrast on background |
| --- | --- | --- | --- |
${swatches(t).map(s => `| ${s.name} | ${s.value} | ${s.role} | ${s.onBackground.toFixed(1)}:1 |`).join('\n')}

## Typography

System font stack, 16px body, 1.55 line height. Sample headline: "${t.heading}". Style plain \`h1\`–\`h3\` and \`p\` once in the base styles.

## Shape

Radius ${t.radius}px on buttons, fields and cards; modals 1.5×. Spacing steps: 4, 8, 12, 16, 24, 40.

${parts().map(p => `## ${p.title}\n\n**Use when:** ${p.when}\n\n**Do not use when:** ${p.whenNot}\n\n\`\`\`html\n${p.code}\n\`\`\`\n`).join('\n')}
${designRules(platform)}`
}

/** Files written into the project by "Generate design system". */
export function designSystemFiles(project: StudioProject, platform: Platform = 'web'): FileItem[] {
  return [
    { path: 'design/design-system.html', content: designSystemHtml(project) },
    { path: 'design/design-system.md', content: designSystemMarkdown(project, platform) },
    { path: 'design/design-rules.md', content: `# Design rules\n\n${designRules(platform)}` },
  ]
}
