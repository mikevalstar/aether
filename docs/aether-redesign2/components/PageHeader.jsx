// PageHeader — eyebrow row + accent left rule + display title + actions slot.

function PageHeader({ icon, eyebrow, title, desc, actions }) {
  const T = window.consoleTokens;
  return (
    <div style={{ paddingBottom: 22, borderBottom: `1px solid ${T.border}`, marginBottom: 24 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
        fontFamily: T.mono, fontSize: 10.5, color: T.lime, letterSpacing: 1.5,
      }}>
        <span>{icon}</span>{eyebrow}
      </div>
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{ borderLeft: `3px solid ${T.lime}`, paddingLeft: 16 }}>
          <h1 style={{
            margin: 0, fontSize: 38, fontWeight: 600, letterSpacing: -1.2,
            color: T.ink, lineHeight: 1.05, fontFamily: T.display,
          }}>{title}</h1>
          <p style={{ margin: '8px 0 0', color: T.inkDim, fontSize: 14, lineHeight: 1.5, maxWidth: 620 }}>
            {desc}
          </p>
        </div>
        {actions}
      </div>
    </div>
  );
}

window.PageHeader = PageHeader;
