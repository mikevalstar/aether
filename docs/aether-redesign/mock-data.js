// Shared mock data used across all four designs.
// Real-feeling content based on the user's screenshots.

const THREADS = [
  { id: 't1',  title: "Pre-order Super Troopers 3",        snippet: "Done! Super Troopers 3 is now added to Radar with monitoring on…", time: "3h",   active: true,  tag: "media", model: "MiniMax M2.7" },
  { id: 't2',  title: "Gastown & Paperclip AI research",   snippet: "All done! Created two new docs in your Code/AI folder following the Jina format.", time: "5h", tag: "research", model: "Kimi K2.5" },
  { id: 't3',  title: "Checking show download statuses",   snippet: "Yep — \"Widow's Bay\" has been added to your library.", time: "8h", tag: "media", model: "MiniMax M2.7" },
  { id: 't4',  title: "Adding note about Jevon",           snippet: "Got it! I'll create a new note about Jevon under People/.", time: "yesterday", tag: "obsidian", model: "Claude H4.5" },
  { id: 't5',  title: "Rogue Trooper movie download",      snippet: "Done! \"Rogue Trooper\" is now added to Radar.", time: "yesterday", tag: "media", model: "MiniMax M2.7" },
  { id: 't6',  title: "Creating task management workflow", snippet: "I'll let you create both files and then build a workflow that links them.", time: "2d", tag: "workflow", model: "Claude H4.5" },
  { id: 't7',  title: "Rhys Darby show in Toronto",        snippet: "Let me search for Rhys Darby dates in TO.", time: "2d", tag: "research", model: "Kimi K2.5" },
  { id: 't8',  title: "Tracking download status — Audacity", snippet: "Yep, \"The Audacity\" is already in your library.", time: "3d", tag: "media", model: "MiniMax M2.7" },
  { id: 't9',  title: "Set reminder to go home",           snippet: "Done! That reminder for now is set for 6:30 PM.", time: "3d", tag: "reminder", model: "Claude H4.5" },
  { id: 't10', title: "Nirvana the band the show",         snippet: "Ah, that explains it! Sonarr is for TV shows…", time: "3d", tag: "media", model: "MiniMax M2.7" },
  { id: 't11', title: "Downloading Nirvana The album",     snippet: "Done! Added \"Nevermind (Deluxe Reissue)\" to Lidarr's queue.", time: "3d", tag: "media", model: "MiniMax M2.7" },
  { id: 't12', title: "Check and archive marketing emails",snippet: "Let me grab those emails for you. Alright, found 14…", time: "4d", tag: "email", model: "Claude H4.5" },
  { id: 't13', title: "Sonarr download issue — prowlarr",  snippet: "Found it! Something very bad to do with the indexer config…", time: "4d", tag: "media", model: "MiniMax M2.7" },
  { id: 't14', title: "Adding a file to a code library",   snippet: "Oops, my mistake! Let me search for the existing folder…", time: "4d", tag: "code", model: "Claude H4.5" },
  { id: 't15', title: "Tracking Canada's drag race",       snippet: "The series is added but I want to be on it.", time: "5d", tag: "media", model: "MiniMax M2.7" },
  { id: 't16', title: "Upcoming movie releases",           snippet: "Quick heads-up — \"The Brick\" (limited) is on…", time: "5d", tag: "research", model: "Kimi K2.5" },
  { id: 't17', title: "Project Hail Mary download",        snippet: "Yes!, it's in Radar. Here's the status —", time: "6d", tag: "media", model: "MiniMax M2.7" },
  { id: 't18', title: "Website Sale Monitoring agent",     snippet: "Oh, nice piece! Let me pull up the still URL.", time: "6d", tag: "agent", model: "Claude H4.5" },
];

// Detailed conversation for the active thread (Super Troopers)
const ACTIVE_CONVO = {
  id: 't1',
  title: "Pre-order Super Troopers 3 release download",
  model: "MiniMax M2.7",
  modelTag: "Agentic, autonomous",
  inputTokens: 13688,
  outputTokens: 514,
  cost: "$0.0150",
  messages: [
    {
      role: 'user',
      text: "can you make sure we have super troopers set to download when it comes out",
    },
    {
      role: 'assistant',
      blocks: [
        { kind: 'tools', label: '3 tool calls', state: 'ready to inspect', items: [
          { name: 'radarr.search', args: { query: 'Super Troopers' }, ms: 412 },
          { name: 'radarr.search', args: { query: 'Super Troopers 2' }, ms: 380 },
          { name: 'radarr.list_monitored', args: {}, ms: 244 },
        ]},
        { kind: 'text', text: "Nothing showing up yet. Let me search for the movie more broadly:" },
        { kind: 'tools', label: '1 tool call', state: 'ready to inspect', items: [
          { name: 'tmdb.search', args: { query: 'Super Troopers 3' }, ms: 612 },
        ]},
        { kind: 'text', text: "Found **Super Troopers 3 (2026)** — it's currently 'announced' status. Want me to add it now so it grabs the file when it releases?" },
        { kind: 'list', items: [
          ["Release info", "When Farva's wildly over-the-top Indian engagement to Thorny's sister spirals into chaos…"],
          ["Studio", "Broken Lizard Industries"],
        ]},
        { kind: 'text', text: "Just say the word and I'll add it to Radarr!" },
      ],
    },
    {
      role: 'user',
      text: "yeah please",
    },
    {
      role: 'assistant',
      blocks: [
        { kind: 'tools', label: '1 tool call', state: 'ready to inspect', items: [
          { name: 'radarr.add_movie', args: { tmdb_id: 928129, monitor: true, quality: '1080p' }, ms: 891 },
        ]},
        { kind: 'text', text: "Done! **Super Troopers 3** is now added to Radarr with monitoring on. It'll automatically search for and grab the file when it releases." },
        { kind: 'text', text: "I'll send you a notification when it hits, if you'd like. Just let me know!" },
        { kind: 'artifacts', items: [
          { kind: 'movie-entry', title: 'Super Troopers 3', meta: 'Radarr · monitored · 1080p', status: 'announced', releaseEta: 'Aug 2026' },
        ]},
      ],
    },
  ],
};

// A second thread payload used for design 3 / 4 demos (research one with file artifacts)
const RESEARCH_CONVO = {
  id: 't2',
  title: "Gastown & Paperclip AI frameworks research",
  model: "Kimi K2.5",
  modelTag: "Low-cost matching",
  inputTokens: 156309,
  outputTokens: 3534,
  cost: "$0.0735",
  artifacts: [
    { kind: 'file', path: 'Code/AI/Gastown.md', size: '4.2 KB', changed: 'just now' },
    { kind: 'file', path: 'Code/AI/Paperclip.md', size: '3.8 KB', changed: 'just now' },
    { kind: 'file', path: 'Code/AI/Jina_AI.md', size: '4.1 KB', changed: 'reference' },
  ],
};

window.MOCK = { THREADS, ACTIVE_CONVO, RESEARCH_CONVO };
