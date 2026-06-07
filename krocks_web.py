# krocks_web.py  ── Krock's Apex Web Interface  (Claude.ai dark theme — pixel-perfect)
"""
Kullanım: python3 krocks_main.py --web [--port 7860]
"""
from __future__ import annotations

import asyncio, json, os, sys, time, re, subprocess
from datetime import datetime
from pathlib import Path
from typing import Any

try:
    from fastapi import FastAPI, WebSocket, Request, WebSocketDisconnect
    from fastapi.responses import HTMLResponse, FileResponse
    from fastapi.staticfiles import StaticFiles
    import uvicorn
    _FASTAPI_OK = True
except ImportError:
    _FASTAPI_OK = False

# Background task tracking (memory leak prevention)
# asyncio.create_task() ile yaratılan task'lar reference'ı tutulmazsa "Task was destroyed but it is pending!" warning verir
# ve shutdown sırasında yarım kalabilir. Burada track edip temiz cancel yapıyoruz.
_bg_tasks: "set[asyncio.Task]" = set()


def _track_bg_task(coro) -> asyncio.Task:
    """Coroutine'u arka plan görevi olarak yarat, takip et, tamamlanınca set'ten düşür."""
    task = asyncio.create_task(coro)
    _bg_tasks.add(task)
    task.add_done_callback(_bg_tasks.discard)
    return task

from krocks_main import (
    KrocksApexAgent, Config, APIClient, SessionManager,
    parse_actions, rough_tokens, _content_str,
    _SYSTEM_PROMPT, _MODULES_OK, _MODULE_ERROR, _load_dotenv,
)
_load_dotenv()

# ─────────────────────────────────────────────────────────────────────────────
#  Customize defaults & state — UI sıfırsa default'ları yükle
# ─────────────────────────────────────────────────────────────────────────────
_DEFAULT_CUSTOMIZATION = {
    "settings": {
        "userName":              "Lord",
        "language":              "tr-TR",
        "voiceEnabled":          False,
        "voiceLang":             "tr-TR",
        "voiceSpeed":            1.0,
        "defaultModel":          "@preset/deepseekv4-flash",
        "temperature":           0.7,
        "maxTokens":             16384,
        "feedbackDepth":         3,
        "systemPromptOverride":  "",
    },
    "connectors": {
        "local_files": {"status": "connected",   "config": {}, "lastTest": None},
        "icloud":      {"status": "disconnected","config": {}, "lastTest": None},
        "github":      {"status": "disconnected","config": {"token": ""}, "lastTest": None},
        "notion":      {"status": "disconnected","config": {"token": ""}, "lastTest": None},
        "linear":      {"status": "disconnected","config": {"token": ""}, "lastTest": None},
        "slack":       {"status": "disconnected","config": {"token": ""}, "lastTest": None},
        "figma":       {"status": "disconnected","config": {"token": ""}, "lastTest": None},
    },
    "defaultModel": "@preset/deepseekv4-flash",
}

# Plugin marketplace (hardcoded — krocks_ui/public/plugins/registry.json ile aynı)
_PLUGIN_REGISTRY = [
    {
        "name": "web-search",
        "version": "1.0",
        "author": "Krock's Team",
        "category": "Web",
        "description": "DuckDuckGo HTML üzerinden gizlilik dostu web araması yapar.",
        "code": (
            "import urllib.request, urllib.parse, re\n"
            "\n"
            "def search(query, max_results=5):\n"
            "    url = 'https://html.duckduckgo.com/html/?q=' + urllib.parse.quote(query)\n"
            "    try:\n"
            "        req = urllib.request.Request(url, headers={'User-Agent': 'KrocksApex/1.0'})\n"
            "        html = urllib.request.urlopen(req, timeout=10).read().decode('utf-8', errors='ignore')\n"
            "    except Exception as e:\n"
            "        return f'Hata: {e}'\n"
            "    results = re.findall(r'<a class=\"result__a\" href=\"([^\"]+)\"[^>]*>([^<]+)</a>', html)\n"
            "    if not results:\n"
            "        return f'Sonuç yok: {query}'\n"
            "    return '\\n'.join(f'• {title} → {href}' for href, title in results[:max_results])\n"
        ),
    },
    {
        "name": "code-review",
        "version": "1.0",
        "author": "Krock's Team",
        "category": "Code",
        "description": "Python kodunda syntax, import ve en iyi pratik kontrolü yapar.",
        "code": (
            "import ast, re\n"
            "\n"
            "def review(code):\n"
            "    findings = []\n"
            "    try:\n"
            "        tree = ast.parse(code)\n"
            "    except SyntaxError as e:\n"
            "        return f'❌ Syntax hatası (satır {e.lineno}): {e.msg}'\n"
            "    funcs = [n.name for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)]\n"
            "    if not funcs:\n"
            "        findings.append('ℹ️  Fonksiyon tanımsız.')\n"
            "    if 'print(' in code:\n"
            "        findings.append('⚠️  print() kullanımı tespit edildi — logger tercih edin.')\n"
            "    if re.search(r'\\b(TODO|FIXME|XXX)\\b', code):\n"
            "        findings.append('⚠️  TODO/FIXME işaretleri var.')\n"
            "    if len(code.splitlines()) > 200:\n"
            "        findings.append('ℹ️  Dosya 200 satırı aşıyor — bölünmesi düşünülebilir.')\n"
            "    if not findings:\n"
            "        return f'✅ Temiz ({len(funcs)} fonksiyon: {\", \".join(funcs) or \"-\"})'\n"
            "    return '\\n'.join(findings)\n"
        ),
    },
    {
        "name": "sql-helper",
        "version": "1.0",
        "author": "Krock's Team",
        "category": "Code",
        "description": "Güvenli parametrik SQL sorguları üretir (SQLite/Postgres).",
        "code": (
            "def select(table, columns='*', where=None, order_by=None, limit=100):\n"
            "    cols = columns if isinstance(columns, str) else ', '.join(columns)\n"
            "    q = f'SELECT {cols} FROM {table}'\n"
            "    if where:\n"
            "        q += ' WHERE ' + ' AND '.join(f'{k}=?' for k in where.keys())\n"
            "    if order_by:\n"
            "        q += f' ORDER BY {order_by}'\n"
            "    if limit:\n"
            "        q += f' LIMIT {int(limit)}'\n"
            "    return q\n"
            "\n"
            "def insert(table, data: dict):\n"
            "    cols = ', '.join(data.keys())\n"
            "    ph = ', '.join('?' for _ in data)\n"
            "    return f'INSERT INTO {table} ({cols}) VALUES ({ph})'\n"
        ),
    },
    {
        "name": "pdf-summarizer",
        "version": "0.9",
        "author": "Krock's Team",
        "category": "Docs",
        "description": "PDF dosyalarını okur ve LLM'e özetletmek için hazırlar (pypdf gerekir).",
        "code": (
            "def extract_text(pdf_path, max_pages=20):\n"
            "    try:\n"
            "        from pypdf import PdfReader\n"
            "    except ImportError:\n"
            "        return 'Hata: pypdf kurulu değil. pip install pypdf'\n"
            "    try:\n"
            "        reader = PdfReader(pdf_path)\n"
            "    except Exception as e:\n"
            "        return f'PDF okunamadı: {e}'\n"
            "    pages = reader.pages[:max_pages]\n"
            "    return '\\n\\n'.join(p.extract_text() or '' for p in pages)\n"
        ),
    },
    {
        "name": "image-describer",
        "version": "1.0",
        "author": "Krock's Team",
        "category": "Vision",
        "description": "Krock's OmniVision'ı sarmalayan basit caption fonksiyonu.",
        "code": (
            "def describe(b64_image, hint='Bu görseli Türkçe detaylıca açıkla.'):\n"
            "    return {\n"
            "        '__vision__': hint,\n"
            "        '__img_list__': [b64_image] if isinstance(b64_image, str) else b64_image,\n"
            "    }\n"
        ),
    },
    {
        "name": "git-helper",
        "version": "1.0",
        "author": "Krock's Team",
        "category": "Dev",
        "description": "Sık kullanılan git komutlarını sarar (commit, branch, log).",
        "code": (
            "import subprocess\n"
            "\n"
            "def run(*args):\n"
            "    r = subprocess.run(['git', *args], capture_output=True, text=True, timeout=30)\n"
            "    return r.stdout.strip() or r.stderr.strip()\n"
            "\n"
            "def status():\n"
            "    return run('status', '--short')\n"
            "\n"
            "def log(n=10):\n"
            "    return run('log', f'--oneline -n {int(n)}')\n"
            "\n"
            "def commit(msg):\n"
            "    return run('commit', '-m', msg)\n"
        ),
    },
]

