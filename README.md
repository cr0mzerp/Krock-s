# Krock's Apex

**Version 6.3** — An autonomous, self-evolving macOS AI agent with terminal TUI and web interface.

Krock's Apex is a modular, streaming AI agent that integrates deeply with macOS: it can see the screen, execute shell commands, run native AppleScript/JXA, simulate hardware keystrokes, learn new skills dynamically via a built-in evolution engine, and persist knowledge to a SQLite memory store. It communicates with language models through the OpenRouter API and presents a real-time streaming chat interface in either a Rich-powered terminal or a FastAPI web UI.

---

## System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     Krock's Apex v6.3                      │
├──────────────────────────────────────────────────────────┤
│                    ┌──────────────────┐                   │
│                    │   KrocksApexAgent (Core)              │
│                    │  ┌────────────────────────────┐      │
│                    │  │ Config                     │      │
│                    │  │ history / session / TTS    │      │
│                    │  │ action parser / executor   │      │
│                    │  └────────────────────────────┘      │
│                    └──────────┬───────────────────┘       │
│                               │                            │
│  ┌────────────┐  ┌──────────┐│┌──────────┐  ┌──────────┐│
│  │ Terminal   │  │  Web UI  │││ Streaming │  │ Session  ││
│  │ TUI (Rich) │  │(FastAPI) │││ APIClient │  │ Manager  ││
│  └────────────┘  └──────────┘│└──────────┘  └──────────┘│
│                               │                            │
│  ┌─────────────────────────────────────────────────────┐ │
│  │                  Action Executor                     │ │
│  │  [CMD]  ──► KrocksInterpreter  (sandboxed shell)    │ │
│  │  [JXA]  ──► NativeOSBridge     (OSAKit JXA)        │ │
│  │  [TYPE] ──► UIManipulator      (CGEvent keystrokes) │ │
│  │  [VISION]─► OmniSight          (Quartz screen cap)  │ │
│  │  [EVOLVE]─► EvolutionEngine    (write + import)     │ │
│  │  [USE]   ─► EvolutionEngine    (call learned skill) │ │
│  └─────────────────────────────────────────────────────┘ │
│                               │                            │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────┐│
│  │   OmniIndexer │  │   SQLite Memory  │  │   Skills/    ││
│  │  (Spotlight)  │  │  (krocks_memory) │  │  (generated) ││
│  └──────────────┘  └──────────────────┘  └──────────────┘│
└──────────────────────────────────────────────────────────┘
```

---

## Modules

### 1. Agent Core (`krocks_main.py`)

The central orchestrator. Contains the main agent loop, configuration, session management, streaming API client, and the Rich TUI renderer.

#### Config

| Field | Environment Variable | Default | Description |
|-------|---------------------|---------|-------------|
| `api_key` | `KROCKS_API_KEY` | `""` | OpenRouter API key |
| `api_url` | — | `https://openrouter.ai/api/v1/chat/completions` | API endpoint |
| `model_id` | `KROCKS_MODEL` | `@preset/mimos` | LLM model identifier |
| `max_tokens` | `KROCKS_MAX_TOKENS` | `4096` | Maximum response tokens |
| `temperature` | `KROCKS_TEMP` | `0.7` | Sampling temperature (0.0–1.0) |
| `history_max` | — | `60` | Max messages in context window |
| `retry_max` | — | `3` | API retry attempts on failure |
| `retry_base` | — | `1.5` | Exponential backoff base (seconds) |
| `feedback_depth` | — | `3` | Max recursive action feedback cycles |
| `tts_timeout` | — | `30.0` | macOS `say` TTS timeout |
| `sessions_dir` | — | `~/.krocks/sessions/` | Session JSON save directory |
| `history_file` | — | `~/.krocks/cmd_history` | Readline history persistence file |
| `debug` | — | `False` | Enable debug logging |

#### APIClient

- Async streaming HTTPX client to the OpenRouter API
- SSE (Server-Sent Events) stream parser
- Automatic retry with exponential backoff on network errors and rate limits (429)
- Raises `RuntimeError` on persistent failure after `retry_max` attempts
- 401/403 errors are immediate (non-retriable)

#### SessionManager

- Save conversation history as JSON to `sessions_dir`
- Load sessions by name
- List all saved sessions
- Auto-generate session names from first user message
- Path traversal protection via `re.sub(r'[^\w\-]', '_', stem)`

#### HistoryManager

- Wraps Python `readline` for persistent command history across sessions
- 1000-entry history limit

#### Renderer

