import React, { useState } from 'react';
import SkillsTab   from './SkillsTab';
import ConnectorsTab from './ConnectorsTab';
import PluginsTab  from './PluginsTab';
import MemoryTab   from './MemoryTab';

const TABS = [
  { id: 'skills',     label: 'Skills',     icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg> },
  { id: 'connectors', label: 'Connectors', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg> },
  { id: 'plugins',    label: 'Plugins',    icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16"><path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a1.5 1.5 0 01-1.5 1.5H8.25m5.25 0h2.25m-2.25 0v3.75m0 0V15m0-3.75h3.75m-3.75 0h-3.75" /></svg> },
  { id: 'memory',     label: 'Memory',     icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /></svg> },
];

export default function CustomizeView({ ws, settings, onSettingsChange, model, onModelChange }) {
  const [tab, setTab] = useState('skills');

  const tabStyle = (id) => ({
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '8px 14px', width: '100%', textAlign: 'left',
    background: tab === id ? 'rgba(255,255,255,0.07)' : 'transparent',
    border: 'none', borderRadius: '8px',
    color: tab === id ? 'var(--t1)' : 'var(--t2)',
    fontSize: '13.5px', fontWeight: tab === id ? 500 : 400,
    cursor: 'pointer', transition: 'all 0.15s',
  });

  return (
    <div style={{
      flex: 1, background: 'rgb(31, 31, 30)',
      display: 'flex', flexDirection: 'row', overflow: 'hidden',
    }}>
      {/* Left sidebar nav */}
      <div style={{
        width: '240px', borderRight: '1px solid rgba(255,255,255,0.06)',
        padding: '20px 14px', flexShrink: 0, display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 8px 20px' }}>
          <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--t1)' }}>Customize</span>
        </div>
        {TABS.map(({ id, label, icon }) => (
          <button key={id} onClick={() => setTab(id)} style={tabStyle(id)}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 48px 64px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          {tab === 'skills'     && <SkillsTab     ws={ws} />}
          {tab === 'connectors' && <ConnectorsTab ws={ws} />}
          {tab === 'plugins'    && <PluginsTab    ws={ws} />}
          {tab === 'memory'     && <MemoryTab     ws={ws} />}
        </div>
      </div>
    </div>
  );
}
