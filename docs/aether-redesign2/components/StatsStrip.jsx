// StatsStrip — N-up KPI tiles. Pass `stats` as [[label, value, sub?], ...].

function StatsStrip({ stats }) {
  const T = window.consoleTokens;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 12 }}>
      {stats.map(([label, val, sub]) => (
        <div key={label} style={{
          background: T.panelSolid, border: `1px solid ${T.border}`,
          borderRadius: 6, padding: '12px 14px',
        }}>
          <div style={{
            fontFamily: T.mono, fontSize: 9.5, color: T.inkMuted,
            letterSpacing: 1.5, marginBottom: 6,
          }}>{label}</div>
          <div style={{
            fontSize: 22, fontWeight: 600, letterSpacing: -0.6,
            color: T.ink, lineHeight: 1, fontFamily: T.display,
          }}>{val}</div>
          {sub && (
            <div style={{ fontFamily: T.mono, fontSize: 10.5, color: T.inkDim, marginTop: 6 }}>
              {sub}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

window.StatsStrip = StatsStrip;
