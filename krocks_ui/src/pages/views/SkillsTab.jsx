import React, { useState, useEffect } from 'react';
import { EmptyState, LoadingState } from './FormFields';
import { Modal, ConfirmDialog } from './Modal';

export default function SkillsTab({ ws }) {
  const [skills, setSkills] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [testing, setTesting] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!ws) return;
    const refresh = () => ws.sendRaw({ type: 'get_skills_v2' });
    refresh();
    const handler = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'skills_data_v2' || data.type === 'skills_data') {
          setSkills(data.skills || []);
        }
        if (data.type === 'skill_updated') {
          setToast({ ok: data.ok, msg: data.msg });
        }
        if (data.type === 'skill_deleted') {
          setToast({ ok: data.ok, msg: data.msg });
        }
      } catch {}
    };
    ws.ws?.addEventListener?.('message', handler);
    return () => ws.ws?.removeEventListener?.('message', handler);
  }, [ws]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!ws) return;
    const handler = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'skills_data') {
          const list = (data.skills || []).map(s => ({
            name: s.name,
            description: '',
            functions: [],
            size_bytes: (s.content || '').length,
            last_used: 0,
            source: 'learned',
            _raw: s.content,
          }));
          setSkills(list);
        }
      } catch {}
    };
    ws.ws?.addEventListener?.('message', handler);
    ws.sendRaw({ type: 'get_skills' });
    return () => ws.ws?.removeEventListener?.('message', handler);
  }, [ws]);

  const refresh = () => ws?.sendRaw({ type: 'get_skills' });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 500, color: 'var(--t1)', margin: '0 0 4px' }}>Skills</h2>
          <p style={{ fontSize: '13.5px', color: 'var(--t3)', margin: 0 }}>Python modules created via EVOLVE action or installed as plugins.</p>
        </div>
        <button
          onClick={refresh}
          style={{
            padding: '6px 12px', background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
            color: 'var(--t2)', fontSize: '12.5px', cursor: 'pointer',
          }}
        >Refresh</button>
      </div>

      {toast && (
        <div style={{
          padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
          background: toast.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${toast.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: toast.ok ? '#4ade80' : '#f87171', fontSize: '13px',
        }}>{toast.msg}</div>
      )}

      {skills === null ? <LoadingState text="Loading…" /> :
        skills.length === 0 ? (
          <EmptyState
            icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>}
            title="No skills yet"
            desc="Ask the LLM with [EVOLVE name]code[/EVOLVE] to create a skill, or install one from the Plugins tab."
          />
        ) : (
          <div>
            {skills.map(s => (
              <div key={s.name} style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                padding: '16px 20px', background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--b1)', borderRadius: '12px',
                marginBottom: '8px',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <code style={{ fontSize: '14px', color: 'var(--t1)', fontFamily: 'ui-monospace, monospace' }}>{s.name}.py</code>
                    <span style={{ fontSize: '10.5px', color: 'var(--t3)', padding: '2px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }}>{(s.size_bytes / 1024).toFixed(1)} KB</span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.description || s._raw?.split('\n').find(l => l.strip?.()?.startsWith('"""') || l.includes('"""')) || 'Python module'}
                  </div>
                </div>
                <button onClick={() => setTesting(s)} style={actionBtnStyle}>Test</button>
                <button onClick={() => setEditing(s)} style={actionBtnStyle}>Edit</button>
                <button onClick={() => setDeleting(s)} style={{ ...actionBtnStyle, color: '#f87171' }}>Delete</button>
              </div>
            ))}
          </div>
        )
      }

      {editing && <EditSkillModal skill={editing} ws={ws} onClose={() => { setEditing(null); refresh(); }} />}
      {deleting && (
        <ConfirmDialog
          open
          onClose={() => setDeleting(null)}
          onConfirm={() => ws?.sendRaw({ type: 'delete_skill', name: deleting.name })}
          title="Delete skill?"
          message={`"${deleting.name}" will be permanently deleted. This cannot be undone.`}
          confirmLabel="Delete"
          danger
        />
      )}
      {testing && <TestSkillModal skill={testing} ws={ws} onClose={() => setTesting(null)} />}
    </div>
  );
}

const actionBtnStyle = {
  padding: '6px 12px', background: 'transparent',
  border: '1px solid var(--b1)', borderRadius: '6px',
  color: 'var(--t2)', fontSize: '12.5px', cursor: 'pointer',
  fontWeight: 500,
};