- `header()` — Displays agent name, version, model, date
- `dashboard()` — Three-column live layout: Markdown response, color-coded action protocols, metrics (elapsed time, token count, tokens/sec, chunk count, feedback depth)
- `error_panel()` — Red-bordered error display

#### KrocksApexAgent

- `run()` — Main REPL loop. Reads user input, dispatches to `_turn()`
- `_turn(prompt, img_b64?, depth?)` — Single conversation turn. Streams response from API, parses actions, executes them, feeds results back recursively
- `_execute(action)` — Dispatches `ActionTag` to the appropriate module. Returns feedback string or vision dict
- `_hotkey(cmd)` — Handles `!` prefixed commands
- `_speak(text)` — macOS TTS via `say` command
- `_to_markdown()` — Exports entire conversation as Markdown
- `_push(role, content)` — Adds message to history with automatic context window trimming
- `_seen_feedback(text)` — Deduplicates repeated feedback

### 2. Shell Interpreter (`krocks_interpreter.py`)

**Class:** `KrocksInterpreter`

Sandboxed shell command execution with a blocklist of 24 forbidden commands:

`rm`, `sudo`, `doas`, `su`, `shutdown`, `reboot`, `halt`, `poweroff`, `dd`, `mkfs`, `fdisk`, `format`, `mount`, `umount`, `chmod`, `chown`, `chattr`, `passwd`, `kill`, `killall`, `pkill`, `wget`, `curl`, `nc`, `netcat`, `ncat`, `bash`, `zsh`, `sh`, `dash`, `fish`, `telnet`, `ssh`, `scp`, `rsync`

| Method | Description |
|--------|-------------|
| `execute_shell_async(command)` | Runs shell command via `asyncio.create_subprocess_exec` with 30-second timeout. Returns stdout or stderr. |
| `execute_python_dynamically(code_string)` | Executes Python in a restricted environment. Only safe builtins are available: `print`, `len`, `range`, `int`, `str`, `list`, `dict`, `abs`, `sorted`, `sum`, `zip`, `enumerate`, `map`, `filter`, etc. Dangerous functions (`__import__`, `exec`, `eval`, `open`) are excluded. |

### 3. Native OS Bridge (`krocks_native_bridge.py`)

**Class:** `NativeOSBridge`

| Method | Description |
|--------|-------------|
| `run_jxa_native(script)` | Compiles and runs JavaScript for Automation (JXA) in-memory using OSAKit. No temporary files, no `osascript` subprocess. Returns result string or error message. |
| `query_metadata(query_string)` | Runs macOS Spotlight search via `mdfind` subprocess with 10-second timeout. Returns list of matching file paths. |

### 4. UI Manipulator (`krocks_accessibility.py`)

**Class:** `UIManipulator`

Hardware-level keyboard simulation using CoreGraphics (`CGEvent`). Requires Accessibility permissions.

| Method | Description |
|--------|-------------|
| `check_accessibility_permissions()` | Verifies the process has Accessibility access (System Settings > Privacy > Accessibility). Prompts user if not. |
| `hardware_keystroke(text)` | Parses text for macro tags (`<enter>`, `<cmd+space>`, `<shift+a>`, etc.) and types them as hardware events. Plain text is typed character-by-character. |

**Special key codes supported:**

| Key | Code | Key | Code | Key | Code | Key | Code |
|-----|------|-----|------|-----|------|-----|------|
| `return`/`enter` | 36 | `tab` | 48 | `space` | 49 | `backspace`/`delete` | 51 |
| `escape`/`esc` | 53 | `left` | 123 | `right` | 124 | `down` | 125 |
| `up` | 126 | `f1`–`f12` | 122–111 | `a`–`z` | 0–46 | `0`–`9` | 18–29 |

**Modifier masks:** `cmd`/`command`, `shift`, `option`/`opt`/`alt`, `ctrl`/`control`

### 5. Vision (`krocks_vision.py`)

**Class:** `OmniSight`

| Method | Description |
|--------|-------------|
| `take_snapshot()` | Captures the main display using `Quartz.CGDisplayCreateImage`, converts to PNG via `NSBitmapImageRep`, and returns the image as a base64-encoded string. Entirely in-memory — no files written to disk. |

### 6. Evolution Engine (`krocks_evolution.py`)

**Class:** `EvolutionEngine`

The self-evolution system that allows the agent to write, persist, and execute new Python skills at runtime.

