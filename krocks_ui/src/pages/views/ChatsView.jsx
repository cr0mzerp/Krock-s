import React, { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';

function ContextMenu({ x, y, onClose, onDelete, onRename }) {
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} style={{
      position: 'fixed', top: y, left: x, zIndex: 999,
      background: 'rgb(32,32,32)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '10px', padding: '4px', minWidth: '180px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    }}>
      {[
        { icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="15" height="15"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>, label: 'Select', action: onClose },
        { icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="15" height="15"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>, label: 'Star', action: onClose },
        { icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="15" height="15"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.89 1.147l-2.83.944.943-2.83a4.5 4.5 0 011.147-1.89L16.862 4.487zm0 0L19.5 7.125" /></svg>, label: 'Rename', action: () => { onRename(); onClose(); } },
        { icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="15" height="15"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>, label: 'Add to project', action: onClose },
      ].map(({ icon, label, action }) => (
        <button key={label} onClick={action} style={{
          display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
          padding: '8px 12px', background: 'transparent', border: 'none',
          color: 'var(--t1)', fontSize: '13px', cursor: 'pointer', borderRadius: '6px',
          textAlign: 'left',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {icon} {label}
        </button>
      ))}
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '3px 8px' }} />
      <button onClick={() => { onDelete(); onClose(); }} style={{
        display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
        padding: '8px 12px', background: 'transparent', border: 'none',
        color: '#f87171', fontSize: '13px', cursor: 'pointer', borderRadius: '6px', textAlign: 'left',
      }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.08)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="15" height="15">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
        Delete
      </button>
    </div>
  );
}

