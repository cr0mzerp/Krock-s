# 👨🏻‍🦯  Krock's Apex  NOT UPDATED YET!  For MaOS 👨🏻‍🦯‍➡️


**MacOS Version 6.3** — An Ultra-Optimized, Autonomous, Self-Evolving macOS AI Agent

Krock's Apex is not just another wrapper for language models; it is a modular, streaming, context-aware autonomous agent deeply integrated with macOS. Engineered for extreme token efficiency, it performs complex multi-step tasks—such as executing sandboxed shell commands, running native AppleScript/JXA, simulating hardware keystrokes, and visually analyzing the screen—with a fraction of the token cost compared to traditional contextual agents.

Featuring a built-in **Evolution Engine**, Krock's Apex dynamically writes, compiles, and memorizes its own Python skills into a SQLite database, allowing it to adapt to its environment over time.

Average Input 1k | Output 500 tokens 🤑
---

## 🧠 Core Philosophy & Advantages

* **Extreme Token Efficiency:** Unlike standard agents that stuff the entire codebase or environment state into the context window, Krock's utilizes a highly optimized micro-feedback loop. It queries only what it needs, keeping average input/output ratios incredibly low.
* **True Autonomy (Stateless Action Loop):** Krock's operates on a recursive feedback mechanism. It triggers an action, evaluates the exact output, and decides the next step without relying on bloated historical context.
* **Self-Evolving Codebase:** Through the `[EVOLVE]` and `[USE]` protocols, the agent can expand its own capabilities at runtime by writing persistent Python modules.

---

## 🏗️ System Architecture

The architecture is divided into specialized, decoupled modules. The Core orchestrates the flow, sending parsed actions to secure execution environments.

    ┌────────────────────────────────────────────────────────────┐
    │                     Krock's Apex v6.3                      │
    ├────────────────────────────────────────────────────────────┤
    │                      ┌──────────────────┐                  │
    │                      │  KrocksApexAgent │                  │
    │                      │      (Core)      │                  │
    │                      └────────┬─────────┘                  │
    │                               │                            │
    │   ┌──────────────┐   ┌────────┴─────────┐   ┌──────────┐   │
    │   │ Terminal TUI │───│  Action Parser   │───│  Web UI  │   │
    │   │    (Rich)    │   │  & Dispatcher    │   │(FastAPI) │   │
    │   └──────────────┘   └────────┬─────────┘   └──────────┘   │
    │                               │                            │
    │   ┌───────────────────────────┴────────────────────────┐   │
    │   │                    Action Executors                │   │
    │   │                                                    │   │
    │   │  [CMD]    ──► KrocksInterpreter  (Sandboxed Shell) │   │
    │   │  [JXA]    ──► NativeOSBridge     (OSAKit Memory)   │   │
    │   │  [TYPE]   ──► UIManipulator      (CoreGraphics)    │   │
    │   │  [VISION] ──► OmniSight          (Quartz Base64)   │   │
    │   │  [EVOLVE] ──► EvolutionEngine    (AST Write)       │   │
    │   │  [USE]    ──► EvolutionEngine    (Dynamic Import)  │   │
    │   └───────────────────────────┬────────────────────────┘   │
    │                               │                            │
    │                      ┌────────┴─────────┐                  │
    │                      │   OmniIndexer    │                  │
    │                      │ (SQLite Memory)  │                  │
    │                      └──────────────────┘                  │
    └────────────────────────────────────────────────────────────┘

---

## 📦 Modules Deep Dive

### 1. Agent Core (`krocks_main.py`)
The orchestrator handling the REPL loop, API streaming, and the presentation layer.
* **State Management:** Automatically trims context windows to prevent token bloat. Implements `_seen_feedback()` to deduplicate recursive action responses.
* **API Client:** Async streaming via HTTPX to OpenRouter. Features exponential backoff for rate limits (429) and network faults.
* **Rich Renderer:** Provides a live TUI featuring a three-column dashboard: markdown responses, real-time action tags, and live metrics (Tokens/sec, elapsed time).

### 2. Execution & Security (`krocks_interpreter.py`)
Handles execution of commands outside the Python environment.
* **Sandboxed Shell:** Executes commands asynchronously via `asyncio.create_subprocess_exec` with a strict 30-second timeout.
* **Blocklist Enforcement:** 24 critical commands are hard-blocked to prevent system damage and network abuse (e.g., `rm`, `sudo`, `chown`, `kill`, `curl`, `ssh`).
* **Dynamic Python Runtime:** Executes raw Python code in a highly restricted AST-verified environment. Built-ins like `eval`, `exec`, `open`, and `__import__` are stripped.