| Method | Description |
|--------|-------------|
| `write_and_learn_skill(skill_name, python_code)` | 1. Writes Python code to `skills/{name}.py` 2. Dynamically imports the module via `importlib.import_module()` 3. Persists to SQLite index via `OmniIndexer.memorize()`. Returns success/error message. |
| `execute_skill(skill_name, function_name, *args)` | Looks up a learned skill module and calls the specified function with given arguments. |
| `_load_existing_skills()` | On startup, loads all `.py` files from `skills/` directory. Falls back to SQLite database if a skill's file is missing (restores from memory). |
| `_import_skill(skill_name)` | Dynamic module import with reload support. |
| `close()` | Closes the SQLite connection. |

**Safety:** Skill names are sanitized with `os.path.basename` and `re.sub(r'[^\w\-]', '_')` to prevent path traversal.

### 7. Memory Indexer (`krocks_indexer.py`)

**Class:** `OmniIndexer`

SQLite-backed persistent knowledge store for the agent.

| Method | Description |
|--------|-------------|
| `memorize(category, key, value)` | Upserts a key-value pair (JSON-serialized) into the `system_knowledge` table. |
| `spotlight_search(query)` | Wraps macOS `mdfind` command for filesystem search. |
| `close()` | Closes the SQLite database connection. |

**Database schema (`system_knowledge`):**

```sql
CREATE TABLE system_knowledge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT,
    key_name TEXT UNIQUE,
    value_data TEXT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Requirements

- **OS:** macOS 14+ (tested on iMac M4, 8-Core CPU/GPU)
- **Python:** 3.14+ (CPython)
- **Dependencies:**

| Package | Purpose |
|---------|---------|
| `rich` | Terminal TUI (tables, panels, Markdown rendering, live display) |
| `httpx` | Async HTTP client for OpenRouter API streaming |
| `fastapi` | Web server framework |
| `uvicorn` | ASGI server for web mode |
| `pyobjc` | Python–ObjectiveC bridge (Quartz, Cocoa, AppKit, OSAKit, ApplicationServices) |

Install all at once:

```bash
pip install rich httpx fastapi uvicorn pyobjc
```

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/cr0mzerp/Krock-s.git
cd "Krock-s"

# 2. Install dependencies
pip install rich httpx fastapi uvicorn pyobjc

# 3. Create .env file with your OpenRouter API key
echo 'KROCKS_API_KEY="sk-or-v1-your-key-here"' > .env

# 4. (Optional) Override model, tokens, or temperature
echo 'KROCKS_MODEL="openai/gpt-4o"' >> .env
echo 'KROCKS_MAX_TOKENS=8192' >> .env
echo 'KROCKS_TEMP=0.5' >> .env
```

---

## Configuration

The agent reads configuration in the following priority order:

1. OS environment variables
2. `.env` file in the project root

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `KROCKS_API_KEY` | — | **Required.** OpenRouter API key. |
| `KROCKS_MODEL` | `@preset/mimos` | Model identifier passed to the API. |
| `KROCKS_MAX_TOKENS` | `4096` | Maximum tokens in generated response. |
| `KROCKS_TEMP` | `0.7` | Sampling temperature. Lower = more deterministic. |

### Example `.env`

```
KROCKS_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
KROCKS_MODEL=@preset/mimos
KROCKS_MAX_TOKENS=4096
KROCKS_TEMP=0.7
```

---

## Usage

### Terminal TUI

```bash
python krocks_main.py
```

Launches the Rich-powered terminal interface. Features:
- Real-time streaming response display
- Three-column live dashboard (response, action protocols, metrics)
- Markdown rendering in responses
- Color-coded action tags by type
- Multi-line input: end a line with `\` to continue on the next line

### Web Interface

```bash
python krocks_main.py --web              # default port 7860
python krocks_main.py --web --port 8080  # custom port
```

Launches a FastAPI web server with a Claude.ai-inspired dark theme. Features:
- WebSocket-based streaming chat
- Model selector (6 presets: MiMo V2.5, Gemini 2.5 Flash, Claude Opus 4, GPT-4o, Llama 3.3 70B, DeepSeek R1)
- Settings panel (temperature slider, max tokens slider, feedback depth)
- Session management (save, load, reset)
- Conversation export to Markdown
- Auto-reconnect on connection loss

### Voice Mode

```bash
python krocks_main.py --voice
```

Enables macOS text-to-speech via the `say` command for agent responses.

### Debug Mode

```bash
python krocks_main.py --debug
```

Enables verbose logging: SSE parse debug output, repeated feedback detection, traceback details.

### Flags Summary

| Flag | Description |
|------|-------------|
| `--web` | Launch web interface instead of TUI |
| `--port <n>` | Web server port (default: 7860, only with `--web`) |
| `--voice` | Enable macOS TTS for responses |
| `--debug` | Enable debug logging |

---

## Action Protocols

The agent communicates actions to the system using bracketed tags in its response. Six action types are supported:

### `[CMD] command [/CMD]`

Execute a shell command.

```markdown
Check the current directory contents:
[CMD]ls -la[/CMD]
```

**Module:** `KrocksInterpreter.execute_shell_async()`
**Security:** Blocked commands include `rm`, `sudo`, `dd`, `wget`, `curl`, `chmod`, `kill`, etc. (24 total). 30-second timeout enforced.

### `[JXA] javascript_code [/JXA]`

Execute JavaScript for Automation (JXA) to control native macOS applications.

```markdown
Get the name of the frontmost application:
[JXA]Application('System Events').processes.whose({frontmost: true})[0].name()[/JXA]
```

**Module:** `NativeOSBridge.run_jxa_native()`
**Security:** Executed in-memory via OSAKit. No subprocess, no temporary files.

### `[TYPE] text [/TYPE]`

Simulate hardware keystrokes — types text as if it came from a physical keyboard.

```markdown
Type into the active text field:
[TYPE]Hello, world![/TYPE]

