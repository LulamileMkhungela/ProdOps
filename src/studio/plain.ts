/** Short, plain-English help for each role and step. No jargon; one idea per line. */
import type { Role } from './workflows'

export const roleHelp: Record<Role, { name: string; short: string; result: string; video: string }> = {
  business: { name: 'Business analysis', short: 'Say what you are building, for whom, and why.', result: 'A clear brief and a list of what the product must do.', video: 'business' },
  design: { name: 'Design', short: 'Decide how it looks and how people move through it.', result: 'Screens, flows, colours and a simple design system.', video: 'design' },
  development: { name: 'Development', short: 'Plan how it is built, then write the first version.', result: 'A build plan and working starter code.', video: 'development' },
  quality: { name: 'Quality assurance', short: 'Decide how you will check that it works.', result: 'Test cases and a release checklist.', video: 'quality' },
  delivery: { name: 'Delivery & operations', short: 'Plan the launch and how it is looked after.', result: 'A release plan, a support plan and ways to measure success.', video: 'delivery' },
}

export const stepHelp: Record<string, string> = {
  'business/vision': 'Write your brief: the problem, who has it, and what success looks like.',
  'business/discovery': 'List who is affected and what limits you (time, money, rules).',
  'business/users': 'Describe your main users and the steps they take.',
  'business/requirements': 'List what the first release must do, and what it will not do.',
  'business/data': 'List the information the product must remember, and the rules for it.',
  'business/roadmap': 'Put the work in order, in small releases.',
  'business/handoff': 'Check nothing is missing, then pass it to the team.',
  'design/research': 'Note what you know about your users, and what you only assume.',
  'design/personas': 'Write down who the users are and what they need.',
  'design/journeys': 'Draw the steps a user takes to get something done.',
  'design/architecture': 'Decide the menus, page names and how things are grouped.',
  'design/system': 'Pick colours, text styles and buttons once, then reuse them.',
  'design/screens': 'Describe each screen and what the user does on it.',
  'design/validation': 'Plan how you will test the design with real people.',
  'design/handoff': 'Write down what the builders need to know about the design.',
  'development/standards': 'Note the code rules and examples the team already follows.',
  'development/architecture': 'Choose the tools and how the parts fit together.',
  'development/specification': 'Describe the feature you are building now.',
  'development/database': 'Plan where data is stored and how it changes over time.',
  'development/tasks': 'Break the work into small tasks, in order.',
  'development/implementation': 'Write the first version of the code.',
  'development/verification': 'List the checks you will run on the code.',
  'development/handoff': 'Write how to set it up, run it and release it.',
  'quality/strategy': 'Decide what could go wrong and what matters most.',
  'quality/cases': 'Write test cases: what to do, and what should happen.',
  'quality/regression': 'List the devices, browsers and access needs to check.',
  'quality/execution': 'Plan the test data and how problems get reported.',
  'quality/release': 'List the proof you need before you say it is ready.',
  'delivery/planning': 'Set the dates, owners and what depends on what.',
  'delivery/risks': 'List what could block you and who can fix it.',
  'delivery/release': 'Plan how people will get the new product.',
  'delivery/operations': 'Say who looks after it once it is live.',
  'delivery/measure': 'Pick a few numbers that show it is working.',
}
export const stepLine = (role: Role, step: string, fallback = '') => stepHelp[`${role}/${step}`] ?? fallback
