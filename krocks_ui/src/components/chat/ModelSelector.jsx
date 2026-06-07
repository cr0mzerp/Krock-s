import React, { useState, useRef, useEffect } from 'react';

export default function ModelSelector({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState(null); // 'effort' or 'more'
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setActiveSubmenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const mainModels = [
    { normalId: '@preset/mimos', name: 'MiMo v2-5 Pro', desc: 'Most capable for ambitious tasks' },
    { normalId: '@preset/sonnet-4-6', name: 'Sonnet 4.6', desc: 'Excellent balance of speed and intelligence' },
    { normalId: '@preset/deepseek', thinkingId: '@preset/deepseek-thinking', name: 'DeepSeek v4 Pro', desc: 'Most efficient for everyday tasks' },
  ];

  const moreModels = [
    { normalId: '@preset/minimax-m3', thinkingId: '@preset/minimax-thinking', name: 'MiniMax m3' },
    { normalId: '@preset/tencent', name: 'Tencent' },
    { normalId: '@preset/mimosvision', name: 'MiMo v2.5' },
    { normalId: '@preset/deepseekv4-flash', name: 'DeepSeek v4 Flash' },
    { normalId: 'nvidia/nemotron-3-ultra-550b-a55b:free', name: 'Nemotron 3 ultra' },
  ];

  const allModels = [...mainModels, ...moreModels];
  const activeModelObj = allModels.find(m => m.normalId === value || m.thinkingId === value);
  const currentModelName = activeModelObj?.name || 'Model';
  
  const isThinkingActive = activeModelObj && activeModelObj.thinkingId === value;
  const supportsThinking = activeModelObj && !!activeModelObj.thinkingId;

  const handleSelect = (modelObj) => {
    // Switch to the selected model. If the newly selected model supports thinking
    // and thinking was active previously, we could optionally map it to its thinking ID.
    // For now, selecting a new model reverts to its normal state.
    onChange(modelObj.normalId);
    setIsOpen(false);
    setActiveSubmenu(null);
  };

  const handleToggleThinking = () => {
    if (!supportsThinking) return;
    if (isThinkingActive) {
      onChange(activeModelObj.normalId);
    } else {
      onChange(activeModelObj.thinkingId);
    }
  };

  const menuStyle = {
    position: 'absolute', bottom: 'calc(100% + 8px)', right: 0,
    background: 'rgb(56, 56, 53)', border: '1px solid rgb(76, 76, 73)',
    borderRadius: '12px', width: '320px',
    padding: '4px 0', zIndex: 100,
    boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 2px 10px rgba(0,0,0,0.2)',
    color: 'rgb(255, 255, 255)'
  };

  const submenuStyle = {
    position: 'absolute', bottom: 0, left: 'calc(100% + 4px)',
    background: 'rgb(56, 56, 53)', border: '1px solid rgb(76, 76, 73)',
    borderRadius: '12px', width: '280px',
    padding: '4px 0', zIndex: 101,
    boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 2px 10px rgba(0,0,0,0.2)',
    color: 'rgb(255, 255, 255)'
  };

  const itemStyle = {
    padding: '6px 16px', cursor: 'pointer',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  };

  const dividerStyle = { height: '1px', background: 'rgb(76, 76, 73)', margin: '4px 16px' };

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: isOpen ? 'rgb(18, 18, 18)' : 'transparent', 
          border: isOpen ? '1px solid rgb(25, 25, 24)' : '1px solid transparent',
          color: 'var(--t1)', fontSize: '14px', cursor: 'pointer',
          padding: '8px 12px', borderRadius: '6px'
        }}
      >
        <span style={{ fontWeight: 500 }}>{currentModelName}</span>
        <span style={{ color: isThinkingActive ? '#60a5fa' : 'var(--t3)', fontSize: '13px' }}>
          {isThinkingActive ? 'Thinking' : 'Low'}
        </span>
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14" style={{ color: 'var(--t3)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {isOpen && (
        <div style={menuStyle}>
          {/* Main Models */}
          {mainModels.map(m => (
            <div 
              key={m.normalId} 
              onClick={() => handleSelect(m)}
              className="ms-item"
              style={itemStyle}
            >
              <div>
                <div style={{ fontSize: '15px', fontWeight: 500, color: 'rgb(255, 255, 255)' }}>{m.name}</div>
                <div style={{ fontSize: '13px', color: 'var(--t3)', marginTop: '2px' }}>{m.desc}</div>
              </div>
              {activeModelObj?.normalId === m.normalId && (
                <svg fill="none" stroke="#60a5fa" viewBox="0 0 24 24" width="18" height="18" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </div>
          ))}

          <div style={dividerStyle} />

          {/* Effort Item */}
          <div 
            className="ms-item"
            onMouseEnter={() => setActiveSubmenu('effort')}
            style={itemStyle}
          >
            <span style={{ fontSize: '15px', color: 'rgb(255, 255, 255)' }}>Effort</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--t3)' }}>
              <span style={{ fontSize: '13px' }}>Low</span>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </div>

          <div style={dividerStyle} />

          {/* More Models Item */}
          <div 
            className="ms-item"
            onMouseEnter={() => setActiveSubmenu('more')}
            style={itemStyle}
          >
            <span style={{ fontSize: '15px', color: 'rgb(255, 255, 255)' }}>More models</span>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14" strokeWidth="2" style={{ color: 'var(--t3)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </div>

          {/* Effort Submenu */}
          {activeSubmenu === 'effort' && (
            <div 
              style={submenuStyle}
              onMouseLeave={() => setActiveSubmenu(null)}
            >
              <div style={{ padding: '4px 16px 10px', fontSize: '13px', color: 'var(--t3)', lineHeight: '1.4' }}>
                Higher effort means more thorough responses, but takes longer and uses your limits faster.
              </div>
              <div className="ms-item" style={itemStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '15px', color: 'rgb(255, 255, 255)' }}>Low</span>
                  <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', color: 'var(--t2)' }}>Default</span>
                </div>
                <svg fill="none" stroke="#60a5fa" viewBox="0 0 24 24" width="18" height="18" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <div className="ms-item" style={{ ...itemStyle, fontSize: '15px', color: 'rgb(255, 255, 255)' }}>Medium</div>
              <div className="ms-item" style={{ ...itemStyle, fontSize: '15px', color: 'rgb(255, 255, 255)' }}>High</div>
              <div className="ms-item" style={{ ...itemStyle, cursor: 'not-allowed', color: 'var(--t3)' }}>
                <span style={{ fontSize: '15px' }}>Max</span>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="12" height="12"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
              </div>
              <div style={dividerStyle} />
              <div style={{ ...itemStyle, opacity: supportsThinking ? 1 : 0.4, cursor: supportsThinking ? 'default' : 'not-allowed' }}>
                <div>
                  <div style={{ fontSize: '15px', color: 'rgb(255, 255, 255)' }}>Thinking</div>
                  <div style={{ fontSize: '13px', color: 'var(--t3)' }}>Can think for more complex tasks</div>
                  <div style={{ fontSize: '11px', color: '#60a5fa', marginTop: '4px' }}>Only for DeepSeek v4 Pro and MiniMax m3</div>
                </div>
                <div 
                  onClick={supportsThinking ? handleToggleThinking : undefined}
                  style={{ 
                    width: '36px', height: '20px', 
                    background: isThinkingActive ? '#60a5fa' : 'rgba(255,255,255,0.2)', 
                    borderRadius: '10px', position: 'relative', 
                    cursor: supportsThinking ? 'pointer' : 'not-allowed',
                    transition: 'background 0.2s'
                  }}
                >
                  <div style={{ 
                    width: '16px', height: '16px', background: '#fff', 
                    borderRadius: '50%', position: 'absolute', top: '2px', 
                    left: isThinkingActive ? '18px' : '2px',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                  }} />
                </div>
              </div>
            </div>
          )}

          {/* More Models Submenu */}
          {activeSubmenu === 'more' && (
            <div 
              style={{ ...submenuStyle, width: '240px' }}
              onMouseLeave={() => setActiveSubmenu(null)}
            >
              {moreModels.map(m => (
                <div 
                  key={m.normalId}
                  onClick={() => handleSelect(m)}
                  className="ms-item"
                  style={itemStyle}
                >
                  <span style={{ fontSize: '15px', color: 'rgb(255, 255, 255)' }}>{m.name}</span>
                  {activeModelObj?.normalId === m.normalId && (
                    <svg fill="none" stroke="#60a5fa" viewBox="0 0 24 24" width="16" height="16" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