Send a keyboard shortcut:
[TYPE]<cmd+space>[/TYPE]
```

**Module:** `UIManipulator.hardware_keystroke()`
**Supports macros:** `<enter>`, `<tab>`, `<esc>`, `<cmd+q>`, `<shift+left>`, `<option+f4>`, etc.

### `[VISION] question [/VISION]`

Capture the screen and analyze it using the AI's visual capabilities.

```markdown
[VISION]What applications are open in the dock?[/VISION]
```

**Module:** `OmniSight.take_snapshot()` — captures main display as base64 PNG in memory, sends back to the AI as an image message, triggering a recursive visual analysis turn.

### `[EVOLVE] skill_name ||| python_code [/EVOLVE]`

Learn a new skill — write a Python module, import it live into the agent's runtime, and persist it to SQLite memory.

```markdown
[EVOLVE]calendar_reader |||
import subprocess
def get_tomorrow_events():
    result = subprocess.run(['icalBuddy', '-npd', '1', 'eventsToday+1'],
                          capture_output=True, text=True)
    return result.stdout
[/EVOLVE]
```

**Module:** `EvolutionEngine.write_and_learn_skill()`
**Persistence:** Survives restarts — stored as `.py` file and in SQLite.

### `[USE] skill_name ||| function_name ||| args [/USE]`

Execute a previously learned skill.

```markdown
[USE]calendar_reader ||| get_tomorrow_events ||| [/USE]
```

**Module:** `EvolutionEngine.execute_skill()` — dynamic function call on a runtime-imported module.

### Action Processing Flow

```
1. API streams response tokens
2. parse_actions() extracts tags using regex
3. Tags are sorted by appearance order
4. Each tag is dispatched to its module via _execute()
5. Results are collected as feedback strings
6. Feedback is fed back to the AI recursively (up to feedback_depth levels)
7. Repeated feedback is deduplicated
```

---

## Commands

All commands are prefixed with `!` and entered in the terminal TUI (or web console).

| Command | Description | Example |
|---------|-------------|---------|
| `!help` | Show this help menu | `!help` |
| `!save [name]` | Save current session | `!save my_session` |
| `!load <name>` | Load a saved session | `!load my_session` |
| `!sessions` | List all saved sessions | `!sessions` |
| `!export [file]` | Export conversation to Markdown | `!export chat.md` |
| `!tokens` | Show estimated token usage | `!tokens` |
| `!model <id>` | Change the active model | `!model openai/gpt-4o` |
| `!config` | Show current configuration | `!config` |
| `!status` | Test API connectivity | `!status` |
| `!reset` | Reset conversation (keeps system prompt) | `!reset` |
| `!clear` | Clear terminal screen | `!clear` |
| `!memory` | Query agent's learned skills and knowledge | `!memory` |
| `exit` / `quit` / `q` | Exit and auto-save session | `q` |

---

## Web Interface

When launched with `--web`, the agent starts a FastAPI server:

- **Default URL:** `http://127.0.0.1:7860`
- **Real-time:** WebSocket-based streaming (no polling)
- **UI:** Pixel-perfect Claude.ai dark theme with Inter and Newsreader fonts

### Settings Panel

Click the gear icon in the sidebar to open:

| Setting | Control | Range |
|---------|---------|-------|
| Temperature | Slider | 0.0 – 1.0 (step 0.05) |
| Max Tokens | Slider | 256 – 8192 (step 256) |
| Feedback Depth | Slider | 0 – 6 (step 1) |

