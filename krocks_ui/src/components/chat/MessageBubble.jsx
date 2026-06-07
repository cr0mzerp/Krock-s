import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { motion, AnimatePresence } from 'framer-motion';

function ReasonBlock({ content, isStreaming }) {
  const [expanded, setExpanded] = useState(false);
  const lines = content.split('\n').filter(Boolean);
  const firstLine = lines[0] || '';
  
  const barStyle = {
    display: 'flex', alignItems: 'center', gap: '8px',
    borderRadius: '6px', padding: '6px 10px', cursor: 'pointer',
    border: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.02)',
    transition: 'border-color 0.2s, background 0.2s',
    userSelect: 'none',
  };
  
  if (!expanded) {
    return (
      <div
        onClick={() => setExpanded(true)}
        style={barStyle}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/></svg>
        <span style={{ fontSize: '12.5px', color: 'var(--t3)', flex: 1 }}>Thinking{lines.length > 1 ? ` (${lines.length} lines)` : ` — ${firstLine.slice(0, 60)}${firstLine.length > 60 ? '…' : ''}`}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
      </div>
    );
  }
  
  return (
    <div>
      <div
        onClick={() => setExpanded(false)}
        style={barStyle}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/></svg>
        <span style={{ fontSize: '12.5px', color: 'var(--t3)', flex: 1 }}>Thinking hidden</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7"/></svg>
      </div>
      <div style={{
        marginTop: '6px',
        padding: '8px 0',
        color: 'var(--t3)',
        fontSize: '13.5px',
        fontFamily: 'var(--f-sans)',
        whiteSpace: 'pre-wrap',
        lineHeight: 1.6,
        opacity: 0.7,
        fontStyle: 'italic',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        paddingLeft: '12px',
      }}>
        {content}
      </div>
    </div>
  );
}

const GlobeIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.974 0-5.699-1.082-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
  </svg>
);