export default function ChatsView({ sessions, onLoadSession, onNewChat, onDeleteSession }) {
  const [search, setSearch] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [contextMenu, setContextMenu] = useState(null); // {x,y,rawName}

  const filtered = (sessions || []).filter(s => {
    const name = typeof s === 'string' ? s : (s.title || s.name);
    return !search || name.toLowerCase().includes(search.toLowerCase());
  });

  const getTimeAgo = (sessionObj) => {
    if (!sessionObj) return '';
    // If it's the old string format fallback
    if (typeof sessionObj === 'string') {
        const match = sessionObj.match(/_(\d{8})_(\d{6})$/);
        if (!match) return '';
        const d = match[1], t = match[2];
        const date = new Date(
          `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}T${t.slice(0,2)}:${t.slice(2,4)}:${t.slice(4,6)}`
        );
        if (isNaN(date)) return '';
        return _formatTimeDiff(date);
    }
    // New SQLite updated_at format (e.g. "2026-06-06 00:51:22")
    if (sessionObj.updated_at) {
        // SQLite uses UTC. Append 'Z' to parse as UTC properly.
        const date = new Date(sessionObj.updated_at.replace(' ', 'T') + 'Z');
        if (isNaN(date)) return '';
        return _formatTimeDiff(date);
    }
    return '';
  };

  const _formatTimeDiff = (date) => {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    if (days === 1) return 'yesterday';
    if (days < 30) {
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${months[date.getMonth()]} ${date.getDate()}`;
    }
    return date.toLocaleDateString();
  };

  const toggleSelect = (rawName) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(rawName) ? next.delete(rawName) : next.add(rawName);
      return next;
    });
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', height: '100vh' }}>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x} y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onDelete={() => onDeleteSession?.(contextMenu.rawName)}
          onRename={() => {/* future: inline rename */}}
        />
      )}
      <div style={{ maxWidth: '768px', margin: '0 auto', width: '100%', padding: '48px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontFamily: 'var(--f-serif)', fontSize: '28px', color: 'var(--t1)', fontWeight: 400, margin: 0 }}>Chats</h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => { setSelectMode(v => !v); setSelected(new Set()); }} style={{
              background: selectMode ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: 'var(--t1)', padding: '6px 14px', borderRadius: '8px',
              fontSize: '13px', fontWeight: 500, border: '1px solid var(--b1)', cursor: 'pointer',
            }}>
              {selectMode ? `${selected.size} selected` : 'Select chats'}
            </button>
            {selectMode && selected.size > 0 && (
              <button onClick={() => { selected.forEach(n => onDeleteSession?.(n)); setSelected(new Set()); setSelectMode(false); }} style={{
                background: 'rgba(248,113,113,0.15)', color: '#f87171',
                padding: '6px 14px', borderRadius: '8px', fontSize: '13px',
                fontWeight: 500, border: '1px solid rgba(248,113,113,0.3)', cursor: 'pointer',
              }}>Delete</button>
            )}
            <button onClick={onNewChat} style={{
              background: '#e5e1d8', color: '#161514', padding: '6px 14px',
              borderRadius: '8px', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer',
            }}>New chat</button>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '8px' }}>
          <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)' }} size={15} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--b1)',
              borderRadius: '10px', padding: '10px 14px 10px 40px', color: 'var(--t1)',
              fontSize: '14px', outline: 'none', transition: 'border-color 0.2s',
            }}
            placeholder="Search chats..."
            onFocus={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--b1)'}
          />
        </div>

        {/* Chats List */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {filtered.map((s, i) => {
            const rawName = typeof s === 'string' ? s : s.name;
            const sessionId = typeof s === 'string' ? s : s.id;
            const isCode = rawName.startsWith('Code_') || rawName.startsWith('Code ');
            let displayName = typeof s === 'string'
              ? s.replace(/_\d{8}_\d{6}$/, '').replace(/_/g, ' ')
              : (s.name || 'Untitled');
            if (isCode) {
              displayName = displayName.replace(/^Code /, '');
            }
            const timeAgo = getTimeAgo(s);
            const isHovered = hoveredIdx === i;
            const isSelected = selected.has(sessionId);

            return (
              <div
                key={i}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => {
                  if (selectMode) { toggleSelect(sessionId); }
                  else { onLoadSession(sessionId); }
                }}
                style={{
                  display: 'flex', alignItems: 'center', padding: '14px 12px',
                  borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer',
                  borderRadius: '8px', margin: '1px 0',
                  background: isSelected
                    ? 'rgba(59,130,246,0.08)'
                    : isHovered
                      ? 'rgba(255,255,255,0.04)'
                      : 'transparent',
                  transition: 'background 0.15s',
                  boxShadow: isHovered ? '0 0 0 1px rgba(255,255,255,0.06)' : 'none',
                }}
              >
                {/* Checkbox in select mode */}
                {selectMode && (
                  <div style={{
                    width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0, marginRight: '12px',
                    background: isSelected ? '#3b82f6' : 'transparent',
                    border: `1.5px solid ${isSelected ? '#3b82f6' : 'var(--b2)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isSelected && <svg fill="none" stroke="white" viewBox="0 0 24 24" width="10" height="10" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                  </div>
                )}

                {/* Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--t1)', flex: 1, fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {isCode && <svg fill="none" stroke="var(--t3)" viewBox="0 0 24 24" width="14" height="14" strokeWidth="2" style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg>}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>
                </div>

                {/* Time */}
                {timeAgo && !isHovered && (
                  <div style={{ fontSize: '12px', color: 'var(--t3)', flexShrink: 0, marginLeft: '12px' }}>{timeAgo}</div>
                )}

                {/* 3-dot menu on hover */}
                {isHovered && !selectMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setContextMenu({ x: e.clientX, y: e.clientY, rawName: sessionId });
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.08)', border: 'none',
                      borderRadius: '6px', padding: '4px 6px', cursor: 'pointer',
                      color: 'var(--t2)', display: 'flex', alignItems: 'center',
                      marginLeft: '8px', flexShrink: 0,
                    }}
                  >
                    <svg fill="currentColor" viewBox="0 0 24 24" width="16" height="16">
                      <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--t3)', fontSize: '14px' }}>
              No chats found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
