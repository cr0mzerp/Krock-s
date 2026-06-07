# Krock's Apex — Autonomous macOS AI Agent (v6.3)

**macOS 14+ (Apple Silicon M-series)** — Ultra-optimized, self-evolving, token-efficient AI agent deeply integrated with macOS via `CoreGraphics`, `OSAKit`, `Quartz`, and `AppleScript/JXA`.

Streams API responses from **OpenRouter**, parses XML-style action tags, executes commands recursively, and dynamically writes/runtime-imports its own Python skills.

---

## Core Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Krock's Apex v6.3                          │
├──────────────────────────────────────────────────────────────────┤
│                        KrocksApexAgent (Core)                     │
│     ┌─────────────┐   ┌──────────────┐   ┌──────────────────┐   │
│     │ Terminal TUI│──▶│Action Parser │──▶│ Web UI (FastAPI) │   │
│     │   (Rich)    │   │ & Dispatcher │   │  + React (Vite)  │   │
│     └─────────────┘   └──────┬───────┘   └──────────────────┘   │
│                              │                                    │
│     ┌────────────────────────┴────────────────────────────┐      │
│     │                    Action Executors                  │      │
│     │                                                     │      │
│     │  [CMD]    ──▶ KrocksInterpreter    (sandboxed sh)   │      │
│     │  [JXA]    ──▶ NativeOSBridge       (OSAKit memory)  │      │
│     │  [TYPE]   ──▶ UIManipulator        (CoreGraphics)   │      │
│     │  [MOUSE]  ──▶ UIManipulator        (CGEvent mouse)  │      │
│     │  [VISION] ──▶ OmniSight            (Quartz capture) │      │
│     │  [WEB]    ──▶ UltraWebEngine       (search / fetch) │      │
│     │  [EVOLVE] ──▶ EvolutionEngine      (dynamic import) │      │
│     │  [USE]    ──▶ EvolutionEngine      (skill dispatch) │      │
│     │  [ASK]    ──▶ frontend modal       (user prompt)    │      │
│     └────────────────────────┬────────────────────────────┘      │
│                              │                                    │
│                    ┌─────────┴──────────┐                        │
│                    │   OmniIndexer      │                        │
│                    │ (SQLite memory DB) │                        │
│                    └────────────────────┘                        │
└──────────────────────────────────────────────────────────────────┘
```

---

## Modules

### Core (`krocks_main.py`)
Orchestrator: REPL loop, env-driven `Config`, `APIClient` (HTTPX streaming with exponential backoff), `Renderer` (Rich TUI dashboard), `SessionManager` (JSON save/load). Parses action tags via `_PATTERNS` and dispatches to executors. Supports `--web`, `--voice`, `--debug` flags.

### Execution & Security (`krocks_interpreter.py`)
- `execute_shell_async` — sandboxed shell via `asyncio.create_subprocess_exec`, 30s timeout, 24-command blocklist (`rm`, `sudo`, `curl`, `ssh`, `kill`, etc.)
- `execute_python_dynamically` — restricted `exec()` with dangerous builtins stripped (`__import__`, `open`, `exec`, `eval`, `compile`)

### Native OS Bridge (`krocks_native_bridge.py`)
- JXA execution via `OSAKit.OSAScript` in-memory (no temp files, no `osascript` spawn)
- Spotlight metadata queries via `mdfind`

### UI Manipulator (`krocks_accessibility.py`)
- Hardware keystroke injection via `CGEvent` (handles US/TR keyboard layouts)
- Modifier syntax: `<cmd+space>`, `<shift+enter>`, etc.
- Mouse actions: `click`, `doubleclick`, `rightclick`, `move`, `drag`

### Vision (`krocks_vision.py`)
- Screen capture via `Quartz.CGDisplayCreateImage` → `NSBitmapImageRep` → base64 PNG
- Multi-monitor support via `CGGetActiveDisplayList`

### Web Engine (`krocks_web_engine.py`)
- `UltraWebEngine.search()` — DuckDuckGo HTML search, returns parsed results
- `UltraWebEngine.fetch()` — URL download with Google Cache fallback on 403

### Evolution Engine (`krocks_evolution.py`)
- Writes AI-generated Python to `skills/<name>.py`, `importlib.reload`s into live process
- Persistent storage in SQLite via `OmniIndexer`
- Skill names sanitized with `os.path.basename` + `r'[^\w\-]'` regex

### Persistent Memory (`krocks_indexer.py`)
- `OmniIndexer` — thread-safe SQLite wrapper, `system_knowledge` table (category, key_name UNIQUE, value_data JSON, last_updated)

### Web UI (`krocks_web.py` + `krocks_ui/`)
- FastAPI server with `WebSocket`-based streaming
- Optional React frontend (`krocks_ui/`) with Tailwind — build to `krocks_ui/dist/`
- Embedded HTML fallback (`_HTML` in `krocks_web.py`)
- Views: Chats, Customize, Models, Memory, Plugins, Connectors, Skills, Artifacts, Projects, Project Dashboard

---

## Action Protocol

Tags the LLM emits; `parse_actions` strips them from visible text and dispatches:

| Tag | Executor | Purpose |
| :--- | :--- | :--- |
| `[CMD]` | `KrocksInterpreter` | Sandboxed shell command |
| `[JXA]` | `NativeOSBridge` | AppleScript/JXA via OSAKit |
| `[TYPE]` | `UIManipulator` | Hardware keystroke injection |
| `[MOUSE]` | `UIManipulator` | Mouse click/drag/move |
| `[VISION]` | `OmniSight` | Screen capture + analysis |
| `[WEB]` | `UltraWebEngine` | Web search / URL fetch |
| `[EVOLVE]` | `EvolutionEngine` | Write + dynamically import skill |
| `[USE]` | `EvolutionEngine` | Execute previously learned skill |
| `[ASK]` | Frontend | Show modal prompting user for input |

---

## Quick Start

```bash
# Install deps
pip install rich httpx fastapi uvicorn pyobjc

