new_html = r'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Krock's Apex</title>
  <!-- Newsreader for Serif, Inter for Sans -->
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap" rel="stylesheet"/>
  <style>
/* RESET */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;font-size:16px}

:root{
  --bg: #1e1e1e;
  --bg-side: #1e1e1e;
  --bg-card: #272726;
  --bg-hover: rgba(255,255,255,0.06);
  --bg-active: rgba(255,255,255,0.1);

  --t1: #ececeb;
  --t2: #a3a19d;
  --t3: #75736f;
  --t4: #4a4946;

  --accent: #da7756;

  --b1: rgba(255,255,255,0.06);
  --b2: rgba(255,255,255,0.12);

  --r1: 8px;
  --r2: 12px;
  --r3: 16px;
  --r4: 24px;
  --r5: 32px;

  --f-sans: 'Inter', system-ui, sans-serif;
  --f-serif: 'Newsreader', serif;
  --f-mono: ui-monospace, monospace;

  --sw: 240px;
  --ease: cubic-bezier(.4,0,.2,1);
}

body{height:100vh;background:var(--bg);color:var(--t1);font-family:var(--f-sans);overflow:hidden;line-height:1.5;display:flex}
button,select,input,textarea{font-family:inherit}

/* SCROLLBARS */
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px}
::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,.2)}

/* APP */
#app{display:flex;width:100%;height:100%}

/* SIDEBAR */
#sidebar{
  width:var(--sw);min-width:var(--sw);
  background:var(--bg-side);
  border-right:1px solid var(--b1);
  display:flex;flex-direction:column;
  z-index:20;
}
.sb-brand{
  display:flex;align-items:center;justify-content:space-between;
  padding:16px 14px 16px 20px;
}
.sb-logo-text{
  font-family:var(--f-serif);font-size:18px;font-weight:500;
  color:var(--t1);letter-spacing:0.01em;
}
.sb-icons{display:flex;gap:4px}
.sb-btn{
  width:28px;height:28px;border-radius:var(--r1);
  border:none;background:transparent;color:var(--t2);
  cursor:pointer;display:flex;align-items:center;justify-content:center;
  transition:all .15s;
}
.sb-btn:hover{background:var(--bg-hover);color:var(--t1)}
.sb-btn svg{width:16px;height:16px}

.sb-nav{padding:0 12px;display:flex;flex-direction:column;gap:2px}
.sb-item{
  display:flex;align-items:center;gap:12px;
  padding:8px 10px;border-radius:var(--r1);
  font-size:13.5px;font-weight:400;color:var(--t1);
  cursor:pointer;transition:background .15s;
  border:none;background:transparent;text-align:left;width:100%;
}
.sb-item:hover{background:var(--bg-hover)}
.sb-item.active{background:var(--bg-active)}
.sb-item svg{width:16px;height:16px;color:var(--t2)}
.sb-item span{flex:1}
.sb-badge-upg{
  font-size:10px;font-weight:500;color:#60a5fa;
  padding:2px 0;letter-spacing:0.02em;
}

.sb-sec-hd{
  padding:20px 22px 6px;
  font-size:11px;font-weight:500;color:var(--t2);
}
.sb-recents{flex:1;overflow-y:auto;padding:0 12px}
.sb-rec-item{
  display:block;padding:8px 10px;border-radius:var(--r1);
  font-size:13.5px;color:var(--t1);cursor:pointer;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  border:none;background:transparent;text-align:left;width:100%;
}
.sb-rec-item:hover{background:var(--bg-hover)}

.sb-tips-card{
  margin:12px;padding:12px;border-radius:var(--r2);
  background:var(--bg-hover);border:1px solid var(--b1);
}
.sb-tips-title{font-size:10px;color:var(--t2);margin-bottom:8px}
.sb-tip{
  display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;
}
.sb-tip:last-child{margin-bottom:0}
.sb-tip svg{width:14px;height:14px;color:var(--t2);flex-shrink:0;margin-top:2px}
.sb-tip div{font-size:12px;color:var(--t1);line-height:1.4}
.sb-tip span{display:block;font-size:11px;color:var(--t3)}

