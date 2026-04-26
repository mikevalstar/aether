// WAlert — info / success / warn / error callout with optional code & actions.

function WAlert({ tone = 'info', title, children, code, action, onDismiss }) {
  const T = window.consoleTokens;
  const map = {
    info:    { fg: T.lime, glyph: 'i', label: 'INFO'  },
    success: { fg: T.add,  glyph: '✓', label: 'OK'    },
    warn:    { fg: T.warn, glyph: '!', label: 'WARN'  },
    error:   { fg: T.del,  glyph: '✕', label: 'ERROR' },
  };
  const s = map[tone] || map.info;
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '4px 1fr',
      background: T.panelSolid, border: `1px solid ${T.border}`,
      borderRadius: 6, overflow: 'hidden',
    }}>
      <div style={{ background: s.fg }} />
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 18, height: 18, borderRadius: 3,
            background: `${s.fg}1A`, color: s.fg,
            display: 'grid', placeItems: 'center',
            fontFamily: T.mono, fontSize: 11, fontWeight: 700,
            border: `1px solid ${s.fg}`, flexShrink: 0,
          }}>{s.glyph}</span>
          <span style={{ fontFamily: T.mono, fontSize: 9.5, color: s.fg, letterSpacing: 1.5, fontWeight: 600 }}>{s.label}</span>
          <span style={{ flex: 1, height: 1, borderTop: `1px dashed ${T.border}` }} />
          {onDismiss && (
            <button onClick={onDismiss} title="Dismiss" style={{
              background: 'transparent', border: 'none', padding: 2,
              color: T.inkMuted, cursor: 'pointer', fontFamily: T.mono, fontSize: 12, lineHeight: 1,
            }}>✕</button>
          )}
        </div>
        {title && <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, letterSpacing: -0.1 }}>{title}</div>}
        {children && <div style={{ fontSize: 13, color: T.inkDim, lineHeight: 1.5 }}>{children}</div>}
        {code && (
          <div style={{
            background: T.bg, border: `1px solid ${T.border}`, borderRadius: 4,
            padding: '7px 10px', fontFamily: T.mono, fontSize: 11.5, color: T.ink,
            overflow: 'auto', whiteSpace: 'pre',
          }}>{code}</div>
        )}
        {action && <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>{action}</div>}
      </div>
    </div>
  );
}

window.WAlert = WAlert;