def _load_customization_state(agent) -> dict:
    """DB'den customization state'i çek, yoksa default'ları yaz."""
    state = dict(_DEFAULT_CUSTOMIZATION)
    try:
        rows = agent.indexer.get_memory_by_category("customization")
        for key, val_str in rows:
            try:
                state[key] = json.loads(val_str)
            except (json.JSONDecodeError, TypeError):
                state[key] = val_str
    except Exception:
        pass
    return state

def _save_customization_state(agent, key: str, value) -> None:
    """Customization alt anahtarını DB'ye yaz."""
    try:
        agent.indexer.memorize("customization", key, value)
    except Exception as e:
        print(f"[customization save error] {key}: {e}")

# ─────────────────────────────────────────────────────────────────────────────
#  Customize helpers — iCloud / Local Files test (gerçek osascript)
# ─────────────────────────────────────────────────────────────────────────────
def _icloud_test() -> dict:
    """iCloud Drive mount kontrolü + osascript Finder sorgusu."""
    path = os.path.expanduser("~/Library/Mobile Documents/com~apple~CloudDocs")
    if not os.path.isdir(path):
        return {"ok": False, "msg": f"iCloud Drive bulunamadı: {path}"}
    try:
        n = len([f for f in os.listdir(path) if not f.startswith(".")])
    except OSError as e:
        return {"ok": False, "msg": f"iCloud okunamadı: {e}"}
    return {"ok": True, "msg": f"iCloud bağlı, {n} öğe.", "path": path}

def _local_files_test() -> dict:
    """Local Files (cwd) durumu."""
    cwd = os.getcwd()
    if not os.path.isdir(cwd):
        return {"ok": False, "msg": f"Geçersiz dizin: {cwd}"}
    return {"ok": True, "msg": f"Çalışma dizini: {cwd}", "path": cwd}

def _local_files_pick() -> str | None:
    """osascript ile kullanıcıdan dosya yolu seçtir (AppleScript choose folder)."""
    try:
        out = subprocess.check_output(
            ['osascript', '-e',
             'POSIX path of (choose folder with prompt "Select Krock\'s Workspace")'],
            stderr=subprocess.STDOUT, timeout=60
        )
        path = out.decode("utf-8", errors="ignore").strip()
        if path and os.path.isdir(path):
            return path
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
        pass
    return None

