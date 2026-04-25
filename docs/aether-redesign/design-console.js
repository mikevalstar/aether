// Design 4 — "Console"
// Bold and unexpected. Agent-as-OS feel. Two runs: Super Troopers + Obsidian research.

const { useState: useState4, useEffect: useEffect4 } = React;

// Live token object — mutated by applyConsoleTweaks() before each render.
// Every component reads from these keys, so swapping them re-skins the design.
const consoleTokens = {
  bg: '#0E100D', panel: '#16191450', panelSolid: '#161914',
  surface: '#1C2019', surfaceHi: '#262B23',
  ink: '#EAEDE6', inkDim: '#8E948A', inkMuted: '#5A5F56',
  border: '#2A2F27', borderHi: '#3A4036',
  lime: '#C8FF3D', limeDim: '#7A9F1F',
  warn: '#FFB347',
  add: '#7DDB8E', del: '#E27A6A',
  display: '"Space Grotesk", "Inter", sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
};

// === Palette presets ===========================================
const CONSOLE_PALETTES = {
  lime: {
    label: 'Lime (default)',
    bg:'#0E100D', panel:'#16191450', panelSolid:'#161914',
    surface:'#1C2019', surfaceHi:'#262B23',
    ink:'#EAEDE6', inkDim:'#8E948A', inkMuted:'#5A5F56',
    border:'#2A2F27', borderHi:'#3A4036',
    lime:'#C8FF3D', limeDim:'#7A9F1F',
    warn:'#FFB347', add:'#7DDB8E', del:'#E27A6A',
  },
  amber: {
    label: 'Amber CRT',
    bg:'#100B05', panel:'#1A130850', panelSolid:'#1A1308',
    surface:'#21180B', surfaceHi:'#2C2010',
    ink:'#F1E4CC', inkDim:'#A38A66', inkMuted:'#6B5A3F',
    border:'#33271A', borderHi:'#46361F',
    lime:'#FFB54A', limeDim:'#B07820',
    warn:'#FF7A6C', add:'#9FCA63', del:'#E27A6A',
  },
  cyan: {
    label: 'Cyan terminal',
    bg:'#08111A', panel:'#0E1B2750', panelSolid:'#0E1B27',
    surface:'#13243A', surfaceHi:'#1B3052',
    ink:'#E2EEFA', inkDim:'#7B97B5', inkMuted:'#4F6781',
    border:'#1F3550', borderHi:'#2C496B',
    lime:'#54E1FF', limeDim:'#1F89A8',
    warn:'#FFB347', add:'#7DDB8E', del:'#E27A6A',
  },
  blueprint: {
    label: 'Blueprint',
    bg:'#0A1830', panel:'#11225050', panelSolid:'#11264D',
    surface:'#163066', surfaceHi:'#1F4080',
    ink:'#E8EEFF', inkDim:'#92A6CC', inkMuted:'#637598',
    border:'#27437A', borderHi:'#365990',
    lime:'#7CB0FF', limeDim:'#3F6FB8',
    warn:'#FFD37A', add:'#A6E0AB', del:'#FFA6A6',
  },
  paper: {
    label: 'Paper (light)',
    bg:'#F4EFE6', panel:'#EDE7DC50', panelSolid:'#EDE7DC',
    surface:'#E5DECF', surfaceHi:'#DBD2BF',
    ink:'#1A1814', inkDim:'#6B6356', inkMuted:'#9A917F',
    border:'#CFC5B0', borderHi:'#B5AC97',
    lime:'#0F7F3F', limeDim:'#27964F',
    warn:'#B5651D', add:'#0F7F3F', del:'#A0322B',
  },
  magenta: {
    label: 'Vapor magenta',
    bg:'#0E0A18', panel:'#1A1230', panelSolid:'#1A1230',
    surface:'#231A40', surfaceHi:'#2E2255',
    ink:'#F1E8FF', inkDim:'#A593C8', inkMuted:'#6F5F8F',
    border:'#322447', borderHi:'#46315E',
    lime:'#FF55C7', limeDim:'#A6328B',
    warn:'#FFB347', add:'#7DDB8E', del:'#E27A6A',
  },
};

const FONT_PRESETS = {
  display: {
    grotesk:  '"Space Grotesk", "Inter", sans-serif',
    inter:    '"Inter", system-ui, sans-serif',
    fraunces: '"Fraunces", Georgia, serif',
    mono:     '"JetBrains Mono", ui-monospace, monospace',
  },
  mono: {
    jetbrains: '"JetBrains Mono", ui-monospace, monospace',
    inter:     '"Inter", system-ui, sans-serif',
  },
};

function applyConsoleTweaks(t) {
  const pal = CONSOLE_PALETTES[t.palette] || CONSOLE_PALETTES.lime;
  // accent overrides palette's lime if user picked a custom accent
  const accent = t.accent || pal.lime;
  // build a dimmed accent automatically from accent (45% alpha mix to bg)
  const dimAccent = pal.limeDim;
  Object.assign(consoleTokens, pal, {
    lime: accent,
    limeDim: t.accent ? mixHex(accent, pal.bg, 0.55) : dimAccent,
    display: FONT_PRESETS.display[t.displayFont] || FONT_PRESETS.display.grotesk,
    mono:    FONT_PRESETS.mono[t.monoFont]       || FONT_PRESETS.mono.jetbrains,
  });
}

function mixHex(a, b, t) {
  const pa = hexRGB(a), pb = hexRGB(b);
  const r = Math.round(pa[0]*(1-t) + pb[0]*t);
  const g = Math.round(pa[1]*(1-t) + pb[1]*t);
  const bl = Math.round(pa[2]*(1-t) + pb[2]*t);
  return '#' + [r,g,bl].map(n => n.toString(16).padStart(2,'0')).join('');
}
function hexRGB(h) {
  const x = h.replace('#','');
  return [parseInt(x.slice(0,2),16), parseInt(x.slice(2,4),16), parseInt(x.slice(4,6),16)];
}

window.applyConsoleTweaks = applyConsoleTweaks;
window.CONSOLE_PALETTES = CONSOLE_PALETTES;

