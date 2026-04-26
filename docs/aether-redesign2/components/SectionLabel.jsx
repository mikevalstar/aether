// SectionLabel — uppercase mono label + count + dividing rule + optional action.

function SectionLabel({ children, count, action }) {
  const T = window.consoleTokens;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, marginTop: 32 }}>
      <span style={{ fontFamily: T.mono, fontSize: 10.5, color: T.inkMuted, letterSpacing: 1.5 }}>{children}</span>
      {count != null && (
        <span style={{ fontFamily: T.mono, fontSize: 10.5, color: T.lime, letterSpacing: 1 }}>
          {String(count).padStart(2, '0')}
        </span>
      )}
      <div style={{ flex: 1, height: 1, background: T.border }} />
      {action}
    </div>
  );
}

window.SectionLabel = SectionLabel;