# ─────────────────────────────────────────────────────────────────────────────
#  HTML  —  Claude.ai dark theme (pixel-perfect, Geist font)
# ─────────────────────────────────────────────────────────────────────────────
_HTML = r"""<!DOCTYPE html>
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

  --t1: #e5e1d8;
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

  --sw: 280px;
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
  padding:16px 14px 12px 20px;
}
.sb-logo-text{
  font-family:var(--f-serif);font-size:16px;font-weight:500;
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
  display:flex;align-items:center;gap:10px;
  padding:8px 10px;border-radius:var(--r1);
  font-size:13.5px;font-weight:400;color:var(--t1);
  cursor:pointer;transition:background .15s;
  border:none;background:transparent;text-align:left;width:100%;
}
.sb-item:hover{background:var(--bg-hover)}
.sb-item.active{background:var(--bg-active)}
.sb-item svg{width:16px;height:16px;color:var(--t2)}
.sb-item span{flex:1}
.sb-badge-upg{font-size:10.5px;font-weight:500;color:#60a5fa;padding:2px 0;}

.sb-sec-hd{
  padding:20px 22px 6px;
  font-size:11px;font-weight:500;color:var(--t2);
}
.sb-recents{flex:1;overflow-y:auto;padding:0 12px;display:flex;flex-direction:column;gap:2px;}
.sb-rec-item{
  display:block;padding:6px 10px;border-radius:var(--r1);
  font-size:13px;color:var(--t1);cursor:pointer;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  border:none;background:transparent;text-align:left;width:100%;
}
.sb-rec-item:hover{background:var(--bg-hover)}

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

/* MAIN CONTAINER */
#main{flex:1;display:flex;flex-direction:column;position:relative;min-width:0;background:var(--bg)}

/* VIEWS */
.view-container {
  display: none;
  flex: 1;
  flex-direction: column;
  width: 100%;
  height: 100%;
  animation: fadeIn 0.2s ease;
}
.view-container.active { display: flex; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

/* CHAT VIEW */
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

#msgs{flex:1;overflow-y:auto;display:flex;flex-direction:column}

#welcome{
  flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:0 24px;min-height:0;
}
.greeting-wrap{display:flex;align-items:center;gap:12px;margin-bottom:32px}
.asterisk{font-size:32px;color:var(--accent);line-height:1}
.greeting{font-family:var(--f-serif);font-size:34px;font-weight:400;color:var(--t1);letter-spacing:0.01em}

.inp-card{
  width:100%;max-width:768px;
  background:var(--bg-card);
  border:1px solid var(--b1);
  border-radius:var(--r3);
  display:flex;flex-direction:column;
  transition:border-color .2s;
}
.inp-card:focus-within{border-color:var(--b2)}
.inp-top{padding:16px 16px 8px}
.inp-ta{
  width:100%;background:transparent;border:none;outline:none;
  color:var(--t1);font-size:18px;line-height:1.5;resize:none;
  min-height:26px;max-height:250px;scrollbar-width:none;
}
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

.mrow{display:flex;padding:24px 0}
.minner{width:100%;max-width:768px;margin:0 auto;display:flex;gap:16px;padding:0 24px}
.mav{
  width:28px;height:28px;border-radius:6px;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
}
.mrow.usr .mav{background:var(--t1);color:var(--bg);font-size:14px;font-weight:600;border-radius:50%}
.mrow.ast .mav{background:transparent;color:var(--accent);font-size:26px}
.mbody{flex:1;min-width:0;padding-top:2px}
.mtext{font-size:18px;line-height:1.6;color:var(--t1)}
.mtext.streaming::after{
  content:'▊';color:var(--accent);animation:blink .6s step-end infinite;margin-left:4px;
}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}

.cblock{border-radius:var(--r2);overflow:hidden;margin:16px 0;border:1px solid var(--b1)}
.chdr{
  display:flex;justify-content:space-between;align-items:center;
  padding:10px 14px;background:#2d2d2d;font-size:13px;color:var(--t2);font-family:var(--f-mono);
}
.mtext pre{background:#1e1e1e;padding:18px;margin:0;overflow-x:auto;font-size:15px;line-height:1.5}
.mtext pre code{font-family:var(--f-mono);color:#e2e8f0}
.mtext p{margin-bottom:16px}

#inp-area{padding:0 24px 24px;background:var(--bg);flex-shrink:0}
.inp-wrap{max-width:768px;margin:0 auto}

/* PAGE VIEWS (PROJECTS, ARTIFACTS, CHATS) */
.page-view {
  display: flex;
  flex-direction: column;
  padding: 40px 60px;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.page-title {
  font-family: var(--f-serif);
  font-size: 28px;
  color: var(--t1);
  font-weight: 500;
}
.page-actions {
  display: flex;
  gap: 12px;
}
.btn-primary {
  background: var(--t1);
  color: var(--bg);
  border: none;
  padding: 8px 16px;
  border-radius: var(--r1);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}
.btn-primary:hover { opacity: 0.9; }
.btn-secondary {
  background: var(--bg-hover);
  color: var(--t1);
  border: 1px solid var(--b1);
  padding: 8px 16px;
  border-radius: var(--r1);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.btn-secondary:hover { background: var(--bg-active); }

.search-bar {
  display: flex;
  align-items: center;
  background: var(--bg-card);
  border: 1px solid var(--b1);
  border-radius: var(--r1);
  padding: 10px 14px;
  margin-bottom: 32px;
}
.search-bar svg { width: 16px; height: 16px; color: var(--t3); margin-right: 10px; }
.search-bar input {
  background: transparent;
  border: none;
  outline: none;
  color: var(--t1);
  font-size: 14px;
  width: 100%;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  text-align: center;
  margin-top: 80px;
}
.empty-icon {
  width: 48px;
  height: 48px;
  color: var(--t1);
  margin-bottom: 20px;
}
.empty-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--t1);
  margin-bottom: 8px;
}
.empty-subtitle {
  font-size: 13px;
  color: var(--t3);
  max-width: 300px;
  line-height: 1.5;
  margin-bottom: 20px;
}

.list-container {
  display: flex;
  flex-direction: column;
}
.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid var(--b1);
  cursor: pointer;
}
.list-item:hover .item-title { color: var(--accent); }
.item-title {
  font-size: 14px;
  color: var(--t1);
  font-weight: 500;
  transition: color .2s;
}
.item-date {
  font-size: 13px;
  color: var(--t3);
}

/* SETTINGS OVERLAY */
#sp{
  position:fixed;top:0;right:0;width:320px;height:100%;
  background:var(--bg-card);border-left:1px solid var(--b1);
  transform:translateX(100%);transition:transform .25s ease;
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
      <button class="sb-btn"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg></button>
      <button class="sb-btn"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"/></svg></button>
    </div>
  </div>

  <div class="sb-nav">
    <button class="sb-item" onclick="newChat()">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
      <span>New chat</span>
    </button>
    <button class="sb-item active" id="nav-chat" onclick="showView('chat')">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
      <span>Chats</span>
    </button>
    <button class="sb-item" id="nav-projects" onclick="showView('projects')">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
      <span>Projects</span>
    </button>
    <button class="sb-item" id="nav-artifacts" onclick="showView('artifacts')">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
      <span>Artifacts</span>
    </button>
    <button class="sb-item" id="nav-code" onclick="showView('code')">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 20l4-16m4 4 4 4-4 4M6 16l-4-4 4-4"/></svg>
      <span>Code</span>
      <span class="sb-badge-upg">Upgrade</span>
    </button>
    <button class="sb-item" onclick="openSP()">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
      <span>Customize</span>
    </button>
  </div>

  <div class="sb-sec-hd">Recents</div>
  <div class="sb-recents" id="sb-recents"></div>

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
  
  <!-- CHAT VIEW (Main) -->
  <div id="view-chat" class="view-container active">
    <div id="topbar">
      <div class="top-pill" id="conn-pill">Free plan - <span>Upgrade</span></div>
    </div>
    <div id="msgs">
      <div id="welcome">
        <div class="greeting-wrap">
          <span class="asterisk">✳</span>
          <h1 class="greeting">Evening, Lord</h1>
        </div>
        <div class="inp-card">
          <div class="inp-top">
            <textarea class="inp-ta" id="inp-w" rows="1" placeholder="Type / for skills" onkeydown="onKeyW(event)" oninput="onInp(this)"></textarea>
          </div>
          <div class="inp-bot">
            <input type="file" id="fup" multiple style="display:none" onchange="handleUpload(this)">
            <button class="inp-ic" onclick="document.getElementById('fup').click()"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg></button>
            <div class="inp-spacer"></div>
            <div class="inp-model">
              <select id="msel" onchange="syncModel()">
                <option value="@preset/deepseekv4-flash" selected>DeepSeek v4 Flash</option>
                <option value="@preset/minimax-m3">MiniMax m3</option>
                <option value="@preset/mimos">MiMo-V2.5 · Auto</option>
                <option value="google/gemini-2.5-flash-preview">Gemini 2.5 Flash</option>
              </select>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </div>
            <button class="inp-ic"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg></button>
            <button class="stop-btn" id="swstop" onclick="stopGen()"><svg fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg></button>
            <button class="send-btn" id="swsend" onclick="send()"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 12h14M12 5l7 7-7 7"/></svg></button>
          </div>
        </div>
        <div class="chips">
          <button class="chip" onclick="useChip('Write a poem')"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>Write</button>
          <button class="chip" onclick="useChip('Explain quantum physics')"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>Learn</button>
          <button class="chip" onclick="useChip('Write a python script')"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>Code</button>
          <button class="chip" onclick="useChip('Plan a trip')"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>Life stuff</button>
          <button class="chip" onclick="useChip('Claude\'s choice')"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>Claude's choice</button>
        </div>
      </div>
    </div>
    <div id="inp-area" style="display:none">
      <div class="inp-wrap">
        <div class="inp-card">
          <div class="inp-top"><textarea class="inp-ta" id="inp-c" rows="1" placeholder="Write a message..." onkeydown="onKeyW(event)" oninput="onInp(this)"></textarea></div>
          <div class="inp-bot">
            <button class="inp-ic" onclick="document.getElementById('fup').click()"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg></button>
            <div class="inp-spacer"></div>
            <div class="inp-model">
              <select id="msel-c" onchange="syncModel()">
                <option value="@preset/deepseekv4-flash" selected>DeepSeek v4 Flash</option>
                <option value="@preset/minimax-m3">MiniMax m3</option>
                <option value="@preset/mimos">MiMo-V2.5 · Auto</option>
                <option value="google/gemini-2.5-flash-preview">Gemini 2.5 Flash</option>
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

  <!-- CHATS LIST VIEW -->
  <div id="view-chats-list" class="view-container">
    <div class="page-view">
      <div class="page-header">
        <h1 class="page-title">Chats</h1>
        <div class="page-actions">
          <button class="btn-secondary">Select chats</button>
          <button class="btn-primary" onclick="newChat()">New chat</button>
        </div>
      </div>
      <div class="search-bar">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <input type="text" id="search-chats" placeholder="Search chats..." onkeyup="filterChats(this.value)">
      </div>
      <div class="list-container" id="chats-list-full"></div>
    </div>
  </div>

  <!-- PROJECTS VIEW -->
  <div id="view-projects" class="view-container">
    <div class="page-view">
      <div class="page-header">
        <h1 class="page-title">Projects</h1>
        <div class="page-actions">
          <button class="btn-secondary">Sort by: Activity</button>
          <button class="btn-primary">New project</button>
        </div>
      </div>
      <div class="search-bar">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <input type="text" placeholder="Search projects...">
      </div>
      <div class="empty-state">
        <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 21H5a2 2 0 01-2-2v-4h6v6z"/></svg>
        <div class="empty-title">Looking to start a project?</div>
        <div class="empty-subtitle">Upload materials, set custom instructions, and organize conversations in one space.</div>
        <button class="btn-secondary">New project</button>
      </div>
    </div>
  </div>

  <!-- ARTIFACTS VIEW -->
  <div id="view-artifacts" class="view-container">
    <div class="page-view">
      <div class="page-header">
        <h1 class="page-title">Artifacts</h1>
        <div class="page-actions">
          <button class="btn-primary">New artifact</button>
        </div>
      </div>
      <div class="search-bar">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <input type="text" id="search-artifacts" placeholder="Search artifacts..." onkeyup="filterArtifacts(this.value)">
      </div>
      <div id="artifacts-list" class="list-container" style="display:none;"></div>
      <div class="empty-state" id="artifacts-empty">
        <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><rect x="7" y="4" width="10" height="16" rx="1"/><path stroke-linecap="round" stroke-linejoin="round" d="M7 8h10M7 12h10M7 16h4"/></svg>
        <div class="empty-title">What will you build with artifacts?</div>
        <div class="empty-subtitle">If you can dream it, you can build it. Take code, games, templates, and tools from thought to reality.</div>
        <button class="btn-secondary" onclick="wsSend({type:'get_artifacts'})">Load Index</button>
      </div>
    </div>
  </div>

  <!-- CODE VIEW -->
  <div id="view-code" class="view-container">
    <div class="page-view">
      <div class="page-header">
        <h1 class="page-title">Evolved Skills</h1>
        <div class="page-actions">
          <button class="btn-primary" onclick="wsSend({type:'get_skills'})">Refresh Skills</button>
        </div>
      </div>
      <div class="search-bar">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <input type="text" id="search-skills" placeholder="Search skills..." onkeyup="filterSkills(this.value)">
      </div>
      <div id="skills-list" class="list-container"></div>
    </div>
  </div>

</div>

<!-- OVERLAYS -->
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
  <div style="margin-bottom:8px"><label style="font-size:12px;color:var(--t2)">Max Tokens</label><input type="range" id="mkr" min="256" max="16384" step="256" value="16384" style="width:100%"></div>
  <div style="margin-bottom:8px"><label style="font-size:12px;color:var(--t2)">Geri Bildirim Derinliği</label><input type="range" id="dr" min="0" max="6" step="1" value="3" style="width:100%"></div>
</aside>
<div id="toasts"></div>

<script>
let ws=null, streaming=false, chatOn=false, aRow=null, aTxt='';
let uploadedImages = [];
let allSessions = [];
let allArtifacts = [];
let allSkills = [];

function handleUpload(input) {
  const files = input.files;
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const reader = new FileReader();
    if (f.type.startsWith('image/')) {
      reader.onload = (e) => { uploadedImages.push(e.target.result.split(',')[1]); toast('Resim eklendi: ' + f.name); };
      reader.readAsDataURL(f);
    } else {
      reader.onload = (e) => { getInp().value += `\n\n[Dosya: ${f.name}]\n${e.target.result}\n`; toast('Metin eklendi: ' + f.name); };
      reader.readAsText(f);
    }
  }
  input.value = '';
}

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
    case 'system': toast(m.text); break;
    case 'sessions': allSessions = m.sessions; renderSess(m.sessions); renderChatsList(m.sessions); break;
    case 'save_ok': toast('Kaydedildi'); reqSess(); break;
    case 'reset_ok': clearMsgs(); toast('Sıfırlandı'); break;
    case 'error': endStr(); toast(m.text,'err'); break;
    case 'history_loaded': loadHistory(m.history); break;
    case 'artifacts_data': allArtifacts = m.artifacts; renderArtifacts(m.artifacts); break;
    case 'skills_data': allSkills = m.skills; renderSkills(m.skills); break;
  }
}

function showView(viewId) {
  document.querySelectorAll('.view-container').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.sb-item').forEach(el => el.classList.remove('active'));
  
  if(viewId === 'chat') {
    document.getElementById('view-chat').classList.add('active');
    document.getElementById('nav-chat').classList.add('active');
  } else if(viewId === 'chats-list') {
    document.getElementById('view-chats-list').classList.add('active');
    document.getElementById('nav-chat').classList.add('active');
  } else {
    document.getElementById('view-' + viewId).classList.add('active');
    document.getElementById('nav-' + viewId).classList.add('active');
  }
  
  if(viewId === 'artifacts') wsSend({type:'get_artifacts'});
  if(viewId === 'code') wsSend({type:'get_skills'});
}

function loadHistory(history) {
  clearMsgs();
  document.getElementById('welcome').style.display='none';
  document.getElementById('inp-area').style.display='block';
  chatOn=true;
  showView('chat');
  
  history.forEach(item => {
    if(item.role === 'user') {
      let txt = typeof item.content === 'string' ? item.content : item.content.find(c=>c.type==='text')?.text || "[Image]";
      addUserRow(txt);
    } else if(item.role === 'assistant') {
      aRow = mkAgentRow();
      aTxt = typeof item.content === 'string' ? item.content : item.content.find(c=>c.type==='text')?.text || "";
      endStr();
    }
  });
  scrollBot();
}

function getInp(){ return chatOn ? document.getElementById('inp-c') : document.getElementById('inp-w'); }
function getModel(){ return chatOn ? document.getElementById('msel-c').value : document.getElementById('msel').value; }

function send(){
  const inp=getInp(), text=inp.value.trim();
  if((!text && uploadedImages.length===0)||streaming||!ws||ws.readyState!==WebSocket.OPEN) return;
  if(!chatOn){
    document.getElementById('welcome').style.display='none';
    document.getElementById('inp-area').style.display='block';
    chatOn=true;
  }
  addUserRow(text || "[Resim Gönderildi]"); inp.value=''; inp.style.height='auto';
  beginStr();
  wsSend({ type:'message', text, images: uploadedImages, model:getModel(),
    temperature:parseFloat(document.getElementById('tr').value),
    max_tokens:parseInt(document.getElementById('mkr').value),
    feedback_depth:parseInt(document.getElementById('dr').value),
  });
  uploadedImages = [];
  aRow=mkAgentRow(); aTxt='';
}

function stopGen(){ if(!streaming)return; wsSend({type:'stop'}); endStr(); }
function onChunk(txt){ if(!aRow)return; aTxt+=txt; const el=aRow.querySelector('.mtext'); if(el){el.innerHTML=renderMd(aTxt); scrollBot();} }
function beginStr(){ streaming=true; ['swsend','csend'].forEach(id=>{const e=document.getElementById(id);if(e)e.disabled=true;}); ['swstop','cstop'].forEach(id=>{const e=document.getElementById(id);if(e)e.classList.add('vis');}); }
function endStr(){ streaming=false; if(aRow){ const el=aRow.querySelector('.mtext'); if(el){el.classList.remove('streaming');el.innerHTML=renderMd(aTxt);} aRow=null; aTxt=''; scrollBot(); } ['swsend','csend'].forEach(id=>{const e=document.getElementById(id);if(e)e.disabled=false;}); ['swstop','cstop'].forEach(id=>{const e=document.getElementById(id);if(e)e.classList.remove('vis');}); }

function addUserRow(text){
  const m=document.getElementById('msgs'), r=document.createElement('div'); r.className='mrow usr';
  r.innerHTML=`<div class="minner"><div class="mav">L</div><div class="mbody"><div class="mtext">${esc(text).replace(/\n/g,'<br>')}</div></div></div>`;
  m.insertBefore(r, m.lastElementChild); scrollBot();
}
function mkAgentRow(){
  const m=document.getElementById('msgs'), r=document.createElement('div'); r.className='mrow ast';
  r.innerHTML=`<div class="minner"><div class="mav">✳</div><div class="mbody"><div class="mtext streaming"></div></div></div>`;
  m.insertBefore(r, m.lastElementChild); scrollBot(); return r;
}

function renderMd(raw){
  let o=raw.replace(/```(\w*)\n?([\s\S]*?)```/g,(_,lang,code)=>`<div class="cblock"><div class="chdr"><span>${lang||'text'}</span></div><pre><code>${esc(code.trim())}</code></pre></div>`);
  o=o.replace(/`([^`\n]+)`/g,'<code>$1</code>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\n{2,}/g,'</p><p>').replace(/\n/g,'<br>');
  if(!o.startsWith('<')) o='<p>'+o+'</p>'; return o;
}

function reqSess(){ wsSend({type:'list_sessions'}); }
function renderSess(list){
  const el=document.getElementById('sb-recents'); el.innerHTML='';
  if(list) list.slice().reverse().slice(0,5).forEach(s=>{
    const b=document.createElement('button'); b.className='sb-rec-item'; b.textContent=s;
    b.onclick=()=>{ wsSend({type:'load_session',name:s}); }; el.appendChild(b);
  });
}
function renderChatsList(list) {
  const el = document.getElementById('chats-list-full'); el.innerHTML = '';
  if(list) list.slice().reverse().forEach(s=>{
    const d=document.createElement('div'); d.className='list-item';
    d.innerHTML = `<span class="item-title">${s}</span><span class="item-date">Saved Session</span>`;
    d.onclick = () => { wsSend({type:'load_session',name:s}); };
    el.appendChild(d);
  });
}
function filterChats(q) {
  const list = allSessions.filter(s => s.toLowerCase().includes(q.toLowerCase()));
  renderChatsList(list);
}
function renderArtifacts(list) {
  const el = document.getElementById('artifacts-list'); el.innerHTML = '';
  document.getElementById('artifacts-empty').style.display = list.length ? 'none' : 'flex';
  el.style.display = list.length ? 'flex' : 'none';
  if(list) list.forEach(s=>{
    const d=document.createElement('div'); d.className='list-item';
    d.innerHTML = `<span class="item-title">[${s.category}] ${s.key}</span><span class="item-date">${s.ts}</span>`;
    el.appendChild(d);
  });
}
function filterArtifacts(q) {
  const list = allArtifacts.filter(s => s.key.toLowerCase().includes(q.toLowerCase()) || s.category.toLowerCase().includes(q.toLowerCase()));
  renderArtifacts(list);
}
function renderSkills(list) {
  const el = document.getElementById('skills-list'); el.innerHTML = '';
  if(list) list.forEach(s=>{
    const d=document.createElement('div'); d.className='list-item';
    d.innerHTML = `<span class="item-title">${s.name}.py</span><span class="item-date">Evolved Skill</span>`;
    el.appendChild(d);
  });
}
function filterSkills(q) {
  const list = allSkills.filter(s => s.name.toLowerCase().includes(q.toLowerCase()));
  renderSkills(list);
}

function newChat() {
  wsSend({type:'reset'}); chatOn = false;
  document.getElementById('welcome').style.display='flex';
  document.getElementById('inp-area').style.display='none';
  clearMsgs(); showView('chat');
}

function syncModel() {
  const val = getModel(); document.getElementById('msel').value = val; document.getElementById('msel-c').value = val;
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
  const c = document.getElementById('toasts'), el = document.createElement('div');
  el.className = 'toast '+type; el.textContent = msg; c.appendChild(el); setTimeout(() => el.remove(), 3000);
}
function esc(s) { const d=document.createElement('div'); d.appendChild(document.createTextNode(s)); return d.innerHTML; }
function saveSess() { wsSend({type:'save_session', name:''}); }
function resetConv() { wsSend({type:'reset'}); }
function exportChat() { wsSend({type:'export'}); }
</script>
</body>
</html>"""


