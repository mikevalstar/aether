// Atoms — WBadge, WButton, WChip, WIcon
// All read from `window.consoleTokens` so they re-skin on palette change.

function WBadge({ children, tone = 'muted', solid = false }) {
  const T = window.consoleTokens;
  const map = {
    muted:  { fg: T.inkDim, bg: T.surface,    br: T.border  },
    accent: { fg: T.lime,   bg: `${T.lime}14`, br: T.limeDim },
    warn:   { fg: T.warn,   bg: `${T.warn}1A`, br: T.warn    },
    add:    { fg: T.add,    bg: `${T.add}1A`,  br: T.add     },
    del:    { fg: T.del,    bg: `${T.del}1A`,  br: T.del     },
  };
  const s = map[tone] || map.muted;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 8px', borderRadius: 3,
      background: solid ? s.fg : s.bg, color: solid ? T.bg : s.fg,
      border: `1px solid ${solid ? s.fg : s.br}`,
      fontFamily: T.mono, fontSize: 10.5, letterSpacing: 0.5,
      whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

function WButton({ children, kind = 'ghost', icon, onClick, size = 'md', type = 'button' }) {
  const T = window.consoleTokens;
  const sz = size === 'sm' ? { p: '4px 9px', fs: 11 }
           : size === 'lg' ? { p: '9px 16px', fs: 13 }
                           : { p: '6px 12px', fs: 12 };
  const styles = {
    primary:   { bg: T.lime,        fg: T.bg,  br: T.lime     },
    secondary: { bg: T.surface,     fg: T.ink, br: T.borderHi },
    ghost:     { bg: 'transparent', fg: T.inkDim, br: T.border },
    danger:    { bg: 'transparent', fg: T.del,    br: T.del    },
  };
  const s = styles[kind] || styles.ghost;
  return (
    <button type={type} onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: sz.p, fontSize: sz.fs, borderRadius: 4,
      background: s.bg, color: s.fg, border: `1px solid ${s.br}`,
      fontFamily: T.mono, fontWeight: kind === 'primary' ? 600 : 500,
      letterSpacing: 0.3, cursor: 'pointer', whiteSpace: 'nowrap',
    }}>
      {icon && <span style={{ fontSize: sz.fs - 1 }}>{icon}</span>}
      {children}
    </button>
  );
}

function WChip({ children, mono = true }) {
  const T = window.consoleTokens;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 7px', borderRadius: 3,
      background: T.bg, border: `1px solid ${T.border}`,
      color: T.inkDim, fontFamily: mono ? T.mono : T.display, fontSize: 11,
      whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

function WIcon({ d, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

window.WBadge  = WBadge;
window.WButton = WButton;
window.WChip   = WChip;
window.WIcon   = WIcon;
