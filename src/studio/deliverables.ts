/** What each step is expected to produce, in that role's own language. */
import type { FileItem, Role } from './model'
import { outlineFiles } from './templates'

const MARK = '> Outline — write under each heading, then delete this line.'
interface Blueprint { name: string; title: string; sections: [string, string][] }

const d = (name: string, title: string, sections: [string, string][]): Blueprint => ({ name, title, sections })

/** One entry per step. Nothing is pre-filled: only headings and the question to answer. */
const plans: Record<string, Blueprint[]> = {
  'business/vision': [
    d('vision.md', 'Problem and outcome', [['Problem', 'What is broken or missing today, and for whom?'], ['Outcome', 'What will be different when this works?'], ['Why now', 'What makes this worth doing this quarter?']]),
    d('success-measures.md', 'Success measures', [['Measure', 'Which numbers will you look at?'], ['Target', 'What counts as success, and by when?']]),
  ],
  'business/discovery': [
    d('stakeholders.md', 'Stakeholders', [['Who decides', 'Who signs off, and who must be consulted?'], ['Who is affected', 'Who does this change for?']]),
    d('constraints.md', 'Constraints', [['Time and budget', 'What limits you?'], ['Rules', 'Which policies, laws or contracts apply?']]),
  ],
  'business/users': [
    d('personas.md', 'Users', [['Main user', 'Who uses this most, and what do they need?'], ['Other users', 'Who else touches it?']]),
    d('journeys.md', 'Journeys', [['Main journey', 'What do they do, step by step?'], ['Pain today', 'Where does it go wrong now?']]),
  ],
  'business/requirements': [
    d('business-requirements.md', 'Business requirements', [['Business problem', 'What problem does this solve?'], ['Outcomes', 'How will you measure it?']]),
    d('functional-requirements.md', 'Functional requirements', [['Must do', 'List one numbered line per thing the product must do.'], ['Acceptance', 'How can a tester check each line?']]),
    d('out-of-scope.md', 'Out of scope', [['Not now', 'What will this release deliberately not do?']]),
  ],
  'business/data': [
    d('business-data-model.md', 'Business data', [['Things you record', 'Which real-world things does the business track?'], ['Fields', 'What must be known about each?']]),
    d('business-rules.md', 'Business rules', [['Rules', 'What must always be true, and who owns the data?']]),
  ],
  'business/roadmap': [
    d('roadmap.md', 'Roadmap', [['Order', 'What comes first and why?'], ['Milestones', 'Which small releases get you there?']]),
  ],
  'business/handoff': [
    d('decisions.md', 'Decisions', [['Decided', 'What is settled, and by whom?']]),
    d('open-questions.md', 'Open questions', [['Unknown', 'What still needs an answer, and from whom?']]),
  ],
  'design/research': [
    d('research-plan.md', 'Research plan', [['Questions', 'What do you need to learn?'], ['Method', 'How will you learn it, and from whom?']]),
    d('findings.md', 'Findings', [['Evidence', 'What do you know for certain?'], ['Assumptions', 'What are you only guessing?']]),
  ],
  'design/personas': [
    d('personas.md', 'Personas', [['Main persona', 'Goals, context and frustrations.'], ['Access needs', 'What must be easy to see, hear or reach?']]),
  ],
  'design/journeys': [
    d('journeys.md', 'Journeys', [['Happy path', 'The main task, step by step.'], ['Edge states', 'Empty, error, loading and no permission.']]),
    d('flows.md', 'Flows', [['Flow', 'Which screens does the journey touch?']]),
  ],
  'design/architecture': [
    d('information-architecture.md', 'Information architecture', [['Structure', 'How is content grouped?'], ['Labels', 'What is each thing called in the product?']]),
    d('navigation.md', 'Navigation', [['Main menu', 'What is always reachable?'], ['Deep links', 'What can be opened directly?']]),
  ],
  'design/system': [
    d('design-system.md', 'Design system', [['Tokens', 'Colours, type and spacing, once.'], ['Components', 'Which parts are reused, and in which states?']]),
    d('components.md', 'Components', [['Component', 'When to use it, and what it looks like at rest, hover, focus and error.']]),
  ],
  'design/screens': [
    d('screens.md', 'Screens', [['Screen', 'One heading per screen, with its main action.'], ['Layout', 'What sits where on desktop and phone?']]),
    d('screen-states.md', 'Screen states', [['State', 'Empty, loading, error, success and permission states.']]),
  ],
  'design/validation': [
    d('usability-plan.md', 'Usability plan', [['Who', 'Who will try it, and with what task?'], ['Measure', 'What will you watch for?']]),
    d('findings.md', 'Findings', [['What happened', 'What did testers do and say?'], ['Changes', 'What will you change?']]),
  ],
  'design/handoff': [
    d('design-handoff.md', 'Design handoff', [['Behaviour', 'What happens on click, hover, error and empty?'], ['Assets', 'Where are the tokens, icons and images?']]),
  ],
  'development/standards': [
    d('code-standards.md', 'Code standards', [['Rule', 'One line per rule, and the reason for it.'], ['Example', 'A short example of the rule.']]),
  ],
  'development/architecture': [
    d('architecture.md', 'Architecture', [['Parts', 'Which pieces exist and what does each own?'], ['Data flow', 'What calls what, and where does data live?']]),
    d('api-endpoints.md', 'API endpoints', [['Endpoints', 'Method, path, purpose, who may call it. Add one row per endpoint.'], ['Errors', 'What does each error look like?']]),
    d('environment-variables.md', 'Environment variables', [['Setting', 'Name, what it is for, and whether it is secret.'], ['Where', 'Local, test and live values. Never paste the real secret here.']]),
    d('integrations.md', 'Integrations', [['Third parties', 'Which outside services, keys and limits?']]),
  ],
  'development/specification': [
    d('feature-spec.md', 'Feature specification', [['Behaviour', 'What must happen, in steps a tester can follow?'], ['Edge cases', 'What about empty, duplicate and failure?']]),
    d('api-contract.md', 'API contract', [['Request', 'Fields, types and required or not.'], ['Response', 'Success and error shapes.']]),
  ],
  'development/database': [
    d('schema.md', 'Schema', [['Tables', 'One per thing the business records.'], ['Keys and links', 'How are rows related?']]),
    d('migrations.md', 'Migrations', [['Change', 'What changes, in what order, and how is it rolled back?']]),
  ],
  'development/tasks': [
    d('tasks.md', 'Tasks', [['Task', 'Small enough to finish in a day, with a clear done.'], ['Order', 'What must come before what?']]),
  ],
  'development/implementation': [
    d('implementation-notes.md', 'Implementation notes', [['Built so far', 'What works now?'], ['Not built', 'What is deliberately missing?']]),
    d('file-map.md', 'File map', [['Files', 'Which file does what?']]),
  ],
  'development/verification': [
    d('test-plan.md', 'Test plan', [['Check', 'What will you run, and what should happen?'], ['Not run', 'What is still unverified?']]),
    d('regression-checklist.md', 'Regression checklist', [['Existing behaviour', 'What must still work after this change?']]),
  ],
  'development/handoff': [
    d('deployment.md', 'Deployment', [['Setup', 'How to install and configure it.'], ['Release', 'How to ship it, and how to undo it.']]),
    d('runbook.md', 'Runbook', [['Where it runs', 'Hosting, database and jobs.'], ['If it breaks', 'First checks and who to call.']]),
  ],
  'quality/strategy': [
    d('quality-strategy.md', 'Quality strategy', [['Risks', 'What is most likely to fail, and how bad is it?'], ['Levels', 'What is checked by hand, by test and by monitoring?']]),
  ],
  'quality/cases': [
    d('test-cases.md', 'Test cases', [['Case', 'Steps, expected result, and which requirement it proves. Add one per case.'], ['Edge cases', 'Empty, error, permissions and limits.']]),
    d('api-tests.md', 'API tests', [['Endpoint', 'Which call you test, with which input, and what comes back.'], ['Failure', 'Bad input, no permission and server error.']]),
    d('ui-e2e-tests.md', 'End-to-end UI tests', [['Journey', 'One path through the screens, from start to done.'], ['Checks', 'What must be visible or true at each step.']]),
    d('acceptance-criteria.md', 'Acceptance criteria', [['Criterion', 'What must be true for this to be accepted?']]),
  ],
  'quality/regression': [
    d('regression-checklist.md', 'Regression checklist', [['Check', 'What could break, and how will you know?']]),
    d('accessibility-checks.md', 'Accessibility checks', [['Keyboard', 'Can everything be reached and used?'], ['Screen reader and contrast', 'What did you test, and with what?']]),
  ],
  'quality/execution': [
    d('test-data.md', 'Test data', [['Data', 'What safe sample data do you need?']]),
    d('defect-process.md', 'Defect process', [['Report', 'How is a defect written up and prioritised?'], ['Owners', 'Who fixes and who confirms?']]),
  ],
  'quality/release': [
    d('release-readiness.md', 'Release readiness', [['Evidence', 'What proof do you have for each risk?'], ['Blockers', 'What must be fixed before release?']]),
    d('sign-off.md', 'Sign-off', [['Owner', 'Who signs off, and on what evidence?']]),
  ],
  'delivery/planning': [
    d('delivery-plan.md', 'Delivery plan', [['Milestones', 'What ships when?'], ['Owners', 'Who is responsible for each?']]),
  ],
  'delivery/risks': [
    d('risk-register.md', 'Risk register', [['Risk', 'What could go wrong, how likely, how bad?'], ['Mitigation', 'What will you do about it, and who owns it?']]),
  ],
  'delivery/release': [
    d('release-plan.md', 'Release plan', [['Rollout', 'Who gets it first, and when?'], ['Comms', 'What do people need to be told?']]),
    d('ci-checks.md', 'CI and deploy checks', [['Pipeline', 'What runs on every change, and what must pass before a deploy?'], ['Deploy', 'How does it reach live, and who can do it?']]),
    d('environments.md', 'Environments', [['Where it runs', 'Local, test and live: hosts, data and who has access.'], ['Config', 'Which settings and secrets each environment needs.']]),
    d('rollback.md', 'Rollback', [['Undo', 'How do you undo it, and how fast?']]),
  ],
  'delivery/operations': [
    d('support-plan.md', 'Support plan', [['Owner', 'Who answers questions and fixes incidents?'], ['Hours and route', 'How are people supported, and how fast?']]),
    d('monitoring.md', 'Monitoring', [['Signals', 'What is watched, and what is normal?'], ['Alerts', 'Who is woken up, and when?']]),
  ],
  'delivery/measure': [
    d('metrics.md', 'Metrics', [['Measure', 'Which few numbers show it is working?'], ['Baseline', 'What is the number today?']]),
    d('feedback-loop.md', 'Feedback loop', [['Feedback', 'How does feedback arrive, and how often is it reviewed?']]),
  ],
}

export interface Deliverable { path: string; label: string; content: string }

/** The files this step is expected to produce. Falls back to a generic outline for any step not listed. */
export function deliverablesFor(role: Role, step: string, prefix: string, label: string, purpose: string): Deliverable[] {
  const plans_ = plans[`${role}/${step}`]
  if (!plans_) return outlineFiles(prefix, label, purpose).map(f => ({ path: f.path, label: f.path.split('/').pop() ?? f.path, content: f.content }))
  return plans_.map(plan => ({
    path: prefix + plan.name,
    label: plan.name,
    content: `# ${plan.title}\n\n${MARK}\n\n${plan.sections.map(([heading, question]) => `## ${heading}\n${question}`).join('\n\n')}\n`,
  }))
}

/** The same list as FileItems, ready to add to the project. */
export const deliverableFiles = (role: Role, step: string, prefix: string, label: string, purpose: string): FileItem[] =>
  deliverablesFor(role, step, prefix, label, purpose).map(({ path, content }) => ({ path, content }))
