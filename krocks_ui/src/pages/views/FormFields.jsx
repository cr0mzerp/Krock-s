import React from 'react';

const baseInput = {
  width: '100%',
  padding: '8px 12px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: 'var(--t1)',
  fontSize: '14px',
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color 0.15s, background 0.15s',
  boxSizing: 'border-box',
};

export function TextField({ label, value, onChange, placeholder, type = 'text', hint }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      {label && <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--t2)', marginBottom: '6px', fontWeight: 500 }}>{label}</label>}
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        style={baseInput}
        onFocus={e => { e.target.style.borderColor = 'rgba(255,255,255,0.25)'; e.target.style.background = 'rgba(255,255,255,0.06)'; }}
        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.04)'; }}
      />
      {hint && <div style={{ fontSize: '11.5px', color: 'var(--t3)', marginTop: '4px' }}>{hint}</div>}
    </div>
  );
}

export function TextAreaField({ label, value, onChange, placeholder, rows = 4, hint }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      {label && <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--t2)', marginBottom: '6px', fontWeight: 500 }}>{label}</label>}
      <textarea
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        style={{ ...baseInput, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
        onFocus={e => { e.target.style.borderColor = 'rgba(255,255,255,0.25)'; e.target.style.background = 'rgba(255,255,255,0.06)'; }}
        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.04)'; }}
      />
      {hint && <div style={{ fontSize: '11.5px', color: 'var(--t3)', marginTop: '4px' }}>{hint}</div>}
    </div>
  );
}

export function SelectField({ label, value, onChange, options, hint }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      {label && <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--t2)', marginBottom: '6px', fontWeight: 500 }}>{label}</label>}
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        style={{ ...baseInput, cursor: 'pointer' }}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value} style={{ background: 'rgb(31,31,30)', color: 'var(--t1)' }}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint && <div style={{ fontSize: '11.5px', color: 'var(--t3)', marginTop: '4px' }}>{hint}</div>}
    </div>
  );
}

export function ToggleField({ label, desc, value, onChange }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
      marginBottom: '8px',
    }}>
      <div style={{ flex: 1, paddingRight: '16px' }}>
        <div style={{ fontSize: '14px', color: 'var(--t1)', fontWeight: 500 }}>{label}</div>
        {desc && <div style={{ fontSize: '12.5px', color: 'var(--t3)', marginTop: '2px' }}>{desc}</div>}
      </div>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        style={{
          width: '40px', height: '22px', borderRadius: '11px',
          background: value ? 'var(--accent, #cc785c)' : 'rgba(255,255,255,0.12)',
          border: 'none', position: 'relative', cursor: 'pointer',
          transition: 'background 0.2s', flexShrink: 0, padding: 0,
        }}
      >
        <span style={{
          position: 'absolute', top: '2px', left: value ? '20px' : '2px',
          width: '18px', height: '18px', borderRadius: '50%',
          background: '#fff', transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </button>
    </div>
  );
}

export function SliderField({ label, value, onChange, min, max, step, format, hint }) {
  // value undefined/null ise format crash edebilir (örn. v.toFixed) — güvenli fallback
  const safeValue = (typeof value === 'number' && !Number.isNaN(value)) ? value : min;
  const display = format ? format(safeValue) : safeValue;
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
        {label && <label style={{ fontSize: '12.5px', color: 'var(--t2)', fontWeight: 500 }}>{label}</label>}
        <span style={{ fontSize: '13px', color: 'var(--t1)', fontFamily: 'ui-monospace, monospace' }}>{display}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step ?? 1}
        value={safeValue}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--accent, #cc785c)' }}
      />
      {hint && <div style={{ fontSize: '11.5px', color: 'var(--t3)', marginTop: '4px' }}>{hint}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, desc, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--t3)' }}>
      {icon && <div style={{ margin: '0 auto 16px', width: '40px', height: '40px', opacity: 0.5 }}>{icon}</div>}
      <div style={{ fontSize: '15px', color: 'var(--t2)', marginBottom: '6px', fontWeight: 500 }}>{title}</div>
      {desc && <div style={{ fontSize: '13px', lineHeight: 1.5, marginBottom: action ? '20px' : 0 }}>{desc}</div>}
      {action}
    </div>
  );
}

export function LoadingState({ text = 'Yükleniyor…' }) {
  return (
    <div style={{ padding: '32px', textAlign: 'center', color: 'var(--t3)', fontSize: '13px' }}>
      <div style={{
        display: 'inline-block', width: '16px', height: '16px',
        border: '2px solid rgba(255,255,255,0.15)',
        borderTopColor: 'var(--t2)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        marginRight: '8px', verticalAlign: 'middle',
      }} />
      {text}
    </div>
  );
}
