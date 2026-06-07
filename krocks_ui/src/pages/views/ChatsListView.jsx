import React, { useState, useEffect } from 'react';

export default function ChatsListView({ ws }) {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    ws?.listSessions?.();
    const handler = (e) => {
      if (e.detail?.type === 'sessions') setSessions(e.detail.sessions ?? []);
    };
    window.addEventListener('krocks_ws', handler);
    return () => window.removeEventListener('krocks_ws', handler);
  }, [ws]);

  return (
    <div className="page-view">
      <div className="page-header">
        <h1 className="page-title">Chats</h1>
        <div className="page-actions">
          <button className="btn-secondary" onClick={() => ws?.listSessions?.()}>⟳ Refresh</button>
        </div>
      </div>
      {sessions.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize:'32px', marginBottom:'12px' }}>💬</div>
          <div className="empty-title">No saved chats yet</div>
          <div className="empty-subtitle">You can save during a chat via Settings → Save Session.</div>
        </div>
      ) : (
        <div className="list-container">
          {sessions.map((s, i) => (
            <button
              key={i}
              className="list-item"
              style={{ background:'none', border:'none', width:'100%', textAlign:'left', cursor:'pointer' }}
              onClick={() => ws?.loadSession?.(s)}
            >
              <div>
                <div className="item-title">{s}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
