/**
 * A curated guide to common product and technical decisions, in plain language.
 * It is written, not generated: it explains the trade-off and gives a default for a
 * small first version. It does not know your product, so treat the default as a start.
 */
export interface Option { name: string; good: string; bad: string }
export interface Tradeoff { id: string; title: string; asks: string; keywords: string[]; options: Option[]; defaultFor: string }

export const TRADEOFFS: Tradeoff[] = [
  { id: 'search-where', title: 'Search and sort: in the browser or on the server', asks: 'Should searching and sorting happen on the user’s device or in the backend?', keywords: ['search', 'sort', 'filter', 'client', 'server', 'client-side', 'server-side', 'list'],
    options: [{ name: 'In the browser (client-side)', good: 'Instant results as you type; simple to build; works offline.', bad: 'Loads the whole list first; slows down or breaks with thousands of records.' }, { name: 'On the server (server-side)', good: 'Scales to large lists; the browser only gets what it shows.', bad: 'More to build; a short wait on each search; needs a connection.' }],
    defaultFor: 'Browser-side while the list will stay under a few thousand items. Switch when it grows.' },
  { id: 'custom-fields', title: 'Hard-coded fields or configurable fields', asks: 'Should users be able to add their own fields and pipeline stages?', keywords: ['custom', 'field', 'fields', 'configurable', 'configure', 'stages', 'settings', 'flexible', 'hardcode', 'hard-code'],
    options: [{ name: 'Hard-coded in the product', good: 'Far less to build; no settings screens; fits exactly your own process.', bad: 'Changing a field needs a code change.' }, { name: 'Configurable by users', good: 'Each customer shapes it to their business.', bad: 'Large extra build: editors, validation, migration, support.' }],
    defaultFor: 'Hard-code for an internal tool or a first version. Make it configurable only when several customers need different shapes.' },
  { id: 'users-auth', title: 'One user or many users with accounts', asks: 'Do people need their own logins, roles and private data?', keywords: ['login', 'account', 'accounts', 'auth', 'authentication', 'users', 'roles', 'permissions', 'multi-user', 'team', 'password'],
    options: [{ name: 'Single user / shared access', good: 'No account system to build or secure.', bad: 'No privacy between people; no audit trail per person.' }, { name: 'Accounts and roles', good: 'Private data, per-person history, controlled access.', bad: 'Sign-up, reset, roles and security all need building and testing.' }],
    defaultFor: 'Single user if only you or one small trusted team uses it; accounts as soon as anyone else’s data is involved.' },
  { id: 'delete', title: 'Delete for good or keep a record', asks: 'When someone deletes something, should it really disappear?', keywords: ['delete', 'remove', 'archive', 'undo', 'restore', 'trash', 'soft'],
    options: [{ name: 'Delete permanently', good: 'Simple; no leftover personal data.', bad: 'Mistakes cannot be undone; history has gaps.' }, { name: 'Archive or mark as deleted', good: 'Undo is possible; history stays complete.', bad: 'Lists must hide archived items; data keeps growing; privacy rules may require real deletion.' }],
    defaultFor: 'Archive for business records (deals, invoices); delete permanently for personal data people ask you to erase.' },
  { id: 'realtime', title: 'Live updates or refresh on demand', asks: 'Should screens update by themselves when something changes elsewhere?', keywords: ['real-time', 'realtime', 'live', 'update', 'updates', 'notifications', 'refresh', 'sync', 'push', 'websocket', 'polling'],
    options: [{ name: 'Refresh when the user acts or reloads', good: 'Simple and cheap.', bad: 'People may act on stale information.' }, { name: 'Live updates', good: 'Everyone sees the same thing at once.', bad: 'Needs a persistent connection, more testing, and conflict handling.' }],
    defaultFor: 'Refresh on demand unless two people edit the same thing at the same time.' },
  { id: 'database', title: 'Which kind of database', asks: 'Where should the data be stored?', keywords: ['database', 'data', 'store', 'storage', 'sql', 'postgres', 'sqlite', 'mongo', 'nosql', 'schema'],
    options: [{ name: 'A relational database (SQL)', good: 'Related records (contacts, deals, tasks) stay consistent; powerful queries.', bad: 'Changing the shape needs migrations.' }, { name: 'A document store or files', good: 'Flexible shape; quick to start.', bad: 'Relationships and reports get harder as the product grows.' }],
    defaultFor: 'SQL when records refer to each other. SQLite is enough for a single-user tool.' },
  { id: 'build-buy', title: 'Build it or use an existing service', asks: 'Should this part be built, or bought or borrowed?', keywords: ['build', 'buy', 'service', 'third-party', 'integration', 'payments', 'email', 'maps', 'login', 'vendor', 'saas'],
    options: [{ name: 'Use an existing service', good: 'Fast; security and upkeep handled for you.', bad: 'Monthly cost, less control, dependency on someone else.' }, { name: 'Build it', good: 'Exactly what you need; no vendor.', bad: 'You maintain it, including security.' }],
    defaultFor: 'Use a service for payments, email delivery and sign-in. Build the part that is specific to your work.' },
  { id: 'offline', title: 'Works offline or needs a connection', asks: 'Must the product work with no internet?', keywords: ['offline', 'connection', 'internet', 'signal', 'mobile', 'field', 'sync', 'low-bandwidth', 'data-cost'],
    options: [{ name: 'Online only', good: 'Simpler; one source of truth.', bad: 'Unusable without signal.' }, { name: 'Offline-capable', good: 'Works anywhere; fast.', bad: 'Storing data on the device and merging changes later is hard to get right.' }],
    defaultFor: 'Online only, unless people really work without signal (field work, spotty networks). Then plan sync early.' },
  { id: 'form-where', title: 'A pop-up form or a full page', asks: 'Should creating and editing open in a modal or on its own page?', keywords: ['modal', 'popup', 'pop-up', 'dialog', 'form', 'page', 'edit', 'create', 'screen'],
    options: [{ name: 'Modal', good: 'Keeps your place; quick for short forms.', bad: 'Cramped for long forms; harder on small screens; hard to link to.' }, { name: 'Own page', good: 'Room for long forms; linkable; easier on mobile.', bad: 'Loses the list context.' }],
    defaultFor: 'Modal for forms of up to about five fields; a page for anything longer.' },
  { id: 'lists-pages', title: 'Pages or endless scroll', asks: 'How should long lists be shown?', keywords: ['pagination', 'paginate', 'infinite', 'scroll', 'list', 'long', 'load', 'more'],
    options: [{ name: 'Pages', good: 'Predictable; easy to return to a spot; easy to build.', bad: 'Extra clicks.' }, { name: 'Endless scroll or load more', good: 'Smooth browsing.', bad: 'Hard to find your place again; footers unreachable.' }],
    defaultFor: 'Pages (or “load more”) for work tools; endless scroll only for browsing feeds.' },
  { id: 'notes-format', title: 'Plain text or formatted notes', asks: 'Should notes support formatting such as bold, lists and links?', keywords: ['notes', 'markdown', 'rich', 'text', 'format', 'editor', 'comments', 'description'],
    options: [{ name: 'Plain text', good: 'Simple and safe; nothing to maintain.', bad: 'No lists or emphasis.' }, { name: 'Markdown or rich text', good: 'Readable structure.', bad: 'An editor to build, plus content-safety work.' }],
    defaultFor: 'Plain text first. Add formatting when people ask for it.' },
  { id: 'architecture', title: 'One app or several services', asks: 'Should the backend be one program or split into services?', keywords: ['architecture', 'monolith', 'microservices', 'services', 'api', 'backend', 'split', 'scale'],
    options: [{ name: 'One application (monolith)', good: 'Simplest to build, test and deploy.', bad: 'Large teams or very different load can strain it later.' }, { name: 'Separate services', good: 'Teams and scaling can be independent.', bad: 'Networking, deployment and debugging complexity from day one.' }],
    defaultFor: 'One application. Split only when a clear need appears.' },
  { id: 'mobile', title: 'Responsive web app, installable web app or native app', asks: 'How should the product reach phones?', keywords: ['mobile', 'phone', 'ios', 'android', 'native', 'expo', 'react native', 'app', 'pwa', 'responsive'],
    options: [{ name: 'Responsive website', good: 'One codebase; nothing to install.', bad: 'Limited device features.' }, { name: 'Installable web app (PWA)', good: 'Home-screen icon; some offline use.', bad: 'Uneven support for device features on iPhones.' }, { name: 'Native app (Expo / React Native)', good: 'Best device access and feel.', bad: 'App-store process and a second interface to maintain.' }],
    defaultFor: 'Responsive website first. Go native when you need device features or store presence.' },
]

const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(w => w.length > 2)

/** Entries ranked by how many of their keywords appear in the question. */
export function matchTradeoffs(question: string, limit = 3): Tradeoff[] {
  const q = new Set(words(question))
  const text = question.toLowerCase()
  return TRADEOFFS
    .map(t => ({ t, score: t.keywords.filter(k => (k.includes(' ') ? text.includes(k) : q.has(k))).length }))
    .filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map(x => x.t)
}
export function tradeoffMarkdown(t: Tradeoff): string {
  return `## ${t.title}\n\n${t.asks}\n\n${t.options.map(o => `**${o.name}**\n- Good: ${o.good}\n- Cost: ${o.bad}`).join('\n\n')}\n\n**For a small first version:** ${t.defaultFor}\n`
}