// === Run definitions ===========================================
const RUN_RADARR = {
  id: 'radarr',
  num: '118',
  title: "Pre-order Super Troopers 3 release download",
  model: "MINIMAX M2.7", model_kind: "AGENTIC",
  status: 'SETTLED',
  time: '14:02:11 → 14:02:46 · 35.2s',
  stats: [['13.7K','IN'],['514','OUT'],['4','CALLS'],['1','ARTIFACT'],['$0.015','COST']],
  trace: [
    { t: '14:02:11', s: 'thread.open', d: 'vince → aether', c: consoleTokens.inkDim },
    { t: '14:02:14', s: 'radarr.search', d: 'q="Super Troopers"', c: consoleTokens.lime },
    { t: '14:02:14', s: 'radarr.search', d: 'q="Super Troopers 2"', c: consoleTokens.lime },
    { t: '14:02:15', s: 'radarr.list_monitored', d: '— 0 hits', c: consoleTokens.lime },
    { t: '14:02:19', s: 'tmdb.search', d: '→ tt9876543', c: consoleTokens.lime },
    { t: '14:02:42', s: 'user.ack', d: '"yeah please"', c: consoleTokens.inkDim },
    { t: '14:02:45', s: 'radarr.add_movie', d: 'monitor=true', c: consoleTokens.warn },
    { t: '14:02:46', s: 'artifact.create', d: 'movie/super_troopers_3', c: consoleTokens.warn },
  ],
};

const RUN_OBSIDIAN = {
  id: 'obsidian',
  num: '119',
  title: "Gastown & Paperclip — Obsidian research",
  model: "KIMI K2.5", model_kind: "LOW-COST · MATCHING",
  status: 'SETTLED',
  time: '14:18:02 → 14:19:14 · 1m 12s',
  stats: [['156K','IN'],['3.5K','OUT'],['8','CALLS'],['2','WRITES'],['$0.073','COST']],
  trace: [
    { t: '14:18:02', s: 'thread.open',         d: 'vince → aether',                c: consoleTokens.inkDim },
    { t: '14:18:04', s: 'vault.list_dir',      d: 'Code/AI/',                       c: consoleTokens.lime },
    { t: '14:18:05', s: 'vault.read',          d: 'Code/AI/Jina_AI.md  4.1KB',     c: consoleTokens.lime },
    { t: '14:18:08', s: 'vault.search',        d: '#framework -> 12 hits',          c: consoleTokens.lime },
    { t: '14:18:21', s: 'web.fetch',           d: 'gastown.dev/docs',               c: consoleTokens.lime },
    { t: '14:18:34', s: 'web.fetch',           d: 'paperclip.so/launch',            c: consoleTokens.lime },
    { t: '14:18:48', s: 'vault.write',         d: 'Code/AI/Gastown.md  +4.2KB',    c: consoleTokens.warn },
    { t: '14:19:02', s: 'vault.write',         d: 'Code/AI/Paperclip.md  +3.8KB',  c: consoleTokens.warn },
    { t: '14:19:08', s: 'vault.update_index',  d: 'reindex 2 docs',                 c: consoleTokens.lime },
    { t: '14:19:14', s: 'thread.settle',       d: '2 artifacts',                    c: consoleTokens.inkDim },
  ],
};

// === Conversation contents =====================================
function MessagesRadarr() {
  const { ACTIVE_CONVO } = window.MOCK;
  return ACTIVE_CONVO.messages.map((m, i) => (
    <ConsoleMessage key={i} msg={m} idx={i} isLast={i === ACTIVE_CONVO.messages.length - 1} />
  ));
}

function MessagesObsidian() {
  const userAsk = "tiny bit of research on the Gastown AI framework, and the Paperclip AI framework — add both to Obsidian under Code/AI, like the Jina AI doc";
  return (
    <>
      <ConsoleUserRow text={userAsk} />

      <ConsoleAetherRow>
        <ConsoleP>Reading the existing reference doc and the rest of the folder to match style and frontmatter.</ConsoleP>
        <ConsoleObsidianBlock kind="read" items={[
          { op: 'list_dir', path: 'Code/AI/', meta: '7 files · 28KB', ms: 38 },
          { op: 'read',     path: 'Code/AI/Jina_AI.md', meta: '4.1KB · 142 lines', ms: 41 },
          { op: 'search',   path: '#framework', meta: '12 hits in vault', ms: 86 },
        ]} />
        <ConsoleP>The Jina doc uses a <ConsoleKbd>frontmatter → tldr → architecture → links</ConsoleKbd> shape. I'll mirror that. Pulling sources next.</ConsoleP>
        <ConsoleObsidianBlock kind="web" items={[
          { op: 'fetch', path: 'gastown.dev/docs', meta: '24KB · markdown', ms: 1320 },
          { op: 'fetch', path: 'paperclip.so/launch-march-2026', meta: '18KB · html', ms: 980 },
        ]} />
        <ConsoleP>Drafting both notes. Writing now.</ConsoleP>

        {/* The big moment — file write with diff preview */}
        <ConsoleVaultWrite
          path="Code/AI/Gastown.md"
          state="created"
          bytes="+4.2KB"
          frontmatter={[
            ['title',   'Gastown'],
            ['type',    'framework'],
            ['language','Go'],
            ['tags',    '[#ai, #orchestration, #framework]'],
            ['source',  '[[Jina_AI]]'],
          ]}
          preview={[
            { kind:'h1',   text:'Gastown' },
            { kind:'em',   text:'"Kubernetes for AI coding agents."' },
            { kind:'p',    text:"Steve Yegge's Go-based multi-agent orchestration system that can coordinate 20–50 AI agents (Claude Code, Copilot, etc.) working in parallel on the same codebase." },
            { kind:'h2',   text:'Architecture' },
            { kind:'li',   text:'Role-based agents — The Mayor, Polecats, The Refinery' },
            { kind:'li',   text:'Git-backed work persistence' },
            { kind:'li',   text:'Heartbeat-driven scheduling' },
          ]}
        />

        <ConsoleVaultWrite
          path="Code/AI/Paperclip.md"
          state="created"
          bytes="+3.8KB"
          frontmatter={[
            ['title',  'Paperclip'],
            ['type',   'framework'],
            ['stack',  'Node.js + React'],
            ['tags',   '[#ai, #zero-human, #framework]'],
            ['source', '[[Jina_AI]]'],
          ]}
          preview={[
            { kind:'h1',   text:'Paperclip' },
            { kind:'em',   text:'"If OpenClaw is an employee, Paperclip is the company."' },
            { kind:'p',    text:'Zero-human-companies framework launched March 2026. Models full company structure with org charts, budgets, governance, heartbeats. Self-hosted.' },
            { kind:'h2',   text:'Notable' },
            { kind:'li',   text:'Tagline reframes agent autonomy as corporate structure' },
            { kind:'li',   text:'Closest competitor → [[Gastown]]' },
            { kind:'li',   text:'Needs evaluation in the [[AI Tools Directory]]' },
          ]}
        />

        <ConsoleP>Both docs follow the Jina format — frontmatter, TLDR, architecture/notable, useful links, current status, competitors. Backlinks added between Gastown ↔ Paperclip and into <ConsoleKbd>[[AI Tools Directory]]</ConsoleKbd>.</ConsoleP>
        <ConsoleP><strong style={{color:consoleTokens.lime}}>Index updated</strong> — vault graph rebuilt, 2 new nodes connected.</ConsoleP>

        <ConsoleActions />
      </ConsoleAetherRow>
    </>
  );
}

