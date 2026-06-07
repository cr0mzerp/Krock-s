import React, { useState, useEffect } from 'react';
import { LoadingState } from './FormFields';
import { Modal, ConfirmDialog } from './Modal';

const CONNECTOR_DEFS = [
  { id: 'local_files', name: 'Local Files', desc: 'Access files in the working directory.', icon: '📁', real: true, needsConfig: false, needsPick: true },
  { id: 'icloud',      name: 'iCloud Drive', desc: 'Connect ~/Library/Mobile Documents/com~apple~CloudDocs.', icon: '☁️', real: true, needsConfig: false, needsTest: true },
  { id: 'github',      name: 'GitHub', desc: 'Repository access (mock — no real OAuth flow).', icon: '🐙', real: false, needsConfig: true, configFields: [{ key: 'token', label: 'Personal Access Token', type: 'password' }] },
  { id: 'notion',      name: 'Notion', desc: 'Page & database reading (mock).', icon: '📝', real: false, needsConfig: true, configFields: [{ key: 'token', label: 'Integration Token', type: 'password' }] },
  { id: 'linear',      name: 'Linear', desc: 'Issue management (mock).', icon: '📐', real: false, needsConfig: true, configFields: [{ key: 'token', label: 'API Key', type: 'password' }] },
  { id: 'slack',       name: 'Slack', desc: 'Channel messages (mock).', icon: '💬', real: false, needsConfig: true, configFields: [{ key: 'token', label: 'Bot Token', type: 'password' }] },
  { id: 'figma',       name: 'Figma', desc: 'Design files (mock).', icon: '🎨', real: false, needsConfig: true, configFields: [{ key: 'token', label: 'Personal Access Token', type: 'password' }] },
];

export default function ConnectorsTab({ ws }) {
  const [state, setState] = useState(null);
  const [configuring, setConfiguring] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    if (!ws) return;
    const handler = (e) => {
      try {
        const d = JSON.parse(e.data);
        if (d.type === 'customization_data') {
          setState(d.state);
        }
        if (d.type === 'customization_saved') {
          ws.sendRaw({ type: 'get_customization' });
        }
        if (d.type === 'connector_test_result') {
          setBusy(null);
          setTestResult({ name: d.name, ok: d.result.ok, msg: d.result.msg });
          setTimeout(() => setTestResult(null), 5000);
        }
      } catch {}
    };
    ws.ws?.addEventListener?.('message', handler);
    ws.sendRaw({ type: 'get_customization' });
    return () => ws.ws?.removeEventListener?.('message', handler);
  }, [ws]);

  const connectors = state?.connectors || {};
  const defById = Object.fromEntries(CONNECTOR_DEFS.map(d => [d.id, d]));

  const toggle = (id) => {
    const cur = connectors[id] || { status: 'disconnected', config: {} };
    const newStatus = cur.status === 'connected' ? 'disconnected' : 'connected';
    if (newStatus === 'connected') {
      const def = defById[id];
      if (def?.real && id === 'local_files') {
        ws?.sendRaw({ type: 'save_connector', name: id, status: 'connected', config: { path: window.__cwd__ || '' } });
        return;
      }
      if (def?.real && id === 'icloud') {
        setBusy(id);
        ws?.sendRaw({ type: 'test_connector', name: id });
        ws?.sendRaw({ type: 'save_connector', name: id, status: 'connected' });
        return;
      }
      if (def?.needsConfig) {
        setConfiguring({ id, def, current: cur.config || {} });
        return;
      }
    }
    ws?.sendRaw({ type: 'save_connector', name: id, status: newStatus });
  };

  const test = (id) => {
    setBusy(id);
    setTestResult(null);
    ws?.sendRaw({ type: 'test_connector', name: id });
  };

  if (state === null) return <LoadingState text="Loading…" />;

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 500, color: 'var(--t1)', margin: '0 0 4px' }}>Connectors</h2>
      <p style={{ fontSize: '13.5px', color: 'var(--t3)', margin: '0 0 24px' }}>Connect to external tools. iCloud and Local Files are real connections; others are UI previews.</p>

      {testResult && (
        <div style={{
          padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
          background: testResult.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${testResult.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: testResult.ok ? '#4ade80' : '#f87171', fontSize: '13px',
        }}>{testResult.msg}</div>
      )}

      {CONNECTOR_DEFS.map(def => {
        const conn = connectors[def.id] || { status: 'disconnected', config: {}, lastTest: null };
        const isConnected = conn.status === 'connected';
        const isBusy = busy === def.id;
        return (
          <div key={def.id} style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            padding: '16px 20px', background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--b1)', borderRadius: '12px', marginBottom: '8px',
          }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', flexShrink: 0,
            }}>{def.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <span style={{ fontSize: '14.5px', color: 'var(--t1)', fontWeight: 500 }}>{def.name}</span>
                <StatusBadge status={conn.status} real={def.real} />
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--t3)' }}>{def.desc}</div>
              {conn.lastTest && (
                <div style={{ fontSize: '11.5px', color: conn.lastTest.ok ? '#4ade80' : '#f87171', marginTop: '2px' }}>
                  Last test: {conn.lastTest.msg}
                </div>
              )}
            </div>
            {def.needsConfig && (
              <button onClick={() => setConfiguring({ id: def.id, def, current: conn.config || {} })} style={actionBtnStyle}>Configure</button>
            )}
            <button onClick={() => test(def.id)} disabled={isBusy} style={actionBtnStyle}>{isBusy ? '…' : 'Test'}</button>
            <button
              onClick={() => toggle(def.id)}
              style={{
                ...actionBtnStyle,
                background: isConnected ? 'rgba(239,68,68,0.15)' : 'var(--accent, #cc785c)',
                borderColor: isConnected ? 'rgba(239,68,68,0.4)' : 'transparent',
                color: isConnected ? '#f87171' : '#fff',
                minWidth: '100px',
              }}
            >{isConnected ? 'Disconnect' : 'Connect'}</button>
          </div>
        );
      })}

      {configuring && <ConfigModal data={configuring} ws={ws} onClose={() => setConfiguring(null)} />}
    </div>
  );
}