### 3. Native OS Bridge (`krocks_native_bridge.py`)
Interacts natively with macOS without spawning external shells.
* **JXA Execution:** Compiles and runs JavaScript for Automation directly in-memory using `OSAKit`. Leaves no temporary files.
* **Spotlight Integration:** Rapid filesystem queries via the `mdfind` API.

### 4. UI Manipulator (`krocks_accessibility.py`)
Hardware-level simulation.
* Uses `CoreGraphics` (`CGEvent`) to simulate physical keystrokes.
* Supports complex modifier masks (`<cmd+space>`, `<shift+enter>`) and raw text typing directly into the active UI element.

### 5. Vision (`krocks_vision.py`)
In-memory visual analysis.
* Uses `Quartz.CGDisplayCreateImage` for zero-disk-write screen captures.
* Encodes the raw bitmap to Base64 and injects it into the API payload for multimodal visual feedback.

### 6. Evolution Engine & Memory (`krocks_evolution.py` & `krocks_indexer.py`)
The cornerstone of Krock's autonomy.
* **Skill Generation:** The AI writes raw Python code which the engine saves to `skills/*.py`, dynamically imports via `importlib`, and executes.
* **Persistence (`OmniIndexer`):** Skills and learned facts are upserted into a local `SQLite` database (`krocks_memory.db`), allowing the agent to remember capabilities across sessions.

---

## 🛠️ Action Protocols

Krock's interacts with its environment exclusively through strictly parsed XML-style action tags.

| Tag | Purpose | Example | Module Triggered |
| :--- | :--- | :--- | :--- |
| `[CMD]` | Run shell command | `[CMD]ls -la[/CMD]` | `KrocksInterpreter` |
| `[JXA]` | Run AppleScript/JXA | `[JXA]Application('Finder').name()[/JXA]` | `NativeOSBridge` |
| `[TYPE]` | Simulate keystrokes | `[TYPE]Hello<enter>[/TYPE]` | `UIManipulator` |
| `[VISION]` | Screen capture analysis | `[VISION]Read the error on screen[/VISION]` | `OmniSight` |
| `[EVOLVE]` | Write & memorize a skill | `[EVOLVE]get_ip \|\|\| <python_code>[/EVOLVE]` | `EvolutionEngine` |
| `[USE]` | Execute a learned skill | `[USE]get_ip \|\|\| fetch_public_ip \|\|\| [/USE]` | `EvolutionEngine` |

---

## 🚀 Installation & Setup

**Prerequisites:**
* macOS 14+ (Optimized for Apple Silicon / M-Series)
* Python 3.14+

```bash
# 1. Clone the secure repository
git clone "https://github.com/cr0mzerp/Krock-s.git"
cd Krock-s

# 2. Install dependencies
pip install rich httpx fastapi uvicorn pyobjc

# 3. Configure API Keys
echo 'KROCKS_API_KEY="sk-or-v1-..."' > .env
echo 'KROCKS_MODEL="anthropic/claude-opus-4"' >> .env

🎮 Usage Modes
Krock's provides three distinct interfaces depending on the deployment need:

1. Terminal TUI (Default)
A high-performance CLI environment with live token metrics.
Bash
python krocks_main.py

2. Web Interface
Launches a FastAPI server featuring a Claude-inspired UI with WebSocket streaming.
Bash
python krocks_main.py --web --port 8080
Features: Real-time streaming, Model Selector, Temperature/Token sliders, Session exporting.

3. Voice Mode
Hooks into macOS's native TTS engine.
Bash
python krocks_main.py --voice

🛡️ Security & Permissions Model
Krock's Apex is designed as a powerful but sandboxed entity.
Accessibility Requirement: To use the [TYPE] protocol, the terminal (or Python executable) must be granted Accessibility permissions (System Settings > Privacy & Security > Accessibility).
Path Traversal Prevention: All dynamically generated files, sessions, and skill names are sanitized using os.path.basename and regex (r'[^\w\-]').
Command Blocklist: 24 system-altering commands are strictly intercepted at the regex level before reaching the subprocess layer.

⚖️ License
Copyright (C) 2026 Batın. All Rights Reserved.
This software and associated documentation files (the "Software") are private and confidential. Unauthorized copying, modification, distribution, or sublicensing of this Software, via any medium, is strictly prohibited. The Software is provided "as is", without warranty of any kind.