### Model Selection

| Option | API Value |
|--------|-----------|
| MiMo-V2.5 · Auto | `@preset/mimos` |
| Gemini 2.5 Flash | `google/gemini-2.5-flash-preview` |
| Claude Opus 4 | `anthropic/claude-opus-4` |
| GPT-4o · Medium | `openai/gpt-4o` |
| Llama 3.3 70B | `meta-llama/llama-3.3-70b-instruct` |
| DeepSeek R1 | `deepseek/deepseek-r1` |

### Session Management in Web UI

- **Save:** Sidebar or Settings panel
- **Load:** Click any session from the Recents list
- **Reset:** Settings panel
- **Export:** Settings panel — saves Markdown to server filesystem

---

## Security Model

### Shell Command Blocklist

24 commands are forbidden from execution in the shell interpreter to prevent system damage, privilege escalation, and network abuse:

| Category | Blocked Commands |
|----------|-----------------|
| System modification | `rm`, `sudo`, `doas`, `su`, `shutdown`, `reboot`, `halt`, `poweroff` |
| Disk operations | `dd`, `mkfs`, `fdisk`, `format`, `mount`, `umount` |
| Permission changes | `chmod`, `chown`, `chattr`, `passwd` |
| Process management | `kill`, `killall`, `pkill` |
| Network tools | `wget`, `curl`, `nc`, `netcat`, `ncat` |
| Shell spawns | `bash`, `zsh`, `sh`, `dash`, `fish` |
| Remote access | `telnet`, `ssh`, `scp`, `rsync` |

### Python Sandbox

Dynamic Python execution (`execute_python_dynamically`) restricts builtins to a whitelist of ~30 safe functions. `__import__`, `open`, `exec`, `eval`, `compile`, `globals`, and `locals` are all excluded.

### Path Traversal Protection

All file/session name inputs are sanitized:
- `os.path.basename()` strips directory components
- `re.sub(r'[^\w\-]', '_')` removes special characters

### Credential Management

- API key is stored in `.env` (excluded from version control via `.gitignore`)
- Read from `os.getenv()` at runtime
- Never hardcoded in source files
- `.env` and `krocks_memory.db` are gitignored

### Accessibility Permissions

`UIManipulator` requires macOS Accessibility access. If not granted, it returns a clear error message directing the user to:
`System Settings > Privacy & Security > Accessibility`

---

## File Structure

```
Krock's/
├── krocks_main.py           # Agent core: config, API client, TUI, main loop
├── krocks_web.py            # FastAPI web server with inline HTML/JS/CSS
├── krocks_interpreter.py    # Sandboxed shell and Python execution
├── krocks_native_bridge.py  # macOS JXA execution and Spotlight search
├── krocks_accessibility.py  # Hardware keystroke simulation via CGEvent
├── krocks_vision.py         # In-memory screen capture via Quartz
├── krocks_evolution.py      # Self-evolution engine (learns new skills)
├── krocks_indexer.py        # SQLite memory/knowledge index
├── update_html.py           # Utility to rebuild embedded HTML in krocks_web.py
├── skills/                  # Dynamically generated skill modules
│   └── __init__.py          # Python package marker
├── .env                     # API key and configuration (gitignored)
├── .gitignore               # Git exclusion rules
├── LICENSE                  # All Rights Reserved
└── README.md                # This file
```

---

## Troubleshooting

| Problem | Likely Cause | Solution |
|---------|--------------|----------|
| `API anahtarı ayarlanmamış!` | Missing `KROCKS_API_KEY` | Create `.env` with your key or set the environment variable |
| `API yetki hatası (401/403)` | Invalid or expired API key | Check key at [OpenRouter](https://openrouter.ai/keys) |
| `Erişilebilirlik izni yok` | Missing macOS permission | System Settings > Privacy & Security > Accessibility > grant permission |
| `Modül yüklenemedi` | Missing Python package | Run `pip install rich httpx fastapi uvicorn pyobjc` |
| WebSocket disconnects | Server restart or network | Auto-reconnect is built in — wait 3 seconds |
| `Yasaklı komut` | Shell command on blocklist | Use a different approach (JXA, Python) |

---

## License

Copyright (C) 2026 Batın. All Rights Reserved.

This software and associated documentation files (the "Software") are private and confidential. Unauthorized copying, modification, distribution, or sublicensing of this Software, via any medium, is strictly prohibited.

The Software is provided "as is", without warranty of any kind.
