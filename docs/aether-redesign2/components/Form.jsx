// Form atoms — WLabel, WField, WInput, WTextarea, WSelect.

const { useState: useStateF } = React;

function WLabel({ children, required, hint }) {
  const T = window.consoleTokens;
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
      <span style={{ fontFamily: T.mono, fontSize: 10, color: T.inkMuted, letterSpacing: 1.5, fontWeight: 600 }}>
        {String(children).toUpperCase()}
      </span>
      {required && <span style={{ color: T.del, fontFamily: T.mono, fontSize: 11, lineHeight: 1 }}>*</span>}
      <span style={{ flex: 1, height: 1, borderTop: `1px dashed ${T.border}`, alignSelf: 'center' }} />
      {hint && <span style={{ fontFamily: T.mono, fontSize: 10, color: T.inkMuted, letterSpacing: 0.5 }}>{hint}</span>}
    </div>
  );
}

function inputBase(T, focused) {
  return {
    width: '100%',
    background: T.bg,
    border: `1px solid ${focused ? T.lime : T.border}`,
    borderRadius: 4,
    padding: '9px 11px',
    fontFamily: T.mono,
    fontSize: 12.5,
    color: T.ink,
    outline: 'none',
    boxShadow: focused ? `0 0 0 3px ${T.lime}1A` : 'none',
    transition: 'border-color 100ms, box-shadow 100ms',
  };
}

function WField({ label, required, hint, children, prefix }) {
  const T = window.consoleTokens;
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <WLabel required={required} hint={hint}>{label}</WLabel>
      {prefix ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'stretch' }}>
          <span style={{ display: 'grid', placeItems: 'center', padding: '0 10px', fontFamily: T.mono, fontSize: 11, color: T.inkMuted, background: T.surface, border: `1px solid ${T.border}`, borderRight: 'none', borderRadius: '4px 0 0 4px' }}>{prefix}</span>
          {children}
        </div>
      ) : children}
    </div>
  );
}

function WInput({ value, onChange, placeholder, prefix, ...rest }) {
  const T = window.consoleTokens;
  const [focused, setFocused] = useStateF(false);
  return (
    <input
      value={value || ''}
      placeholder={placeholder}
      onChange={(e) => onChange?.(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{ ...inputBase(T, focused), ...(prefix ? { borderRadius: '0 4px 4px 0' } : {}) }}
      {...rest}
    />
  );
}

function WTextarea({ value, onChange, placeholder, rows = 4 }) {
  const T = window.consoleTokens;
  const [focused, setFocused] = useStateF(false);
  return (
    <textarea
      value={value || ''}
      placeholder={placeholder}
      rows={rows}
      onChange={(e) => onChange?.(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{ ...inputBase(T, focused), resize: 'vertical', minHeight: 84, lineHeight: 1.55, fontFamily: T.mono }}
    />
  );
}

function WSelect({ value, onChange, options = [], placeholder = 'Select…' }) {
  const T = window.consoleTokens;
  const [open, setOpen] = useStateF(false);
  const sel = options.find(o => (typeof o === 'string' ? o : o.value) === value);
  const selLabel = sel ? (typeof sel === 'string' ? sel : sel.label) : null;
  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        style={{
          ...inputBase(T, open),
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
        <span style={{ flex: 1, color: selLabel ? T.ink : T.inkMuted }}>{selLabel || placeholder}</span>
        <span style={{ color: T.inkMuted, fontSize: 10 }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 10,
          background: T.panelSolid, border: `1px solid ${T.borderHi}`, borderRadius: 4,
          boxShadow: `0 8px 24px -8px ${T.bg}80`, overflow: 'hidden',
        }}>
          {options.map((o, i) => {
            const v = typeof o === 'string' ? o : o.value;
            const l = typeof o === 'string' ? o : o.label;
            const isSel = v === value;
            return (
              <div
                key={v}
                onMouseDown={(e) => { e.preventDefault(); onChange?.(v); setOpen(false); }}
                style={{
                  padding: '7px 11px', fontFamily: T.mono, fontSize: 12,
                  color: isSel ? T.lime : T.ink,
                  background: isSel ? `${T.lime}14` : 'transparent',
                  cursor: 'pointer',
                  borderBottom: i < options.length - 1 ? `1px solid ${T.border}` : 'none',
                }}
                onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = T.surface; }}
                onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}>
                <span style={{ marginRight: 6, color: isSel ? T.lime : T.inkMuted }}>{isSel ? '◆' : '◇'}</span>{l}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

window.WLabel    = WLabel;
window.WField    = WField;
window.WInput    = WInput;
window.WTextarea = WTextarea;
window.WSelect   = WSelect;
