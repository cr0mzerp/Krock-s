import React, { useState, useEffect } from 'react';

export default function CodeView({ ws }) {
  const [skills, setSkills] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ws?.getSkills?.();
    setLoading(true);

    const handler = (e) => {
      if (e.detail?.type === 'skills_data') {
        setSkills(e.detail.skills ?? []);
        setLoading(false);
      }
    };
    window.addEventListener('krocks_ws', handler);
    return () => window.removeEventListener('krocks_ws', handler);
  }, [ws]);

  return (
    <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
      {/* Skill list */}
      <div style={{ width:'220px', minWidth:'220px', borderRight:'1px solid rgba(255,255,255,0.06)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'20px 16px 12px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:'13px', fontWeight:500, color:'#a3a19d', textTransform:'uppercase', letterSpacing:'0.05em' }}>Skills</span>
          <button onClick={() => ws?.getSkills?.()} style={{ background:'none', border:'none', color:'#a3a19d', cursor:'pointer', fontSize:'14px' }}>⟳</button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'0 8px' }}>
          {loading ? (
            <div style={{ padding:'12px', color:'#75736f', fontSize:'13px' }}>Loading…</div>
          ) : skills.length === 0 ? (
            <div style={{ padding:'12px', color:'#75736f', fontSize:'13px' }}>No skills yet.<br/>Teach Krock something!</div>
          ) : skills.map((s, i) => (
            <button
              key={i}
              onClick={() => setSelected(s)}
              style={{
                width:'100%', textAlign:'left', padding:'8px 10px', borderRadius:'8px',
                background: selected?.name === s.name ? 'rgba(255,255,255,0.1)' : 'transparent',
                border:'none', color:'#e5e1d8', fontSize:'13px', cursor:'pointer', marginBottom:'2px',
                display:'flex', alignItems:'center', gap:'8px',
              }}
            >
              <span style={{ fontSize:'16px' }}>🧩</span> {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Code view */}
      <div style={{ flex:1, overflow:'auto', padding:'24px' }}>
        {selected ? (
          <>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
              <h2 style={{ fontFamily:'var(--f-serif)', fontSize:'20px', color:'#e5e1d8' }}>{selected.name}</h2>
            </div>
            <pre style={{
              background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px',
              padding:'20px', fontSize:'13px', lineHeight:1.6, color:'#e2e8f0',
              fontFamily:'var(--f-mono)', overflow:'auto', whiteSpace:'pre-wrap',
            }}>
              {selected.content}
            </pre>
          </>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'12px', color:'#75736f' }}>
            <span style={{ fontSize:'40px' }}>🧩</span>
            <span style={{ fontSize:'14px' }}>Select a skill</span>
            <span style={{ fontSize:'12px', maxWidth:'280px', textAlign:'center', color:'#4a4946' }}>
              Krock's new skills will appear here as it learns them. You can teach it with the [EVOLVE] command.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