.sb-user{
  display:flex;align-items:center;gap:10px;
  padding:12px 20px 20px;cursor:pointer;
}
.sb-avatar{
  width:28px;height:28px;border-radius:50%;
  background:var(--t1);color:var(--bg);
  display:flex;align-items:center;justify-content:center;
  font-size:13px;font-weight:600;flex-shrink:0;
}
.sb-uname{font-size:13.5px;font-weight:500;color:var(--t1)}
.sb-uplan{font-size:11px;color:var(--t3)}
.sb-user-icon{margin-left:auto;color:var(--t2)}
.sb-user-icon svg{width:16px;height:16px}

/* MAIN */
#main{flex:1;display:flex;flex-direction:column;position:relative;min-width:0}

/* TOPBAR */
#topbar{
  position:absolute;top:0;left:0;right:0;
  display:flex;justify-content:center;padding:16px;
  pointer-events:none;z-index:10;
}
.top-pill{
  pointer-events:auto;
  display:flex;align-items:center;padding:4px 12px;
  background:#262524;border:1px solid var(--b1);
  border-radius:var(--r5);font-size:12px;color:var(--t2);
  cursor:pointer;transition:all .15s;
}
.top-pill:hover{background:#302f2e;color:var(--t1)}
.top-pill span{color:var(--t1);font-weight:500;margin-left:4px}

/* MESSAGES */
#msgs{flex:1;overflow-y:auto;display:flex;flex-direction:column}

/* WELCOME */
#welcome{
  flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:0 24px;min-height:0;
}
.greeting-wrap{display:flex;align-items:center;gap:12px;margin-bottom:32px}
.asterisk{font-size:32px;color:var(--accent);line-height:1}
.greeting{font-family:var(--f-serif);font-size:34px;font-weight:400;color:var(--t1);letter-spacing:0.01em}

/* INPUT CARD */
.inp-card{
  width:100%;max-width:768px;
  background:var(--bg-card);
  border:1px solid var(--b1);
  border-radius:var(--r3);
  box-shadow:var(--sh1);
  display:flex;flex-direction:column;
  transition:border-color .2s;
}
.inp-card:focus-within{border-color:var(--b2)}
.inp-top{padding:16px 16px 8px}
.inp-ta{
  width:100%;background:transparent;border:none;outline:none;
  color:var(--t1);font-size:16px;line-height:1.5;resize:none;
  min-height:24px;max-height:250px;scrollbar-width:none;
}
.inp-ta::-webkit-scrollbar{display:none}
.inp-ta::placeholder{color:var(--t3)}

.inp-bot{display:flex;align-items:center;padding:8px 12px 12px;gap:8px}
.inp-ic{
  width:32px;height:32px;border-radius:var(--r1);
  background:transparent;border:none;color:var(--t1);
  display:flex;align-items:center;justify-content:center;cursor:pointer;
}
.inp-ic:hover{background:var(--bg-hover)}
.inp-ic svg{width:18px;height:18px}

.inp-model{
  display:flex;align-items:center;gap:6px;
  padding:6px 10px;border-radius:var(--r1);
  color:var(--t2);font-size:13px;cursor:pointer;
}
.inp-model:hover{background:var(--bg-hover);color:var(--t1)}
.inp-model select{
  background:transparent;border:none;outline:none;color:inherit;font-size:13px;
  cursor:pointer;appearance:none;
}
.inp-spacer{flex:1}

.send-btn{
  width:32px;height:32px;border-radius:var(--r1);
  border:none;background:var(--t1);color:var(--bg);
  cursor:pointer;display:flex;align-items:center;justify-content:center;
}
.send-btn:disabled{background:var(--t4);cursor:not-allowed}
.send-btn svg{width:16px;height:16px}
.stop-btn{
  display:none;width:32px;height:32px;border-radius:var(--r1);
  border:1px solid var(--b2);background:transparent;color:var(--t1);
  cursor:pointer;align-items:center;justify-content:center;
}
.stop-btn.vis{display:flex}

/* CHIPS */
.chips{
  display:flex;flex-wrap:wrap;gap:8px;justify-content:center;
  max-width:768px;margin-top:16px;
}
.chip{
  display:flex;align-items:center;gap:6px;
  padding:8px 14px;border-radius:var(--r5);
  border:1px solid var(--b1);background:transparent;
  color:var(--t2);font-size:13px;cursor:pointer;
  transition:all .15s;
}
.chip:hover{background:var(--bg-hover);color:var(--t1)}
.chip svg{width:14px;height:14px}

