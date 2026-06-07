import React, { useState, useRef, useEffect, useCallback } from 'react';
import MessageBubble, { KrocksIcon } from '../../components/chat/MessageBubble';

export default function ProjectDashboard({ project, onBack, ws, messages, isStreaming, onSendMessage, onStop, onUpdateProject }) {
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [instructions, setInstructions] = useState(project.instructions || '');
  const [inputText, setInputText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const instructionsTimer = useRef(null);
  const msgsEndRef = useRef(null);
  const msgContainerRef = useRef(null);

  const instructionsSavedRef = useRef(project.instructions || '');
  useEffect(() => {
    if (instructions !== instructionsSavedRef.current && ws?.connected) {
      if (instructionsTimer.current) clearTimeout(instructionsTimer.current);
      instructionsTimer.current = setTimeout(() => {
        onUpdateProject?.(project.id, { instructions });
        instructionsSavedRef.current = instructions;
      }, 800);
    }
    return () => { if (instructionsTimer.current) clearTimeout(instructionsTimer.current); };
  }, [instructions, project.id, ws?.connected, onUpdateProject]);

  const scrollToBottom = useCallback((force = false) => {
    setTimeout(() => msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages.length, scrollToBottom]);

  const handleSend = () => {
    if (!inputText.trim() && attachedFiles.length === 0) return;
    let text = inputText.trim();
    if (attachedFiles.length > 0) {
      const fileRefs = attachedFiles.map(f =>
        f.content ? `\n\n--- File: ${f.name} ---\n${f.content}` : `@${f.name}`
      ).join('');
      text = text ? `${text}${fileRefs}` : `Please review these file(s):${fileRefs}`;
    }
    onSendMessage?.(text, project, instructions);
    setInputText('');
    setAttachedFiles([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    Promise.all(files.map(f => {
      if (f.type && f.type.startsWith('text/') || f.name.match(/\.(js|jsx|ts|tsx|py|rb|go|rs|java|c|cpp|h|hpp|css|html|json|yaml|yml|md|txt|xml|svg|sh|bash|zsh|fish|sql|graphql|toml|ini|cfg|env|gitignore|dockerignore|editorconfig|eslintrc|prettierrc)$/i)) {
        return new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve({ name: f.name, content: ev.target.result, size: f.size });
          reader.readAsText(f);
        });
      }
      return Promise.resolve({ name: f.name, content: null, size: f.size });
    })).then(results => {
      setAttachedFiles(prev => [...prev, ...results]);
    });
    e.target.value = '';
  };

  const handleRemoveFile = (idx) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const chatStarted = messages.length > 0;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#161514', height: '100%' }}>
      
      {/* Header */}
      <div style={{ 
        padding: '16px 24px', 
        borderBottom: '1px solid #3E3C3A',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <button 
          onClick={onBack}
          style={{ background: 'transparent', border: 'none', color: '#A09D98', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '13px', fontWeight: 500 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          All projects
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* Chat area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', maxWidth: showRightPanel ? undefined : '900px', margin: showRightPanel ? undefined : '0 auto', width: showRightPanel ? undefined : '100%' }}>
          <div style={{ padding: `32px ${showRightPanel ? '48px' : '32px'} 0`, flexShrink: 0 }}>
            <h1 style={{ fontFamily: '"Copernicus", "STIX Two Text", "Georgia", serif', fontSize: '28px', color: '#E5E1D8', margin: '0 0 8px 0', fontWeight: 500 }}>
              {project.name}
            </h1>
            <p style={{ color: '#A09D98', fontSize: '14px', margin: '0 0 24px 0' }}>{project.description}</p>
          </div>

          {chatStarted ? (
            /* Chat Messages */
            <div ref={msgContainerRef} style={{ flex: 1, overflowY: 'auto', padding: `0 ${showRightPanel ? '48px' : '32px'} 16px` }}>
              {messages.map((msg, i) => (
                <MessageBubble 
                  key={i} 
                  message={msg} 
                  isStreaming={isStreaming && i === messages.length - 1 && msg.role === 'assistant'} 
                  userName="Lord"
                  showAvatar={i === 0 || messages[i-1]?.role !== msg.role}
                  onRetry={msg.role === 'assistant' ? (() => {
                    const prev = messages[i - 1];
                    if (prev && prev.role === 'user') onSendMessage?.(prev.content, project, instructions);
                  }) : undefined}
                />
              ))}
              <div ref={msgsEndRef} />
            </div>
          ) : (
            <div style={{ flex: 1, padding: `0 ${showRightPanel ? '48px' : '32px'}` }}>
              <p style={{ fontSize: '13px', color: '#737373', textAlign: 'center', marginTop: '40px' }}>
                Start a chat to keep conversations organized and re-use project knowledge.
              </p>
            </div>
          )}

          {/* Input Area */}
          <div style={{ padding: `8px ${showRightPanel ? '48px' : '32px'} 24px`, flexShrink: 0 }}>
            {attachedFiles.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {attachedFiles.map((f, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: 'rgba(255,255,255,0.07)', border: '1px solid #3E3C3A',
                    borderRadius: '6px', padding: '4px 10px', fontSize: '12px', color: '#E5E1D8',
                  }}>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="12" height="12">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    {f.name}
                    <button onClick={() => handleRemoveFile(i)}
                      style={{ background: 'transparent', border: 'none', color: '#A09D98', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="11" height="11"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ 
              background: '#1C1B19', 
              border: '1px solid #3E3C3A', 
              borderRadius: '12px', 
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <input 
                type="text"
                placeholder="How can I help you today?"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  color: '#E5E1D8',
                  fontSize: '15px',
                  outline: 'none'
                }}
              />
              {isStreaming ? (
                <button
                  onClick={onStop}
                  style={{
                    background: 'rgba(239,68,68,0.15)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    color: '#ef4444',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  ⏹ Stop
                </button>
              ) : (
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{ background: 'transparent', border: 'none', color: 'var(--t3)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                    title="Attach files"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.74l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                    </svg>
                  </button>
                  <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileSelect} />
                  <button
                    onClick={handleSend}
                    style={{
                      background: 'transparent', border: 'none', color: 'var(--t3)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', padding: '4px',
                      opacity: (!inputText.trim() && attachedFiles.length === 0) ? 0.4 : 1,
                    }}
                    disabled={!inputText.trim() && attachedFiles.length === 0}
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Toggle button */}
        <div style={{ display: 'flex', alignItems: 'flex-start', paddingTop: '24px', flexShrink: 0 }}>
          <button
            onClick={() => setShowRightPanel(v => !v)}
            style={{
              background: 'transparent', border: 'none', color: '#525252', cursor: 'pointer',
              padding: '4px', display: 'flex', alignItems: 'center',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#A09D98'}
            onMouseLeave={e => e.currentTarget.style.color = '#525252'}
            title={showRightPanel ? 'Hide panel' : 'Show panel'}
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14" strokeWidth="1.5">
              {showRightPanel
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
              }
            </svg>
          </button>
        </div>

        {/* Right Col - Settings / Files */}
        {showRightPanel && (
          <div style={{ width: '280px', borderLeft: '1px solid #3E3C3A', padding: '20px', overflowY: 'auto', background: '#1C1B19', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '14px', color: '#E5E1D8', fontWeight: 500, margin: 0 }}>Instructions</h3>
              <span style={{ fontSize: '11px', color: 'var(--t3)' }}>Auto-saved</span>
            </div>
            <textarea 
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Add instructions to tailor Krock's responses..."
              style={{
                width: '100%',
                background: '#2B2A28',
                border: '1px solid #3E3C3A',
                borderRadius: '8px',
                padding: '12px',
                color: '#E5E1D8',
                fontSize: '13px',
                minHeight: '120px',
                resize: 'vertical',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '14px', color: '#E5E1D8', fontWeight: 500, margin: 0 }}>Files</h3>
            </div>
            {project.files && project.files.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {project.files.map((f, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 10px', borderRadius: '6px',
                    background: 'rgba(255,255,255,0.04)', fontSize: '12px', color: 'var(--t2)',
                  }}>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="13" height="13">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    {typeof f === 'string' ? f : f.name || f.path || JSON.stringify(f)}
                  </div>
                ))}
              </div>
            ) : (
              <div onClick={() => fileInputRef.current?.click()} style={{
                background: '#2B2A28',
                border: '1px dashed #525252',
                borderRadius: '8px',
                padding: '24px',
                textAlign: 'center',
                cursor: 'pointer'
              }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#A09D98'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#525252'}
              >
                <p style={{ color: '#A09D98', fontSize: '13px', margin: 0 }}>
                  Add files to reference in this project.
                </p>
              </div>
            )}
            <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileSelect} />
          </div>
          </div>
        )}
      </div>
    </div>
  );
}
