// WorkflowCard — single workflow tile.
// Run number tick mark in corner, status badge, field/model chips, edit/run actions.

function WorkflowCard({ wf }) {
  const T = window.consoleTokens;
  const { WBadge, WChip, WButton } = window;
  return (
    <div
      style={{
        background: T.panelSolid, border: `1px solid ${T.border}`, borderRadius: 6,
        padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10,
        position: 'relative', transition: 'border-color 120ms',
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = T.borderHi}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = T.border}>
      <div style={{
        position: 'absolute', top: 0, right: 14,
        fontFamily: T.mono, fontSize: 9, color: T.inkMuted, letterSpacing: 1,
        padding: '3px 6px', background: T.bg, borderRadius: '0 0 3px 3px',
        borderLeft: `1px solid ${T.border}`, borderRight: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`,
      }}>WF_{wf.num}</div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: 16, fontWeight: 600, letterSpacing: -0.2,
            color: T.ink, marginBottom: 4, lineHeight: 1.25,
          }}>{wf.name}</div>
          <div style={{ fontSize: 13, color: T.inkDim, lineHeight: 1.45 }}>{wf.desc}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginTop: 2 }}>
          {wf.status === 'success' && <WBadge tone="add">✓ SUCCESS</WBadge>}
          {wf.status === 'error'   && <WBadge tone="del">✕ ERROR</WBadge>}
          {wf.status === 'running' && <WBadge tone="warn">▸ RUNNING</WBadge>}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
        <WChip><span style={{ color: T.inkMuted }}>▤</span>{wf.fields} fields</WChip>
        <WChip>{wf.model}</WChip>
        {wf.tags?.map(t => <WChip key={t}>#{t}</WChip>)}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, paddingTop: 10, borderTop: `1px solid ${T.border}`, marginTop: 4,
      }}>
        <div style={{
          fontFamily: T.mono, fontSize: 10.5, color: T.inkMuted, letterSpacing: 0.5,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {wf.lastRun ? `LAST RUN ${wf.lastRun}` : 'NEVER RUN'}
          {wf.runs != null && <span style={{ color: T.border }}> · </span>}
          {wf.runs != null && `${wf.runs} TOTAL`}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <WButton kind="ghost" size="sm" icon="✎">EDIT</WButton>
          <WButton kind="primary" size="sm" icon="▸">RUN</WButton>
        </div>
      </div>
    </div>
  );
}

window.WorkflowCard = WorkflowCard;
