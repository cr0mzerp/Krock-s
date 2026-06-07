import React from 'react';
import ChatInput from './ChatInput';

const ClaudeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" style={{width:'100%', height:'100%'}}>
    <path d="M236.88,118.12l-83-29.28L124.64,5.88a7.86,7.86,0,0,0-15.15.13L80.7,88.75l-82.58,29.4a7.88,7.88,0,0,0,0,14.86l82.58,29.4,28.79,82.74a7.86,7.86,0,0,0,15.15-.13l29.24-83,83-29.28A7.88,7.88,0,0,0,236.88,118.12Z"/>
  </svg>
);

export default function WelcomeScreen({ onSend, userName, isStreaming }) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div id="welcome">
      <div className="greeting-wrap">
        <div style={{ width: 32, height: 32, color: '#cc785c' }}>
          <ClaudeIcon />
        </div>
        <h1 className="greeting">{getGreeting()}, {userName || 'User'}</h1>
      </div>
      <div className="inp-card-wrap" style={{ width:'100%', maxWidth:'768px' }}>
        <ChatInput onSend={onSend} isStreaming={isStreaming} />
      </div>
      <div className="chips">
        <button className="chip">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          Everyday Skills
        </button>
        <button className="chip">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
          System Skills
        </button>
        <button className="chip">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
          Create Artifact
        </button>
      </div>
    </div>
  );
}
