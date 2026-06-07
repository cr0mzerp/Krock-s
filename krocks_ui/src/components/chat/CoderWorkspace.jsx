import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import MessageBubble, { KrocksIcon } from './MessageBubble';

// ── Helpers ──────────────────────────────────────────────────────────────
const RECENT_FOLDERS_KEY = 'krocks_recent_folders';
const getRecentFolders = () => {
  try { return JSON.parse(localStorage.getItem(RECENT_FOLDERS_KEY) || '[]'); }
  catch { return []; }
};
const saveRecentFolder = (path, name) => {
  const existing = getRecentFolders().filter(f => f.path !== path);
  const updated = [{ path, name }, ...existing].slice(0, 8);
  localStorage.setItem(RECENT_FOLDERS_KEY, JSON.stringify(updated));
};

// ── Sub-components ────────────────────────────────────────────────────────

function FolderDropdown({ currentFolder, onSelect, onClose, onOpenFolderNative }) {
  const recent = getRecentFolders();
  const dirInputRef = useRef(null);

  const handleOpenFolder = () => {
    if (onOpenFolderNative) {
      onOpenFolderNative();
      onClose();
    } else {
      dirInputRef.current?.click();
    }
  };

  const handleDirChange = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    // webkitRelativePath gives "folderName/file.ext" — extract folder name
    const firstPath = files[0].webkitRelativePath || files[0].name;
    const folderName = firstPath.split('/')[0];
    // We can't get the real absolute path from browser, store folder name
    saveRecentFolder(folderName, folderName);
    onSelect(folderName, folderName);
  };

  return (
    <div style={{
      position: 'absolute', bottom: 'calc(100% + 8px)', left: 0,
      background: 'rgb(30,30,30)', border: '1px solid var(--b2)',
      borderRadius: '10px', padding: '8px 0', minWidth: '200px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.5)', zIndex: 100,
    }}>
      {recent.length > 0 && (
        <>
          <div style={{ padding: '4px 14px 6px', fontSize: '11px', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recent</div>
          {recent.map((f, i) => (
            <button key={i} onClick={() => onSelect(f.path, f.name)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', padding: '7px 14px', background: 'transparent', border: 'none',
              color: 'var(--t1)', fontSize: '13px', cursor: 'pointer', textAlign: 'left',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span>{f.name}</span>
              {f.path === currentFolder && <span style={{ color: 'var(--t1)' }}>✓</span>}
            </button>
          ))}
          <div style={{ height: '1px', background: 'var(--b1)', margin: '4px 0' }} />
        </>
      )}
      <button onClick={handleOpenFolder} style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        width: '100%', padding: '7px 14px', background: 'transparent', border: 'none',
        color: 'var(--t2)', fontSize: '13px', cursor: 'pointer',
      }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--t1)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--t2)'}
      >
        Open folder...
      </button>
      <input ref={dirInputRef} type="file" webkitdirectory="" directory="" multiple style={{ display: 'none' }} onChange={handleDirChange} />
    </div>
  );
}

