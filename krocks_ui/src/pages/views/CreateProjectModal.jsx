import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CreateProjectModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '16px'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{
          background: '#2B2A28',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '500px',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          border: '1px solid #3E3C3A'
        }}
      >
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #3E3C3A',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 500, color: '#E5E1D8' }}>Create a project</h2>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#A09D98', cursor: 'pointer', padding: '4px' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          <div style={{
            background: '#1C1B19',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '24px',
            border: '1px solid #3E3C3A'
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#E5E1D8', fontSize: '14px', fontWeight: 500 }}>How to use projects</h4>
            <p style={{ margin: 0, color: '#A09D98', fontSize: '13px', lineHeight: '1.5' }}>
              Projects help organize your work and leverage knowledge across multiple conversations. Upload docs, code, and files to create themed collections that Krock can reference again and again.
              <br/><br/>
              Start by creating a memorable title and description to organize your project. You can always edit it later.
            </p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#A09D98', marginBottom: '8px' }}>What are you working on?</label>
            <input 
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name your project"
              style={{
                width: '100%',
                background: '#1C1B19',
                border: '1px solid #3E3C3A',
                borderRadius: '8px',
                padding: '12px 16px',
                color: '#E5E1D8',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#3E3C3A'}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#A09D98', marginBottom: '8px' }}>What are you trying to achieve?</label>
            <textarea 
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Describe your project, goals, subject, etc..."
              style={{
                width: '100%',
                background: '#1C1B19',
                border: '1px solid #3E3C3A',
                borderRadius: '8px',
                padding: '12px 16px',
                color: '#E5E1D8',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s',
                minHeight: '80px',
                resize: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#3E3C3A'}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button 
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#A09D98',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                padding: '8px 16px'
              }}
            >
              Cancel
            </button>
            <button 
              disabled={!name.trim()}
              onClick={() => onCreate(name.trim(), desc.trim())}
              style={{
                background: '#E5E1D8',
                border: 'none',
                color: '#161514',
                cursor: name.trim() ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: 500,
                padding: '8px 16px',
                borderRadius: '8px',
                opacity: name.trim() ? 1 : 0.5
              }}
            >
              Create project
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