function EditSkillModal({ skill, ws, onClose }) {
  const [code, setCode] = useState(skill._raw || '');
  const [desc, setDesc] = useState(skill.description || '');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const save = () => {
    setBusy(true);
    setResult(null);
    const handler = (e) => {
      try {
        const d = JSON.parse(e.data);
        if (d.type === 'skill_updated') {
          setResult({ ok: d.ok, msg: d.msg });
          setBusy(false);
          if (d.ok) setTimeout(onClose, 1200);
        }
      } catch {}
    };
    ws?.ws?.addEventListener?.('message', handler);
    const finalCode = desc ? `"""${desc}"""\n\n${code.replace(/^""".*?"""\s*/s, '')}` : code;
    ws?.sendRaw({ type: 'update_skill', name: skill.name, code: finalCode });
    setTimeout(() => ws?.ws?.removeEventListener?.('message', handler), 5000);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit: ${skill.name}.py`}
      width={720}
      footer={
        <>
          <button onClick={onClose} style={{ padding: '8px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'var(--t2)', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={save} disabled={busy} style={{ padding: '8px 14px', background: 'var(--accent, #cc785c)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', cursor: busy ? 'wait' : 'pointer', fontWeight: 500, opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--t2)', marginBottom: '6px', fontWeight: 500 }}>Description (docstring)</label>
        <input
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="What does this skill do?"
          style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--t1)', fontSize: '14px', boxSizing: 'border-box' }}
        />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--t2)', marginBottom: '6px', fontWeight: 500 }}>Python code</label>
        <textarea
          value={code}
          onChange={e => setCode(e.target.value)}
          rows={18}
          style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--t1)', fontSize: '12.5px', fontFamily: 'ui-monospace, "SF Mono", monospace', lineHeight: 1.5, resize: 'vertical', boxSizing: 'border-box' }}
          spellCheck={false}
        />
      </div>
      {result && (
        <div style={{
          marginTop: '12px', padding: '10px 14px', borderRadius: '8px',
          background: result.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${result.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: result.ok ? '#4ade80' : '#f87171', fontSize: '12.5px', whiteSpace: 'pre-wrap',
        }}>{result.msg}</div>
      )}
    </Modal>
  );
}

function TestSkillModal({ skill, ws, onClose }) {
  const [funcName, setFuncName] = useState('main');
  const [argsText, setArgsText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (skill._raw) {
      const matches = [...skill._raw.matchAll(/^def\s+(\w+)\s*\(/gm)].map(m => m[1]);
      if (matches.length && !matches.includes(funcName)) {
        setFuncName(matches[0]);
      }
    }
  }, [skill]);

  const run = () => {
    setBusy(true);
    setResult(null);
    const handler = (e) => {
      try {
        const d = JSON.parse(e.data);
        if (d.type === 'skill_test_result') {
          setResult({ ok: d.ok, output: d.output });
          setBusy(false);
        }
      } catch {}
    };
    ws?.ws?.addEventListener?.('message', handler);
    const args = argsText.split(',').map(a => {
      const t = a.trim();
      if (!t) return t;
      if (/^-?\d+(\.\d+)?$/.test(t)) return parseFloat(t);
      if (t === 'true') return true;
      if (t === 'false') return false;
      return t;
    }).filter(x => x !== '');
    ws?.sendRaw({ type: 'test_skill', name: skill.name, function: funcName, args });
    setTimeout(() => ws?.ws?.removeEventListener?.('message', handler), 10000);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Test: ${skill.name}`}
      width={600}
      footer={
        <>
          <button onClick={onClose} style={{ padding: '8px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'var(--t2)', fontSize: '13px', cursor: 'pointer' }}>Close</button>
          <button onClick={run} disabled={busy} style={{ padding: '8px 14px', background: 'var(--accent, #cc785c)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', cursor: busy ? 'wait' : 'pointer', fontWeight: 500, opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Running…' : 'Run'}
          </button>
        </>
      }
    >
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--t2)', marginBottom: '6px', fontWeight: 500 }}>Function</label>
        <input
          value={funcName}
          onChange={e => setFuncName(e.target.value)}
          style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--t1)', fontSize: '14px', fontFamily: 'ui-monospace, monospace', boxSizing: 'border-box' }}
        />
      </div>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--t2)', marginBottom: '6px', fontWeight: 500 }}>Arguments (comma-separated)</label>
        <input
          value={argsText}
          onChange={e => setArgsText(e.target.value)}
          placeholder="e.g. 'hello', 42, true"
          style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--t1)', fontSize: '14px', fontFamily: 'ui-monospace, monospace', boxSizing: 'border-box' }}
        />
        <div style={{ fontSize: '11.5px', color: 'var(--t3)', marginTop: '4px' }}>Numbers, booleans, and strings are parsed automatically.</div>
      </div>
      {result && (
        <div style={{
          padding: '12px', borderRadius: '8px',
          background: 'rgba(0,0,0,0.3)',
          border: `1px solid ${result.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: result.ok ? '#e0e0e0' : '#f87171',
          fontSize: '12.5px', fontFamily: 'ui-monospace, monospace',
          whiteSpace: 'pre-wrap', maxHeight: '300px', overflowY: 'auto',
        }}>{result.output}</div>
      )}
    </Modal>
  );
}
