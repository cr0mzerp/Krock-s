import React, { useState } from 'react';
import { Search, Code, FileText, Gamepad2, Wrench, Palette, HelpCircle, PenTool } from 'lucide-react';

const TEMPLATES = [
  { id: 'apps', icon: <Code size={24} color="#A78BFA" />, title: 'Apps and websites', prompt: 'I want to build a new App/Website. What should we start with? <!-- HIDDEN_INSTRUCTION: Lütfen [ASK] formatını kullanarak ne ile başlayacağımız konusunda çoktan seçmeli şıklar sun. -->' },
  { id: 'docs', icon: <FileText size={24} color="#60A5FA" />, title: 'Documents and templates', prompt: 'I need a professional document or template. Can you help me draft one? <!-- HIDDEN_INSTRUCTION: Lütfen [ASK] formatını kullanarak ne tür bir belge istediğimi sor. -->' },
  { id: 'games', icon: <Gamepad2 size={24} color="#34D399" />, title: 'Games', prompt: 'I want to create a Game. Can you help me design and code it? <!-- HIDDEN_INSTRUCTION: Lütfen [ASK] formatını kullanarak ne tür (genre) bir oyun yapmak istediğimi sor. -->' },
  { id: 'tools', icon: <Wrench size={24} color="#FBBF24" />, title: 'Productivity tools', prompt: 'I want to build a productivity tool. What are some good ideas? <!-- HIDDEN_INSTRUCTION: Lütfen [ASK] formatını kullanarak bu aracın hangi problemi çözeceğini sor. -->' },
  { id: 'creative', icon: <Palette size={24} color="#F472B6" />, title: 'Creative projects', prompt: 'I have a creative project in mind. Let\'s brainstorm together. <!-- HIDDEN_INSTRUCTION: Lütfen [ASK] formatını kullanarak bu yaratıcı projenin ne tür bir şey olduğunu sor. -->' },
  { id: 'quiz', icon: <HelpCircle size={24} color="#6EE7B7" />, title: 'Quiz or survey', prompt: 'I want to create an interactive quiz or survey. <!-- HIDDEN_INSTRUCTION: Lütfen [ASK] formatını kullanarak anketin/quizin konusunun ne olacağını sor. -->' },
  { id: 'scratch', icon: <PenTool size={24} color="#9CA3AF" />, title: 'Start from scratch', prompt: 'Let\'s start a new project from scratch. <!-- HIDDEN_INSTRUCTION: Lütfen [ASK] formatını kullanarak tamamen rastgele proje fikirleri sun ve hangisini seçmek istediğimi sor. -->' },
];

export default function ArtifactsView({ ws, onTemplateSelect }) {
  const [search, setSearch] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: '768px', margin: '0 auto', width: '100%', padding: '48px 24px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontFamily: '"Copernicus", "STIX Two Text", "Georgia", serif', fontSize: '28px', color: 'var(--t1)', fontWeight: 500, margin: 0 }}>Artifacts</h1>
          <button 
            onClick={() => setShowTemplates(true)}
            style={{ background: '#e5e1d8', color: '#161514', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer' }}
          >
            New artifact
          </button>
        </div>

        {showTemplates ? (
          <div style={{ marginTop: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 500, color: '#E5E1D8', textAlign: 'center', marginBottom: '8px', fontFamily: '"Copernicus", "STIX Two Text", "Georgia", serif' }}>Let's get cooking!</h2>
            <p style={{ fontSize: '14px', color: '#A09D98', textAlign: 'center', marginBottom: '32px' }}>Pick an artifact category or start building your idea from scratch.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
              {TEMPLATES.map((tmpl) => (
                <div 
                  key={tmpl.id}
                  onClick={() => onTemplateSelect && onTemplateSelect(tmpl.prompt)}
                  style={{
                    background: '#2B2A28',
                    border: '1px solid #3E3C3A',
                    borderRadius: '12px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#363431'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#2B2A28'}
                >
                  <div style={{ marginBottom: '16px', background: '#1C1B19', padding: '8px', borderRadius: '8px', border: '1px solid #3E3C3A' }}>
                    {tmpl.icon}
                  </div>
                  <span style={{ fontSize: '15px', color: '#E5E1D8', fontWeight: 500 }}>{tmpl.title}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '120px' }}>
              <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)' }} size={16} />
              <input 
                type="text" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', background: 'transparent', border: '1px solid var(--b1)', borderRadius: '8px', padding: '10px 12px 10px 36px', color: 'var(--t1)', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s' }} 
                placeholder="Search artifacts..." 
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = 'var(--b1)'}
              />
            </div>

            {/* Empty State */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ color: 'var(--t1)', marginBottom: '16px' }}>
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="14" y="10" width="12" height="16" rx="2" />
                  <path d="M26 14l6-4v14" />
                  <circle cx="32" cy="28" r="6" />
                  <path d="M12 24v8a4 4 0 004 4h12" />
                </svg>
              </div>
              <h2 style={{ fontSize: '15px', color: 'var(--t1)', fontWeight: 500, marginBottom: '8px', margin: 0 }}>What will you build with artifacts?</h2>
              <p style={{ fontSize: '13px', color: 'var(--t2)', maxWidth: '300px', lineHeight: '1.5', margin: '0 0 24px' }}>If you can dream it, you can build it. Like apps, games, templates, and mind from thought to reality.</p>
              <button 
                onClick={() => setShowTemplates(true)}
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--b1)', color: 'var(--t1)', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
              >
                New artifact
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