function BranchDropdown({ currentBranch, branches, onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const filtered = branches.filter(b => b.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{
      position: 'absolute', bottom: 'calc(100% + 8px)', left: 0,
      background: 'rgb(30,30,30)', border: '1px solid var(--b2)',
      borderRadius: '10px', padding: '8px', minWidth: '220px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.5)', zIndex: 100,
    }}>
      {/* Active branch */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: '6px', marginBottom: '4px', background: 'rgba(255,255,255,0.04)' }}>
        <span style={{ color: 'var(--t1)', fontSize: '13px' }}>{currentBranch}</span>
        <span style={{ color: 'var(--t1)' }}>✓</span>
      </div>
      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '5px 8px', marginBottom: '4px' }}>
        <svg fill="none" stroke="var(--t3)" viewBox="0 0 24 24" width="13" height="13"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
        <input
          autoFocus
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search branches..."
          style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--t1)', fontSize: '13px', width: '100%' }}
        />
      </div>
      {/* Branch list */}
      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
        {filtered.length === 0 && (
          <div style={{ padding: '8px', color: 'var(--t3)', fontSize: '12px', textAlign: 'center' }}>No branches found</div>
        )}
        {filtered.filter(b => b !== currentBranch).map((b, i) => (
          <button key={i} onClick={() => onSelect(b)} style={{
            display: 'block', width: '100%', padding: '6px 8px', background: 'transparent', border: 'none',
            color: 'var(--t2)', fontSize: '13px', cursor: 'pointer', textAlign: 'left', borderRadius: '4px',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--t1)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t2)'; }}
          >
            {b}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────
export default function CoderWorkspace({ ws, sessions = [], messages = [], currentModel = '', isStreaming = false, userName = 'Lord', activeWorkspace, gitBranches = [], currentGitBranch = 'main', onSend, onStop, onWorkspaceChange, onBranchChange }) {
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [timeFilter, setTimeFilter] = useState('all');
  const [showFolderMenu, setShowFolderMenu] = useState(false);
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [worktreeEnabled, setWorktreeEnabled] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const folderRef = useRef(null);
  const branchRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (folderRef.current && !folderRef.current.contains(e.target)) setShowFolderMenu(false);
      if (branchRef.current && !branchRef.current.contains(e.target)) setShowBranchMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Listen for branches from backend
  useEffect(() => {
    if (ws?.listBranches && activeWorkspace) {
      ws.sendRaw({ type: 'list_branches', workspace: activeWorkspace });
    }
  }, [activeWorkspace, ws]);

  // Model name map
  const modelNames = {
    '@preset/minimax-m3': 'MiniMax m3',
    '@preset/minimax-m1': 'MiniMax m1',
    'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
    '@preset/tencent': 'Tencent',
    '@preset/deepseek': 'DeepSeek v4 Pro',
    '@preset/mimos': 'MiMo v2-5 Pro',
    '@preset/mimosvision': 'MiMo v2.5',
    '@preset/deepseekv4-flash': 'DeepSeek v4 Flash',
  };
  const favoriteModelName = modelNames[currentModel] || currentModel.replace('@preset/', '').replace(/-/g, ' ') || 'Unknown';

  // ── Stats calculation ─────────────────────────────────────────────────
  const filterDate = useMemo(() => {
    if (timeFilter === '7d') { const d = new Date(); d.setDate(d.getDate() - 7); return d; }
    if (timeFilter === '30d') { const d = new Date(); d.setDate(d.getDate() - 30); return d; }
    return null;
  }, [timeFilter]);

  const filteredSessions = useMemo(() => {
    if (!filterDate) return sessions;
    return sessions.filter(s => {
      const rawName = typeof s === 'string' ? s : s.name;
      const match = rawName.match(/_(\d{8})_(\d{6})$/);
      if (!match) return true;
      const d = new Date(match[1].slice(0,4), match[1].slice(4,6)-1, match[1].slice(6,8));
      return d >= filterDate;
    });
  }, [sessions, filterDate]);

  const stats = useMemo(() => {
    let sessionCount = filteredSessions.length;
    let messageCount = messages.length;
    let tokens = Math.floor(messages.reduce((acc, m) => acc + (m.content.length / 4), 0));

    const dates = [];
    const hours = {};
    const modelUsage = {};

    filteredSessions.forEach(s => {
      const rawName = typeof s === 'string' ? s : s.name;
      const match = rawName.match(/_(\d{8})_(\d{2})\d{4}$/);
      if (match) {
        dates.push(match[1]);
        hours[match[2]] = (hours[match[2]] || 0) + 1;
      }
    });

    modelUsage[favoriteModelName] = sessionCount;

    const uniqueDates = [...new Set(dates)].sort();
    const activeDays = uniqueDates.length;

    let currentStreak = 0, longestStreak = 0;
    if (uniqueDates.length > 0) {
      let tempStreak = 1;
      longestStreak = 1;
      for (let i = 1; i < uniqueDates.length; i++) {
        const d1 = new Date(uniqueDates[i-1].slice(0,4), uniqueDates[i-1].slice(4,6)-1, uniqueDates[i-1].slice(6,8));
        const d2 = new Date(uniqueDates[i].slice(0,4), uniqueDates[i].slice(4,6)-1, uniqueDates[i].slice(6,8));
        const diffDays = Math.ceil(Math.abs(d2 - d1) / 86400000);
        if (diffDays === 1) { tempStreak++; longestStreak = Math.max(longestStreak, tempStreak); }
        else tempStreak = 1;
      }
      const lastDate = new Date(uniqueDates.at(-1).slice(0,4), uniqueDates.at(-1).slice(4,6)-1, uniqueDates.at(-1).slice(6,8));
      const today = new Date(); today.setHours(0,0,0,0);
      if (Math.ceil(Math.abs(today - lastDate) / 86400000) <= 1) currentStreak = tempStreak;
    }

    let peakHour = 'N/A';
    let maxHourCount = 0;
    for (const [h, count] of Object.entries(hours)) {
      if (count > maxHourCount) {
        maxHourCount = count;
        const hInt = parseInt(h, 10);
        peakHour = hInt >= 12 ? (hInt === 12 ? 12 : hInt - 12) + ' PM' : (hInt === 0 ? 12 : hInt) + ' AM';
      }
    }

    let tokenDisplay = tokens.toString();
    if (tokens > 1_000_000) tokenDisplay = (tokens / 1_000_000).toFixed(1) + 'M';
    else if (tokens > 1_000) tokenDisplay = (tokens / 1_000).toFixed(1) + 'k';

    return { sessionCount, messageCount, tokenDisplay, activeDays, currentStreak, longestStreak, peakHour, uniqueDates, modelUsage };
  }, [filteredSessions, messages.length, favoriteModelName]);

  const heatmap = useMemo(() => {
    const map = new Array(120).fill(false);
    const today = new Date(); today.setHours(0,0,0,0);
    stats.uniqueDates.forEach(dateStr => {
      const d = new Date(dateStr.slice(0,4), dateStr.slice(4,6)-1, dateStr.slice(6,8));
      const diffDays = Math.ceil((today - d) / 86400000);
      if (diffDays >= 0 && diffDays < 120) map[119 - diffDays] = true;
    });
    return map;
  }, [stats.uniqueDates]);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendClick();
    }
  };

  const handleSendClick = () => {
    if (!inputText.trim() && attachedFiles.length === 0) return;
    if (!onSend) return;
    let text = inputText.trim();
    if (attachedFiles.length > 0) {
      const fileRefs = attachedFiles.map(f => `@${f.name}`).join(' ');
      text = text ? `${text} ${fileRefs}` : fileRefs;
    }
    onSend(text);
    setInputText('');
    setAttachedFiles([]);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setAttachedFiles(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const handleFolderSelect = (path, name) => {
    saveRecentFolder(path, name);
    ws?.sendRaw({ type: 'set_cwd', path: path });
    onWorkspaceChange?.(path);
    setShowFolderMenu(false);
  };

  const handleBranchSelect = (branch) => {
    ws?.sendRaw({ type: 'checkout_branch', workspace: activeWorkspace, branch: branch });
    onBranchChange?.(branch);
    setShowBranchMenu(false);
  };

  const handleWorktreeToggle = () => {
    const next = !worktreeEnabled;
    setWorktreeEnabled(next);
    ws?.sendRaw({ type: 'worktree', enabled: next, path: activeWorkspace });
  };

  // ── StatBox ───────────────────────────────────────────────────────────
  const statBox = (label, value) => (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
      <div style={{ fontSize: '12px', color: 'var(--t3)' }}>{label}</div>
      <div style={{ fontSize: '15px', color: 'var(--t1)', fontWeight: 600 }}>{value}</div>
    </div>
  );

  // ── Tab buttons style ─────────────────────────────────────────────────
  const tabBtn = (id, label) => (
    <button onClick={() => setActiveTab(id)} style={{
      background: activeTab === id ? 'var(--b2)' : 'transparent',
      border: 'none', padding: '6px 12px', borderRadius: '6px',
      color: activeTab === id ? 'var(--t1)' : 'var(--t3)',
      fontSize: '13px', cursor: 'pointer', fontWeight: activeTab === id ? 500 : 400,
      transition: 'all 0.15s',
    }}>
      {label}
    </button>
  );

  const filterBtn = (id, label) => (
    <button onClick={() => setTimeFilter(id)} style={{
      background: timeFilter === id ? 'var(--b2)' : 'transparent',
      border: 'none', padding: '4px 8px', borderRadius: '4px',
      color: timeFilter === id ? 'var(--t1)' : 'var(--t3)',
      fontSize: '12px', cursor: 'pointer',
      transition: 'all 0.15s',
    }}>
      {label}
    </button>
  );

  // ── Tag chip style ────────────────────────────────────────────────────
  const tagChip = (icon, label, onClick, isActive = false) => (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '5px',
      background: isActive ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)',
      padding: '4px 9px', borderRadius: '6px',
      border: `1px solid ${isActive ? 'rgba(59,130,246,0.4)' : 'var(--b1)'}`,
      cursor: 'pointer', fontSize: '12px',
      color: isActive ? '#60a5fa' : 'var(--t2)',
      transition: 'all 0.15s', userSelect: 'none', position: 'relative',
    }}>
      {icon}{label}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', background: 'var(--bg)', color: 'var(--t1)', padding: '48px', overflowY: 'auto' }}>

      {messages.length === 0 ? (
        <>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
            <div style={{ width: 28, height: 28, color: '#da7756' }}>
              <KrocksIcon />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 500 }}>What's up next?</h1>
          </div>

          {/* Dashboard Card */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--b1)', borderRadius: '12px', padding: '24px', maxWidth: '700px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Tabs + Filters */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                {tabBtn('overview', 'Overview')}
                {tabBtn('models', 'Models')}
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {filterBtn('all', 'All')}
                {filterBtn('30d', '30d')}
                {filterBtn('7d', '7d')}
              </div>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {statBox('Sessions', stats.sessionCount)}
                    {statBox('Messages', stats.messageCount)}
                    {statBox('Total tokens', stats.tokenDisplay)}
                    {statBox('Active days', stats.activeDays)}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {statBox('Current streak', `${stats.currentStreak}d`)}
                    {statBox('Longest streak', `${stats.longestStreak}d`)}
                    {statBox('Peak hour', stats.peakHour)}
                    {statBox('Favorite model', favoriteModelName)}
                  </div>
                </div>

                {/* Heatmap */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(30, 1fr)', gap: '4px', marginTop: '8px' }}>
                  {heatmap.map((isActive, i) => (
                    <div key={i} style={{ aspectRatio: '1', background: isActive ? '#3b82f6' : 'rgba(255,255,255,0.06)', borderRadius: '2px' }} />
                  ))}
                </div>

                <div style={{ fontSize: '12px', color: 'var(--t3)', marginTop: '4px' }}>
                  {stats.sessionCount > 0
                    ? `${stats.sessionCount} session${stats.sessionCount > 1 ? 's' : ''} in the selected period.`
                    : "No sessions yet. Start coding!"}
                </div>
              </>
            )}

            {/* Models Tab */}
            {activeTab === 'models' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                {Object.entries(stats.modelUsage).map(([name, count]) => (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 14px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', color: 'var(--t1)', fontWeight: 500 }}>{name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--t3)', marginTop: '2px' }}>{count} session{count !== 1 ? 's' : ''}</div>
                    </div>
                    <div style={{ fontSize: '12px', background: 'rgba(218,119,86,0.12)', color: '#da7756', padding: '3px 8px', borderRadius: '4px' }}>
                      Active
                    </div>
                  </div>
                ))}
                {Object.keys(stats.modelUsage).length === 0 && (
                  <div style={{ color: 'var(--t3)', fontSize: '13px', padding: '16px 0' }}>No model data available yet.</div>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
          {messages.map((m, i) => (
            <MessageBubble 
              key={i} 
              message={m} 
              isStreaming={isStreaming && i === messages.length - 1} 
              userName={userName}
              showAvatar={i === 0 || messages[i-1].role !== m.role}
              onRetry={m.role === 'assistant' ? (() => {
                const prev = messages[i - 1];
                if (prev && prev.role === 'user') onSend(prev.content);
              }) : undefined}
            />
          ))}
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* Input Area */}
      <div style={{ maxWidth: '900px', width: '100%', margin: '0 auto', position: 'relative', display: 'flex', flexDirection: 'column', gap: '8px' }}>

        {/* Attached Files Chips */}
        {attachedFiles.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {attachedFiles.map((f, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'rgba(255,255,255,0.07)', border: '1px solid var(--b2)',
                borderRadius: '6px', padding: '3px 8px', fontSize: '12px', color: 'var(--t1)',
              }}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="12" height="12">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                {f.name}
                <button onClick={() => setAttachedFiles(prev => prev.filter((_, j) => j !== i))}
                  style={{ background: 'transparent', border: 'none', color: 'var(--t3)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="11" height="11"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Context Tags Row */}
        <div style={{ display: 'flex', gap: '6px', fontSize: '12px', color: 'var(--t2)', alignItems: 'center' }}>

          {/* Local */}
          {tagChip(
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="12" height="12"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
            'Local',
            () => setInputText(prev => prev + (prev ? ' ' : '') + '@Local')
          )}

          {/* Folder (was Krock's) */}
          <div ref={folderRef} style={{ position: 'relative' }}>
            {tagChip(
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="12" height="12"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>,
              activeWorkspace ? activeWorkspace.split('/').pop() : 'Select Workspace',
              () => { setShowBranchMenu(false); setShowFolderMenu(v => !v); }
            )}
            {showFolderMenu && (
              <FolderDropdown
                currentFolder={activeWorkspace}
                onSelect={handleFolderSelect}
                onOpenFolderNative={() => ws?.sendRaw({ type: 'choose_folder' })}
                onClose={() => setShowFolderMenu(false)}
              />
            )}
          </div>

          {/* Branch (was main) */}
          <div ref={branchRef} style={{ position: 'relative' }}>
            {tagChip(
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="12" height="12"><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>,
              currentGitBranch || 'main',
              () => { setShowFolderMenu(false); setShowBranchMenu(v => !v); }
            )}
            {showBranchMenu && (
              <BranchDropdown
                currentBranch={currentGitBranch}
                branches={gitBranches}
                onSelect={handleBranchSelect}
                onClose={() => setShowBranchMenu(false)}
              />
            )}
          </div>

          {/* Worktree toggle */}
          <div onClick={handleWorktreeToggle} style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            background: worktreeEnabled ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)',
            padding: '4px 9px', borderRadius: '6px',
            border: `1px solid ${worktreeEnabled ? 'rgba(59,130,246,0.4)' : 'var(--b1)'}`,
            cursor: 'pointer', fontSize: '12px',
            color: worktreeEnabled ? '#60a5fa' : 'var(--t2)',
            transition: 'all 0.15s', userSelect: 'none',
          }}>
            <div style={{
              width: '12px', height: '12px', borderRadius: '3px',
              background: worktreeEnabled ? '#3b82f6' : 'rgba(255,255,255,0.12)',
              border: `1.5px solid ${worktreeEnabled ? '#3b82f6' : 'var(--b2)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s', flexShrink: 0,
            }}>
              {worktreeEnabled && (
                <svg fill="none" stroke="white" viewBox="0 0 24 24" width="8" height="8" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </div>
            worktree
          </div>

          {/* File picker (folder+ icon) */}
          <div onClick={() => fileInputRef.current?.click()} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.05)', padding: '4px 6px', borderRadius: '6px',
            border: '1px solid var(--b1)', cursor: 'pointer', color: 'var(--t2)',
          }}>
            {/* folder+ svg */}
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="15" height="15">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
          </div>
          <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileSelect} />

          <div style={{ flex: 1 }} />

          {/* Robot mascot */}
          <div style={{ color: '#da7756', alignSelf: 'flex-end', marginBottom: '2px', marginRight: '8px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 8h12v8H6V8zm-2 2h2v4H4v-4zm14 0h2v4h-2v-4zM8 6h8v2H8V6zm2-4h4v2h-4V2zm-4 14h12v2H6v-2zm2 2h8v2H8v-2zm-4 2h16v2H4v-2zm4-8h2v2H8v-2zm6 0h2v2h-2v-2z" />
            </svg>
          </div>
        </div>

        {/* Input Box */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--b2)', borderRadius: '12px', padding: '12px 16px', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Describe a task or ask a question"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--t1)', fontSize: '15px', width: '100%', padding: '8px 0' }}
            />
            <svg fill="none" stroke="var(--t3)" viewBox="0 0 24 24" width="18" height="18"
              style={{ marginLeft: '8px', cursor: 'pointer' }}
              onClick={handleSendClick}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
          </div>

          <div style={{ height: '1px', background: 'var(--b1)', margin: '8px 0' }} />

          {/* Bottom Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: 'var(--t2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              Accept edits
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              High
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14"><circle cx="12" cy="12" r="9" /></svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