# ─────────────────────────────────────────────────────────────────────────────
#  FastAPI
# ─────────────────────────────────────────────────────────────────────────────
def create_app() -> "FastAPI":
    if not _FASTAPI_OK:
        raise ImportError("pip install fastapi uvicorn")
    from contextlib import asynccontextmanager

    @asynccontextmanager
    async def _lifespan(app: "FastAPI"):
        yield
        # Shutdown: tüm background task'ları iptal et (örn. _bg_rename)
        for t in list(_bg_tasks):
            if not t.done():
                t.cancel()
        if _bg_tasks:
            await asyncio.gather(*_bg_tasks, return_exceptions=True)
        _bg_tasks.clear()

    app = FastAPI(title="Krock's Apex", lifespan=_lifespan)

    from fastapi.responses import RedirectResponse

    _vite_url = "http://127.0.0.1:5173"
    _use_vite  = os.path.isdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "krocks_ui")) \
                 and os.path.isfile(os.path.join(os.path.dirname(os.path.abspath(__file__)), "krocks_ui", "package.json"))

    @app.get("/", response_class=HTMLResponse)
    async def index():
        # If Vite dev server is likely running, redirect there
        if _use_vite:
            return RedirectResponse(url=_vite_url, status_code=302)
        dist_index = os.path.join(os.path.dirname(os.path.abspath(__file__)), "krocks_ui", "dist", "index.html")
        if os.path.exists(dist_index):
            with open(dist_index, "r", encoding="utf-8") as f:
                return HTMLResponse(f.read())
        return HTMLResponse(_HTML)
    
    dist_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "krocks_ui", "dist")
    if os.path.exists(dist_dir):
        app.mount("/assets", StaticFiles(directory=os.path.join(dist_dir, "assets")), name="assets")

    # Serve the physical images directory directly
    from krocks_main import Config
    cfg = Config()
    app.mount("/images", StaticFiles(directory=str(cfg.images_dir)), name="images")

    @app.websocket("/ws")
    async def chat_endpoint(websocket: WebSocket):
        await websocket.accept()
        agent = KrocksApexAgent()
        agent.conversation_id = None
        active_task = None

        async def tx(msg: dict):
            try: await websocket.send_json(msg)
            except Exception: pass

        await tx({"type":"system","text":f"Krock's Apex v6.3 · {agent.cfg.model_id}"})
        await tx({"type":"sessions","sessions":agent.sessions.list_sessions()})

        try:
            while True:
                raw  = await websocket.receive_text()
                data = json.loads(raw)
                t    = data.get("type","")

                if t == "choose_folder":
                    cmd = 'osascript -e "POSIX path of (choose folder with prompt \\"Select Krock\'s Workspace\\")"'
                    try:
                        proc = await asyncio.create_subprocess_shell(cmd, stdout=asyncio.subprocess.PIPE)
                        stdout, _ = await proc.communicate()
                        folder = stdout.decode().strip()
                        if folder:
                            agent.active_workspace = folder
                            if agent.history and agent.history[0]["role"] == "system":
                                sp = agent.history[0]["content"]
                                if "AKTİF ÇALIŞMA DİZİNİ:" not in sp:
                                    agent.history[0]["content"] = sp + f"\n\n[SİSTEM BİLGİSİ] AKTİF ÇALIŞMA DİZİNİ: {folder}\nBu dizinde çalışıyorsun. [CMD] komutların otomatik olarak bu dizinde çalıştırılacaktır."
                            await tx({"type": "folder_chosen", "path": folder})
                    except Exception:
                        pass
                    continue

                if t == "set_cwd":
                    folder = (data.get("path") or "").strip()
                    if folder:
                        agent.active_workspace = folder
                        if agent.history and agent.history[0]["role"] == "system":
                            sp = agent.history[0]["content"]
                            if "AKTİF ÇALIŞMA DİZİNİ:" not in sp:
                                agent.history[0]["content"] = sp + f"\n\n[SİSTEM BİLGİSİ] AKTİF ÇALIŞMA DİZİNİ: {folder}\nBu dizinde çalışıyorsun. [CMD] komutların otomatik olarak bu dizinde çalıştırılacaktır."
                            else:
                                agent.history[0]["content"] = re.sub(r'\[SİSTEM BİLGİSİ\] AKTİF ÇALIŞMA DİZİNİ:.*', f'[SİSTEM BİLGİSİ] AKTİF ÇALIŞMA DİZİNİ: {folder}\\nBu dizinde çalışıyorsun. [CMD] komutların otomatik olarak bu dizinde çalıştırılacaktır.', sp, flags=re.DOTALL)
                        await tx({"type": "folder_chosen", "path": folder})
                    continue

                if t == "list_branches":
                    ws_path = data.get("workspace")
                    if ws_path:
                        try:
                            proc = await asyncio.create_subprocess_shell("git branch", stdout=asyncio.subprocess.PIPE, cwd=ws_path)
                            stdout, _ = await proc.communicate()
                            lines = stdout.decode().splitlines()
                            branches = [b.replace("*", "").strip() for b in lines if b.strip()]
                            current = ""
                            for b in lines:
                                if b.startswith("*"): current = b.replace("*", "").strip()
                            await tx({"type": "branches_listed", "branches": branches, "current": current})
                        except Exception:
                            pass
                    continue
                    
                if t == "checkout_branch":
                    ws_path = data.get("workspace")
                    branch = data.get("branch")
                    if ws_path and branch:
                        try:
                            proc = await asyncio.create_subprocess_shell(f"git checkout {branch}", stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE, cwd=ws_path)
                            await proc.communicate()
                            # Tekrar listele
                            proc2 = await asyncio.create_subprocess_shell("git branch", stdout=asyncio.subprocess.PIPE, cwd=ws_path)
                            stdout2, _ = await proc2.communicate()
                            lines2 = stdout2.decode().splitlines()
                            branches2 = [b.replace("*", "").strip() for b in lines2 if b.strip()]
                            current2 = ""
                            for b in lines2:
                                if b.startswith("*"): current2 = b.replace("*", "").strip()
                            await tx({"type": "branches_listed", "branches": branches2, "current": current2})
                        except Exception:
                            pass
                    continue


                if t == "message":
                    text = data.get("text","").strip()
                    images = data.get("images", [])
                    if not text and not images: continue
                    for key, setter in [
                        ("model",          lambda: setattr(agent.cfg,"model_id",data["model"])),
                        ("temperature",    lambda: setattr(agent.cfg,"temperature",float(data.get("temperature",agent.cfg.temperature)))),
                        ("max_tokens",     lambda: setattr(agent.cfg,"max_tokens",int(data.get("max_tokens",agent.cfg.max_tokens)))),
                        ("feedback_depth", lambda: setattr(agent.cfg,"feedback_depth",int(data.get("feedback_depth",agent.cfg.feedback_depth)))),
                    ]:
                        if key in data:
                            try: setter()
                            except Exception: pass
                    
                    if "system_prompt" in data and agent.history and agent.history[0]["role"] == "system":
                        agent.history[0]["content"] = data["system_prompt"]
                        
                    if "workspace" in data and data["workspace"]:
                        ws_path = data["workspace"]
                        agent.active_workspace = ws_path
                        if agent.history and agent.history[0]["role"] == "system":
                            sp = agent.history[0]["content"]
                            if "AKTİF ÇALIŞMA DİZİNİ:" not in sp:
                                agent.history[0]["content"] = sp + f"\n\n[SİSTEM BİLGİSİ] AKTİF ÇALIŞMA DİZİNİ: {ws_path}\nBu dizinde çalışıyorsun. [CMD] komutların otomatik olarak bu dizinde çalıştırılacaktır."
                            else:
                                agent.history[0]["content"] = re.sub(r'\[SİSTEM BİLGİSİ\] AKTİF ÇALIŞMA DİZİNİ:.*', f'[SİSTEM BİLGİSİ] AKTİF ÇALIŞMA DİZİNİ: {ws_path}\\nBu dizinde çalışıyorsun. [CMD] komutların otomatik olarak bu dizinde çalıştırılacaktır.', sp, flags=re.DOTALL)

                    if not agent.cfg.api_key:
                        await tx({"type":"error","text":"API anahtarı eksik! .env dosyasında KROCKS_API_KEY'i ayarlayın."})
                        continue
                    if text.startswith("!"):
                        if active_task and not active_task.done():
                            active_task.cancel()
                        agent._gen += 1
                        active_task = asyncio.create_task(_hotkey(text, agent, tx))
                    else:
                        if active_task and not active_task.done():
                            active_task.cancel()
                        agent._gen += 1
                        active_task = asyncio.create_task(_stream(text, agent, tx, images=images))

                elif t == "config":
                    if "model" in data: agent.cfg.model_id = data["model"]
                    if "system_prompt" in data and agent.history and agent.history[0]["role"] == "system":
                        agent.history[0]["content"] = data["system_prompt"]
                elif t == "reset":
                    # Önce aktif streaming task'ı iptal et (aksi halde arka planda
                    # tamamlanan eski stream agent.history'ye yazıp yeni context'i kirletir)
                    if active_task and not active_task.done():
                        active_task.cancel()
                        try:
                            await active_task
                        except asyncio.CancelledError:
                            pass
                    active_task = None
                    agent._gen += 1
                    agent.history = [agent.history[0]]
                    agent.conversation_id = None
                    agent._fb_seen.clear()
                    await tx({"type":"reset_ok"})
                elif t == "list_sessions":
                    await tx({"type":"sessions","sessions":agent.sessions.list_sessions()})
                elif t == "delete_session":
                    conv_id = data.get("name") or data.get("id", "")
                    agent.sessions.delete(conv_id)
                    if agent.conversation_id == conv_id:
                        # Aynı reset mantığı: aktif task'ı durdur, history'yi temizle
                        if active_task and not active_task.done():
                            active_task.cancel()
                            try:
                                await active_task
                            except asyncio.CancelledError:
                                pass
                        active_task = None
                        agent._gen += 1
                        agent.history = [agent.history[0]]
                        agent.conversation_id = None
                        agent._fb_seen.clear()
                        await tx({"type":"reset_ok"})
                    await tx({"type":"sessions","sessions":agent.sessions.list_sessions()})
                elif t == "save_session":
                    # React auto-save (Home.jsx) sends {name, mode}. mode is 'code' or 'chat'.
                    # We honor mode by prefixing the title with "Code " so the recents list
                    # can render the code icon (Sidebar.jsx checks for the "Code_" prefix).
                    name = (data.get("name") or "").strip()
                    mode = (data.get("mode") or "").strip()
                    is_code = (mode == "code")

                    if agent.conversation_id:
                        # Active conversation exists — update its title
                        current = agent.sessions.get_title(agent.conversation_id) or ""
                        if is_code and not current.startswith("Code "):
                            # Promote chat session to code session: prepend the prefix
                            base = current or "Yeni Sohbet"
                            new_title = f"Code {base}"
                            agent.sessions.update_title(agent.conversation_id, new_title)
                            name = new_title
                        else:
                            # Already code, or chat mode — keep current title
                            name = current
                    else:
                        # No active conversation — create one with the right prefix
                        if is_code:
                            name = "Code Yeni Sohbet"
                        else:
                            name = "Yeni Sohbet"
                        agent.conversation_id = agent.sessions.create_conversation(name)

                    await tx({"type": "sessions", "sessions": agent.sessions.list_sessions()})
                    await tx({"type": "save_ok", "name": name})
                elif t == "load_session":
                    conv_id = data.get("name") or data.get("id", "")
                    try:
                        agent.history = agent.sessions.load(conv_id)
                        agent.conversation_id = conv_id
                        await tx({"type":"system","text":"Oturum yüklendi."})
                        await tx({"type":"history_loaded", "history": agent.history})
                    except Exception as e:
                        await tx({"type":"error","text":str(e)})
                elif t == "take_screenshot":
                    import tempfile
                    import os
                    import base64
                    import uuid
                    try:
                        tmp_path = os.path.join(tempfile.gettempdir(), f"krocks_ss_{uuid.uuid4().hex}.png")
                        proc = await asyncio.create_subprocess_exec(
                            "screencapture", "-i", "-x", tmp_path,
                            stdout=asyncio.subprocess.PIPE,
                            stderr=asyncio.subprocess.PIPE
                        )
                        await proc.communicate()
                        if os.path.exists(tmp_path):
                            with open(tmp_path, "rb") as f:
                                b64 = base64.b64encode(f.read()).decode("utf-8")
                            os.remove(tmp_path)
                            await tx({"type":"status", "ok": True, "text": "Ekran görüntüsü eklendi."})
                            # Send back a custom event or just a fake chunk to put it in the UI?
                            # Wait, the frontend needs to receive it somehow.
                            await tx({"type":"screenshot_taken", "base64": f"data:image/png;base64,{b64}"})
                        else:
                            await tx({"type":"status", "ok": False, "text": "Ekran görüntüsü iptal edildi."})
                    except Exception as e:
                        await tx({"type":"error", "text": f"Screenshot hatası: {e}"})
                elif t == "list_projects":
                    await tx({"type":"projects","projects":agent.projects.list_projects()})
                elif t == "create_project":
                    name = data.get("name","").strip()
                    desc = data.get("description","").strip()
                    if name:
                        new_proj = agent.projects.create(name, desc)
                        await tx({"type":"projects","projects":agent.projects.list_projects()})
                        await tx({"type":"project_created","project":new_proj})
                elif t == "update_project":
                    proj_id = data.get("id","")
                    updates = data.get("updates", {})
                    if proj_id and updates:
                        agent.projects.update(proj_id, updates)
                        await tx({"type":"projects","projects":agent.projects.list_projects()})
                elif t == "delete_project":
                    proj_id = data.get("id","")
                    if proj_id:
                        agent.projects.delete(proj_id)
                        await tx({"type":"projects","projects":agent.projects.list_projects()})
                elif t == "get_artifacts":
                    rows = []
                    if _MODULES_OK and hasattr(agent, 'indexer'):
                        try:
                            rows = agent.indexer.get_all_memory()
                        except Exception:
                            pass
                    artifacts = [{"category": r[0], "key": r[1], "value": r[2], "ts": r[3]} for r in rows]
                    await tx({"type":"artifacts_data", "artifacts": artifacts})
                elif t == "get_skills":
                    skills = []
                    skills_dir = Path("skills")
                    skills_dir.mkdir(exist_ok=True)
                    for f in skills_dir.glob("*.*"):
                        if f.is_file() and f.suffix in ['.py', '.md', '.txt', '.json']:
                            skills.append({"name": f.stem, "content": f.read_text(encoding="utf-8")})
                    await tx({"type":"skills_data", "skills": skills})
                elif t == "get_connectors":
                    connectors = []
                    conn_dir = Path("connectors")
                    conn_dir.mkdir(exist_ok=True)
                    for f in conn_dir.glob("*.*"):
                        if f.is_file() and f.suffix in ['.py', '.md', '.txt', '.json']:
                            connectors.append({"name": f.stem, "content": f.read_text(encoding="utf-8")})
                    await tx({"type":"connectors_data", "connectors": connectors})
                elif t == "get_plugins":
                    plugins = []
                    plugins_dir = Path("plugins")
                    plugins_dir.mkdir(exist_ok=True)
                    for f in plugins_dir.glob("*.*"):
                        if f.is_file() and f.suffix in ['.py', '.md', '.txt', '.json']:
                            plugins.append({"name": f.stem, "content": f.read_text(encoding="utf-8")})
                    await tx({"type":"plugins_data", "plugins": plugins})

                # ── Customize panel handler'ları ─────────────────────────
                elif t == "get_customization":
                    state = _load_customization_state(agent)
                    # Memory facts'ı da ekle (indexer'dan canlı çek)
                    try:
                        state["memory"] = agent.indexer.list_facts()
                    except Exception:
                        state["memory"] = []
                    # Installed plugin isimleri (skills/ dizininden)
                    installed = []
                    if _MODULES_OK and hasattr(agent, 'evolution'):
                        try:
                            installed = [s["name"] for s in agent.evolution.list_skills()]
                        except Exception:
                            pass
                    state["installedPlugins"] = installed
                    await tx({"type":"customization_data", "state": state})

                elif t == "save_settings":
                    patch = data.get("patch", {})
                    if not isinstance(patch, dict):
                        patch = {}
                    state = _load_customization_state(agent)
                    cur = state.get("settings", {})
                    if not isinstance(cur, dict):
                        cur = dict(_DEFAULT_CUSTOMIZATION["settings"])
                    cur.update(patch)
                    state["settings"] = cur
                    _save_customization_state(agent, "settings", cur)
                    # Canlı agent state'ine yansıt
                    try:
                        if "temperature" in patch and hasattr(agent, "cfg"):
                            agent.cfg.temperature = float(patch["temperature"])
                        if "maxTokens" in patch and hasattr(agent, "cfg"):
                            agent.cfg.max_tokens = int(patch["maxTokens"])
                        if "feedbackDepth" in patch and hasattr(agent, "cfg"):
                            agent.cfg.feedback_depth = int(patch["feedbackDepth"])
                    except Exception:
                        pass
                    await tx({"type":"customization_saved","key":"settings"})

                elif t == "save_connector":
                    name = (data.get("name") or "").strip()
                    status_in = data.get("status")
                    config = data.get("config")
                    if name:
                        state = _load_customization_state(agent)
                        conns = state.get("connectors") or {}
                        if not isinstance(conns, dict):
                            conns = dict(_DEFAULT_CUSTOMIZATION["connectors"])
                        entry = conns.get(name) or {"status": "disconnected", "config": {}, "lastTest": None}
                        if status_in in ("connected", "disconnected", "error"):
                            entry["status"] = status_in
                        if isinstance(config, dict):
                            entry["config"] = config
                        conns[name] = entry
                        state["connectors"] = conns
                        _save_customization_state(agent, "connectors", conns)
                        await tx({"type":"customization_saved","key":"connectors"})

                elif t == "test_connector":
                    name = (data.get("name") or "").strip()
                    result = {"ok": False, "msg": "Bilinmeyen connector."}
                    if name == "icloud":
                        result = _icloud_test()
                    elif name == "local_files":
                        result = _local_files_test()
                    else:
                        # Mock connector'lar için: config.token varsa OK, yoksa FAIL
                        state = _load_customization_state(agent)
                        entry = (state.get("connectors") or {}).get(name, {})
                        token = (entry.get("config") or {}).get("token", "")
                        if token and len(token) >= 8:
                            result = {"ok": True, "msg": f"{name} mock bağlantısı başarılı (token: ****{token[-4:]})."}
                        else:
                            result = {"ok": False, "msg": f"{name} için geçerli bir token gerekli."}
                    # lastTest'i güncelle
                    try:
                        state = _load_customization_state(agent)
                        conns = state.get("connectors") or {}
                        if name in conns:
                            conns[name]["lastTest"] = {"ok": result["ok"], "ts": time.time(), "msg": result["msg"]}
                            state["connectors"] = conns
                            _save_customization_state(agent, "connectors", conns)
                    except Exception:
                        pass
                    await tx({"type":"connector_test_result","name":name,"result":result})

                elif t == "delete_skill":
                    name = (data.get("name") or "").strip()
                    if name and _MODULES_OK and hasattr(agent, "evolution"):
                        res = agent.evolution.delete_skill(name)
                        await tx({"type":"skill_deleted","name":name,"ok":res["ok"],"msg":res["msg"]})
                        if res["ok"]:
                            await tx({"type":"skills_data","skills":agent.evolution.list_skills()})

                elif t == "update_skill":
                    name = (data.get("name") or "").strip()
                    code = data.get("code", "")
                    if name and _MODULES_OK and hasattr(agent, "evolution"):
                        res = agent.evolution.update_skill_code(name, code)
                        await tx({"type":"skill_updated","name":name,"ok":res["ok"],"msg":res["msg"]})
                        if res["ok"]:
                            await tx({"type":"skills_data","skills":agent.evolution.list_skills()})

                elif t == "test_skill":
                    name = (data.get("name") or "").strip()
                    func = (data.get("function") or "main").strip()
                    args_raw = data.get("args", [])
                    if name and _MODULES_OK and hasattr(agent, "evolution"):
                        try:
                            args = args_raw if isinstance(args_raw, list) else [args_raw]
                            out = agent.evolution.execute_skill(name, func, *args)
                            out_str = str(out)
                            if len(out_str) > 4000:
                                out_str = out_str[:4000] + "…(kırpıldı)"
                            await tx({"type":"skill_test_result","name":name,"ok":True,"output":out_str})
                        except Exception as e:
                            await tx({"type":"skill_test_result","name":name,"ok":False,"output":str(e)})

                elif t == "browse_plugins":
                    # Installed olanları işaretle
                    installed = set()
                    if _MODULES_OK and hasattr(agent, "evolution"):
                        try:
                            installed = {s["name"] for s in agent.evolution.list_skills()}
                        except Exception:
                            pass
                    items = []
                    for p in _PLUGIN_REGISTRY:
                        items.append({
                            "name":        p["name"],
                            "version":     p["version"],
                            "author":      p["author"],
                            "category":    p["category"],
                            "description": p["description"],
                            "size":        len(p["code"]),
                            "installed":   p["name"] in installed,
                        })
                    await tx({"type":"plugin_registry","plugins":items})

                elif t == "install_plugin":
                    name = (data.get("name") or "").strip()
                    plugin = next((p for p in _PLUGIN_REGISTRY if p["name"] == name), None)
                    if plugin and _MODULES_OK and hasattr(agent, "evolution"):
                        msg = agent.evolution.write_and_learn_skill(plugin["name"], plugin["code"])
                        ok = "Başarılı" in msg
                        await tx({"type":"plugin_installed","name":name,"ok":ok,"msg":msg})
                        if ok:
                            await tx({"type":"skills_data","skills":agent.evolution.list_skills()})
                    elif not plugin:
                        await tx({"type":"plugin_installed","name":name,"ok":False,"msg":"Plugin registry'de yok."})

                elif t == "uninstall_plugin":
                    name = (data.get("name") or "").strip()
                    if name and _MODULES_OK and hasattr(agent, "evolution"):
                        res = agent.evolution.delete_skill(name)
                        await tx({"type":"plugin_uninstalled","name":name,"ok":res["ok"],"msg":res["msg"]})
                        if res["ok"]:
                            await tx({"type":"skills_data","skills":agent.evolution.list_skills()})

                elif t == "list_memory":
                    cat = data.get("category") or None
                    try:
                        facts = agent.indexer.list_facts(cat)
                    except Exception:
                        facts = []
                    await tx({"type":"memory_facts","facts":facts,"category":cat or "all"})

                elif t == "add_memory":
                    cat_in = (data.get("category") or "user_prefs").strip()
                    content = (data.get("content") or "").strip()
                    if content and cat_in in ("user_prefs", "project_info", "code_conventions", "memory"):
                        try:
                            kid = agent.indexer.add_fact(cat_in, content, "user")
                            await tx({"type":"memory_added","id":kid,"ok":bool(kid)})
                            if kid:
                                await tx({"type":"memory_facts","facts":agent.indexer.list_facts(),"category":"all"})
                        except Exception as e:
                            await tx({"type":"memory_added","ok":False,"msg":str(e)})

                elif t == "delete_memory":
                    kid = (data.get("id") or "").strip()
                    if kid:
                        try:
                            ok = agent.indexer.delete_memory(kid)
                            await tx({"type":"memory_deleted","id":kid,"ok":ok})
                            if ok:
                                await tx({"type":"memory_facts","facts":agent.indexer.list_facts(),"category":"all"})
                        except Exception as e:
                            await tx({"type":"memory_deleted","id":kid,"ok":False,"msg":str(e)})
                elif t == "export":
                    md = agent._to_markdown()
                    fname = f"krocks_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
                    Path(fname).write_text(md, encoding="utf-8")
                    await tx({"type":"system","text":f"Aktarıldı: {fname}"})
                elif t == "check_status":
                    ok = await agent.api.ping()
                    await tx({"type":"status_result","ok":ok,"text":"✅ API erişilebilir" if ok else "❌ API erişilemiyor"})
                elif t == "abort":
                    if active_task and not active_task.done():
                        active_task.cancel()
                        await tx({"type":"system","text":"İşlem durduruldu."})
                elif t == "stop":
                    pass  # client handles visually

        except WebSocketDisconnect:
            pass
        except Exception as exc:
            try: await tx({"type":"error","text":str(exc)})
            except Exception: pass
        finally:
            await agent._cleanup()

    return app