// === Inline conversation primitives ============================
function ConsoleUserRow({ text }) {
  return (
    <div style={{ margin: '14px 0', display: 'flex', gap: 14 }}>
      <div style={{ fontFamily: consoleTokens.mono, fontSize: 10, color: consoleTokens.inkMuted, letterSpacing: 1, paddingTop: 4, width: 60, flexShrink: 0 }}>VINCE</div>
      <div style={{ flex: 1, fontSize: 14, lineHeight: 1.55, color: consoleTokens.ink, borderLeft: `2px solid ${consoleTokens.borderHi}`, paddingLeft: 14 }}>{text}</div>
    </div>
  );
}
function ConsoleAetherRow({ children }) {
  return (
    <div style={{ margin: '14px 0', display: 'flex', gap: 14 }}>
      <div style={{ fontFamily: consoleTokens.mono, fontSize: 10, color: consoleTokens.lime, letterSpacing: 1, paddingTop: 4, width: 60, flexShrink: 0 }}>AETHER</div>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}
function ConsoleP({ children }) { return <p style={{margin:'0 0 12px', fontSize:14, lineHeight:1.6, color:consoleTokens.ink}}>{children}</p>; }
function ConsoleKbd({ children }) {
  return <code style={{padding:'1px 5px', margin:'0 1px', borderRadius:3, background:consoleTokens.surface, border:`1px solid ${consoleTokens.border}`, fontFamily:consoleTokens.mono, fontSize:11.5, color:consoleTokens.lime}}>{children}</code>;
}
function ConsoleActions() {
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
      {['COPY','RETRY','BRANCH','PIN'].map(s => (
        <button key={s} style={{ padding: '3px 8px', borderRadius: 3, border: `1px solid ${consoleTokens.border}`, background: 'transparent', color: consoleTokens.inkDim, fontFamily: consoleTokens.mono, fontSize: 9.5, letterSpacing: 1, cursor: 'pointer' }}>{s}</button>
      ))}
    </div>
  );
}

function ConsoleObsidianBlock({ kind, items }) {
  const label = kind === 'web' ? 'WEB · FETCH' : 'OBSIDIAN · READ';
  const accent = kind === 'web' ? consoleTokens.warn : consoleTokens.lime;
  return (
    <div style={{ margin: '4px 0 12px', border: `1px solid ${consoleTokens.border}`, borderRadius: 4, background: consoleTokens.surface, overflow: 'hidden', fontFamily: consoleTokens.mono, fontSize: 11 }}>
      <div style={{ padding: '5px 12px', borderBottom: `1px solid ${consoleTokens.border}`, display: 'flex', alignItems: 'center', gap: 8, fontSize: 9.5, color: accent, letterSpacing: 1.2, whiteSpace: 'nowrap' }}>
        <span style={{ width: 5, height: 5, borderRadius: 3, background: accent, flexShrink: 0 }} />
        <span style={{ whiteSpace: 'nowrap' }}>{label}</span>
        <span style={{ color: consoleTokens.inkMuted, marginLeft: 'auto', whiteSpace: 'nowrap' }}>{items.length} call{items.length>1?'s':''}</span>
      </div>
      {items.map((it, j) => (
        <div key={j} style={{ display: 'grid', gridTemplateColumns: '14px 70px minmax(0, 1fr) auto auto', alignItems: 'center', gap: 8, padding: '6px 12px', borderBottom: j < items.length - 1 ? `1px solid ${consoleTokens.border}` : 'none' }}>
          <span style={{ color: accent }}>▸</span>
          <span style={{ color: consoleTokens.inkDim, whiteSpace: 'nowrap' }}>{it.op}</span>
          <span style={{ color: consoleTokens.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', minWidth: 0 }}>{it.path}</span>
          <span style={{ color: consoleTokens.inkMuted, whiteSpace: 'nowrap' }}>{it.meta}</span>
          <span style={{ color: consoleTokens.inkMuted, textAlign: 'right', whiteSpace: 'nowrap' }}>{it.ms}ms</span>
        </div>
      ))}
    </div>
  );
}

function ConsoleVaultWrite({ path, state, bytes, frontmatter, preview }) {
  return (
    <div style={{ margin: '8px 0 14px', border: `1px solid ${consoleTokens.limeDim}`, borderRadius: 5, overflow: 'hidden', background: consoleTokens.surface }}>
      {/* file tab header */}
      <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: `1px solid ${consoleTokens.border}`, background: consoleTokens.bg }}>
        <div style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, borderRight: `1px solid ${consoleTokens.border}`, fontFamily: consoleTokens.mono, fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0 }}>
          <span style={{ color: consoleTokens.lime }}>◆</span>
          <span style={{ color: consoleTokens.ink }}>{path}</span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: '0 12px', fontFamily: consoleTokens.mono, fontSize: 10, color: consoleTokens.inkMuted, letterSpacing: 1, whiteSpace: 'nowrap', minWidth: 0 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 7px', borderRadius: 3, background: `${consoleTokens.add}1A`, color: consoleTokens.add, whiteSpace: 'nowrap', flexShrink: 0 }}>
            <span style={{ width: 5, height: 5, borderRadius: 3, background: consoleTokens.add }} />
            {state.toUpperCase()}
          </span>
          <span style={{ whiteSpace: 'nowrap' }}>{bytes}</span>
          <span style={{ display: 'inline-flex', gap: 4, whiteSpace: 'nowrap' }}>
            <span style={{ color: consoleTokens.add }}>+{preview.length + frontmatter.length + 4}</span>
            <span style={{ color: consoleTokens.del }}>−0</span>
          </span>
        </div>
      </div>
      {/* preview body */}
      <div style={{ display: 'grid', gridTemplateColumns: '34px 1fr', fontFamily: consoleTokens.mono, fontSize: 11.5, lineHeight: 1.55 }}>
        {/* gutter */}
        <div style={{ background: consoleTokens.bg, borderRight: `1px solid ${consoleTokens.border}`, padding: '8px 0', textAlign: 'right' }}>
          {Array.from({length: frontmatter.length + preview.length + 4}).map((_, i) => (
            <div key={i} style={{ color: consoleTokens.inkMuted, fontSize: 10, padding: '0 6px' }}>{i+1}</div>
          ))}
        </div>
        <div style={{ padding: '8px 12px', background: `${consoleTokens.add}08` }}>
          {/* frontmatter */}
          <div style={{ color: consoleTokens.inkMuted }}>---</div>
          {frontmatter.map(([k,v]) => (
            <div key={k}><span style={{ color: consoleTokens.lime }}>{k}:</span> <span style={{ color: consoleTokens.ink }}>{v}</span></div>
          ))}
          <div style={{ color: consoleTokens.inkMuted }}>---</div>
          <div>&nbsp;</div>
          {/* body */}
          {preview.map((b, j) => {
            if (b.kind === 'h1') return <div key={j} style={{ color: consoleTokens.ink, fontWeight: 700 }}><span style={{ color: consoleTokens.del }}># </span>{b.text}</div>;
            if (b.kind === 'h2') return <div key={j} style={{ color: consoleTokens.ink, fontWeight: 600, marginTop: 4 }}><span style={{ color: consoleTokens.del }}>## </span>{b.text}</div>;
            if (b.kind === 'em') return <div key={j} style={{ color: consoleTokens.inkDim, fontStyle: 'italic' }}>{b.text}</div>;
            if (b.kind === 'p')  return <div key={j} style={{ color: consoleTokens.ink, whiteSpace: 'pre-wrap' }}>{b.text}</div>;
            if (b.kind === 'li') return <div key={j} style={{ color: consoleTokens.ink }}><span style={{ color: consoleTokens.warn }}>- </span>{b.text}</div>;
            return null;
          })}
        </div>
      </div>
      {/* footer actions */}
      <div style={{ borderTop: `1px solid ${consoleTokens.border}`, padding: '6px 10px', display: 'flex', gap: 6, background: consoleTokens.bg, fontFamily: consoleTokens.mono, fontSize: 10, letterSpacing: 0.8 }}>
        <button style={{ padding: '3px 8px', borderRadius: 3, border: `1px solid ${consoleTokens.border}`, background: 'transparent', color: consoleTokens.inkDim, fontFamily: 'inherit', fontSize: 'inherit', cursor: 'pointer' }}>OPEN IN OBSIDIAN ↗</button>
        <button style={{ padding: '3px 8px', borderRadius: 3, border: `1px solid ${consoleTokens.border}`, background: 'transparent', color: consoleTokens.inkDim, fontFamily: 'inherit', fontSize: 'inherit', cursor: 'pointer' }}>VIEW DIFF</button>
        <button style={{ padding: '3px 8px', borderRadius: 3, border: `1px solid ${consoleTokens.border}`, background: 'transparent', color: consoleTokens.inkDim, fontFamily: 'inherit', fontSize: 'inherit', cursor: 'pointer' }}>REVERT</button>
        <span style={{ flex: 1 }} />
        <span style={{ color: consoleTokens.inkMuted, alignSelf: 'center' }}>vault: <span style={{ color: consoleTokens.lime }}>vince/notes</span> · just now</span>
      </div>
    </div>
  );
}

