import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function QuizModal({ askData, onAnswer, onSkip }) {
  const [customText, setCustomText] = useState('');
  
  if (!askData) return null;

  const question = askData.q || "What would you like to do?";
  const options = askData.options || [];

  return (
    <div style={{
      position: 'absolute',
      bottom: '160px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: '768px',
      zIndex: 50,
      padding: '0 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      {/* Main Quiz Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        style={{
          background: '#32312F', // Claude's distinct quiz card background
          borderRadius: '16px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
          overflow: 'hidden',
          border: '1px solid #484643',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 400, color: '#E5E1D8', fontFamily: '"Copernicus", "STIX Two Text", "Georgia", serif' }}>
            {question}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#A09D98', fontSize: '14px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button style={{ background: 'transparent', border: 'none', color: '#73706A', cursor: 'pointer', padding: 0 }}>&lt;</button>
              1 of 2
              <button style={{ background: 'transparent', border: 'none', color: '#73706A', cursor: 'pointer', padding: 0 }}>&gt;</button>
            </span>
            <button 
              onClick={onSkip}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#73706A',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Options List */}
        <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '50vh', overflowY: 'auto' }}>
          {options.map((opt, i) => (
            <button
              key={i}
              onClick={() => onAnswer(opt)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                background: 'transparent',
                border: 'none',
                borderRadius: '12px',
                color: '#E5E1D8',
                fontSize: '15px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#403E3B'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ 
                width: '28px', height: '28px', 
                borderRadius: '8px', 
                background: '#403E3B', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                marginRight: '16px', 
                fontSize: '13px', color: '#A09D98',
                fontWeight: 500
              }}>
                {i + 1}
              </span>
              <span style={{ flex: 1, letterSpacing: '0.2px' }}>{opt}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#73706A" strokeWidth="2" style={{ marginLeft: '12px' }}>
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          ))}
          
          {/* Divider */}
          <div style={{ height: '1px', background: '#484643', margin: '8px 12px' }} />

          {/* Something else / Skip Row */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '4px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <span style={{ 
                width: '28px', height: '28px', 
                borderRadius: '8px', 
                background: '#403E3B', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                marginRight: '16px', 
                color: '#A09D98'
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                </svg>
              </span>
              <span style={{ color: '#73706A', fontSize: '15px' }}>Something else</span>
            </div>
            <button 
              onClick={onSkip}
              style={{
                background: '#4D4A46',
                color: '#E5E1D8',
                border: 'none',
                padding: '6px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#5B5854'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#4D4A46'}
            >
              Skip
            </button>
          </div>
        </div>
      </motion.div>

      {/* Or reply directly... Input Box */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        style={{
          background: '#242321', // Darker input box like the screenshot
          borderRadius: '16px',
          padding: '16px 20px',
          border: '1px solid #3E3C3A',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#E5E1D8', cursor: 'pointer' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          <input 
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && customText.trim()) {
                onAnswer(customText.trim());
              }
            }}
            placeholder="Or reply directly..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#E5E1D8',
              fontSize: '16px',
              outline: 'none',
              fontFamily: 'inherit'
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#A09D98', fontSize: '13px' }}>
             <span>Krock's <span style={{ opacity: 0.5 }}>▼</span></span>
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
             </svg>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