const ToolCallGroup = ({ actions, isStreaming }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!actions || actions.length === 0) return null;

  // Auto-expand if streaming or if explicitly expanded by user
  const showDetails = isStreaming || isExpanded;

  const getSmallIcon = (tag) => {
    switch(tag) {
      case 'VISION': return <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
      case 'JXA': return <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.75 8.25v7.5m-3-3h3m6-6h-7.5c-1.242 0-2.25 1.008-2.25 2.25v10.5c0 1.242 1.008 2.25 2.25 2.25h7.5c1.242 0 2.25-1.008 2.25-2.25v-10.5c0-1.242-1.008-2.25-2.25-2.25h-7.5z" /></svg>;
      default: return <GlobeIcon />;
    }
  };

  const getStepTitle = (tag, data) => {
    switch(tag) {
      case 'CMD': {
         const cmdString = data.split('\n')[0] || '';
         if (cmdString.includes('mdfind') || cmdString.includes('find')) return `Searching files`;
         if (cmdString.includes('curl') || cmdString.includes('wget')) return `Fetching web content`;
         if (cmdString.includes('python')) return `Running Python script`;
         return `Executing terminal command`;
      }
      case 'VISION': return 'Analyzing image';
      case 'JXA': return 'Running macOS automation';
      case 'USE': return 'Using system tool';
      default: return `Processing ${tag}`;
    }
  };

  if (!showDetails) {
    return (
      <div 
        onClick={() => setIsExpanded(true)}
        style={{ 
          display: 'inline-flex', alignItems: 'center', gap: '6px', 
          marginTop: '12px', marginBottom: '8px', cursor: 'pointer',
          color: '#a1a1aa', fontSize: '13.5px', userSelect: 'none',
          transition: 'color 0.2s ease'
        }}
        onMouseOver={(e) => e.currentTarget.style.color = '#e4e4e7'}
        onMouseOut={(e) => e.currentTarget.style.color = '#a1a1aa'}
      >
        <span>Used {actions.length} tool{actions.length > 1 ? 's' : ''}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6"/></svg>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '16px', marginBottom: '16px', fontFamily: 'var(--f-sans)', userSelect: 'none' }}>
      {/* Header: Working / Finished */}
      <div 
        style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', cursor: !isStreaming ? 'pointer' : 'default' }}
        onClick={() => !isStreaming && setIsExpanded(false)}
      >
        <div style={{ color: isStreaming ? '#f97316' : '#71717a', display: 'flex', alignItems: 'center' }}>
           {isStreaming ? (
             <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style={{width:'100%', height:'100%'}} fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round">
                 <g>
                   <line x1="50" y1="50" x2="50" y2="10" />
                   <line x1="50" y1="50" x2="78" y2="22" />
                   <line x1="50" y1="50" x2="90" y2="50" />
                   <line x1="50" y1="50" x2="78" y2="78" />
                   <line x1="50" y1="50" x2="50" y2="90" />
                   <line x1="50" y1="50" x2="22" y2="78" />
                   <line x1="50" y1="50" x2="10" y2="50" />
                   <line x1="50" y1="50" x2="22" y2="22" />
                 </g>
               </svg>
             </motion.div>
           ) : (
             <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
           )}
        </div>
        <span style={{ fontSize: '13.5px', color: '#e4e4e7' }}>{isStreaming ? 'Working' : 'Finished working'}</span>
      </div>

      {/* Steps Container */}
      <div style={{ position: 'relative', paddingLeft: '24px' }}>
        {/* The connecting vertical line */}
        <div style={{ position: 'absolute', left: '7px', top: '10px', bottom: '10px', width: '1px', background: '#3f3f46' }} />
        
        {actions.map((act, i) => {
          const isLast = i === actions.length - 1;
          const isActive = isStreaming && isLast;
          
          return (
            <div key={i} style={{ position: 'relative', marginBottom: isLast ? '0' : '20px' }}>
              
              {/* Step Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Icon bridging the line */}
                <div style={{ 
                  position: 'absolute', left: '-24px', width: '16px', height: '16px', 
                  background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isActive ? '#e4e4e7' : '#a1a1aa'
                }}>
                  {getSmallIcon(act.tag)}
                </div>
                
                <span style={{ fontSize: '13px', color: isActive ? '#e4e4e7' : '#a1a1aa' }}>
                  {getStepTitle(act.tag, act.data)}
                </span>
              </div>
              
              {/* Step Data Block */}
              <div style={{ 
                marginTop: '10px', 
                background: '#18181b', 
                border: '1px solid #27272a', 
                borderRadius: '8px', 
                padding: '12px',
                fontSize: '12.5px', 
                fontFamily: 'var(--f-mono)', 
                color: '#a1a1aa', 
                maxHeight: '250px', 
                overflowY: 'auto', 
                whiteSpace: 'pre-wrap', 
                wordBreak: 'break-all',
                userSelect: 'text',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)'
              }}>
                {act.data}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Krock's Apex AI Icon — Claude-inspired warm starburst
export const KrocksIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style={{width:'85%', height:'85%', willChange: 'transform, opacity'}} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" className="organic-spark">
    <g className="spark-rays" strokeWidth="7">
      <line className="kr-ray" x1="50" y1="50" x2="50" y2="8" />
      <line className="kr-ray" x1="50" y1="50" x2="65" y2="15" />
      <line className="kr-ray" x1="50" y1="50" x2="85" y2="22" />
      <line className="kr-ray" x1="50" y1="50" x2="92" y2="38" />
      <line className="kr-ray" x1="50" y1="50" x2="85" y2="55" />
      <line className="kr-ray" x1="50" y1="50" x2="78" y2="70" />
      <line className="kr-ray" x1="50" y1="50" x2="62" y2="88" />
      <line className="kr-ray" x1="50" y1="50" x2="52" y2="95" />
      <line className="kr-ray" x1="50" y1="50" x2="35" y2="88" />
      <line className="kr-ray" x1="50" y1="50" x2="20" y2="72" />
      <line className="kr-ray" x1="50" y1="50" x2="10" y2="55" />
      <line className="kr-ray" x1="50" y1="50" x2="5" y2="40" />
      <line className="kr-ray" x1="50" y1="50" x2="15" y2="25" />
      <line className="kr-ray" x1="50" y1="50" x2="30" y2="12" />
    </g>
  </svg>
);

const CopyIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
  </svg>
);

const CheckIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
  </svg>
);

const ThumbsUp = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M3 15.75h3.375c.621 0 1.125-.504 1.125-1.125V8.25a1.125 1.125 0 00-1.125-1.125H3M3 15.75V8.25m0 7.5l.75-9"/>
  </svg>
);

const ThumbsDown = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.367 13.5c.806 0 1.533.446 2.031 1.08a9.041 9.041 0 012.861 2.4c.723.384 1.35.956 1.653 1.715a4.498 4.498 0 01.322 1.672V21a.75.75 0 01.75.75A2.25 2.25 0 0121 24c0-1.152-.26-2.243-.723-3.218-.266-.558.107-1.282.725-1.282h3.126c1.026 0 1.945-.694 2.054-1.715.045-.422.068-.85.068-1.285a11.95 11.95 0 00-2.649-7.521c-.388-.482-.987-.729-1.605-.729H13.48c-.483 0-.964.078-1.423.23l-3.114 1.04a4.501 4.501 0 01-1.423.23H5.904M21 8.25h-3.375c-.621 0-1.125.504-1.125 1.125v6.375c0 .621.504 1.125 1.125 1.125H21m0-8.625V15.75m0-7.5l.75 9"/>
  </svg>
);

const RetryIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

function CodeBlock({ node, inline, className, children, ...props }) {
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : '';
  const codeString = String(children).replace(/\n$/, '');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (lang === 'reasoning') {
    return <ReasonBlock content={codeString} isStreaming={false} />;
  }

  if (!inline) {
    return (
      <div className="code-block">
        <div className="code-block-header">
          <span className="code-lang">{lang || 'text'}</span>
          <button className="copy-btn" onClick={handleCopy}>
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? 'Copied!' : 'Copy code'}
          </button>
        </div>
        <pre>
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      </div>
    );
  }
  return <code className={className} {...props}>{children}</code>;
}

const STATIC_REMARK_PLUGINS = [remarkGfm];
const STATIC_REHYPE_PLUGINS_HIGHLIGHT = [rehypeHighlight];
const STATIC_REHYPE_PLUGINS_EMPTY = [];
const STATIC_COMPONENTS = { 
  code: CodeBlock,
  a: ({ node, ...props }) => (
    <a {...props} className="md-link" target="_blank" rel="noopener noreferrer">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px', verticalAlign: '-1px', opacity: 0.7}}>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
      </svg>
      {props.children}
    </a>
  )
};

const MessageBubble = React.memo(({ message, isStreaming, userName, showAvatar, onRetry }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null);  // null | 'up' | 'down'

  const handleCopyText = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const handleThumbsUp = () => setFeedback(feedback === 'up' ? null : 'up');
  const handleThumbsDown = () => setFeedback(feedback === 'down' ? null : 'down');

  if (isSystem) {
    return (
      <div className="msys">
        <span className="msys-inner">{message.content}</span>
      </div>
    );
  }

  const [isExpanded, setIsExpanded] = useState(false);
  const { displayUserText, isLongUserMsg } = React.useMemo(() => {
    if (!isUser) return { displayUserText: '', isLongUserMsg: false };
    const cleanContent = message.content ? message.content.replace(/<!-- HIDDEN_INSTRUCTION:.*?-->/gs, '').trim() : '';
    const isLong = cleanContent.length > 400;
    const displayText = isLong && !isExpanded ? cleanContent.slice(0, 400) : cleanContent;
    return { displayUserText: displayText, isLongUserMsg: isLong };
  }, [message.content, isUser, isExpanded]);

  const toolActions = React.useMemo(() => {
    if (isUser || typeof message.content !== 'string') return [];
    const actions = [];
    const regex = /\[(CMD|JXA|TYPE|MOUSE|VISION|EVOLVE|USE|WEB)\]([\s\S]*?)(?:\[\/\1\]|$)/g;
    let match;
    while ((match = regex.exec(message.content)) !== null) {
      actions.push({ tag: match[1], data: match[2].trim() });
    }
    return actions;
  }, [message.content, isUser]);

  try {
    return (
      <div className={`mrow ${isUser ? 'usr' : 'ast'}`}>
        <div className="minner">
          
          {/* Only show avatar for AI if showAvatar is true */}
          {!isUser && (
            <div className={`mav ${isStreaming && !message.content ? 'thinking-avatar' : ''}`} style={{ opacity: showAvatar ? 1 : 0, visibility: showAvatar ? 'visible' : 'hidden' }}>
              <KrocksIcon />
            </div>
          )}

          <div className="mbody">
            <div className={`mtext${isStreaming ? ' streaming' : ''}`}>
              {isUser ? (
                <div style={{ whiteSpace: 'pre-wrap', position: 'relative' }}>
                  {displayUserText}
                  {isLongUserMsg && !isExpanded && <span style={{ opacity: 0.5 }}>...</span>}
                  
                  {isLongUserMsg && !isExpanded && (
                    <div style={{
                      position: 'absolute',
                      bottom: 0, left: 0, right: 0, height: '60px',
                      background: 'linear-gradient(to bottom, transparent, rgba(25, 25, 25, 1))',
                      pointerEvents: 'none',
                      borderRadius: '8px'
                    }} />
                  )}

                  {isLongUserMsg && (
                    <button 
                      onClick={() => setIsExpanded(!isExpanded)}
                      style={{
                        display: 'block', marginTop: '8px', padding: '4px 8px', marginLeft: '-8px',
                        color: 'var(--t3)', fontSize: '13px', background: 'transparent', border: 'none',
                        cursor: 'pointer', textAlign: 'left', position: 'relative', zIndex: 2,
                        transition: 'color 0.2s'
                      }}
                      onMouseOver={(e) => e.target.style.color = 'var(--t1)'}
                      onMouseOut={(e) => e.target.style.color = 'var(--t3)'}
                    >
                      {isExpanded ? 'Show less' : 'Show more'}
                    </button>
                  )}

                  {message.images && message.images.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: message.content ? '12px' : '0' }}>
                      {message.images.map((imgSrc, i) => (
                        <div key={i} style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)', maxWidth: '280px', maxHeight: '280px' }}>
                          <img src={imgSrc} alt="attachment" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {(() => {
                    const raw = typeof message.content === 'string' ? message.content : '';
                    const txt = raw.replace(/\[(CMD|JXA|TYPE|MOUSE|VISION|EVOLVE|USE|ASK|WEB)\][\s\S]*?(?:\[\/\1\]|$)/g, '');
                    // Streaming sırasında ReactMarkdown parser'ı çalıştırma — her chunk'ta O(n) reparse hafıza basıncı yaratır
                    // Ama reasoning bloklarını lightweight algılayıp styled göster ki kullanıcı çıplak backtick görmesin
                    if (isStreaming) {
                      const reasoningRegex = /```reasoning\n([\s\S]*?)\n```(?:\n|$)/g;
                      const segments = [];
                      let lastIdx = 0;
                      let match;
                      while ((match = reasoningRegex.exec(txt)) !== null) {
                        if (match.index > lastIdx) {
                          segments.push({ type: 'text', content: txt.slice(lastIdx, match.index) });
                        }
                        segments.push({ type: 'reasoning', content: match[1] });
                        lastIdx = match.index + match[0].length;
                      }
                      if (lastIdx < txt.length) {
                        segments.push({ type: 'text', content: txt.slice(lastIdx) });
                      }

                      if (segments.length === 0) {
                        return (
                          <ReactMarkdown remarkPlugins={STATIC_REMARK_PLUGINS} rehypePlugins={STATIC_REHYPE_PLUGINS_EMPTY} components={STATIC_COMPONENTS}>
                            {txt}
                          </ReactMarkdown>
                        );
                      }
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', wordBreak: 'break-word' }}>
                          {segments.map((seg, i) => {
                            if (seg.type === 'reasoning') {
                              return <ReasonBlock key={i} content={seg.content} isStreaming={true} />;
                            }
                            return (
                              <ReactMarkdown key={i} remarkPlugins={STATIC_REMARK_PLUGINS} rehypePlugins={STATIC_REHYPE_PLUGINS_EMPTY} components={STATIC_COMPONENTS}>
                                {seg.content}
                              </ReactMarkdown>
                            );
                          })}
                        </div>
                      );
                    }
                    if (!txt && toolActions.length === 0) {
                      return <span style={{ opacity: 0.6, fontStyle: 'italic' }}>Stopped...</span>;
                    }
                    return (
                      <ReactMarkdown
                        remarkPlugins={STATIC_REMARK_PLUGINS}
                        rehypePlugins={STATIC_REHYPE_PLUGINS_EMPTY}
                        components={STATIC_COMPONENTS}
                      >
                        {txt}
                      </ReactMarkdown>
                    );
                  })()}

                  {/* Render beautiful nested tool call group */}
                  <ToolCallGroup actions={toolActions} isStreaming={isStreaming} />
                </>
              )}
            </div>

            {/* AI Message Actions */}
            {!isUser && !isStreaming && (
              <div className="msg-actions">
                <button className="msg-btn" onClick={handleCopyText} title="Copy">
                  {copied ? <CheckIcon /> : <CopyIcon />}
                </button>
                <button className="msg-btn" onClick={handleThumbsUp} title="Good response" style={feedback === 'up' ? { color: '#4ade80' } : {}}>
                  <ThumbsUp />
                </button>
                <button className="msg-btn" onClick={handleThumbsDown} title="Bad response" style={feedback === 'down' ? { color: '#f87171' } : {}}>
                  <ThumbsDown />
                </button>
                <button className="msg-btn" onClick={onRetry} title="Retry">
                  <RetryIcon />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  } catch (err) {
    return <div style={{color:'red'}}>Error rendering message: {err.message}</div>;
  }
});
export default MessageBubble;
