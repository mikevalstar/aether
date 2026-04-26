// RunTable — recent runs grid with monospace columns + status glyphs.

function RunTable({ rows }) {
  const T = window.consoleTokens;
  const { WBadge } = window;
  const cols = '60px 1.6fr 1fr 100px 90px 70px 36px';
  return (
    <div style={{
      border: `1px solid ${T.border}`, borderRadius: 6,
      overflow: 'hidden', background: T.panelSolid,
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: cols, alignItems: 'center', gap: 10,
        padding: '10px 14px', borderBottom: `1px solid ${T.border}`,
        background: T.surface, fontFamily: T.mono, fontSize: 9.5,
        color: T.inkMuted, letterSpacing: 1.4,
      }}>
        <div>RUN</div>
        <div>WORKFLOW</div>
        <div>TRIGGER</div>
        <div>DURATION</div>
        <div style={{ textAlign: 'right' }}>COST</div>
        <div>STATUS</div>
        <div></div>
      </div>
      {rows.map((r, i) => (
        <div key={i}
          style={{
            display: 'grid', gridTemplateColumns: cols, alignItems: 'center', gap: 10,
            padding: '11px 14px',
            borderBottom: i < rows.length - 1 ? `1px solid ${T.border}` : 'none',
            fontSize: 13, transition: 'background 100ms', cursor: 'pointer',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = T.surface}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          <div style={{ fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>#{r.num}</div>
          <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ color: T.ink, fontWeight: 500 }}>{r.workflow}</span>
            {r.note && <span style={{ color: T.inkMuted, marginLeft: 8, fontSize: 12 }}>· {r.note}</span>}
          </div>
          <div style={{
            fontFamily: T.mono, fontSize: 11.5, color: T.inkDim,
            minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{r.trigger}</div>
          <div style={{ fontFamily: T.mono, fontSize: 11.5, color: T.inkDim }}>{r.dur}</div>
          <div style={{ fontFamily: T.mono, fontSize: 11.5, color: T.inkDim, textAlign: 'right' }}>{r.cost}</div>
          <div>
            {r.status === 'success' && <WBadge tone="add">✓</WBadge>}
            {r.status === 'error'   && <WBadge tone="del">✕</WBadge>}
            {r.status === 'running' && <WBadge tone="warn">▸</WBadge>}
            {r.status === 'queued'  && <WBadge tone="muted">…</WBadge>}
          </div>
          <div style={{ color: T.inkMuted, textAlign: 'right', fontFamily: T.mono }}>›</div>
        </div>
      ))}
    </div>
  );
}

window.RunTable = RunTable;