// === The original Radarr conversation message renderer =========
function ConsoleMessage({ msg, idx, isLast }) {
  if (msg.role === 'user') return <ConsoleUserRow text={msg.text} />;
  return (
    <ConsoleAetherRow>
      {msg.blocks.map((b, i) => {
        if (b.kind === 'text') {
          const parts = b.text.split(/\*\*(.*?)\*\*/g);
          return <p key={i} style={{ margin: '0 0 12px', fontSize: 14, lineHeight: 1.6, color: consoleTokens.ink }}>
            {parts.map((p, j) => j % 2 === 1 ? <strong key={j} style={{ fontWeight: 600, color: consoleTokens.lime }}>{p}</strong> : p)}
          </p>;
        }
        if (b.kind === 'tools') {
          return (
            <div key={i} style={{ margin: '4px 0 12px', border: `1px solid ${consoleTokens.border}`, borderRadius: 4, background: consoleTokens.surface, overflow: 'hidden', fontFamily: consoleTokens.mono, fontSize: 11 }}>
              {b.items.map((it, j) => (
                <div key={j} style={{ display: 'grid', gridTemplateColumns: '14px 1fr 60px', alignItems: 'center', gap: 8, padding: '6px 12px', borderBottom: j < b.items.length - 1 ? `1px solid ${consoleTokens.border}` : 'none' }}>
                  <span style={{ color: consoleTokens.lime }}>▸</span>
                  <span><span style={{ color: consoleTokens.ink }}>{it.name}</span><span style={{ color: consoleTokens.inkMuted }}>(</span>{Object.entries(it.args).map(([k, v], n) => (
                    <span key={n}>{n > 0 && <span style={{ color: consoleTokens.inkMuted }}>, </span>}<span style={{ color: consoleTokens.inkDim }}>{k}=</span><span style={{ color: consoleTokens.warn }}>{typeof v === 'string' ? `"${v}"` : String(v)}</span></span>
                  ))}<span style={{ color: consoleTokens.inkMuted }}>)</span></span>
                  <span style={{ color: consoleTokens.inkMuted, textAlign: 'right' }}>{it.ms}ms</span>
                </div>
              ))}
            </div>
          );
        }
        if (b.kind === 'list') {
          return (
            <div key={i} style={{ margin: '4px 0 12px', padding: '8px 12px', background: consoleTokens.surface, borderRadius: 4, border: `1px solid ${consoleTokens.border}` }}>
              {b.items.map(([k, v], j) => (
                <div key={j} style={{ fontSize: 13, lineHeight: 1.55 }}>
                  <span style={{ fontFamily: consoleTokens.mono, fontSize: 10, color: consoleTokens.lime, letterSpacing: 0.8, marginRight: 10 }}>{k.toUpperCase()}</span>
                  <span style={{ color: consoleTokens.inkDim }}>{v}</span>
                </div>
              ))}
            </div>
          );
        }
        if (b.kind === 'artifacts') {
          return <div key={i} style={{ margin: '8px 0 12px', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 10px', borderRadius: 3, background: `${consoleTokens.lime}14`, border: `1px solid ${consoleTokens.limeDim}`, fontFamily: consoleTokens.mono, fontSize: 11, color: consoleTokens.lime, whiteSpace: 'nowrap', maxWidth: '100%' }}>
            <span>◆</span><span>artifact → super_troopers_3</span><span style={{ color: consoleTokens.inkMuted }}>↗</span>
          </div>;
        }
        return null;
      })}
      {isLast && <ConsoleActions />}
    </ConsoleAetherRow>
  );
}

// === Right-rail right-panels per run ===========================
function ArtifactPanelRadarr() {
  return (
    <div style={{ border: `1px solid ${consoleTokens.borderHi}`, borderRadius: 6, overflow: 'hidden', background: consoleTokens.surface }}>
      <div style={{ height: 88, position: 'relative', background: `linear-gradient(135deg, ${consoleTokens.surfaceHi}, ${consoleTokens.bg})`, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(200,255,61,0.05) 8px, rgba(200,255,61,0.05) 9px)' }} />
        <div style={{ position: 'absolute', top: 8, left: 10, right: 10, fontFamily: consoleTokens.mono, fontSize: 9.5, color: consoleTokens.lime, letterSpacing: 1.2, whiteSpace: 'nowrap' }}>RADARR · MONITORED</div>
        <div style={{ position: 'absolute', bottom: 8, left: 10, right: 10 }}>
          <div style={{ fontFamily: consoleTokens.mono, fontSize: 10, color: consoleTokens.inkDim, marginBottom: 2 }}>2026</div>
          <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: -0.4, lineHeight: 1.15 }}>Super Troopers 3</div>
        </div>
      </div>
      <div style={{ padding: '10px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 10px', fontFamily: consoleTokens.mono, fontSize: 11 }}>
        <div><span style={{ color: consoleTokens.inkMuted }}>STATUS </span><span style={{ color: consoleTokens.warn }}>announced</span></div>
        <div><span style={{ color: consoleTokens.inkMuted }}>ETA </span><span>aug26</span></div>
        <div><span style={{ color: consoleTokens.inkMuted }}>QUAL </span><span>1080p</span></div>
        <div><span style={{ color: consoleTokens.inkMuted }}>TMDB </span><span style={{ color: consoleTokens.lime }}>tt9876543</span></div>
      </div>
      <div style={{ padding: '8px 12px', borderTop: `1px solid ${consoleTokens.border}`, display: 'flex', gap: 6 }}>
        <button style={{ flex: 1, padding: '5px 8px', borderRadius: 3, background: consoleTokens.bg, color: consoleTokens.ink, border: `1px solid ${consoleTokens.border}`, fontFamily: consoleTokens.mono, fontSize: 10, letterSpacing: 0.8, cursor: 'pointer' }}>OPEN ↗</button>
        <button style={{ flex: 1, padding: '5px 8px', borderRadius: 3, background: `${consoleTokens.lime}14`, color: consoleTokens.lime, border: `1px solid ${consoleTokens.limeDim}`, fontFamily: consoleTokens.mono, fontSize: 10, letterSpacing: 0.8, cursor: 'pointer' }}>NOTIFY</button>
      </div>
    </div>
  );
}

function VaultPanelObsidian() {
  const [tab, setTab] = useState4('graph');
  return (
    <div>
      {/* tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 10, fontFamily: consoleTokens.mono, fontSize: 9.5, letterSpacing: 1 }}>
        {[['graph','GRAPH'],['files','FILES · 2'],['vault','VAULT']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding: '4px 9px', borderRadius: 3, border: `1px solid ${tab===k ? consoleTokens.limeDim : consoleTokens.border}`,
            background: tab===k ? `${consoleTokens.lime}14` : 'transparent',
            color: tab===k ? consoleTokens.lime : consoleTokens.inkDim, cursor: 'pointer', fontFamily: 'inherit',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>{l}</button>
        ))}
      </div>
      {tab === 'graph' && <VaultGraph />}
      {tab === 'files' && <VaultFiles />}
      {tab === 'vault' && <VaultTree />}
    </div>
  );
}

function VaultGraph() {
  // hand-placed nodes with backlinks
  const nodes = [
    { id:'gastown',  x: 70,  y: 80,  label:'Gastown',  fresh:true,  size:14 },
    { id:'paperclip',x: 230, y: 110, label:'Paperclip', fresh:true, size:14 },
    { id:'jina',     x: 150, y: 30,  label:'Jina_AI',   fresh:false, size:11 },
    { id:'tools',    x: 240, y: 200, label:'AI Tools',  fresh:false, size:11 },
    { id:'agents',   x: 50,  y: 195, label:'Agents',    fresh:false, size:11 },
  ];
  const edges = [
    ['gastown','jina', true], ['paperclip','jina', true],
    ['gastown','paperclip', true], ['paperclip','tools', true],
    ['gastown','agents', false], ['jina','tools', false],
  ];
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
  return (
    <div style={{ border: `1px solid ${consoleTokens.borderHi}`, borderRadius: 6, background: consoleTokens.surface, overflow: 'hidden' }}>
      <div style={{ padding: '6px 10px', borderBottom: `1px solid ${consoleTokens.border}`, fontFamily: consoleTokens.mono, fontSize: 9.5, color: consoleTokens.inkMuted, letterSpacing: 1.2, display: 'flex', justifyContent:'space-between', whiteSpace: 'nowrap', gap: 8 }}>
        <span style={{ whiteSpace: 'nowrap' }}>VAULT GRAPH · Code/AI</span>
        <span style={{ color: consoleTokens.lime, whiteSpace: 'nowrap' }}>+2 nodes</span>
      </div>
      <svg viewBox="0 0 300 240" style={{ width:'100%', height: 240, display:'block', background: consoleTokens.bg }}>
        {/* faint dot grid */}
        <defs>
          <pattern id="cgrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.6" fill={consoleTokens.border} />
          </pattern>
          <filter id="glow"><feGaussianBlur stdDeviation="2" /></filter>
        </defs>
        <rect width="300" height="240" fill="url(#cgrid)" />
        {edges.map(([a,b,fresh], i) => {
          const A = byId[a], B = byId[b];
          return <line key={i} x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={fresh ? consoleTokens.lime : consoleTokens.borderHi} strokeWidth={fresh ? 1.2 : 0.8} strokeDasharray={fresh ? '0' : '2 3'} opacity={fresh ? 0.85 : 0.55} />;
        })}
        {nodes.map(n => (
          <g key={n.id}>
            {n.fresh && <circle cx={n.x} cy={n.y} r={n.size+4} fill={consoleTokens.lime} opacity="0.18" filter="url(#glow)" />}
            <circle cx={n.x} cy={n.y} r={n.size/2} fill={n.fresh ? consoleTokens.lime : consoleTokens.surfaceHi} stroke={n.fresh ? consoleTokens.lime : consoleTokens.borderHi} strokeWidth="1" />
            <text x={n.x} y={n.y + n.size/2 + 11} textAnchor="middle" fontFamily={consoleTokens.mono} fontSize="9" fill={n.fresh ? consoleTokens.lime : consoleTokens.inkDim} letterSpacing="0.5">{n.label}</text>
          </g>
        ))}
      </svg>
      <div style={{ padding: '6px 10px', borderTop: `1px solid ${consoleTokens.border}`, fontFamily: consoleTokens.mono, fontSize: 9.5, color: consoleTokens.inkMuted, display:'flex', gap: 12, whiteSpace: 'nowrap' }}>
        <span style={{ whiteSpace: 'nowrap' }}><span style={{display:'inline-block', width:6, height:6, borderRadius:3, background:consoleTokens.lime, marginRight:4}} />new</span>
        <span style={{ whiteSpace: 'nowrap' }}><span style={{display:'inline-block', width:6, height:6, borderRadius:3, background:consoleTokens.borderHi, marginRight:4}} />existing</span>
        <span style={{flex:1}} />
        <span style={{ whiteSpace: 'nowrap' }}>5 nodes · 6 links</span>
      </div>
    </div>
  );
}

function VaultFiles() {
  const files = [
    { path: 'Code/AI/Gastown.md', state: 'created', adds: 142, dels: 0, size: '4.2 KB' },
    { path: 'Code/AI/Paperclip.md', state: 'created', adds: 118, dels: 0, size: '3.8 KB' },
  ];
  return (
    <div style={{ border: `1px solid ${consoleTokens.borderHi}`, borderRadius: 6, background: consoleTokens.surface, overflow: 'hidden' }}>
      <div style={{ padding: '6px 10px', borderBottom: `1px solid ${consoleTokens.border}`, fontFamily: consoleTokens.mono, fontSize: 9.5, color: consoleTokens.inkMuted, letterSpacing: 1.2 }}>FILES TOUCHED · 2 WRITES</div>
      {files.map((f, i) => (
        <div key={i} style={{ padding: '10px 12px', borderBottom: i < files.length-1 ? `1px solid ${consoleTokens.border}` : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: consoleTokens.mono, fontSize: 11.5 }}>
            <span style={{ color: consoleTokens.lime }}>◆</span>
            <span style={{ color: consoleTokens.ink, flex: 1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.path}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontFamily: consoleTokens.mono, fontSize: 10, color: consoleTokens.inkMuted, whiteSpace: 'nowrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '1px 6px', borderRadius: 2, background: `${consoleTokens.add}1A`, color: consoleTokens.add, flexShrink: 0 }}>{f.state.toUpperCase()}</span>
            <span style={{ color: consoleTokens.add, flexShrink: 0 }}>+{f.adds}</span>
            <span style={{ color: consoleTokens.del, flexShrink: 0 }}>−{f.dels}</span>
            <span style={{ flexShrink: 0 }}>·</span><span style={{ flexShrink: 0 }}>{f.size}</span>
            <span style={{flex:1}} />
            <span style={{ cursor: 'pointer', color: consoleTokens.lime, flexShrink: 0 }}>OPEN ↗</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function VaultTree() {
  const tree = [
    { name: 'Code/', depth: 0, kind: 'dir' },
    { name: 'AI/', depth: 1, kind: 'dir' },
    { name: 'Jina_AI.md', depth: 2, kind: 'file', meta: '4.1 KB', state: 'read' },
    { name: 'Gastown.md', depth: 2, kind: 'file', meta: '4.2 KB', state: 'new' },
    { name: 'Paperclip.md', depth: 2, kind: 'file', meta: '3.8 KB', state: 'new' },
    { name: 'AI Tools Directory.md', depth: 2, kind: 'file', meta: '12 KB', state: 'linked' },
    { name: 'Workflows/', depth: 1, kind: 'dir' },
    { name: 'People/', depth: 0, kind: 'dir' },
  ];
  const stateColor = { new: consoleTokens.add, read: consoleTokens.lime, linked: consoleTokens.warn };
  return (
    <div style={{ border: `1px solid ${consoleTokens.borderHi}`, borderRadius: 6, background: consoleTokens.surface, overflow: 'hidden', fontFamily: consoleTokens.mono, fontSize: 11 }}>
      <div style={{ padding: '6px 10px', borderBottom: `1px solid ${consoleTokens.border}`, fontSize: 9.5, color: consoleTokens.inkMuted, letterSpacing: 1.2, display:'flex', justifyContent:'space-between' }}>
        <span>VAULT · vince/notes</span>
        <span style={{ color: consoleTokens.lime }}>4 touched</span>
      </div>
      {tree.map((n, i) => (
        <div key={i} style={{ padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 10 + n.depth * 14 }}>
          <span style={{ color: n.kind === 'dir' ? consoleTokens.warn : consoleTokens.inkMuted, width: 10 }}>{n.kind === 'dir' ? '▸' : '·'}</span>
          <span style={{ color: n.kind === 'dir' ? consoleTokens.ink : consoleTokens.inkDim, flex: 1 }}>{n.name}</span>
          {n.meta && <span style={{ color: consoleTokens.inkMuted, fontSize: 10 }}>{n.meta}</span>}
          {n.state && <span style={{ fontSize: 9, padding: '0 5px', borderRadius: 2, color: stateColor[n.state], border: `1px solid ${stateColor[n.state]}33`, letterSpacing: 0.5 }}>{n.state.toUpperCase()}</span>}
        </div>
      ))}
    </div>
  );
}

// === Main component ===========================================
// Light/dark counterpart for theme toggle
const PALETTE_COUNTERPART = {
  lime: 'paper',
  amber: 'paper',
  cyan: 'paper',
  blueprint: 'paper',
  magenta: 'paper',
  paper: 'lime',
};
const LIGHT_PALETTES = new Set(['paper']);

function ConsoleDesign(props) {
  const { THREADS } = window.MOCK;
  const tweaks = (props && props.tweaks) || {};
  const onTweak = (props && props.onTweak) || (() => {});
  // Re-skin tokens before rendering
  if (window.applyConsoleTweaks) window.applyConsoleTweaks(tweaks);

  const [paletteOpen, setPaletteOpen] = useState4(false);
  const [paletteFilter, setPaletteFilter] = useState4('');
  const [activeRun, setActiveRun] = useState4(tweaks.activeRun || 'obsidian');

  // Sync if tweak changes externally
  useEffect4(() => {
    if (tweaks.activeRun) setActiveRun(tweaks.activeRun);
  }, [tweaks.activeRun]);

  useEffect4(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setPaletteOpen(v => !v); }
      if (e.key === 'Escape') setPaletteOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const density = tweaks.density || 'regular';
  const padScale = density === 'compact' ? 0.78 : density === 'comfy' ? 1.18 : 1;
  const gridOpacity = tweaks.gridBackdrop != null ? tweaks.gridBackdrop : 0.25;
  const showStatusPulse = tweaks.statusPulse !== false;
  const userInitials = tweaks.userInitials || 'VC';
  const productName = tweaks.productName || 'aether';
  const productVersion = tweaks.productVersion || 'v7.2';

  const filtered = THREADS.filter(t => t.title.toLowerCase().includes(paletteFilter.toLowerCase()));
  const RUN = activeRun === 'obsidian' ? RUN_OBSIDIAN : RUN_RADARR;

  return (
    <div style={{ height: '100%', background: consoleTokens.bg, color: consoleTokens.ink, fontFamily: consoleTokens.display, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${consoleTokens.border} 1px, transparent 1px), linear-gradient(90deg, ${consoleTokens.border} 1px, transparent 1px)`, backgroundSize: '48px 48px', opacity: gridOpacity, pointerEvents: 'none' }} />

      {/* Top bar */}
      <div style={{ height: 48, display: 'flex', alignItems: 'center', padding: '0 20px', borderBottom: `1px solid ${consoleTokens.border}`, gap: 14, flexShrink: 0, position: 'relative', zIndex: 1, background: consoleTokens.panelSolid }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: 5, background: consoleTokens.lime, color: consoleTokens.bg, display: 'grid', placeItems: 'center', fontFamily: consoleTokens.mono, fontWeight: 700, fontSize: 13 }}>æ</div>
          <span style={{ fontWeight: 600, letterSpacing: -0.3, fontSize: 14 }}>{productName}</span>
          <span style={{ fontFamily: consoleTokens.mono, fontSize: 10, color: consoleTokens.inkMuted, padding: '1px 6px', borderRadius: 3, background: consoleTokens.surface, marginLeft: 4 }}>{productVersion}</span>
        </div>
        <div style={{ display: 'flex', gap: 2, marginLeft: 14 }}>
          {['CHAT','TASKS','WORKFLOWS','TRIGGERS','OBSIDIAN','PLUGINS','SYSTEM'].map((n, i) => (
            <div key={n} style={{ padding: '4px 10px', fontSize: 11, fontFamily: consoleTokens.mono, letterSpacing: 1, color: i===0 ? consoleTokens.lime : consoleTokens.inkDim, background: i===0 ? `${consoleTokens.lime}14` : 'transparent', borderRadius: 4, cursor: 'pointer' }}>{n}</div>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontFamily: consoleTokens.mono, fontSize: 10.5, color: consoleTokens.inkDim, whiteSpace: 'nowrap', flexShrink: 0 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: consoleTokens.lime, boxShadow: showStatusPulse ? `0 0 8px ${consoleTokens.lime}` : 'none' }} />
            VAULT SYNCED
          </span>
          <span>QUEUE 1</span>
          <span>$0.12/DAY</span>
        </div>
        <button
          onClick={() => {
            const next = LIGHT_PALETTES.has(tweaks.palette)
              ? (tweaks._lastDarkPalette || 'blueprint')
              : tweaks.palette;
            const target = LIGHT_PALETTES.has(tweaks.palette)
              ? (tweaks._lastDarkPalette || 'blueprint')
              : 'paper';
            // remember the dark palette so we can restore it
            if (!LIGHT_PALETTES.has(tweaks.palette)) {
              onTweak('_lastDarkPalette', tweaks.palette);
            }
            onTweak('palette', target);
          }}
          title={LIGHT_PALETTES.has(tweaks.palette) ? 'Switch to dark' : 'Switch to light'}
          style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: 4, border: `1px solid ${consoleTokens.border}`, background: consoleTokens.surface, color: consoleTokens.inkDim, cursor: 'pointer', flexShrink: 0, padding: 0 }}
        >
          {LIGHT_PALETTES.has(tweaks.palette) ? (
            // moon
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
          ) : (
            // sun
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>
          )}
        </button>
        <button onClick={() => setPaletteOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 4, border: `1px solid ${consoleTokens.border}`, background: consoleTokens.surface, color: consoleTokens.inkDim, fontSize: 11, fontFamily: consoleTokens.mono, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
          <span>⌕ THREADS</span>
          <span style={{ padding: '0 5px', borderRadius: 3, background: consoleTokens.bg, color: consoleTokens.inkDim, fontSize: 9.5 }}>⌘K</span>
        </button>
        <div style={{ width: 26, height: 26, borderRadius: 4, background: consoleTokens.lime, color: consoleTokens.bg, display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, fontFamily: consoleTokens.mono }}>{userInitials}</div>
      </div>

      {/* Run selector tabs */}
      <div style={{ display: 'flex', gap: 6, padding: '8px 20px 0', borderBottom: `1px solid ${consoleTokens.border}`, background: consoleTokens.panelSolid, position: 'relative', zIndex: 1 }}>
        {[
          { id: 'obsidian', label: 'RUN_119 · OBSIDIAN', sub: 'Gastown & Paperclip · 2 writes' },
          { id: 'radarr',   label: 'RUN_118 · RADARR',   sub: 'Super Troopers 3 · 1 artifact' },
        ].map(r => (
          <button key={r.id} onClick={() => setActiveRun(r.id)} style={{
            padding: '8px 14px', borderRadius: '4px 4px 0 0',
            border: `1px solid ${activeRun === r.id ? consoleTokens.borderHi : consoleTokens.border}`, borderBottom: activeRun === r.id ? `1px solid ${consoleTokens.panelSolid}` : `1px solid ${consoleTokens.border}`,
            marginBottom: -1,
            background: activeRun === r.id ? consoleTokens.panelSolid : consoleTokens.bg,
            color: activeRun === r.id ? consoleTokens.lime : consoleTokens.inkDim,
            fontFamily: consoleTokens.mono, fontSize: 10.5, letterSpacing: 1, cursor: 'pointer', textAlign: 'left',
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, flexShrink: 0,
          }}>
            <span style={{ whiteSpace: 'nowrap' }}>{r.label}</span>
            <span style={{ color: consoleTokens.inkMuted, fontSize: 9.5, letterSpacing: 0.5, textTransform: 'none', whiteSpace: 'nowrap' }}>{r.sub}</span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button style={{ padding: '8px 12px', border: 'none', background: 'transparent', color: consoleTokens.inkMuted, fontFamily: consoleTokens.mono, fontSize: 10.5, cursor: 'pointer', letterSpacing: 1 }}>+ NEW RUN</button>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative', zIndex: 1 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Heading slab */}
          <div style={{ padding: `${Math.round(20*padScale)}px ${Math.round(32*padScale)}px ${Math.round(18*padScale)}px`, borderBottom: `1px solid ${consoleTokens.border}`, background: consoleTokens.panelSolid }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
              <div style={{ fontFamily: consoleTokens.mono, fontSize: 10.5, color: consoleTokens.inkMuted, letterSpacing: 1.5, whiteSpace: 'nowrap' }}>RUN_{RUN.num}</div>
              <div style={{ height: 12, width: 1, background: consoleTokens.border }} />
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 8px', borderRadius: 3, background: `${consoleTokens.lime}14`, color: consoleTokens.lime, fontFamily: consoleTokens.mono, fontSize: 10, letterSpacing: 1, whiteSpace: 'nowrap' }}>
                <span style={{ width: 5, height: 5, borderRadius: 3, background: consoleTokens.lime }} />
                {RUN.status}
              </div>
              <div style={{ fontFamily: consoleTokens.mono, fontSize: 10.5, color: consoleTokens.inkMuted, letterSpacing: 1, whiteSpace: 'nowrap' }}>{RUN.model} · {RUN.model_kind}</div>
              <div style={{ flex: 1 }} />
              <div style={{ fontFamily: consoleTokens.mono, fontSize: 10.5, color: consoleTokens.inkMuted, letterSpacing: 1, whiteSpace: 'nowrap' }}>{RUN.time}</div>
            </div>
            <h1 style={{ margin: 0, fontSize: 32, fontWeight: 600, lineHeight: 1.05, letterSpacing: -1, fontFamily: consoleTokens.display }}>{RUN.title}</h1>
            <div style={{ display: 'flex', gap: 28, marginTop: 16 }}>
              {RUN.stats.map(([v, k]) => (
                <div key={k}>
                  <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.5, lineHeight: 1, color: consoleTokens.ink }}>{v}</div>
                  <div style={{ fontFamily: consoleTokens.mono, fontSize: 9.5, color: consoleTokens.inkMuted, letterSpacing: 1, marginTop: 4 }}>{k}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Conversation */}
          <div style={{ flex: 1, overflowY: 'auto', padding: `${Math.round(20*padScale)}px ${Math.round(32*padScale)}px ${Math.round(24*padScale)}px` }}>
            {activeRun === 'obsidian' ? <MessagesObsidian /> : <MessagesRadarr />}
          </div>

          {/* Composer */}
          <div style={{ padding: '14px 32px 20px', borderTop: `1px solid ${consoleTokens.border}`, background: consoleTokens.panelSolid }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 4px 4px 14px', border: `1px solid ${consoleTokens.borderHi}`, borderRadius: 6, background: consoleTokens.surface }}>
              <span style={{ fontFamily: consoleTokens.mono, fontSize: 12, color: consoleTokens.lime, fontWeight: 700 }}>{'>'}</span>
              <input placeholder="dispatch instruction…" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: consoleTokens.ink, fontFamily: consoleTokens.mono, fontSize: 13, padding: '8px 0' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: consoleTokens.mono, fontSize: 10.5, color: consoleTokens.inkMuted }}>
                <span style={{ padding: '2px 7px', borderRadius: 3, border: `1px solid ${consoleTokens.border}` }}>auto</span>
                <span style={{ padding: '2px 7px', borderRadius: 3, border: `1px solid ${consoleTokens.border}`, color: consoleTokens.lime }}>+vault</span>
              </div>
              <button style={{ padding: '7px 12px', borderRadius: 4, background: consoleTokens.lime, color: consoleTokens.bg, border: 'none', fontFamily: consoleTokens.mono, fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: 'pointer' }}>EXEC ↵</button>
            </div>
          </div>
        </div>

        {/* Right inspector */}
        <div style={{ width: 340, borderLeft: `1px solid ${consoleTokens.border}`, background: consoleTokens.panelSolid, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '14px 18px 12px', borderBottom: `1px solid ${consoleTokens.border}` }}>
            <div style={{ fontFamily: consoleTokens.mono, fontSize: 10, color: consoleTokens.inkMuted, letterSpacing: 1.5, marginBottom: 10, whiteSpace: 'nowrap' }}>
              {activeRun === 'obsidian' ? 'OBSIDIAN VAULT · 2 NEW' : 'ARTIFACTS · 1'}
            </div>
            {activeRun === 'obsidian' ? <VaultPanelObsidian /> : <ArtifactPanelRadarr />}
          </div>
          <div style={{ padding: '14px 18px', flex: 1, overflowY: 'auto' }}>
            <div style={{ fontFamily: consoleTokens.mono, fontSize: 10, color: consoleTokens.inkMuted, letterSpacing: 1.5, marginBottom: 10 }}>TRACE</div>
            {RUN.trace.map((e, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: 10, padding: '4px 0', fontFamily: consoleTokens.mono, fontSize: 11, lineHeight: 1.4 }}>
                <div style={{ color: consoleTokens.inkMuted }}>{e.t}</div>
                <div>
                  <span style={{ color: e.c }}>{e.s}</span>
                  <span style={{ color: consoleTokens.inkMuted, marginLeft: 6 }}>{e.d}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Command palette */}
      {paletteOpen && (
        <>
          <div onClick={() => setPaletteOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 10 }} />
          <div style={{ position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)', width: 540, maxHeight: '70%', background: consoleTokens.panelSolid, border: `1px solid ${consoleTokens.borderHi}`, borderRadius: 8, zIndex: 11, boxShadow: `0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px ${consoleTokens.lime}33`, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${consoleTokens.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: consoleTokens.mono, fontSize: 14, color: consoleTokens.lime, fontWeight: 700 }}>⌕</span>
              <input autoFocus value={paletteFilter} onChange={e => setPaletteFilter(e.target.value)} placeholder="thread / command / agent…" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: consoleTokens.ink, fontFamily: consoleTokens.mono, fontSize: 14 }} />
              <span style={{ fontFamily: consoleTokens.mono, fontSize: 10, color: consoleTokens.inkMuted, padding: '2px 6px', border: `1px solid ${consoleTokens.border}`, borderRadius: 3 }}>esc</span>
            </div>
            <div style={{ overflowY: 'auto', padding: '6px 0' }}>
              <div style={{ padding: '6px 18px', fontFamily: consoleTokens.mono, fontSize: 9.5, color: consoleTokens.inkMuted, letterSpacing: 1.5 }}>THREADS · {filtered.length}</div>
              {filtered.slice(0, 10).map(t => (
                <div key={t.id} onClick={() => setPaletteOpen(false)} style={{ padding: '8px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontFamily: consoleTokens.mono, fontSize: 10, color: consoleTokens.inkMuted, width: 60 }}>{t.tag.toUpperCase()}</div>
                  <div style={{ flex: 1, fontSize: 13, color: consoleTokens.ink }}>{t.title}</div>
                  <div style={{ fontFamily: consoleTokens.mono, fontSize: 10, color: consoleTokens.inkMuted }}>{t.time}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

window.ConsoleDesign = ConsoleDesign;
