import React, { useState, useEffect } from 'react';
import { EmptyState, LoadingState, TextAreaField, SelectField } from './FormFields';
import { Modal, ConfirmDialog } from './Modal';

const CATEGORIES = [
  { value: 'user_prefs',       label: 'User Preferences' },
  { value: 'project_info',     label: 'Project Info' },
  { value: 'code_conventions', label: 'Code Conventions' },
  { value: 'memory',           label: 'General Note' },
];

export default function MemoryTab({ ws }) {
  const [facts, setFacts] = useState(null);
  const [filter, setFilter] = useState('all');
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!ws) return;
    const handler = (e) => {
      try {
        const d = JSON.parse(e.data);
        if (d.type === 'memory_facts') {
          setFacts(d.facts || []);
        }
        if (d.type === 'memory_added' || d.type === 'memory_deleted') {
          setToast({ ok: d.ok, msg: d.ok ? (d.id ? 'Added.' : 'Deleted.') : (d.msg || 'Error') });
        }
      } catch {}
    };
    ws.ws?.addEventListener?.('message', handler);
    ws.sendRaw({ type: 'list_memory' });
    return () => ws.ws?.removeEventListener?.('message', handler);
  }, [ws]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const refresh = () => ws?.sendRaw({ type: 'list_memory', category: filter === 'all' ? null : filter });

  const visible = (facts || []).filter(f => filter === 'all' || f.category === filter);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 500, color: 'var(--t1)', margin: '0 0 4px' }}>Memory</h2>
          <p style={{ fontSize: '13.5px', color: 'var(--t3)', margin: 0 }}>Persistent information Krock's remembers.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            value={filter}
            onChange={e => { setFilter(e.target.value); ws?.sendRaw({ type: 'list_memory', category: e.target.value === 'all' ? null : e.target.value }); }}
            style={{
              padding: '6px 10px', background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
              color: 'var(--t1)', fontSize: '13px',
            }}
          >
            <option value="all">All</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <button
            onClick={() => setAdding(true)}
            style={{
              padding: '6px 14px', background: 'var(--accent, #cc785c)',
              border: 'none', borderRadius: '8px', color: '#fff',
              fontSize: '13px', cursor: 'pointer', fontWeight: 500,
            }}
          >+ New Note</button>
        </div>
      </div>

      {toast && (
        <div style={{
          padding: '8px 12px', borderRadius: '8px', marginBottom: '12px',
          background: toast.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          color: toast.ok ? '#4ade80' : '#f87171', fontSize: '12.5px',
        }}>{toast.msg}</div>
      )}

      {facts === null ? <LoadingState /> :
        visible.length === 0 ? (
          <EmptyState
            title={filter === 'all' ? "No notes yet" : "No notes in this category"}
            desc="Krock's automatically remembers some things. You can also add notes with '+ New Note'."
          />
        ) : (
          <div>
            {visible.map(f => (
              <div key={f.id} style={{
                display: 'flex', gap: '12px', alignItems: 'flex-start',
                padding: '14px 18px', background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--b1)', borderRadius: '12px', marginBottom: '6px',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '11.5px', color: 'var(--t3)', marginBottom: '4px' }}>
                    {CATEGORIES.find(c => c.value === f.category)?.label || f.category} · {f.source}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--t1)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{f.content}</div>
                </div>
                <button
                  onClick={() => setDeleting(f)}
                  style={{
                    padding: '4px 8px', background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
                    color: 'var(--t3)', fontSize: '12px', cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >Delete</button>
              </div>
            ))}
          </div>
        )}

      {adding && <AddFactModal ws={ws} onClose={() => { setAdding(false); refresh(); }} />}
      {deleting && (
        <ConfirmDialog
          open
          onClose={() => setDeleting(null)}
          onConfirm={() => ws?.sendRaw({ type: 'delete_memory', id: deleting.id })}
          title="Delete note?"
          message="This note will be permanently deleted."
          confirmLabel="Delete"
          danger
        />
      )}
    </div>
  );
}

function AddFactModal({ ws, onClose }) {
  const [category, setCategory] = useState('user_prefs');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);

  const save = () => {
    if (!content.trim()) return;
    setBusy(true);
    const handler = (e) => {
      try {
        const d = JSON.parse(e.data);
        if (d.type === 'memory_added') {
          setBusy(false);
          onClose();
        }
      } catch {}
    };
    ws?.ws?.addEventListener?.('message', handler);
    ws?.sendRaw({ type: 'add_memory', category, content: content.trim() });
    setTimeout(() => ws?.ws?.removeEventListener?.('message', handler), 5000);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="New Note"
      footer={
        <>
          <button onClick={onClose} style={{ padding: '8px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'var(--t2)', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={save} disabled={busy || !content.trim()} style={{ padding: '8px 14px', background: 'var(--accent, #cc785c)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', cursor: busy ? 'wait' : 'pointer', fontWeight: 500, opacity: (busy || !content.trim()) ? 0.5 : 1 }}>
            {busy ? 'Adding…' : 'Add'}
          </button>
        </>
      }
    >
      <SelectField
        label="Category"
        value={category}
        onChange={setCategory}
        options={CATEGORIES}
      />
      <TextAreaField
        label="Content"
        value={content}
        onChange={setContent}
        placeholder="Information you want Krock's to remember…"
        rows={5}
        hint="This information is shared with Krock's in every session."
      />
    </Modal>
  );
}
