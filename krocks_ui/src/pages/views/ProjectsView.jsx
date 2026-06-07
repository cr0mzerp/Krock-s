import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import CreateProjectModal from './CreateProjectModal';
import ProjectDashboard from './ProjectDashboard';

export default function ProjectsView({ ws, projects, messages, isStreaming, onSend, onStop }) {
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    if (!ws || !ws.connected) return;
    ws.sendRaw({ type: 'list_projects' });
  }, [ws, ws?.connected]);

  const handleCreate = (name, desc) => {
    ws.sendRaw({ type: 'create_project', name, description: desc });
    setShowCreateModal(false);
  };

  const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  if (selectedProject) {
    return <ProjectDashboard 
      project={selectedProject} 
      onBack={() => setSelectedProject(null)}
      ws={ws}
      messages={messages}
      isStreaming={isStreaming}
      onSendMessage={(text, proj, instructions) => {
        const ctx = `Adı: ${proj.name}\nAçıklama: ${proj.description || '—'}\nTalimatlar: ${instructions || '—'}\nDosyalar: ${(proj.files && proj.files.length > 0) ? proj.files.map(f => typeof f === 'string' ? f : f.name || f.path).join(', ') : 'Henüz yok'}`;
        onSend?.(text, false, [], { projectContext: ctx });
      }}
      onStop={onStop}
      onUpdateProject={(projId, updates) => {
        ws.sendRaw({ type: 'update_project', project_id: projId, ...updates });
        setTimeout(() => ws.sendRaw({ type: 'list_projects' }), 500);
      }}
    />;
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: '768px', margin: '0 auto', width: '100%', padding: '48px 24px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontFamily: '"Copernicus", "STIX Two Text", "Georgia", serif', fontSize: '28px', color: 'var(--t1)', fontWeight: 500, margin: 0 }}>Projects</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '13px', color: 'var(--t2)' }}>Sort by <span style={{ color: 'var(--t1)', cursor: 'pointer', fontWeight: 500 }}>Activity <svg style={{ display:'inline', verticalAlign:'middle' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg></span></span>
            <button 
              onClick={() => setShowCreateModal(true)}
              style={{ background: '#e5e1d8', color: '#161514', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer' }}
            >
              New project
            </button>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '40px' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)' }} size={16} />
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', background: 'transparent', border: '1px solid var(--b1)', borderRadius: '8px', padding: '10px 12px 10px 36px', color: 'var(--t1)', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s' }} 
            placeholder="Search projects..." 
            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.target.style.borderColor = 'var(--b1)'}
          />
        </div>

        {projects.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginTop: '80px' }}>
            <div style={{ color: 'var(--t1)', marginBottom: '16px' }}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="14" y="10" width="10" height="10" rx="1" />
                <rect x="26" y="10" width="10" height="10" rx="1" />
                <rect x="14" y="22" width="10" height="10" rx="1" />
                <path d="M28 26v4h4" />
                <path d="M30 30h4v6a2 2 0 01-2 2h-6v-4" />
              </svg>
            </div>
            <h2 style={{ fontSize: '15px', color: 'var(--t1)', fontWeight: 500, marginBottom: '8px', margin: 0 }}>Looking to start a project?</h2>
            <p style={{ fontSize: '13px', color: 'var(--t2)', maxWidth: '340px', lineHeight: '1.5', margin: '0 0 24px' }}>Upload materials, set custom instructions, and organize conversations into projects.</p>
            <button 
              onClick={() => setShowCreateModal(true)}
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--b1)', color: 'var(--t1)', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
            >
              New project
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {filteredProjects.map(proj => (
              <div 
                key={proj.id}
                onClick={() => setSelectedProject(proj)}
                style={{
                  background: '#1C1B19',
                  border: '1px solid #3E3C3A',
                  borderRadius: '12px',
                  padding: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '120px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#525252'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#3E3C3A'}
              >
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 500, color: '#E5E1D8' }}>{proj.name}</h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#A09D98', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {proj.description || "No description"}
                </p>
                <span style={{ fontSize: '12px', color: '#737373', marginTop: '16px' }}>Updated {new Date(proj.updated_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}

      </div>

      {showCreateModal && (
        <CreateProjectModal 
          onClose={() => setShowCreateModal(false)} 
          onCreate={handleCreate} 
        />
      )}
    </div>
  );
}
