# Krock's Apex v6.3

**macOS 14+ · Apple Silicon M-series · Python 3.14+**

An autonomous, self-evolving macOS AI agent that streams responses from **OpenRouter**, parses XML-style action tags, and executes them recursively against the operating system. Token-efficient by design — keeps average input/output around 1k/500 tokens.

Krock's Apex is not a wrapper — it's a modular, streaming, context-aware agent deeply integrated with macOS via `CoreGraphics`, `OSAKit`, `Quartz`, and `AppleScript/JXA`. Features a built-in **Evolution Engine** that lets the agent write its own Python skills at runtime, persist them to disk and SQLite, and dynamically `importlib.reload` them into the live process.

---

## Table of Contents

1. [Core Philosophy](#core-philosophy)
2. [System Architecture](#system-architecture)
3. [Module Reference](#module-reference)
4. [Action Protocol](#action-protocol)
5. [Quick Start](#quick-start)
6. [Configuration](#configuration)
7. [Recursive Feedback Loop](#recursive-feedback-loop)
8. [Session Management](#session-management)
9. [Project Management](#project-management)
10. [Skill / Evolution Engine](#skill--evolution-engine)
11. [Persistent Memory](#persistent-memory)
12. [Web UI (React + FastAPI)](#web-ui-react--fastapi)
13. [Hotkeys & Commands](#hotkeys--commands)
14. [Security & Sandboxing](#security--sandboxing)
15. [File Layout](#file-layout)
16. [License](#license)

---

## Core Philosophy

| Principle | Implementation |
|:---|:---|
| **Extreme Token Efficiency** | Micro-feedback loop queries only what it needs; history trimmed aggressively; no full-codebase stuffing |
| **True Autonomy** | Stateless recursive action loop — trigger, evaluate, decide next step without bloated historical context |
| **Self-Evolving Codebase** | `[EVOLVE]` / `[USE]` protocols let the agent expand capabilities at runtime by writing persistent Python modules |
| **Native macOS Integration** | Zero-shell JXA execution, CoreGraphics hardware input, Quartz screen capture, Spotlight `mdfind` queries |
| **Multi-Interface** | Terminal TUI (Rich dashboard), Web UI (FastAPI + React), Voice mode (macOS `say` TTS) |

---

## System Architecture

```
  ┌────────────────────────────────────────────────────────────────────┐
  │                       Krock's Apex v6.3                            │
  ├────────────────────────────────────────────────────────────────────┤
  │                                                                    │
  │ ┌─────────────┐          ┌───────────────────┐    ┌─────────────┐  │
  │ │Terminal TUI │─────────▶│  KrocksApexAgent  │◀───│  Web UI     │  │
  │ │   (Rich)    │          │      (Core)       │    │ (FastAPI)   │  │
  │ └──────┬──────┘          └────────┬──────────┘    └──────┬──────┘  │
  │        │ Stream chunks            │ Parse actions        │WebSocket│
  │        │                          ▼                      │streaming│
  │        │               ┌────────────────────┐            ├─────────┤
  │        │               │   Action Parser    │            │         │
  │        │               │   & Dispatcher     │            │         │
  │        │               └─────────┬──────────┘            │         │
  │        │                         │                       │         │
  │        │         ┌───────────────┼───────────────┐       │         │
  │        │         ▼               ▼               ▼       │         │
  │        │   ┌──────────┐   ┌───────────┐   ┌───────────┐  │         │
  │        │   │Executors │   │ Evolution │   │  Memory   │  │         │
  │        │   ├──────────┤   │  Engine   │   │  (SQLite) │  │         │
  │        │   │ CMD      │   │           │   │           │  │         │
  │        │   │ JXA      │   │ [EVOLVE]  │   │OmniIndexer│  │         │
  │        │   │ TYPE     │   │ [USE]     │   │ (key-val) │  │         │
  │        │   │ MOUSE    │   └───────────┘   └───────────┘  │         │
  │        │   │ VISION   │                                  │         │
  │        │   │ WEB      │                                  │         │
  │        │   │ ASK      │                                  │         │
  │        │   └──────────┘                                  │         │
  │        └─────────────────────────────────────────────────┘         │
  │                                                                    │
  └────────────────────────────────────────────────────────────────────┘
```

---

## Module Reference

### 1. Core Orchestrator — `krocks_main.py` (1300 lines)

The central nervous system. Contains the REPL loop, streaming logic, action parser, and all coordination.

#### Classes

| Class | Role |
|:---|:---|
| `Config` | Dataclass — all configuration from env vars with defaults (see [Configuration](#configuration)) |
| `ActionTag` | Enum — `CMD`, `JXA`, `TYPE`, `MOUSE`, `VISION`, `EVOLVE`, `USE`, `ASK`, `WEB` |
| `Action` | Dataclass — `tag`, `data`, `extra` dict, `status` |
| `APIClient` | Async HTTPX streaming to OpenRouter with SSE parsing; exponential backoff + jitter on 429/network errors; hard-abort on 401/403; intercepts local `/images/` paths → base64 for multimodal API |
| `Renderer` | Rich-based TUI: header panel, 3-column dashboard (Response \| Protocols \| Metrics), error panels |
| `SessionManager` | SQLite-backed conversation persistence (see [Session Management](#session-management)) |
| `ProjectManager` | SQLite-backed project tracking with workspace files and session links (see [Project Management](#project-management)) |
| `KrocksApexAgent` | The main agent — orchestrates the recursive feedback loop, manages history, dispatches actions, handles hotkeys |

#### KrocksApexAgent Key Methods

| Method | Purpose |
|:---|:---|
| `_turn(prompt, img_b64, depth)` | Main recursive loop — streams, parses, executes, recurses on feedback |
| `_execute(action)` | Dispatch by `ActionTag` → executor module |
| `_push(role, content)` | Add to history with dedup, merge, base64→file conversion, trim |
| `_hotkey(cmd)` | Handle all `!commands` |
| `_fire_tts(text)` | Spawn `say` subprocess (voice mode) |
| `_prepare_messages()` | Build API payload with system prompt + history + optional images |
| `_to_markdown()` | Serialize history to Markdown for export |
| `_seen_feedback(text)` | Ring buffer (128 max) deduplication for recursive feedback |
| `run()` | REPL loop — input handling, multi-line via `\`, hotkey dispatch |

#### Action Parser (`parse_actions`)

1. Strips all tag bodies from visible text for rendering
2. Ignores tags inside ` ``` ` fenced code blocks
3. Finds remaining tags by regex position sort
4. Returns `(clean_text, list[Action])`

---

### 2. Shell & Python Executor — `krocks_interpreter.py` (87 lines)

#### `KrocksInterpreter`

| Method | Details |
|:---|:---|
| `execute_shell_async(command, cwd=None)` | `asyncio.create_subprocess_shell` with `preexec_fn=os.setsid`; 30s timeout via `asyncio.wait_for`; kills process group on timeout via `os.killpg`; stores last 500 chars in history |
| `execute_python_dynamically(code_string)` | Strips dangerous builtins from `__builtins__`; executes via restricted `exec()` in a safe globals namespace |

#### Shell Blocklist (24 commands)

Cannot be executed — intercepted at command parsing level:

```
rm, sudo, doas, su, shutdown, reboot, halt, poweroff,
dd, mkfs, fdisk, format, mount, umount, chmod, chown, chattr,
passwd, kill, killall, pkill, bash, zsh, sh, dash, fish,
netcat, nc, ncat, telnet, ssh, scp, rsync
```

#### Python Sandbox Builtins

**Stripped:** `open`, `exec`, `eval`, `compile`, `globals`, `locals`

**Allowed:** `print`, `len`, `range`, `int`, `float`, `str`, `bool`, `list`, `dict`, `tuple`, `set`, `type`, `True`, `False`, `None`, `abs`, `all`, `any`, `enumerate`, `filter`, `iter`, `map`, `max`, `min`, `next`, `reversed`, `slice`, `sorted`, `sum`, `zip`, `isinstance`, `hasattr`, `getattr`, `setattr`, common exception types

---

### 3. Native macOS Bridge — `krocks_native_bridge.py` (53 lines)

#### `NativeOSBridge` (all static methods)

| Method | Details |
|:---|:---|
| `run_jxa_native(script)` | Compiles JavaScript for Automation via `OSAKit.OSAScript` — in-memory, no temp files, no `osascript` spawn. Uses `OSALanguage.languageForName_("JavaScript")`, `executeAndReturnError_(None)` |
| `query_metadata(query_string)` | Runs `mdfind` via `subprocess.run()` with 10s timeout. Returns list of file paths |

---

### 4. Hardware Input — `krocks_accessibility.py` (203 lines)

#### `UIManipulator`

Requires **Accessibility permission** (System Settings → Privacy & Security → Accessibility). Checks permission at each invocation.

| Method | Details |
|:---|:---|
| `hardware_keystroke(text)` | Injects Unicode `CGEvent` keystrokes via `kCGHIDEventTap`. Parses `<cmd+space>`, `<shift+enter>`, `<ctrl+c>` modifier syntax. Falls back to plain text typing for unknown tags. 0.01s delay between characters |
| `hardware_mouse_action(action_str)` | Parses `click <x>,<y>`, `doubleclick <x>,<y>`, `rightclick <x>,<y>`, `move <x>,<y>`, `drag <x1>,<y1> <x2>,<y2>`. Uses `CGEventCreateMouseEvent` with proper event types and click states |
| `_type_plain_text(text)` | Sends each character as Unicode CGEvent pair (key down + key up) |
| `check_accessibility_permissions()` | Calls `AXIsProcessTrustedWithOptions` with prompt=True |

#### Modifier Key Reference

| Syntax | Key |
|:---|:---|
| `cmd` / `command` | `kCGEventFlagMaskCommand` |
| `shift` | `kCGEventFlagMaskShift` |
| `option` / `opt` / `alt` | `kCGEventFlagMaskAlternate` |
| `ctrl` / `control` | `kCGEventFlagMaskControl` |

#### Named Key Reference

`return`/`enter`, `tab`, `space`, `backspace`/`delete`, `escape`/`esc`, arrow keys (left/right/up/down), F1-F12

---

### 5. Screen Capture — `krocks_vision.py` (44 lines)

#### `OmniSight`

| Method | Details |
|:---|:---|
| `take_snapshot(multi_monitor=False)` | Single: `CGMainDisplayID()` → `CGDisplayCreateImage` → `NSBitmapImageRep` → base64 PNG. Multi: `CGGetActiveDisplayList(max=16)` → per-display captures. Falls back to main display on error. Returns `str` (single) or `list[str]` (multi) |

Base64 images are injected into the next API turn as `image_url` content parts for multimodal vision feedback.

---

### 6. Web Engine — `krocks_web_engine.py` (138 lines)

#### `UltraWebEngine` (all static methods)

A self-contained, dependency-free web search and content fetch utility.

| Method | Details |
|:---|:---|
| `search(query)` | Queries DuckDuckGo HTML edition (`html.duckduckgo.com`), parses result URLs and snippets via regex, strips DDG redirect params, returns top 7 results as Markdown |
| `fetch(url)` | Downloads URL via `urllib` with rotating User-Agent headers (Safari/Chrome/Linux), extracts readable text via `TextExtractor` (HTMLParser subclass), limits to 15000 chars. On HTTP 403: falls back to Google Cache (`webcache.googleusercontent.com`). Resolves relative URLs to absolute. Returns Markdown with content + important links (max 15) |

#### `TextExtractor` (HTMLParser subclass)

Skips content inside: `<script>`, `<style>`, `<nav>`, `<footer>`, `<header>`, `<aside>`, `<noscript>`, `<iframe>`, `<form>`. Tracks `<a href>` links (max 30), filters out `javascript:`, `#`, `mailto:` links.

---

### 7. Evolution Engine — `krocks_evolution.py` (181 lines)

#### `EvolutionEngine`

The self-evolution subsystem that lets the agent write, import, and execute its own Python modules at runtime.

| Method | Details |
|:---|:---|
| `write_and_learn_skill(name, code)` | Sanitizes name (`os.path.basename` + `r'[^\w\-]'` regex), writes to `skills/<name>.py`, `importlib.import_module` + `importlib.reload`, saves to SQLite via OmniIndexer |
| `execute_skill(skill_name, fn_name, *args)` | Looks up module in `learned_skills` dict, gets attribute, calls with args |
| `import_skill(name)` | Dynamic import + reload |
| `list_skills()` | Enumerates all learned modules with functions list, file size, file mtime, source code |
| `get_skill_code(name)` | Reads raw `.py` content |
| `delete_skill(name)` | Removes file, pops from dict, drops from `sys.modules`, deletes from SQLite |
| `update_skill_code(name, new_code)` | Validates syntax via `ast.parse`, then re-imports |
| `_load_existing_skills()` | On startup: scans `skills/` directory + recovers any skills in SQLite but missing from disk |

Skills are stored in **two locations**: `skills/*.py` (file system) and `krocks_memory.db` → `system_knowledge` table (category=`"skills"`). The dual persistence ensures survival across sessions and disk operations.

---

### 8. Persistent Memory — `krocks_indexer.py` (124 lines)

#### `OmniIndexer`

Thread-safe SQLite wrapper using `threading.Lock()` and `check_same_thread=False`.

**Table:** `system_knowledge`

| Column | Type |
|:---|:---|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT |
| `category` | TEXT |
| `key_name` | TEXT UNIQUE |
| `value_data` | TEXT (JSON string) |
| `last_updated` | TIMESTAMP DEFAULT CURRENT_TIMESTAMP |

| Method | Details |
|:---|:---|
| `memorize(category, key, value)` | UPSERT via `INSERT...ON CONFLICT(key_name) DO UPDATE` |
| `get_all_memory()` | SELECT all, ORDER BY `last_updated` DESC |
| `get_memory_by_category(category)` | Filter by category |
| `delete_memory(key_name)` | DELETE by key |
| `add_fact(category, content, source="user")` | Auto-generates timestamp key |
| `list_facts(category=None)` | Returns dicts with id/content/source |
| `spotlight_search(query)` | Runs `mdfind` subprocess |
| `close()` | Close SQLite connection |

---

### 9. Web UI — `krocks_web.py` (1895 lines) + `krocks_ui/` (React)

#### FastAPI Server

| Route | Purpose |
|:---|:---|
| `GET /` | Serves Vite redirect, React build, or embedded HTML fallback |
| `/assets` | Static mount for `krocks_ui/dist/assets/` |
| `/images` | Static mount for `~/.krocks/images/` (generated screenshots) |
| `WS /ws` | Main WebSocket chat endpoint |

#### WebSocket Message Types

<details>
<summary><b>All 35 message types</b> (click to expand)</summary>

| Client → Server | Purpose |
|:---|:---|
| `message` | Chat with text, images, model, temp, max_tokens, feedback_depth, workspace, system_prompt |
| `config` | Update model or system prompt |
| `reset` | Reset conversation history |
| `list_sessions` | List saved conversations |
| `delete_session` | Delete by conversation ID |
| `save_session` | Save with optional mode prefix (code/chat) |
| `load_session` | Load by conversation ID |
| `get_artifacts` | Return all OmniIndexer memory rows |
| `get_skills` | List files in `skills/` dir |
| `get_connectors` | List files in `connectors/` dir |
| `get_plugins` | List files in `plugins/` dir |
| `get_customization` | Load customization from DB |
| `save_settings` | Patch user settings, persist |
| `save_connector` | Update connector config |
| `test_connector` | Test iCloud or local_files |
| `delete_skill` | Delete from disk + DB |
| `update_skill` | Update skill code (ast.parse validated) |
| `test_skill` | Execute a skill function |
| `browse_plugins` | Return plugin registry |
| `install_plugin` | Install from registry |
| `uninstall_plugin` | Delete installed plugin |
| `list_memory` | List facts by category |
| `add_memory` | Add fact to indexer |
| `delete_memory` | Delete fact by ID |
| `export` | Export to Markdown file |
| `check_status` | API reachability check |
| `take_screenshot` | macOS region screenshot |
| `choose_folder` | AppleScript folder picker |
| `set_cwd` | Set active workspace |
| `list_branches` | Git branches in workspace |
| `checkout_branch` | Git checkout |
| `list_projects` | List projects |
| `create_project` | Create project with description |
| `update_project` | Update project metadata/files |
| `delete_project` | Delete project |

| Server → Client | Purpose |
|:---|:---|
| `chunk` | Streaming text chunk |
| `done` | Turn complete |
| `system` | System message |
| `error` | Error message |
| `action` | Action execution status (tag/data/status) |
| `sessions` | Session list |
| `save_ok` | Session saved |
| `reset_ok` | Reset confirmed |
| `history_loaded` | History loaded with messages array |
| `artifacts_data` | Memory rows |
| `skills_data` | Skill file list |
| `customization_data` | User settings + connectors |
| `customization_saved` | Settings saved confirm |
| `connector_test_result` | Connector test result |
| `skill_deleted` / `skill_updated` | Skill action confirm |
| `skill_test_result` | Skill execution output |
| `plugin_registry` / `plugin_installed` / `plugin_uninstalled` | Plugin events |
| `memory_facts` / `memory_added` / `memory_deleted` | Memory events |
| `screenshot_taken` | Screenshot confirm |
| `status_result` | API status |
| `folders_listed` / `folder_chosen` | File browser events |
| `branches_listed` | Git branch list |
| `projects` / `project_created` | Project events |

</details>

#### React Frontend (`krocks_ui/`)

Vite + React + Tailwind CSS. Build output goes to `krocks_ui/dist/`, auto-detected by the FastAPI server.

**Component Tree:**
```
App.jsx
├── Sidebar.jsx (navigation)
├── ChatInput.jsx (message input, attachments, model selector)
├── MessageBubble.jsx (chat messages)
├── ModelSelector.jsx (model picker dropdown)
├── WelcomeScreen.jsx (landing page)
├── PageView.jsx (list + content layout)
├── AttachmentMenu.jsx (file upload overlay)
├── QuizModal.jsx (interactive quiz)
├── EmptyState.jsx (empty list placeholder)
├── ListItem.jsx (list item card)
├── CoderWorkspace.jsx (code editing workspace)
└── Home.jsx
    ├── ChatsView.jsx → ChatsListView.jsx
    ├── ArtifactsView.jsx
    ├── SkillsTab.jsx
    ├── ModelsTab.jsx
    ├── CustomizeView.jsx
    │   ├── GeneralTab.jsx
    │   ├── MemoryTab.jsx
    │   ├── PluginsTab.jsx
    │   └── ConnectorsTab.jsx
    ├── ProjectsView.jsx → ProjectDashboard.jsx
    ├── CodeView.jsx
    ├── CreateProjectModal.jsx
    ├── Modal.jsx
    └── FormFields.jsx
```

**Embedded HTML Fallback** — `krocks_web.py` contains a `_HTML` string (~440 lines) — a Claude.ai dark-theme replica with Geist fonts (Inter + Newsreader), sidebar navigation, chat view, overlays, toasts, and in-page WebSocket JS logic. Served when no React build is present.

#### Built-in Plugin Registry

7 hardcoded plugins: `web-search`, `code-review`, `sql-helper`, `pdf-summarizer`, `image-describer`, `git-helper`, `terminal-automation`

---

## Action Protocol

The agent communicates with the system exclusively through XML-style action tags. Tags are parsed out of the streaming response via regex, executed, and the results are fed back as the next conversation turn.

| Tag | Syntax | Executor | Description |
|:---|:---|:---|:---|
| `[CMD]` | `[CMD]ls -la[/CMD]` | `KrocksInterpreter` | Sandboxed shell command — 30s timeout, 24-command blocklist |
| `[JXA]` | `[JXA]Application('Finder').name()[/JXA]` | `NativeOSBridge` | Native macOS API via OSAKit JavaScript for Automation |
| `[TYPE]` | `[TYPE]Hello<enter>[/TYPE]` | `UIManipulator` | Hardware keystroke injection — supports `<cmd+space>`, `<shift+enter>` modifiers |
| `[MOUSE]` | `[MOUSE]click 500,300[/MOUSE]` | `UIManipulator` | Mouse control — `click`, `doubleclick`, `rightclick`, `move`, `drag` at coordinate strings |
| `[VISION]` | `[VISION]What's on screen?[/VISION]` | `OmniSight` | Screen capture → base64 PNG → injected as `image_url` into next turn for multimodal analysis |
| `[WEB]` | `[WEB]python docs[/WEB]`<br>`[WEB]https://example.com[/WEB]` | `UltraWebEngine` | DuckDuckGo search if query is text; URL content fetch if starts with `http://`/`https://` |
| `[EVOLVE]` | `[EVOLVE]get_ip \|\|\| import socket\n...[/EVOLVE]` | `EvolutionEngine` | Write Python skill to disk, dynamically import, persist to SQLite |
| `[USE]` | `[USE]get_ip \|\|\| get_public_ip \|\|\| [/USE]` | `EvolutionEngine` | Execute a previously learned skill by `module.function` |
| `[ASK]` | `[ASK]Where should I save the file?[/ASK]` | Frontend | Shows modal prompting the user for input |

### System Prompt (Turkish)

The agent is Turkish-speaking. Its system prompt defines it as a macOS M4 iMac agent (MiMo-V2.5 Pro intelligence) with four non-negotiable rules:

1. After receiving system auto-feedback, if the goal is reached, **stop** — don't generate more commands
2. If a command returns "directory not found", "not found", or "access error" — **don't retry** with different paths
3. Never run discovery commands (`ls`, `find`, `pwd`, `whoami`) more than once consecutively
4. Never put commands inside Markdown code blocks — use only bracket tags

---

## Quick Start

### Prerequisites

- macOS 14+ (Apple Silicon M-series optimized)
- Python 3.14+
- OpenRouter API key

### Installation

```bash
# Clone
git clone https://github.com/cr0mzerp/Krock-s.git
cd Krock-s

# Install Python dependencies
pip install rich httpx fastapi uvicorn pyobjc

# Configure API key
echo 'KROCKS_API_KEY="sk-or-v1-..."' > .env
echo 'KROCKS_MODEL="anthropic/claude-opus-4"' >> .env
```

### React Frontend (optional)

```bash
cd krocks_ui
npm install
npm run dev       # Vite dev server
npm run build     # Production build to krocks_ui/dist/
npm run lint      # ESLint
```

### Running the Agent

```bash
# Terminal TUI (default — Rich-based live dashboard)
python krocks_main.py

# Voice mode (macOS say TTS playback)
python krocks_main.py --voice

# Debug logging
python krocks_main.py --debug

# Web UI (FastAPI server, opens browser at http://127.0.0.1:7860)
python krocks_main.py --web --port 7860
```

### Syntax Check

```bash
# Validate any module
python3 -c "import py_compile; py_compile.compile('krocks_main.py', doraise=True); print('OK')"
```

---

## Configuration

All configuration is driven by the `.env` file. The `Config` dataclass loads these at startup:

| Variable | Default | Description |
|:---|:---|:---|
| `KROCKS_API_KEY` | *(required)* | OpenRouter API key — agent refuses to start without this |
| `KROCKS_MODEL` | `@preset/deepseekv4-flash` | Model ID string passed to OpenRouter |
| `KROCKS_MAX_TOKENS` | `16384` | Maximum completion tokens per turn |
| `KROCKS_TEMP` | `0.7` | Sampling temperature |
| `KROCKS_FEEDBACK_DEPTH` | `3` | Maximum recursion depth for the feedback loop |
| `KROCKS_HISTORY_MAX` | `60` | Maximum history entries before trimming |

### Runtime Configuration (via `!config`)

| Key | Default | Description |
|:---|:---|:---|
| `enable_mouse` | `True` | Toggle `[MOUSE]` action execution |
| `enable_multi_monitor` | `True` | Toggle multi-monitor vision capture |
| `enable_file_upload` | `True` | Toggle file upload in web UI |
| `enable_vision` | `True` | Toggle `[VISION]` action execution |
| `debug` | `False` | Enable debug traceback printing |

### Internal Timings

| Parameter | Value |
|:---|:---|
| API retry max | 3 attempts |
| API retry base delay | 1.5s (exponential backoff + jitter) |
| Subprocess timeout | 30s |
| TTS timeout | 30s |
| TTS max characters | 512 |
| Shell output truncation | 20,000 chars |
| Web fetch content max | 15,000 chars |
| Maximum input chars | 32,000 |
| Feedback ring buffer | 128 entries |
| Generation context max | 16384 chars |

---

## Recursive Feedback Loop

The core execution model — `KrocksApexAgent._turn(prompt, img_b64, depth)`:

```
                    ┌──────────────────┐
                    │  User Prompt +   │
                    │  Optional Image  │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Push to History │
                    │  (dedup, merge)  │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Stream via      │
                    │  OpenRouter (SSE)│
                    │  → Rich dashboard│
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Parse Actions   │
                    │  (regex extract) │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼                             ▼
     ┌────────────┐                ┌────────────┐
     │ No actions │                │ Has actions│
     │ → return   │                │ → execute  │
     └────────────┘                └─────┬──────┘
                                         │
                                         ▼
                                ┌──────────────────┐
                                │  Execute Each    │
                                │  via _execute()  │
                                └────────┬─────────┘
                                         │
                                         ▼
                                ┌──────────────────┐
                                │  Collect Feedback│
                                │  (dedup via ring)│
                                └────────┬─────────┘
                                         │
                                         ▼
                                ┌──────────────────┐
                                │  Depth < max?    │
                                │  Yes → _turn(    │
                                │    feedback,     │
                                │  No → return     │
                                └──────────────────┘
```

**Loop termination conditions:**
1. No actions returned from the LLM
2. Recursion depth exceeds `feedback_depth`
3. Feedback text matches an already-seen entry in the ring buffer

**Image handling:** `[VISION]` feedback includes the base64 image string, injected into the next API call as `image_url` content. Non-vision text feedback is prefixed with `[SİSTEM OTOMATİK GERİ BİLDİRİMİ]`.

**History trimming:** `_push` keeps the system prompt + the last `history_max // 2` turns, inserting the marker `[Geçmiş kırpıldı]` when truncation occurs. Content exceeding `MAX_INPUT_CHARS` (32,000) is truncated with context preserved.

---

## Session Management

Sessions are stored in `~/.krocks/krocks.db` (SQLite).

**Tables:**
- `conversations` — `id` (UUID), `title`, `created_at`, `updated_at`
- `messages` — `id`, `conversation_id` (FK), `role`, `content` (JSON), `created_at`

**Commands:**
```
!save <name>       — Save current conversation
!load <conv_id>    — Load a previous conversation
!sessions          — List all saved conversations
!export [file.md]  — Export current chat as Markdown
```

The session manager auto-names conversations on first save by sending the first user message to the LLM for a 2-4 word title. Generated images live in `~/.krocks/images/` and are automatically cleaned up when sessions are deleted.

---

## Project Management

Projects track workspace context, custom instructions, file manifests, and linked conversation sessions.

**Table:** `projects` — `id` (UUID), `name`, `description`, `instructions`, `files` (JSON), `sessions` (JSON array of conv IDs), `updated_at`

**Web UI commands:** `list_projects`, `create_project`, `update_project`, `delete_project`

---

## Skill / Evolution Engine

Skills are Python modules the agent writes, imports, and executes at runtime. Stored in `skills/*.py` and redundantly persisted in SQLite.

### Lifecycle

```
[EVOLVE] name ||| code
         │
         ▼
   Sanitize name (basename + regex)
         │
         ▼
   Write skills/name.py
         │
         ▼
   importlib.import_module + reload
         │
     ┌───┴───┐
     ▼       ▼
  Error?   Success?
  Return   Store in learned_skills dict
  trace    │
           ▼
         Save to SQLite (category="skills")
               │
               ▼
         [USE] skill.function ||| args
               │
               ▼
         Lookup → getattr → call(*args)
               │
               ▼
         Return result as text
```

### Web UI Skill Operations

| Action | Description |
|:---|:---|
| `get_skills` | List all skills with metadata |
| `update_skill` | Edit skill code — validates via `ast.parse` before saving |
| `delete_skill` | Remove from disk, RAM, and SQLite |
| `test_skill` | Execute a single function from a skill |

---

## Persistent Memory

The `OmniIndexer` provides a key-value JSON store backed by SQLite. Used for:

- **Skills** (category=`"skills"`) — code, metadata, timestamps
- **Facts** (category=`"memory"`) — user facts, project info, code conventions
- **Customization** (category=`"customization"`) — user settings, connector configs

Thread-safe via `threading.Lock()` on all read/write operations. `check_same_thread=False` on the SQLite connection for async-compatible access.

**Web UI memory operations:** `list_memory`, `add_memory`, `delete_memory`

---

## Web UI (React + FastAPI)

### Architecture

```
Browser ──WebSocket──▶ FastAPI (krocks_web.py)
                          │
                          ├── Serves React build (krocks_ui/dist/)
                          ├── Serves embedded HTML fallback
                          ├── Manages KrocksApexAgent per connection
                          ├── Streams chunks via WebSocket
                          └── Dispatches action execution
```

### Customization State

The web UI saves user preferences to the OmniIndexer under category `"customization"`:

```json
{
  "settings": {
    "userName": "Lord",
    "language": "tr-TR",
    "voiceEnabled": false,
    "voiceLang": "tr-TR",
    "voiceSpeed": 1.0,
    "defaultModel": "@preset/deepseekv4-flash",
    "temperature": 0.7,
    "maxTokens": 16384,
    "feedbackDepth": 3,
    "systemPromptOverride": ""
  },
  "connectors": {
    "local_files": {"status": "connected"},
    "icloud": {"status": "disconnected"},
    "github": {"status": "disconnected", "config": {"token": ""}},
    "notion": {"status": "disconnected"},
    "linear": {"status": "disconnected"},
    "slack": {"status": "disconnected"},
    "figma": {"status": "disconnected"}
  }
}
```

### Connector Ecosystem

| Connector | Purpose |
|:---|:---|
| `local_files` | Filesystem access — always connected |
| `icloud` | iCloud Drive access — checks `~/Library/Mobile Documents/com~apple~CloudDocs` |
| `github` | GitHub API via token |
| `notion` | Notion workspace integration |
| `linear` | Linear issue tracking |
| `slack` | Slack messaging |
| `figma` | Figma design tool integration |

---

## Hotkeys & Commands

Available in both Terminal TUI and Web UI:

| Command | Description |
|:---|:---|
| `!help` | Show help menu |
| `!save [name]` | Save current session to SQLite |
| `!load <id>` | Load a previous session |
| `!sessions` | List all saved sessions |
| `!export [file.md]` | Export conversation to Markdown |
| `!tokens` | Show estimated token usage |
| `!model <id>` | Switch model at runtime |
| `!config` | View all config |
| `!config set <key> <value>` | Set config value (e.g., `!config set enable_mouse true`) |
| `!status` | Check API reachability |
| `!reset` | Reset conversation history |
| `!clear` | Clear terminal screen |
| `!memory` | Query persistent memory |
| `exit` / `q` / `quit` | Exit (auto-saves session) |

**Multi-line input:** End a line with `\` to continue typing on the next line.

---

## Security & Sandboxing

| Layer | Mechanism |
|:---|:---|
| **Command blocklist** | 24 dangerous commands (`rm`, `sudo`, `dd`, `ssh`, `curl`, `kill`, etc.) intercepted at regex level before subprocess creation |
| **Python sandbox** | `exec`/`eval`/`open`/`compile`/`globals`/`locals` stripped from `__builtins__` before dynamic execution |
| **Skill sanitization** | `os.path.basename` + `re.sub(r'[^\w\-]', '_')` prevents path traversal attacks on skill filenames |
| **Subprocess isolation** | `preexec_fn=os.setsid` creates new process group; `os.killpg` terminates entire group on timeout |
| **Accessibility gating** | `[TYPE]` and `[MOUSE]` check `AXIsProcessTrustedWithOptions` before each invocation |
| **API key protection** | Loaded from `.env` only; never exposed in history, logs, or Markdown exports |
| **Dedup ring buffer** | Prevents infinite feedback loops by tracking previously seen feedback (max 128 entries) |
| **Timeout enforcement** | All external operations capped: shell (30s), web fetch (15s), TTS (30s), mdfind (10s) |

---

## File Layout

```
Krock-s/
├── krocks_main.py              # Core orchestrator — REPL, streaming, action parser
├── krocks_interpreter.py       # Sandboxed shell + Python executor
├── krocks_native_bridge.py     # macOS JXA bridge (OSAKit + mdfind)
├── krocks_accessibility.py     # Hardware keystroke + mouse injection (CoreGraphics)
├── krocks_vision.py            # Screen capture (Quartz → base64 PNG)
├── krocks_web_engine.py        # Web search + content fetch (UltraWebEngine)
├── krocks_evolution.py         # Self-evolution engine (skill write/import/execute)
├── krocks_indexer.py           # Persistent memory (SQLite, thread-safe)
├── krocks_web.py               # FastAPI web server + WebSocket + embedded HTML
├── update_html.py              # Regenerate embedded _HTML string
├── krocks_ui/                  # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   └── views/          # All view components
│   │   └── components/
│   │       └── chat/           # Chat UI components
│   ├── dist/                   # Production build (gitignored)
│   ├── package.json
│   └── vite.config.js
├── skills/                     # Dynamically generated Python skills (gitignored)
├── .env                        # API key + config (gitignored)
├── krocks_memory.db            # SQLite memory database (gitignored)
├── README.md
└── CLAUDE.md                   # OpenCode agent configuration
```

---

## License

Copyright (C) 2026 Batın. All Rights Reserved.

This software and associated documentation files (the "Software") are the proprietary and exclusive intellectual property of Batın. Unauthorized copying, modification, distribution, sublicensing, reverse engineering, or any other use of this Software, in whole or in part, via any medium, is strictly prohibited without prior written authorization.

The Software is provided "as is", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and non-infringement. In no event shall the author be liable for any claim, damages, or other liability arising from the use of the Software.
