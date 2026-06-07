import React from 'react';

export default function Sidebar({ isOpen, activeView, onViewChange, recentSessions, onLoadSession, onDeleteSession, onNewChat, onOpenSettings, userName, activeSessionName }) {
  const navItem = (id, label, svgPath, badge) => (
    <button className={`sb-item${(id === 'new' ? (activeView === 'chat' && !activeSessionName) : activeView === id) ? ' active' : ''}`} onClick={() => {
      if (id === 'new') onNewChat();
      else onViewChange(id);
    }}>
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d={svgPath} />
      </svg>
      <span>{label}</span>
      {badge && <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#60a5fa', fontWeight: 500 }}>{badge}</span>}
    </button>
  );

  return (
    <nav id="sidebar" className={isOpen ? '' : 'closed'}>
      {/* Brand */}
      <div className="sb-brand" style={{ justifyContent: 'space-between', padding: '12px 10px 10px', display: 'flex', alignItems: 'center' }}>
        <div className="sb-logo-text" style={{ fontFamily: 'var(--f-serif)', fontSize: '18px', fontWeight: 500, letterSpacing: '0.02em', paddingLeft: '2px', transform: 'translate(2px, -1px)' }}>Krock's</div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className="sb-btn" style={{ width: '32px', height: '32px' }}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Nav */}
      <div className="sb-nav" style={{ padding: '0 8px' }}>
        {navItem('new',       'New chat',   'M12 4.5v15m7.5-7.5h-15')}
        {navItem('chats',     'Chats',      'M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155')}
        {navItem('projects',  'Projects',   'M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z')}
        {navItem('artifacts', 'Artifacts',  'M14.25 9.75 16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z')}
        {navItem('code',      'Code',       'M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5')}
        <button className={`sb-item${activeView === 'customize' ? ' active' : ''}`} onClick={onOpenSettings}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>Customize</span>
        </button>
      </div>

      {/* Recents */}
      <div className="sb-sec-hd" style={{ marginTop: '16px', padding: '0 12px 8px', fontSize: '11px', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Recents</span>
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" style={{width: 12, height: 12}}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
      </div>
      <div className="sb-recents" style={{ padding: '0 8px' }}>
        {(recentSessions || []).map((s, i) => {
          const rawName = typeof s === 'string' ? s : s.name;
          const sessionId = typeof s === 'string' ? s : s.id;
          const isCode = rawName.startsWith('Code_') || rawName.startsWith('Code ');
          let displayName = typeof s === 'string' ? s.replace(/_\d{8}_\d{6}$/, '').replace(/_/g, ' ') : (s.name || 'Untitled');
          if (isCode) {
            displayName = displayName.replace(/^Code /, '');
          }
          const isActive = activeView === 'chat' && activeSessionName === rawName;
          return (
            <div key={i} className={`sb-rec-item-wrapper ${isActive ? 'active' : ''}`} style={{ position: 'relative', display: 'flex', alignItems: 'center', margin: '2px 0', borderRadius: '8px' }}>
              <button className="sb-rec-item" onClick={() => onLoadSession(sessionId)} style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, padding: '8px 10px', fontSize: '13px', background: 'transparent', border: 'none', textAlign: 'left', borderRadius: '8px', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {isCode && <svg fill="none" stroke="var(--t3)" viewBox="0 0 24 24" width="14" height="14" strokeWidth="2" style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg>}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>
              </button>
              <button 
                className="sb-rec-del" 
                onClick={(e) => { e.stopPropagation(); onDeleteSession(sessionId); }}
                style={{ padding: '4px', background: 'transparent', border: 'none', color: 'var(--t3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '4px', borderRadius: '4px' }}
                title="Delete chat"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
              </button>
            </div>
          );
        })}
      </div>

      {/* User */}
      <div className="sb-user" style={{ marginTop: 'auto', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderTop: '1px solid var(--b1)' }}>
        <div className="sb-avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#E5E1D8', color: '#1C1B19', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600 }}>
          {userName ? userName[0].toUpperCase() : 'U'}
        </div>
        <div style={{ flex: 1 }}>
          <div className="sb-uname" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--t1)' }}>{userName || 'User'}</div>
        </div>
        <div className="sb-user-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" style={{ width: 14, height: 14, color: 'var(--t3)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
          </svg>
        </div>
      </div>
    </nav>
  );
}
