// TopBar — product mark, version, top nav, status counters, theme toggle, user.

function TopBar({ palette, onTogglePalette, productName = 'aether', productVersion = 'v7.2', userInitials = 'VC', activeNav = 'WORKFLOWS' }) {
  const T = window.consoleTokens;
  const isLight = window.LIGHT_PALETTES.has(palette);
  return (
    <div style={{
      height: 48, display: 'flex', alignItems: 'center', padding: '0 20px',
      borderBottom: `1px solid ${T.border}`, gap: 14, flexShrink: 0,
      position: 'relative', zIndex: 1, background: T.panelSolid,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 5, background: T.lime, color: T.bg,
          display: 'grid', placeItems: 'center', fontFamily: T.mono, fontWeight: 700, fontSize: 13,
        }}>æ</div>
        <span style={{ fontWeight: 600, letterSpacing: -0.3, fontSize: 14 }}>{productName}</span>
        <span style={{
          fontFamily: T.mono, fontSize: 10, color: T.inkMuted,
          padding: '1px 6px', borderRadius: 3, background: T.surface, marginLeft: 4,
        }}>{productVersion}</span>
      </div>

      <div style={{ display: 'flex', gap: 2, marginLeft: 14 }}>
        {['CHAT','TASKS','WORKFLOWS','TRIGGERS','OBSIDIAN','PLUGINS','SYSTEM'].map((n) => {
          const active = n === activeNav;
          return (
            <div key={n} style={{
              padding: '4px 10px', fontSize: 11, fontFamily: T.mono, letterSpacing: 1,
              color: active ? T.lime : T.inkDim,
              background: active ? `${T.lime}14` : 'transparent',
              borderRadius: 4, cursor: 'pointer',
            }}>{n}</div>
          );
        })}
      </div>

      <div style={{ flex: 1 }} />

      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        fontFamily: T.mono, fontSize: 10.5, color: T.inkDim, whiteSpace: 'nowrap',
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 6, height: 6, borderRadius: 3, background: T.add,
            boxShadow: `0 0 8px ${T.add}`,
          }} />
          6 ACTIVE
        </span>
        <span>QUEUE 1</span>
        <span>$0.18/DAY</span>
      </div>

      <button
        onClick={onTogglePalette}
        title={isLight ? 'Switch to dark' : 'Switch to light'}
        style={{
          display: 'grid', placeItems: 'center', width: 28, height: 28,
          borderRadius: 4, border: `1px solid ${T.border}`,
          background: T.surface, color: T.inkDim, cursor: 'pointer',
          flexShrink: 0, padding: 0,
        }}>
        {isLight
          ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
          : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>}
      </button>

      <div style={{
        width: 26, height: 26, borderRadius: 4, background: T.lime, color: T.bg,
        display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, fontFamily: T.mono,
      }}>{userInitials}</div>
    </div>
  );
}

window.TopBar = TopBar;
