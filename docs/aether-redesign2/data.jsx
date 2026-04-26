// Mock data for the Workflows page.

const WORKFLOWS = [
  { num: '01', name: 'Add AI Skill',     desc: 'Add a new AI skill to the AI Skills note — bookmarked by default unless already tried.', fields: 3, model: 'claude-haiku-4-5', status: null,      runs: 12, lastRun: '2D AGO',  tags: ['skills', 'notes'] },
  { num: '02', name: 'Recipe Formatter', desc: 'Convert a recipe URL into a formatted recipe file in the recipes folder.',                fields: 2, model: 'minimax-m2.7',    status: 'success', runs: 8,  lastRun: '23D AGO', tags: ['cooking'] },
  { num: '03', name: 'Daily Digest',     desc: 'Summarize unread newsletters into a single daily note pinned to today.',                  fields: 1, model: 'claude-sonnet-4', status: 'running', runs: 87, lastRun: '4M AGO',  tags: ['inbox', 'daily'] },
  { num: '04', name: 'PR Reviewer',      desc: 'Read a GitHub PR diff and write a review note with concerns and suggested commits.',     fields: 4, model: 'claude-haiku-4-5', status: 'error',   runs: 3,  lastRun: '1H AGO',  tags: ['code'] },
  { num: '05', name: 'Meeting Notes',    desc: 'Turn a transcript into structured notes — decisions, actions, follow-ups.',              fields: 2, model: 'minimax-m2.7',    status: 'success', runs: 41, lastRun: '6H AGO',  tags: ['work'] },
  { num: '06', name: 'Bookmark Triage',  desc: 'Cluster recent bookmarks by topic and propose folder moves.',                            fields: 1, model: 'claude-haiku-4-5', status: null,      runs: 0,  lastRun: null,      tags: ['inbox'] },
];

const RUN_ROWS = [
  { num: '0142', workflow: 'Recipe Formatter',  note: 'gnocchi al pesto',         trigger: 'manual · vince',     dur: '12.4s', cost: '$0.012', status: 'success' },
  { num: '0141', workflow: 'Daily Digest',      note: '7 sources',                 trigger: 'cron · 07:00',       dur: '01:24', cost: '$0.084', status: 'running' },
  { num: '0140', workflow: 'Add AI Skill',      note: 'rust async patterns',       trigger: 'chat · /skill',      dur: '8.1s',  cost: '$0.008', status: 'success' },
  { num: '0139', workflow: 'PR Reviewer',       note: 'paperclip#412',             trigger: 'webhook · github',   dur: '—',     cost: '$0.000', status: 'error'   },
  { num: '0138', workflow: 'Meeting Notes',     note: 'eng standup transcript',    trigger: 'file · drop folder', dur: '00:38', cost: '$0.041', status: 'success' },
  { num: '0137', workflow: 'Bookmark Triage',   note: 'pending',                   trigger: 'cron · sun 09:00',   dur: '—',     cost: '—',      status: 'queued'  },
];

const STATS = [
  ['DEFINED',     '06',    null],
  ['RUNS · 7D',   '24',    '+8 vs prev'],
  ['SUCCESS',     '88%',   '21/24'],
  ['SPEND · 7D',  '$0.74', 'budget $5.00'],
];

window.MOCK = { WORKFLOWS, RUN_ROWS, STATS };