/* MESSAGES CHAT */
.mrow{display:flex;padding:24px 0}
.minner{width:100%;max-width:768px;margin:0 auto;display:flex;gap:16px;padding:0 24px}
.mav{
  width:28px;height:28px;border-radius:6px;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
}
.mrow.usr .mav{background:var(--t1);color:var(--bg);font-size:13px;font-weight:600;border-radius:50%}
.mrow.ast .mav{background:transparent;color:var(--accent);font-size:24px}
.mbody{flex:1;min-width:0;padding-top:2px}
.mrole{display:none} /* Claude doesn't show names usually, just icons */
.mtext{font-size:16px;line-height:1.6;color:var(--t1)}
.mtext.streaming::after{
  content:'▊';color:var(--accent);animation:blink .6s step-end infinite;margin-left:4px;
}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}

.mactions{display:flex;gap:6px;margin-top:12px;opacity:0;transition:opacity .2s}
.mrow:hover .mactions{opacity:1}
.mact{
  width:28px;height:28px;border-radius:var(--r1);
  border:none;background:transparent;color:var(--t3);
  cursor:pointer;display:flex;align-items:center;justify-content:center;
}
.mact:hover{background:var(--bg-hover);color:var(--t1)}
.mact svg{width:14px;height:14px}

.abadges{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.ab{
  display:inline-flex;align-items:center;gap:4px;
  padding:4px 8px;border-radius:var(--r1);font-size:12px;
  background:var(--bg-hover);border:1px solid var(--b1);color:var(--t2);
}
.ab.ok{color:#4ade80}
.ab.err{color:#f87171}

.cblock{border-radius:var(--r2);overflow:hidden;margin:16px 0;border:1px solid var(--b1)}
.chdr{
  display:flex;justify-content:space-between;align-items:center;
  padding:8px 12px;background:#2d2d2d;font-size:12px;color:var(--t2);font-family:var(--f-mono);
}
.chdr button{background:none;border:none;color:var(--t2);cursor:pointer;font-family:var(--f-sans);font-size:12px}
.chdr button:hover{color:var(--t1)}
.mtext pre{background:#1e1e1e;padding:16px;margin:0;overflow-x:auto;font-size:14px;line-height:1.5}
.mtext pre code{font-family:var(--f-mono);color:#e2e8f0}
.mtext p{margin-bottom:16px}
.mtext p:last-child{margin-bottom:0}

/* BOTTOM INPUT (Chat) */
#inp-area{padding:0 24px 24px;background:var(--bg);flex-shrink:0}
.inp-wrap{max-width:768px;margin:0 auto}

/* OVERLAYS / SETTINGS */
#sp{
  position:fixed;top:0;right:0;width:320px;height:100%;
  background:var(--bg-card);border-left:1px solid var(--b1);
  transform:translateX(100%);transition:transform .25s var(--ease);
  z-index:100;padding:24px;overflow-y:auto;
}
#sp.open{transform:translateX(0)}
.sp-hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;font-size:16px;font-weight:500}
.sp-x{background:none;border:none;color:var(--t2);cursor:pointer}
.sp-x svg{width:20px;height:20px}
.sp-lbl{font-size:12px;color:var(--t3);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px;margin-top:24px}
.sp-btn{
  width:100%;padding:10px;border-radius:var(--r1);
  background:var(--bg-hover);border:1px solid var(--b1);
  color:var(--t1);font-size:14px;cursor:pointer;text-align:left;
  display:flex;align-items:center;gap:8px;margin-bottom:8px;
}
.sp-btn:hover{background:var(--bg-active)}
.sp-btn svg{width:16px;height:16px;color:var(--t2)}
#ov{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:90}
#ov.show{display:block}
#toasts{position:fixed;bottom:24px;right:24px;z-index:999;display:flex;flex-direction:column;gap:8px}
.toast{padding:12px 16px;border-radius:var(--r1);font-size:14px;background:var(--bg-card);border:1px solid var(--b1);color:var(--t1)}
  </style>
</head>
<body>
<div id="app">

<!-- SIDEBAR -->
<nav id="sidebar">
  <div class="sb-brand">
    <div class="sb-logo-text">Claude</div>
    <div class="sb-icons">
      <button class="sb-btn" onclick="toast('Ara')">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      </button>
      <button class="sb-btn" onclick="openSP()">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>
      </button>
    </div>
  </div>

  <div class="sb-nav">
    <button class="sb-item" onclick="newChat()">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
      <span>New chat</span>
    </button>
    <button class="sb-item active">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
      <span>Chats</span>
    </button>
    <button class="sb-item">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
      <span>Projects</span>
    </button>
    <button class="sb-item">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
      <span>Artifacts</span>
    </button>
    <button class="sb-item">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 20l4-16m4 4 4 4-4 4M6 16l-4-4 4-4"/></svg>
      <span>Code</span>
      <span class="sb-badge-upg">Upgrade</span>
    </button>
    <button class="sb-item">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
      <span>Customize</span>
    </button>
  </div>

  <div class="sb-sec-hd">Recents</div>
  <div class="sb-recents" id="sb-recents"></div>

  <div class="sb-tips-card">
    <div class="sb-tips-title">Try the Claude app</div>
    <div class="sb-tip">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"/></svg>
      <div>Bring history from another AI<span>So you're not starting from scratch</span></div>
    </div>
    <div class="sb-tip">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
      <div>Connect your everyday tools<span>Claude gives better answers when it understands what matters to you</span></div>
    </div>
    <div class="sb-tip">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
      <div>Get the desktop app<span>Head off faster, code with Claude, and do more from your desktop</span></div>
    </div>
  </div>

  <div class="sb-user">
    <div class="sb-avatar">L</div>
    <div>
      <div class="sb-uname">Lord</div>
      <div class="sb-uplan">Free plan</div>
    </div>
    <div class="sb-user-icon">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4-4 4m0 0-4-4m4 4V4"/></svg>
    </div>
  </div>
</nav>

<!-- MAIN -->
<div id="main">
  <div id="topbar">
    <div class="top-pill" id="conn-pill">Free plan - <span>Upgrade</span></div>
  </div>

  <div id="msgs">
    <div id="welcome">
      <div class="greeting-wrap">
        <span class="asterisk">✳</span>
        <h1 class="greeting">Good afternoon, Lord</h1>
      </div>

      <div class="inp-card">
        <div class="inp-top">
          <textarea class="inp-ta" id="inp-w" rows="1" placeholder="How can I help you today?" onkeydown="onKeyW(event)" oninput="onInp(this)"></textarea>
        </div>
        <div class="inp-bot">
          <button class="inp-ic"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg></button>
          
          <div class="inp-spacer"></div>

          <div class="inp-model">
            <select id="msel" onchange="syncModel()">
              <option value="@preset/mimos">MiMo-V2.5 · Auto</option>
              <option value="google/gemini-2.5-flash-preview">Gemini 2.5 Flash</option>
              <option value="anthropic/claude-opus-4">Claude Opus 4</option>
              <option value="openai/gpt-4o">GPT-4o · Medium</option>
              <option value="meta-llama/llama-3.3-70b-instruct">Llama 3.3 70B</option>
              <option value="deepseek/deepseek-r1">DeepSeek R1</option>
            </select>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </div>
          
          <button class="inp-ic"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg></button>

          <button class="stop-btn" id="swstop" onclick="stopGen()">
            <svg fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
          </button>
          <button class="send-btn" id="swsend" onclick="send()">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>

      <div class="chips">
        <button class="chip" onclick="useChip('Write a poem')">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
          Write
        </button>
        <button class="chip" onclick="useChip('Explain quantum physics')">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
          Learn
        </button>
        <button class="chip" onclick="useChip('Write a python script')">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
          Code
        </button>
        <button class="chip" onclick="useChip('Plan a trip to Japan')">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
          Life stuff
        </button>
        <button class="chip" onclick="useChip('Claude\'s choice')">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          Claude's choice
        </button>
      </div>
    </div>
  </div>

  <div id="inp-area" style="display:none">
    <div class="inp-wrap">
      <div class="inp-card">
        <div class="inp-top">
          <textarea class="inp-ta" id="inp-c" rows="1" placeholder="How can I help you today?" onkeydown="onKeyW(event)" oninput="onInp(this)"></textarea>
        </div>
        <div class="inp-bot">
          <button class="inp-ic"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg></button>
          <div class="inp-spacer"></div>
          <div class="inp-model">
            <select id="msel-c" onchange="syncModel()">
              <option value="@preset/mimos">MiMo-V2.5 · Auto</option>
              <option value="google/gemini-2.5-flash-preview">Gemini 2.5 Flash</option>
              <option value="anthropic/claude-opus-4">Claude Opus 4</option>
              <option value="openai/gpt-4o">GPT-4o · Medium</option>
              <option value="meta-llama/llama-3.3-70b-instruct">Llama 3.3 70B</option>
              <option value="deepseek/deepseek-r1">DeepSeek R1</option>
            </select>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </div>
          <button class="inp-ic"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg></button>
          <button class="stop-btn" id="cstop" onclick="stopGen()"><svg fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg></button>
          <button class="send-btn" id="csend" onclick="send()"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 12h14M12 5l7 7-7 7"/></svg></button>
        </div>
      </div>
    </div>
  </div>
</div>

<div id="ov" onclick="closeAll()"></div>
<aside id="sp">
  <div class="sp-hd">
    <span>Settings</span>
    <button class="sp-x" onclick="closeAll()"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
  </div>
  <div class="sp-lbl">Oturum Yönetimi</div>
  <button class="sp-btn" onclick="saveSess()"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg> Oturumu Kaydet</button>
  <button class="sp-btn" onclick="resetConv()"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0115 0m1 6a9 9 0 01-15 0"/></svg> Sohbeti Sıfırla</button>
  <button class="sp-btn" onclick="exportChat()"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4-4 4m0 0-4-4m4 4V4"/></svg> Dışa Aktar</button>
  
  <div class="sp-lbl">Gelişmiş</div>
  <div style="margin-bottom:8px"><label style="font-size:12px;color:var(--t2)">Sıcaklık</label><input type="range" id="tr" min="0" max="1" step="0.05" value="0.7" style="width:100%"></div>
  <div style="margin-bottom:8px"><label style="font-size:12px;color:var(--t2)">Max Tokens</label><input type="range" id="mkr" min="256" max="8192" step="256" value="4096" style="width:100%"></div>
  <div style="margin-bottom:8px"><label style="font-size:12px;color:var(--t2)">Geri Bildirim Derinliği</label><input type="range" id="dr" min="0" max="6" step="1" value="3" style="width:100%"></div>
</aside>
<div id="toasts"></div>

<script>
let ws=null, streaming=false, chatOn=false, aRow=null, aTxt='';

function connect(){
  const p=location.protocol==='https:'?'wss:':'ws:';
  ws=new WebSocket(`${p}//${location.host}/ws`);
  ws.onopen=()=>{ document.getElementById('conn-pill').innerHTML='Free plan - <span style="color:#4ade80">Connected</span>'; reqSess(); };
  ws.onclose=()=>{ document.getElementById('conn-pill').innerHTML='Free plan - <span style="color:#f87171">Offline</span>'; setTimeout(connect,3000); };
  ws.onmessage=e=>{ try{handle(JSON.parse(e.data));}catch(x){} };
}
connect();

function wsSend(o){ if(ws&&ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify(o)); }

function handle(m){
  switch(m.type){
    case 'chunk': onChunk(m.text); break;
    case 'done': endStr(); break;
    case 'action': break;
    case 'system': toast(m.text); break;
    case 'sessions': renderSess(m.sessions); break;
    case 'save_ok': toast('Kaydedildi'); reqSess(); break;
    case 'reset_ok': clearMsgs(); toast('Sıfırlandı'); break;
    case 'error': endStr(); toast(m.text,'err'); break;
  }
}

function getInp(){ return chatOn ? document.getElementById('inp-c') : document.getElementById('inp-w'); }
function getModel(){ return chatOn ? document.getElementById('msel-c').value : document.getElementById('msel').value; }

function send(){
  const inp=getInp(), text=inp.value.trim();
  if(!text||streaming||!ws||ws.readyState!==WebSocket.OPEN) return;
  if(!chatOn){
    document.getElementById('welcome').style.display='none';
    document.getElementById('inp-area').style.display='block';
    chatOn=true;
  }
  addUserRow(text); inp.value=''; inp.style.height='auto';
  beginStr();
  wsSend({ type:'message', text,
    model:getModel(),
    temperature:parseFloat(document.getElementById('tr').value),
    max_tokens:parseInt(document.getElementById('mkr').value),
    feedback_depth:parseInt(document.getElementById('dr').value),
  });
  aRow=mkAgentRow(); aTxt='';
}

function stopGen(){ if(!streaming)return; wsSend({type:'stop'}); endStr(); }

function onChunk(txt){
  if(!aRow)return;
  aTxt+=txt;
  const el=aRow.querySelector('.mtext');
  if(el){el.innerHTML=renderMd(aTxt); scrollBot();}
}

function beginStr(){
  streaming=true;
  ['swsend','csend'].forEach(id=>{const e=document.getElementById(id);if(e)e.disabled=true;});
  ['swstop','cstop'].forEach(id=>{const e=document.getElementById(id);if(e)e.classList.add('vis');});
}
function endStr(){
  streaming=false;
  if(aRow){
    const el=aRow.querySelector('.mtext');
    if(el){el.classList.remove('streaming');el.innerHTML=renderMd(aTxt);}
    aRow=null; aTxt=''; scrollBot();
  }
  ['swsend','csend'].forEach(id=>{const e=document.getElementById(id);if(e)e.disabled=false;});
  ['swstop','cstop'].forEach(id=>{const e=document.getElementById(id);if(e)e.classList.remove('vis');});
}

function addUserRow(text){
  const m=document.getElementById('msgs');
  const r=document.createElement('div'); r.className='mrow usr';
  r.innerHTML=`<div class="minner">
    <div class="mav">L</div>
    <div class="mbody"><div class="mtext">${esc(text).replace(/\n/g,'<br>')}</div></div>
  </div>`;
  m.insertBefore(r, m.lastElementChild);
  scrollBot();
}

function mkAgentRow(){
  const m=document.getElementById('msgs');
  const r=document.createElement('div'); r.className='mrow ast';
  r.innerHTML=`<div class="minner">
    <div class="mav">✳</div>
    <div class="mbody"><div class="mtext streaming"></div></div>
  </div>`;
  m.insertBefore(r, m.lastElementChild);
  scrollBot();
  return r;
}

function renderMd(raw){
  let o=raw.replace(/```(\w*)\n?([\s\S]*?)```/g,(_,lang,code)=>{
    return `<div class="cblock"><div class="chdr"><span>${lang||'text'}</span></div><pre><code>${esc(code.trim())}</code></pre></div>`;
  });
  o=o.replace(/`([^`\n]+)`/g,'<code>$1</code>');
  o=o.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
  o=o.replace(/\n{2,}/g,'</p><p>');
  o=o.replace(/\n/g,'<br>');
  if(!o.startsWith('<')) o='<p>'+o+'</p>';
  return o;
}

function reqSess(){ wsSend({type:'list_sessions'}); }
function renderSess(list){
  const el=document.getElementById('sb-recents');
  el.innerHTML='';
  if(list){
    list.slice().reverse().slice(0,10).forEach(s=>{
      const b=document.createElement('button'); b.className='sb-rec-item';
      b.textContent=s;
      b.onclick=()=>{ wsSend({type:'load_session',name:s}); };
      el.appendChild(b);
    });
  }
}

function newChat() {
  wsSend({type:'reset'});
  chatOn = false;
  document.getElementById('welcome').style.display='flex';
  document.getElementById('inp-area').style.display='none';
  clearMsgs();
}

function syncModel() {
  const val = getModel();
  document.getElementById('msel').value = val;
  document.getElementById('msel-c').value = val;
  wsSend({type:'config', model:val});
}

function onKeyW(e) { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();} }
function onInp(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 220)+'px'; }
function useChip(txt) { const inp=getInp(); inp.value=txt; inp.focus(); }
function scrollBot() { const m=document.getElementById('msgs'); m.scrollTop=m.scrollHeight; }
function clearMsgs() { const m=document.getElementById('msgs'); Array.from(m.children).forEach(c=>{ if(c.id!=='welcome')c.remove(); }); }

function openSP() { document.getElementById('sp').classList.add('open'); document.getElementById('ov').classList.add('show'); }
function closeAll() { document.getElementById('sp').classList.remove('open'); document.getElementById('ov').classList.remove('show'); }

function toast(msg, type='inf') {
  const c = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast '+type;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function esc(s) { const d=document.createElement('div'); d.appendChild(document.createTextNode(s)); return d.innerHTML; }
function saveSess() { wsSend({type:'save_session', name:''}); }
function resetConv() { wsSend({type:'reset'}); }
function exportChat() { wsSend({type:'export'}); }
</script>
</body>
</html>'''

with open("krocks_web.py", "r", encoding="utf-8") as f:
    content = f.read()

start = content.find('_HTML = r"""')
end = content.find('"""', start + 12) + 3

if start != -1 and end != -1:
    new_content = content[:start] + f'_HTML = r"""{new_html}"""' + content[end:]
    with open("krocks_web.py", "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Updated _HTML successfully using string slicing.")
else:
    print("Failed to find _HTML block.")