async def _hotkey(cmd: str, agent: KrocksApexAgent, tx) -> None:
    async def reply(text: str):
        await tx({"type":"chunk","text":text})
        await tx({"type":"done","tokens":max(10,len(text)//4),"elapsed":0.05})

    if cmd == "!help":
        await reply("## Komutlar\n\n- `!help` — Bu yardım\n- `!reset` — Sohbet sıfırla\n- `!sessions` — Oturum listesi\n- `!tokens` — Token kullanımı\n- `!model <id>` — Model değiştir\n- `!status` — API durumu\n- `!memory` — Hafıza")
    elif cmd == "!sessions":
        ss = agent.sessions.list_sessions()
        await reply("## Kayıtlı Oturumlar\n\n" + ("\n".join(f"- `{s}`" for s in ss) if ss else "_Oturum yok_"))
    elif cmd == "!tokens":
        total = sum(rough_tokens(_content_str(m["content"])) for m in agent.history)
        await reply(f"Tahmini token: **~{total:,}** ({len(agent.history)} mesaj)")
    elif cmd == "!reset":
        from pathlib import Path
        for msg in agent.history[1:]:
            if isinstance(msg.get("content"), list):
                for item in msg["content"]:
                    if isinstance(item, dict) and item.get("type") == "image_url":
                        url = item.get("image_url", {}).get("url", "")
                        if url.startswith("/images/"):
                            img_path = agent.cfg.images_dir / url.split("/")[-1]
                            if img_path.exists():
                                img_path.unlink()
        agent._gen += 1
        agent.history = [agent.history[0]]; agent._fb_seen.clear()
        await tx({"type":"reset_ok"})
    elif cmd == "!status":
        ok = await agent.api.ping()
        await reply("API erişilebilir" if ok else "API erişilemiyor")
    elif cmd.startswith("!model"):
        parts = cmd.split(None, 1)
        if len(parts) >= 2:
            agent.cfg.model_id = parts[1].strip()
            await reply(f"Model değiştirildi: `{agent.cfg.model_id}`")
        else:
            await reply(f"Aktif model: `{agent.cfg.model_id}`")
    elif cmd == "!memory":
        if not _MODULES_OK:
            await reply("Hafıza modülü yüklenemedi: "+_MODULE_ERROR); return
        try:
            rows = agent.indexer.get_all_memory()
            if not rows:
                await reply("Hafıza boş.")
            else:
                lines = ["## Krock's Hafıza İndeksi\n"]
                for cat,key,val,ts in rows:
                    lines.append(f"- **[{cat}]** `{key}` — {ts}")
                await reply("\n".join(lines))
        except Exception as e:
            await reply(f"Hafıza sorgu hatası: {e}")
    else:
        await reply(f"Bilinmeyen komut: `{cmd}` — `!help` yazın.")


async def _stream(prompt: str, agent: KrocksApexAgent, tx, depth: int = 0, images: list[str] = None) -> None:
    import traceback
    _my_gen = agent._gen
    try:
        content_items = [{"type": "text", "text": prompt}]
        if images and agent.cfg.enable_file_upload:
            for img in images:
                url = img if img.startswith("data:") else f"data:image/png;base64,{img}"
                content_items.append({"type": "image_url", "image_url": {"url": url}})
        
        content = content_items if len(content_items) > 1 else prompt
        agent._push("user", content)
        
        if getattr(agent, "conversation_id", None) is None:
            agent.conversation_id = agent.sessions.create_conversation("Yeni Sohbet")
            await tx({"type":"sessions","sessions":agent.sessions.list_sessions()})
            
        agent.sessions.add_message(agent.conversation_id, "user", content)
        
        full = ""; t0 = time.monotonic()
    
        try:
            async for chunk in agent.api.stream(agent.history):
                if agent._gen != _my_gen:
                    return
                full += chunk
                await tx({"type":"chunk","text":chunk})
        except RuntimeError as exc:
            await tx({"type":"error","text":str(exc)})
            if agent.history and agent.history[-1]["role"] == "user":
                msg = agent.history[-1]
                if isinstance(msg.get("content"), list):
                    for item in msg["content"]:
                        if isinstance(item, dict) and item.get("type") == "image_url":
                            url = item.get("image_url", {}).get("url", "")
                            if url.startswith("/images/"):
                                img_path = agent.cfg.images_dir / url.split("/")[-1]
                                if img_path.exists():
                                    try: img_path.unlink()
                                    except: pass
                agent.history.pop()
            return
            
        if not full.strip():
            await tx({"type":"error","text":"Yanıt alınamadı."})
            if agent.history and agent.history[-1]["role"] == "user":
                msg = agent.history[-1]
                if isinstance(msg.get("content"), list):
                    for item in msg["content"]:
                        if isinstance(item, dict) and item.get("type") == "image_url":
                            url = item.get("image_url", {}).get("url", "")
                            if url.startswith("/images/"):
                                img_path = agent.cfg.images_dir / url.split("/")[-1]
                                if img_path.exists():
                                    try: img_path.unlink()
                                    except: pass
                agent.history.pop()
            return

        elapsed = time.monotonic() - t0
        tokens  = rough_tokens(full)
        if agent._gen != _my_gen:
            return
        agent._push("assistant", full)
        
        if getattr(agent, "conversation_id", None):
            agent.sessions.add_message(agent.conversation_id, "assistant", full)
            if len(agent.history) == 3:
                async def _bg_rename():
                    new_name = await agent.sessions.auto_name(agent.history, agent.api)
                    if new_name:
                        # Preserve the "Code " prefix if this is a code-mode session
                        # (the React frontend's save_session handler sets the prefix,
                        #  the LLM auto-namer would otherwise overwrite it).
                        current_title = agent.sessions.get_title(agent.conversation_id) or ""
                        if current_title.startswith("Code ") and not new_name.startswith("Code "):
                            new_name = f"Code {new_name}"
                        agent.sessions.update_title(agent.conversation_id, new_name)
                        await tx({"type":"sessions","sessions":agent.sessions.list_sessions()})
                _track_bg_task(_bg_rename())
                
        clean, actions = parse_actions(full)

        for act in actions:
            await tx({"type":"action","tag":act.tag.value,"data":act.data,"status":"pending"})

        await tx({"type":"done","tokens":tokens,"elapsed":round(elapsed,2)})

        if actions:
            feedbacks = []
            for act in actions:
                await tx({"type":"action","tag":act.tag.value,"data":act.data,"status":"running"})
                fb = await agent._execute(act)
                status = "err" if isinstance(fb,str) and fb.startswith("[Hata") else "ok"
                await tx({"type":"action","tag":act.tag.value,"data":act.data,"status":status})
                if fb is not None: feedbacks.append(fb)
                await asyncio.sleep(0.08)

            text_fbs = []
            vision_fbs = []
            for fb in feedbacks:
                if isinstance(fb, dict) and "__vision__" in fb:
                    vision_fbs.append(fb)
                elif isinstance(fb, str) and fb.strip() and not agent._seen_feedback(fb):
                    text_fbs.append(fb)
                    
            for fb in vision_fbs:
                await tx({"type":"system","text":"Ekran analizi…"})
                await _stream(f"Ekran analizi: {fb['__vision__']}", agent, tx, depth+1)
                
            if text_fbs:
                combined_fb = "\n\n---\n\n".join(text_fbs)
                await _stream(combined_fb, agent, tx, depth+1)
                    
    except Exception as exc:
        traceback.print_exc()
        try: await tx({"type":"error","text":f"Sistem Hatası: {exc}"})
        except: pass


# ─────────────────────────────────────────────────────────────────────────────
#  Entry point
# ─────────────────────────────────────────────────────────────────────────────
def run_web_server(port: int = 7860, host: str = "127.0.0.1") -> None:
    import subprocess, threading, webbrowser

    if not _FASTAPI_OK:
        print("❌  pip install fastapi uvicorn")
        sys.exit(1)

    app = create_app()

    # ── Launch Vite dev server if krocks_ui exists ────────────────────────────
    base_dir  = os.path.dirname(os.path.abspath(__file__))
    ui_dir    = os.path.join(base_dir, "krocks_ui")
    vite_proc = None
    ui_port   = 5173

    if os.path.isdir(ui_dir) and os.path.isfile(os.path.join(ui_dir, "package.json")):
        print(f"  ⚡  Vite dev server başlatılıyor… (krocks_ui/)")
        try:
            vite_proc = subprocess.Popen(
                ["npm", "run", "dev"],
                cwd=ui_dir,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            # Wait until Vite is actually accepting connections (up to 10s)
            import socket as _sock
            for _ in range(40):
                try:
                    s = _sock.create_connection(("127.0.0.1", ui_port), timeout=0.25)
                    s.close()
                    break
                except OSError:
                    time.sleep(0.25)
            print(f"  ✅  Vite: http://localhost:{ui_port}")

        except FileNotFoundError:
            print("  ⚠  npm bulunamadı — Vite başlatılamadı.")
            vite_proc = None
    else:
        print(f"  ⚠  krocks_ui/ bulunamadı — sadece Python dist sunuluyor.")

    display_host = "localhost" if host == "127.0.0.1" else host
    print(f"\n  🤖  Krock's Apex (API) → http://{display_host}:{port}")
    if vite_proc:
        print(f"  🌐  Arayüz (Vite)     → http://localhost:{ui_port}")
    print()

    open_url = f"http://localhost:{ui_port}" if vite_proc else f"http://{display_host}:{port}"
    def _open(): time.sleep(3.0); webbrowser.open(open_url)
    threading.Thread(target=_open, daemon=True).start()
    print(f"  🌐  Tarayıcı açılıyor: {open_url}")

    try:
        uvicorn.run(app, host=host, port=port, log_level="warning")
    finally:
        if vite_proc:
            vite_proc.terminate()
            print("  🛑  Vite durduruldu.")