# Configure API key
echo 'KROCKS_API_KEY="sk-or-v1-..."' > .env
echo 'KROCKS_MODEL="anthropic/claude-opus-4"' >> .env

# Run
python krocks_main.py           # Terminal TUI
python krocks_main.py --web     # Web UI (http://127.0.0.1:7860)
python krocks_main.py --voice   # Voice mode (macOS say)
python krocks_main.py --debug   # Debug logging
```

### React Frontend

```bash
cd krocks_ui
npm install
npm run dev       # Vite dev server
npm run build     # production build → krocks_ui/dist/
```

---

## Recursive Feedback Loop

`KrocksApexAgent._turn(prompt, img_b64, depth)` streams response → parses actions → executes each → collects feedback → recurses with feedback as next user turn. Terminates when no actions returned, depth exceeds `feedback_depth`, or duplicate feedback detected via `_seen_feedback`.

History trimming: `_push` keeps system prompt + last `history_max // 2` turns, injects `[Geçmiş kırpıldı]` marker. Token estimation via `len(utf8) // 4`.

---

## Configuration

`.env` file (required):
| Variable | Default | Description |
| :--- | :--- | :--- |
| `KROCKS_API_KEY` | — | OpenRouter API key |
| `KROCKS_MODEL` | `anthropic/claude-opus-4` | Model string |
| `KROCKS_MAX_TOKENS` | `4096` | Max completion tokens |
| `KROCKS_TEMP` | `0.7` | Temperature |
| `KROCKS_FEEDBACK_DEPTH` | `5` | Max recursion depth |
| `KROCKS_HISTORY_MAX` | `65536` | Max history chars |

---

## Security

- **Accessibility permission** required for `[TYPE]`/`[MOUSE]` (System Settings → Privacy → Accessibility)
- **Command blocklist**: 24 dangerous commands intercepted pre-execution
- **Skill sanitization**: `basename` + regex prevents path traversal
- **Python sandbox**: dangerous builtins stripped before `exec()`

---

## License

Copyright (C) 2026 Batın. All Rights Reserved.
