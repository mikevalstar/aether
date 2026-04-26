// App shell — owns palette state, applies tokens, renders the WorkflowsPage.

const { useState: useStateApp } = React;

function WorkflowsPage({ palette, onTogglePalette }) {
  const T = window.consoleTokens;
  const {
    WBadge, WButton, WChip, WAlert,
    PageHeader, SectionLabel, StatsStrip, TopBar,
    WorkflowCard, RunTable, RunWorkflowForm,
  } = window;
  const { WORKFLOWS, RUN_ROWS, STATS } = window.MOCK;

  const [filter, setFilter]       = useStateApp('all');
  const [alertOpen, setAlertOpen] = useStateApp(true);

  const filteredWFs = filter === 'all'    ? WORKFLOWS
    : filter === 'recent' ? WORKFLOWS.filter(w => w.lastRun)
    :                       WORKFLOWS.filter(w => w.status === filter);

  return (
    <div style={{
      height: '100%', background: T.bg, color: T.ink, fontFamily: T.display,
      display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden',
    }}>
      {/* Subtle dot/grid backdrop */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.1,
        backgroundImage: `linear-gradient(${T.border} 1px, transparent 1px), linear-gradient(90deg, ${T.border} 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
      }} />

      <TopBar palette={palette} onTogglePalette={onTogglePalette} />

      <div style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 40px 60px' }}>

          <PageHeader
            icon="⌥"
            eyebrow="WORKFLOWS"
            title="Workflows"
            desc="Form-based AI workflows that run in the background. Define workflows as markdown files in your AI config — Aether picks them up automatically."
            actions={
              <div style={{ display: 'flex', gap: 8 }}>
                <WButton kind="secondary" icon="↻">REFRESH</WButton>
                <WButton kind="primary" icon="+">NEW WORKFLOW</WButton>
              </div>
            }
          />

          {alertOpen && (
            <div style={{ marginTop: 24 }}>
              <WAlert
                tone="error"
                title="PR Reviewer failed on paperclip#412"
                code="GitHub API returned 401 — token expired 3h ago"
                action={<>
                  <WButton size="sm" kind="primary" icon="↻">RETRY</WButton>
                  <WButton size="sm" kind="secondary" icon="⚙">UPDATE TOKEN</WButton>
                  <WButton size="sm" icon="↗">VIEW LOG</WButton>
                </>}
                onDismiss={() => setAlertOpen(false)}
              />
            </div>
          )}

          <div style={{ marginTop: 32, marginBottom: 32 }}>
            <StatsStrip stats={STATS} />
          </div>

          <SectionLabel
            count={filteredWFs.length}
            action={
              <div style={{ display: 'flex', gap: 4 }}>
                {[['all','ALL'],['recent','RECENT'],['error','ERRORED'],['running','RUNNING']].map(([k,l]) => (
                  <button key={k} onClick={() => setFilter(k)} style={{
                    padding: '4px 10px', borderRadius: 3,
                    border: `1px solid ${filter===k ? T.limeDim : T.border}`,
                    background: filter===k ? `${T.lime}14` : 'transparent',
                    color: filter===k ? T.lime : T.inkDim,
                    fontFamily: T.mono, fontSize: 10, letterSpacing: 1, cursor: 'pointer',
                  }}>{l}</button>
                ))}
              </div>
            }>DEFINED WORKFLOWS</SectionLabel>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {filteredWFs.map(w => <WorkflowCard key={w.num} wf={w} />)}
          </div>

          <SectionLabel
            count={RUN_ROWS.length}
            action={
              <div style={{ display: 'flex', gap: 6 }}>
                <WButton size="sm" icon="⌕">FILTER</WButton>
                <WButton size="sm" icon="↗">EXPORT</WButton>
              </div>
            }>RECENT RUNS</SectionLabel>

          <RunTable rows={RUN_ROWS} />

          <SectionLabel action={<WChip>FORM</WChip>}>RUN WORKFLOW</SectionLabel>
          <RunWorkflowForm />

          <SectionLabel>ALERTS</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <WAlert tone="info" title="Workflow definitions live in your AI config">
              Drop a markdown file in <span style={{ fontFamily: T.mono, fontSize: 12, color: T.ink }}>~/.aether/workflows/</span> and Aether picks it up automatically.
            </WAlert>
            <WAlert tone="success" title="Recipe Formatter run #0142 finished">
              Wrote <span style={{ fontFamily: T.mono, fontSize: 12, color: T.ink }}>recipes/gnocchi-al-pesto.md</span> · 12.4s · $0.012
            </WAlert>
            <WAlert tone="warn" title="Approaching daily spend cap"
              action={<>
                <WButton size="sm" kind="secondary">RAISE CAP</WButton>
                <WButton size="sm">VIEW BREAKDOWN</WButton>
              </>}>
              You've used <strong style={{ color: T.ink }}>$4.12</strong> of your <strong style={{ color: T.ink }}>$5.00</strong> daily budget. Workflows will pause at cap.
            </WAlert>
            <WAlert tone="error" title="Plugin sandbox sealed"
              code="obsidian-bridge: refused to load (signature mismatch)">
              Re-install from the Plugins page or disable signature checking in System.
            </WAlert>
          </div>

          <SectionLabel>BUTTONS</SectionLabel>
          <div style={{
            background: T.panelSolid, border: `1px solid ${T.border}`,
            borderRadius: 6, padding: 18, display: 'flex', flexWrap: 'wrap', gap: 10,
          }}>
            <WButton kind="primary"   icon="▸">PRIMARY</WButton>
            <WButton kind="secondary" icon="✎">SECONDARY</WButton>
            <WButton kind="ghost"     icon="↗">GHOST</WButton>
            <WButton kind="danger"    icon="✕">DANGER</WButton>
            <WButton size="sm">SMALL</WButton>
            <WButton size="lg" kind="primary">LARGE PRIMARY</WButton>
          </div>

          <SectionLabel>BADGES &amp; CHIPS</SectionLabel>
          <div style={{
            background: T.panelSolid, border: `1px solid ${T.border}`,
            borderRadius: 6, padding: 18, display: 'flex', flexWrap: 'wrap', gap: 8,
          }}>
            <WBadge tone="add">✓ SUCCESS</WBadge>
            <WBadge tone="del">✕ ERROR</WBadge>
            <WBadge tone="warn">▸ RUNNING</WBadge>
            <WBadge tone="accent">◆ NEW</WBadge>
            <WBadge tone="muted">DRAFT</WBadge>
            <WBadge tone="add" solid>SOLID ADD</WBadge>
            <WBadge tone="accent" solid>SOLID ACCENT</WBadge>
            <span style={{ width: 14 }} />
            <WChip>claude-haiku-4-5</WChip>
            <WChip>3 fields</WChip>
            <WChip>cron · 07:00</WChip>
            <WChip>#daily</WChip>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [palette, setPalette] = useStateApp('paper');
  // Apply tokens BEFORE the children render. Mutating the shared object then
  // re-rendering with a key=palette guarantees every subtree picks up the new
  // values on the same paint.
  window.applyTokens(palette);

  const togglePalette = () => setPalette(p => p === 'paper' ? 'blueprint' : 'paper');

  return (
    <div style={{ position: 'absolute', inset: 0 }} key={palette}>
      <WorkflowsPage palette={palette} onTogglePalette={togglePalette} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
