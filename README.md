# Krock's Apex

An autonomous, self-evolving macOS AI agent.

## Features

- **Terminal TUI** — Rich-powered terminal interface
- **Web UI** — Optional FastAPI web interface (`--web` flag)
- **Screen Vision** — Screen capture and analysis via Quartz
- **Native macOS** — JXA, AppleScript, Cocoa/AppKit integration
- **Keystroke Simulation** — Hardware-level keystrokes via CGEvent
- **Self-Evolution** — Learns new skills and writes persistent modules
- **Sandboxed Execution** — Security-restricted shell commands

## Installation

```bash
# Install dependencies
pip install rich httpx fastapi uvicorn pyobjc

# Set API key (also reads from .env file)
export KROCKS_API_KEY="sk-or-v1-..."
```

## Usage

```bash
python krocks_main.py          # Terminal TUI
python krocks_main.py --web    # Web interface
```

## License

Copyright (C) 2026 Batın. All Rights Reserved.