const actionBtnStyle = {
  padding: '6px 12px', background: 'transparent',
  border: '1px solid var(--b1)', borderRadius: '6px',
  color: 'var(--t2)', fontSize: '12.5px', cursor: 'pointer',
  fontWeight: 500,
};

function StatusBadge({ status, real }) {
  const colors = {
    connected:   { bg: 'rgba(34,197,94,0.15)',  fg: '#4ade80', text: 'connected' },
    disconnected:{ bg: 'rgba(255,255,255,0.06)',fg: 'var(--t3)', text: 'disconnected' },
    error:       { bg: 'rgba(239,68,68,0.15)',  fg: '#f87171', text: 'error' },
  };
  const c = colors[status] || colors.disconnected;
  return (
    <span style={{
      fontSize: '10.5px', padding: '2px 6px', borderRadius: '4px',
      background: c.bg, color: c.fg, fontWeight: 500,
    }}>{c.text}{!real && ' (mock)'}</span>
  );
}

function ConfigModal({ data, ws, onClose }) {
  const [form, setForm] = useState({ ...(data.current || {}) });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const save = () => {
    setBusy(true);
    setResult(null);
    const handler = (e) => {
      try {
        const d = JSON.parse(e.data);
        if (d.type === 'customization_saved') {
          setBusy(false);
          setResult({ ok: true, msg: 'Saved.' });
          setTimeout(onClose, 800);
        }
      } catch {}
    };
    ws?.ws?.addEventListener?.('message', handler);
    ws?.sendRaw({ type: 'save_connector', name: data.id, config: form, status: 'connected' });
    setTimeout(() => ws?.ws?.removeEventListener?.('message', handler), 5000);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Configure ${data.def.name}`}
      footer={
        <>
          <button onClick={onClose} style={{ padding: '8px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'var(--t2)', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={save} disabled={busy} style={{ padding: '8px 14px', background: 'var(--accent, #cc785c)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', cursor: busy ? 'wait' : 'pointer', fontWeight: 500, opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Saving…' : 'Save & Connect'}
          </button>
        </>
      }
    >
      {data.def.configFields?.map(f => (
        <div key={f.key} style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--t2)', marginBottom: '6px', fontWeight: 500 }}>{f.label}</label>
          <input
            type={f.type || 'text'}
            value={form[f.key] || ''}
            onChange={e => setForm({ ...form, [f.key]: e.target.value })}
            style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--t1)', fontSize: '14px', boxSizing: 'border-box' }}
            autoComplete="off"
          />
        </div>
      ))}
      {result && (
        <div style={{
          marginTop: '12px', padding: '10px 14px', borderRadius: '8px',
          background: result.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          color: result.ok ? '#4ade80' : '#f87171', fontSize: '12.5px',
        }}>{result.msg}</div>
      )}
    </Modal>
  );
}
