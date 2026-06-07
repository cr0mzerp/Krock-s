import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

const AttachmentMenu = ({ onAddFiles, onTakeScreenshot, onToggleWebSearch, webSearchEnabled, onSelectStyle, selectedStyle, projects = [], skills = [], connectors = [], plugins = [], onOpenCustomize, onAddInstruction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSubMenu, setActiveSubMenu] = useState(null); // 'projects', 'skills', 'styles'
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
        setActiveSubMenu(null);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
    setActiveSubMenu(null);
  };

  const menuStyle = {
    position: 'absolute',
    top: '100%',
    left: '0',
    marginTop: '8px',
    background: '#2d2d2d',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '6px',
    width: '240px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    zIndex: 100
  };

  const subMenuStyle = {
    ...menuStyle,
    left: '100%',
    top: '0',
    marginTop: '0',
    marginLeft: '4px'
  };

  const itemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 10px',
    background: 'transparent',
    border: 'none',
    color: '#e5e5e5',
    fontSize: '14px',
    cursor: 'pointer',
    borderRadius: '8px',
    textAlign: 'left',
    width: '100%'
  };

  const activeItemStyle = {
    ...itemStyle,
    background: 'rgba(255,255,255,0.08)'
  };

  const divider = <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 8px' }} />;

  const handleAction = (action) => {
    action();
    setIsOpen(false);
    setActiveSubMenu(null);
  };

  return (
    <div style={{ position: 'relative' }} ref={menuRef}>
      <button
        className="inp-ic"
        style={{ padding: '6px', color: isOpen ? '#fff' : 'rgb(219, 219, 217)', background: isOpen ? 'rgba(255,255,255,0.1)' : 'transparent', borderRadius: '8px' }}
        onClick={toggleMenu}
        title="Add attachments"
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" style={{width: 20, height: 20}}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

      {isOpen && (
        <div style={menuStyle}>
          <button 
            style={itemStyle} 
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'} 
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            onClick={() => handleAction(onAddFiles)}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"/></svg>
            <span style={{ flex: 1 }}>Add files or photos</span>
            <span style={{ fontSize: '11px', color: '#888' }}>⌘U</span>
          </button>

          <button 
            style={itemStyle} 
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'} 
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            onClick={() => handleAction(onTakeScreenshot)}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"/><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"/></svg>
            <span>Take a screenshot</span>
          </button>

          {divider}

          <div style={{ position: 'relative' }}>
            <button 
              style={activeSubMenu === 'projects' ? activeItemStyle : itemStyle} 
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; setActiveSubMenu('projects'); }} 
              onMouseLeave={(e) => { if(activeSubMenu !== 'projects') e.currentTarget.style.background = 'transparent'; }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>
              <span style={{ flex: 1 }}>Add to project</span>
              <svg width="12" height="12" fill="none" stroke="#888" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
            
            {activeSubMenu === 'projects' && (
              <div style={subMenuStyle}>
                 {projects.length > 0 ? projects.map(proj => (
                   <button key={proj.id} style={itemStyle} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'} onClick={() => handleAction(() => {
                      toast.success(`Connected: ${proj.name}`);
                   })}>
                     <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"/></svg>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
                       <span>{proj.name}</span>
                       <span style={{ fontSize: '11px', color: '#888' }}>Project</span>
                     </div>
                   </button>
                 )) : (
                   <div style={{ padding: '8px 12px', fontSize: '12px', color: '#a1a1aa' }}>No projects found.</div>
                 )}
                 {divider}
                 <button style={itemStyle} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}                     onClick={() => handleAction(() => { toast("Create a new project from the Projects tab."); })}>
                   <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                   <span>Start a new project</span>
                 </button>
              </div>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <button 
              style={activeSubMenu === 'skills' ? activeItemStyle : itemStyle} 
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; setActiveSubMenu('skills'); }} 
              onMouseLeave={(e) => { if(activeSubMenu !== 'skills') e.currentTarget.style.background = 'transparent'; }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>
              <span style={{ flex: 1 }}>Skills</span>
              <svg width="12" height="12" fill="none" stroke="#888" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
            {activeSubMenu === 'skills' && (
              <div style={subMenuStyle}>
                 {skills.length > 0 ? skills.map(skill => (
                   <button key={skill.name} style={itemStyle} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'} onClick={() => handleAction(() => {
                     onAddInstruction(`[SKILL: ${skill.name}]\n${skill.content}\n[/SKILL]`);
                      toast.success(`${skill.name} added`);
                   })}>
                     <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>
                     <span>{skill.name}</span>
                   </button>
                 )) : (
                   <div style={{ padding: '8px 12px', fontSize: '12px', color: '#a1a1aa' }}>No skills found.</div>
                 )}
                 {divider}
                 <button style={itemStyle} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'} onClick={() => handleAction(() => { onOpenCustomize(); })}>
                   <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" /></svg>
                   <span>Manage skills</span>
                 </button>
                 <button style={itemStyle} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'} onClick={() => handleAction(() => { onOpenCustomize(); })}>
                   <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                   <span>Add skill</span>
                 </button>
              </div>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <button 
              style={activeSubMenu === 'connectors' ? activeItemStyle : itemStyle} 
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; setActiveSubMenu('connectors'); }} 
              onMouseLeave={(e) => { if(activeSubMenu !== 'connectors') e.currentTarget.style.background = 'transparent'; }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v2.25A2.25 2.25 0 006 10.5zm0 9.75h2.25A2.25 2.25 0 0010.5 18v-2.25a2.25 2.25 0 00-2.25-2.25H6a2.25 2.25 0 00-2.25 2.25V18A2.25 2.25 0 006 20.25zm9.75-9.75H18a2.25 2.25 0 002.25-2.25V6A2.25 2.25 0 0018 3.75h-2.25A2.25 2.25 0 0013.5 6v2.25a2.25 2.25 0 002.25 2.25z" /></svg>
              <span style={{ flex: 1 }}>Add connectors</span>
              <svg width="12" height="12" fill="none" stroke="#888" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
            {activeSubMenu === 'connectors' && (
              <div style={subMenuStyle}>
                 {connectors.length > 0 ? connectors.map(conn => (
                   <button key={conn.name} style={itemStyle} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'} onClick={() => handleAction(() => {
                     onAddInstruction(`[CONNECTOR: ${conn.name}]\n${conn.content}\n[/CONNECTOR]`);
                     toast.success(`${conn.name} connector attached`);
                   })}>
                     <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>
                     <span>{conn.name}</span>
                   </button>
                 )) : (
                   <div style={{ padding: '8px 12px', fontSize: '12px', color: '#a1a1aa' }}>No connectors found.</div>
                 )}
              </div>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <button 
              style={activeSubMenu === 'plugins' ? activeItemStyle : itemStyle} 
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; setActiveSubMenu('plugins'); }} 
              onMouseLeave={(e) => { if(activeSubMenu !== 'plugins') e.currentTarget.style.background = 'transparent'; }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
              <span style={{ flex: 1 }}>Add plugins...</span>
              <svg width="12" height="12" fill="none" stroke="#888" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
            {activeSubMenu === 'plugins' && (
              <div style={subMenuStyle}>
                 {plugins.length > 0 ? plugins.map(plug => (
                   <button key={plug.name} style={itemStyle} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'} onClick={() => handleAction(() => {
                     onAddInstruction(`[PLUGIN: ${plug.name}]\n${plug.content}\n[/PLUGIN]`);
                     toast.success(`${plug.name} plugin attached`);
                   })}>
                     <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
                     <span>{plug.name}</span>
                   </button>
                 )) : (
                   <div style={{ padding: '8px 12px', fontSize: '12px', color: '#a1a1aa' }}>No plugins found.</div>
                 )}
              </div>
            )}
          </div>

          {divider}

          <button 
            style={itemStyle} 
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'} 
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            onClick={() => {
              onToggleWebSearch(!webSearchEnabled);
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.974 0-5.699-1.082-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" /></svg>
            <span style={{ flex: 1 }}>Web search</span>
            {webSearchEnabled && <svg width="14" height="14" fill="none" stroke="#60a5fa" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
          </button>

          <div style={{ position: 'relative' }}>
            <button 
              style={activeSubMenu === 'styles' ? activeItemStyle : itemStyle} 
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; setActiveSubMenu('styles'); }} 
              onMouseLeave={(e) => { if(activeSubMenu !== 'styles') e.currentTarget.style.background = 'transparent'; }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.433 4.433 0 002.771 2.773 4.493 4.493 0 004.306-1.758" /></svg>
              <span style={{ flex: 1 }}>Use style</span>
              <svg width="12" height="12" fill="none" stroke="#888" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
            {activeSubMenu === 'styles' && (
              <div style={subMenuStyle}>
                 <div style={{ padding: '8px 12px', fontSize: '12px', color: '#a1a1aa', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '4px' }}>
                   Styles are migrating to Skills
                 </div>
                 {['Normal', 'Learning', 'Concise', 'Explanatory', 'Formal'].map(style => (
                   <button 
                     key={style}
                     style={itemStyle} 
                     onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'} 
                     onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'} 
                     onClick={() => { onSelectStyle(style); setIsOpen(false); setActiveSubMenu(null); }}
                   >
                     <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.433 4.433 0 002.771 2.773 4.493 4.493 0 004.306-1.758" /></svg>
                     <span style={{ flex: 1 }}>{style}</span>
                     {selectedStyle === style && <svg width="14" height="14" fill="none" stroke="#60a5fa" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                   </button>
                 ))}
                 {divider}
                 <button style={itemStyle} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'} onClick={() => handleAction(() => { onOpenCustomize(); })}>
                   <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                   <span>Create & edit styles</span>
                 </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttachmentMenu;
