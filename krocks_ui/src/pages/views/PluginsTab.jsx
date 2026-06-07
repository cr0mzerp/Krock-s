import React, { useState, useEffect } from 'react';
import { EmptyState, LoadingState } from './FormFields';
import { Modal, ConfirmDialog } from './Modal';

export default function PluginsTab({ ws }) {
  const [plugins, setPlugins] = useState(null);
  const [previewing, setPreviewing] = useState(null);
  const [uninstalling, setUninstalling] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!ws) return;
    const handler = (e) => {
      try {
        const d = JSON.parse(e.data);
        if (d.type === 'plugin_registry') {
          setPlugins(d.plugins || []);
        }
        if (d.type === 'plugin_installed' || d.type === 'plugin_uninstalled') {
          setToast({ ok: d.ok, msg: d.msg });
          ws.sendRaw({ type: 'browse_plugins' });
        }
      } catch {}
    };
    ws.ws?.addEventListener?.('message', handler);
    ws.sendRaw({ type: 'browse_plugins' });
    return () => ws.ws?.removeEventListener?.('message', handler);
  }, [ws]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const install = (name) => ws?.sendRaw({ type: 'install_plugin', name });
  const uninstall = (name) => {
    setUninstalling(null);
    ws?.sendRaw({ type: 'uninstall_plugin', name });
  };

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 500, color: 'var(--t1)', margin: '0 0 4px' }}>Plugins</h2>
      <p style={{ fontSize: '13.5px', color: 'var(--t3)', margin: '0 0 24px' }}>Install ready-made capability packages. Each plugin is added as a Python skill.</p>

      {toast && (
        <div style={{
          padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
          background: toast.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${toast.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: toast.ok ? '#4ade80' : '#f87171', fontSize: '13px',
        }}>{toast.msg}</div>
      )}

      {plugins === null ? <LoadingState /> :
        plugins.length === 0 ? (
          <EmptyState title="No plugins found" desc="The marketplace is currently empty." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {plugins.map(p => (
              <div key={p.name} style={{
                padding: '16px', background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--b1)', borderRadius: '12px',
                display: 'flex', flexDirection: 'column',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--t3)', padding: '2px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }}>{p.category}</span>
                  {p.installed && (
                    <span style={{ fontSize: '11px', color: '#4ade80', padding: '2px 6px', background: 'rgba(34,197,94,0.1)', borderRadius: '4px' }}>Installed</span>
                  )}
                </div>
                <div style={{ fontSize: '15px', color: 'var(--t1)', fontWeight: 500, marginBottom: '2px' }}>{p.name}</div>
                <div style={{ fontSize: '11.5px', color: 'var(--t3)', marginBottom: '8px' }}>v{p.version} · {p.author} · {(p.size / 1024).toFixed(1)} KB</div>
                <div style={{ fontSize: '13px', color: 'var(--t2)', lineHeight: 1.45, flex: 1, marginBottom: '12px' }}>{p.description}</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => setPreviewing(p)} style={actionBtnStyle}>Preview</button>
                  {p.installed ? (
                    <button onClick={() => setUninstalling(p)} style={{ ...actionBtnStyle, color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}>Remove</button>
                  ) : (
                    <button onClick={() => install(p.name)} style={{ ...actionBtnStyle, background: 'var(--accent, #cc785c)', borderColor: 'transparent', color: '#fff' }}>Install</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      {previewing && <PreviewModal plugin={previewing} ws={ws} onClose={() => setPreviewing(null)} onInstall={() => { install(previewing.name); setPreviewing(null); }} />}
      {uninstalling && (
        <ConfirmDialog
          open
          onClose={() => setUninstalling(null)}
          onConfirm={() => uninstall(uninstalling.name)}
          title="Remove plugin?"
          message={`"${uninstalling.name}" will be uninstalled.`}
          confirmLabel="Remove"
          danger
        />
      )}
    </div>
  );
}

const actionBtnStyle = {
  padding: '6px 12px', background: 'transparent',
  border: '1px solid var(--b1)', borderRadius: '6px',
  color: 'var(--t2)', fontSize: '12.5px', cursor: 'pointer',
  fontWeight: 500, flex: 1,
};

function PreviewModal({ plugin, ws, onClose, onInstall }) {
  const [code, setCode] = useState('');
  useEffect(() => {
    ws?.sendRaw({ type: 'install_plugin', name: plugin.name, _preview: true });
    setCode(`# ${plugin.name} v${plugin.version}\n# ${plugin.description}\n#\n# Install and view the code from the Skills tab to edit it.`);
  }, [plugin, ws]);

  return (
    <Modal
      open
      onClose={onClose}
      title={`${plugin.name} preview`}
      width={620}
      footer={
        <>
          <button onClick={onClose} style={{ padding: '8px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'var(--t2)', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
          {!plugin.installed && (
            <button onClick={onInstall} style={{ padding: '8px 14px', background: 'var(--accent, #cc785c)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
              Install
            </button>
          )}
        </>
      }
    >
      <div style={{
        background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px', padding: '12px',
        fontSize: '12px', fontFamily: 'ui-monospace, "SF Mono", monospace',
        color: 'var(--t2)', whiteSpace: 'pre-wrap', maxHeight: '360px', overflowY: 'auto',
        lineHeight: 1.55,
      }}>{code}</div>
    </Modal>
  );
}
