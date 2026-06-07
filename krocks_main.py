# krocks_main.py
from __future__ import annotations

import sys, os, time, asyncio, json, re, readline, atexit, traceback, random, base64, uuid, mimetypes, sqlite3
from pathlib import Path
from dataclasses import dataclass, field
from typing import AsyncGenerator, Any
from datetime import datetime
from enum import Enum

# ── .env dosyasını otomatik yükle ────────────────────────────────────────────
def _load_dotenv(env_path: Path | None = None) -> None:
    """Basit .env yükleyici — python-dotenv gerekmez."""
    path = env_path or (Path(__file__).parent / ".env")
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        if key and key not in os.environ:  # Mevcut env değişkenlerini ezmez
            os.environ[key] = val

_load_dotenv()

import httpx
from rich.console import Console
from rich.panel import Panel
from rich.text import Text
from rich import box
from rich.table import Table
from rich.live import Live
from rich.markup import escape as esc
from rich.markdown import Markdown  # <-- EKLENEN KRİTİK UI MODÜLÜ

# ── Core module loading ───────────────────────────────────────────────────────
_MODULES_OK, _MODULE_ERROR = False, ""
try:
    from krocks_interpreter   import KrocksInterpreter
    from krocks_native_bridge import NativeOSBridge
    from krocks_accessibility import UIManipulator
    from krocks_evolution     import EvolutionEngine
    from krocks_vision        import OmniSight
    from krocks_indexer       import OmniIndexer
    _MODULES_OK = True
except ImportError as _e:
    _MODULE_ERROR = str(_e)

console = Console(highlight=False)

# ═════════════════════════════════════════════════════════════════════════════
#  §1  CONFIG
# ═════════════════════════════════════════════════════════════════════════════
@dataclass
class Config:
    api_key:        str   = field(default_factory=lambda: os.getenv("KROCKS_API_KEY", ""))
    api_url:        str   = "https://openrouter.ai/api/v1/chat/completions"
    model_id:       str   = field(default_factory=lambda: os.getenv(
                               "KROCKS_MODEL", "@preset/deepseekv4-flash"))
    max_tokens:     int   = int(os.getenv("KROCKS_MAX_TOKENS", "16384"))
    temperature:    float = float(os.getenv("KROCKS_TEMP", "0.7"))
    history_max:    int   = 60
    retry_max:      int   = 3
    retry_base:     float = 1.5
    feedback_depth: int   = 3        
    tts_timeout:    float = 30.0     
    sessions_dir:   Path  = field(default_factory=lambda: Path.home() / ".krocks" / "sessions")
    history_file:   Path  = field(default_factory=lambda: Path.home() / ".krocks" / "cmd_history")
    images_dir:     Path  = field(default_factory=lambda: Path.home() / ".krocks" / "images")
    debug:          bool  = False
    enable_mouse:          bool = True
    enable_multi_monitor:  bool = True
    enable_file_upload:    bool = True
    enable_vision:         bool = True

    def __post_init__(self) -> None:
        self.sessions_dir.mkdir(parents=True, exist_ok=True)
        self.history_file.parent.mkdir(parents=True, exist_ok=True)
        self.images_dir.mkdir(parents=True, exist_ok=True)

# ═════════════════════════════════════════════════════════════════════════════
#  §2  ACTION MODEL
# ═════════════════════════════════════════════════════════════════════════════
class ActionTag(str, Enum):
    CMD    = "CMD"
    JXA    = "JXA"
    TYPE   = "TYPE"
    MOUSE  = "MOUSE"
    VISION = "VISION"
    EVOLVE = "EVOLVE"
    USE    = "USE"
    ASK    = "ASK"
    WEB    = "WEB"

_TAG_COLOR: dict[ActionTag, str] = {
    ActionTag.CMD:    "blue",
    ActionTag.JXA:    "white",
    ActionTag.TYPE:   "red",
    ActionTag.MOUSE:  "magenta",
    ActionTag.VISION: "magenta",
    ActionTag.EVOLVE: "green",
    ActionTag.USE:    "yellow",
    ActionTag.ASK:    "cyan",
    ActionTag.WEB:    "bright_blue",
}

@dataclass
class Action:
    tag:    ActionTag
    data:   str
    extra:  dict = field(default_factory=dict)
    status: str  = "⏳"

_TAG_NAMES = "CMD|JXA|TYPE|MOUSE|VISION|EVOLVE|USE|ASK|WEB"
_STRIP_RE  = re.compile(rf'\[(?:{_TAG_NAMES})\].*?\[/(?:{_TAG_NAMES})\]', re.DOTALL)
_PATTERNS: dict[ActionTag, re.Pattern] = {
    ActionTag.VISION: re.compile(r'\[VISION\](.*?)\[/VISION\]',                  re.DOTALL),
    ActionTag.EVOLVE: re.compile(r'\[EVOLVE\](.*?)\|\|\|(.*?)\[/EVOLVE\]',        re.DOTALL),
    ActionTag.USE:    re.compile(r'\[USE\](.*?)\|\|\|(.*?)\|\|\|(.*?)\[/USE\]',   re.DOTALL),
    ActionTag.CMD:    re.compile(r'\[CMD\](.*?)\[/CMD\]',                         re.DOTALL),
    ActionTag.JXA:    re.compile(r'\[JXA\](.*?)\[/JXA\]',                         re.DOTALL),
    ActionTag.TYPE:   re.compile(r'\[TYPE\](.*?)\[/TYPE\]',                       re.DOTALL),
    ActionTag.MOUSE:  re.compile(r'\[MOUSE\](.*?)\[/MOUSE\]',                     re.DOTALL),
    ActionTag.ASK:    re.compile(r'\[ASK\](.*?)\[/ASK\]',                         re.DOTALL),
    ActionTag.WEB:    re.compile(r'\[WEB\](.*?)\[/WEB\]',                         re.DOTALL),
}

def parse_actions(text: str) -> tuple[str, list[Action]]:
    clean = _STRIP_RE.sub("", text).strip()
    # Markdown kod blokları içerisindeki aksiyon etiketlerini görmezden gelmek için
    code_block_re = re.compile(r'```.*?```', re.DOTALL)
    search_text = code_block_re.sub("", text)
    
    found: list[tuple[int, Action]] = []
    for tag, pat in _PATTERNS.items():
        for m in pat.finditer(search_text):
            g = m.groups()
            if   tag == ActionTag.EVOLVE: act = Action(tag, g[0].strip(), {"code": g[1].strip()})
            elif tag == ActionTag.USE:    act = Action(tag, f"{g[0].strip()}.{g[1].strip()}", {"args": g[2]})
            else:                          act = Action(tag, g[0].strip())
            found.append((m.start(), act))
    found.sort(key=lambda x: x[0])
    return clean, [a for _, a in found]

#  §3  UTILITIES
# ═════════════════════════════════════════════════════════════════════════════
def rough_tokens(text: str) -> int:
    return max(1, len(text.encode("utf-8")) // 4)

def _save_base64_to_disk(b64_url: str, cfg: Config) -> str:
    """Base64 URL'sini alır, diske kaydeder ve UI'ın görebileceği /images/... yolunu döner."""
    if not b64_url.startswith("data:image"):
        return b64_url
    try:
        header, encoded = b64_url.split(",", 1)
        ext = "png"
        if "jpeg" in header or "jpg" in header: ext = "jpeg"
        elif "webp" in header: ext = "webp"
        
        file_name = f"img_{uuid.uuid4().hex[:12]}.{ext}"
        file_path = cfg.images_dir / file_name
        file_path.write_bytes(base64.b64decode(encoded))
        return f"/images/{file_name}"
    except Exception:
        return b64_url

def _content_str(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return " ".join(
            p.get("text", "") for p in content
            if isinstance(p, dict) and p.get("type") == "text"
        )
    return json.dumps(content)

class SessionManager:
    def __init__(self, cfg: Config) -> None:
        self.dir = cfg.sessions_dir
        self.db_path = cfg.sessions_dir.parent / "krocks.db"
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS conversations (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            conn.execute('''
                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    conversation_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
                )
            ''')

    def create_conversation(self, title: str) -> str:
        conv_id = str(uuid.uuid4())
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("INSERT INTO conversations (id, title) VALUES (?, ?)", (conv_id, title))
        return conv_id

    def add_message(self, conv_id: str, role: str, content: Any) -> None:
        msg_id = str(uuid.uuid4())
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)",
                (msg_id, conv_id, role, json.dumps(content, ensure_ascii=False))
            )
            conn.execute("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", (conv_id,))

    def update_title(self, conv_id: str, title: str) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("UPDATE conversations SET title = ? WHERE id = ?", (title, conv_id))

    def get_title(self, conv_id: str) -> str | None:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT title FROM conversations WHERE id = ?", (conv_id,))
            row = cursor.fetchone()
            return row[0] if row else None

    def save(self, history: list[dict], name: str | None = None) -> str:
        # Legacy compatibility method, returns conversation_id instead of Path
        # In the new system, web will use incremental saves, but for CLI we can dump the whole list
        conv_id = str(uuid.uuid4())
        title = name or f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("INSERT INTO conversations (id, title) VALUES (?, ?)", (conv_id, title))
            for msg in history:
                msg_id = str(uuid.uuid4())
                conn.execute(
                    "INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)",
                    (msg_id, conv_id, msg.get("role", "user"), json.dumps(msg.get("content", ""), ensure_ascii=False))
                )
        return conv_id

    def load(self, conv_id: str) -> list[dict]:
        history = []
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
                (conv_id,)
            )
            for row in cursor:
                role, content_str = row
                try:
                    content = json.loads(content_str)
                except:
                    content = content_str
                history.append({"role": role, "content": content})
        
        if not history:
            raise FileNotFoundError(f"Oturum bulunamadı: {conv_id}")
        return history

    def list_sessions(self) -> list[dict]:
        sessions = []
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT id, title, updated_at FROM conversations ORDER BY updated_at DESC")
            for row in cursor:
                # updated_at is a string like '2023-10-25 10:20:30'
                sessions.append({"id": row[0], "name": row[1], "updated_at": row[2]})
        return sessions

    def delete(self, conv_id: str) -> bool:
        # Silmeden önce resimleri temizle
        try:
            history = self.load(conv_id)
            for msg in history:
                if isinstance(msg.get("content"), list):
                    for item in msg["content"]:
                        if isinstance(item, dict) and item.get("type") == "image_url":
                            url = item.get("image_url", {}).get("url", "")
                            if url.startswith("/images/"):
                                file_name = url.split("/")[-1]
                                img_path = self.dir.parent / "images" / file_name
                                if img_path.exists():
                                    img_path.unlink()
        except Exception:
            pass

        with sqlite3.connect(self.db_path) as conn:
            conn.execute("PRAGMA foreign_keys = ON")
            cursor = conn.execute("DELETE FROM conversations WHERE id = ?", (conv_id,))
            return cursor.rowcount > 0


    async def auto_name(self, history: list[dict], client) -> str:
        import re as _re
        for msg in history:
            if msg.get("role") == "user":
                raw = _content_str(msg["content"])
                # Strip reasoning blocks and internal tags so they don't pollute the name
                clean = _re.sub(r'```reasoning[\s\S]*?```', '', raw)
                clean = _re.sub(r'\[(CMD|JXA|TYPE|MOUSE|VISION|EVOLVE|USE|ASK|WEB)\][\s\S]*?(?:\[/\1\]|$)', '', clean)
                clean = clean.strip()[:500]
                if not clean:
                    continue
                prompt = f"Generate a short 2-4 word title for this conversation based on the user's first message. Reply with ONLY the title, no punctuation, no explanation:\n\n{clean}"
                try:
                    title = ""
                    async for chunk in client.stream([{"role": "user", "content": prompt}]):
                        title += chunk
                    # Strip any reasoning blocks the model might emit
                    title = _re.sub(r'```reasoning[\s\S]*?```', '', title)
                    slug = _re.sub(r'[^\w\s\-]', '', title.strip())
                    slug = _re.sub(r'\s+', ' ', slug).strip()[:50]
                    if slug:
                        return slug
                except Exception:
                    break
        return f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

class ProjectManager:
    def __init__(self, cfg: Config) -> None:
        self.db_path = cfg.sessions_dir.parent / "krocks.db"
        self.legacy_file = cfg.sessions_dir.parent / "projects.json"
        self._init_db()
        self._migrate_legacy_data()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS projects (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    instructions TEXT,
                    files TEXT,
                    sessions TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

    def _migrate_legacy_data(self):
        if self.legacy_file.exists():
            try:
                data = json.loads(self.legacy_file.read_text(encoding="utf-8")).get("projects", [])
                with sqlite3.connect(self.db_path) as conn:
                    for p in data:
                        # Tabloda var mı kontrol et
                        cursor = conn.execute("SELECT 1 FROM projects WHERE id = ?", (p.get("id"),))
                        if not cursor.fetchone():
                            conn.execute('''
                                INSERT INTO projects (id, name, description, instructions, files, sessions, updated_at)
                                VALUES (?, ?, ?, ?, ?, ?, ?)
                            ''', (
                                p.get("id"), p.get("name"), p.get("description", ""), 
                                p.get("instructions", ""), json.dumps(p.get("files", []), ensure_ascii=False),
                                json.dumps(p.get("sessions", []), ensure_ascii=False), p.get("updated_at", datetime.now().isoformat())
                            ))
                # Rename the file to mark as migrated
                backup_path = self.legacy_file.parent / "projects_backup.json"
                if not backup_path.exists():
                    os.rename(self.legacy_file, backup_path)
                else:
                    os.remove(self.legacy_file)
            except Exception:
                pass

    def list_projects(self) -> list[dict]:
        projects = []
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("SELECT * FROM projects ORDER BY updated_at DESC")
            for row in cursor:
                projects.append({
                    "id": row["id"],
                    "name": row["name"],
                    "description": row["description"],
                    "instructions": row["instructions"],
                    "files": json.loads(row["files"]) if row["files"] else [],
                    "sessions": json.loads(row["sessions"]) if row["sessions"] else [],
                    "updated_at": row["updated_at"]
                })
        return projects

    def create(self, name: str, description: str = "") -> dict:
        proj_id = f"proj_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        now = datetime.now().isoformat()
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                INSERT INTO projects (id, name, description, instructions, files, sessions, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (proj_id, name, description, "", "[]", "[]", now))
        
        return {
            "id": proj_id,
            "name": name,
            "description": description,
            "instructions": "",
            "files": [],
            "sessions": [],
            "updated_at": now
        }

    def get(self, proj_id: str) -> dict | None:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("SELECT * FROM projects WHERE id = ?", (proj_id,))
            row = cursor.fetchone()
            if row:
                return {
                    "id": row["id"],
                    "name": row["name"],
                    "description": row["description"],
                    "instructions": row["instructions"],
                    "files": json.loads(row["files"]) if row["files"] else [],
                    "sessions": json.loads(row["sessions"]) if row["sessions"] else [],
                    "updated_at": row["updated_at"]
                }
        return None

    def update(self, proj_id: str, updates: dict) -> dict | None:
        p = self.get(proj_id)
        if not p: return None
        
        merged = {**p, **updates, "updated_at": datetime.now().isoformat()}
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                UPDATE projects 
                SET name = ?, description = ?, instructions = ?, files = ?, sessions = ?, updated_at = ?
                WHERE id = ?
            ''', (
                merged["name"], merged["description"], merged["instructions"],
                json.dumps(merged["files"], ensure_ascii=False),
                json.dumps(merged["sessions"], ensure_ascii=False),
                merged["updated_at"], proj_id
            ))
            
        return merged

    def delete(self, proj_id: str) -> bool:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("DELETE FROM projects WHERE id = ?", (proj_id,))
            return cursor.rowcount > 0


class HistoryManager:
    def __init__(self, cfg: Config) -> None:
        try:
            if cfg.history_file.exists():
                readline.read_history_file(str(cfg.history_file))
            readline.set_history_length(1000)
            atexit.register(readline.write_history_file, str(cfg.history_file))
        except Exception:
            pass

# ═════════════════════════════════════════════════════════════════════════════
#  §4  STREAMING API CLIENT
# ═════════════════════════════════════════════════════════════════════════════
class APIClient:
    def __init__(self, cfg: Config) -> None:
        self.cfg = cfg

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.cfg.api_key}",
            "Content-Type":  "application/json",
            "HTTP-Referer":  "https://krocks.local",
            "X-Title":       "Krock's Apex v6.3",
        }

    async def stream(self, messages: list[dict]) -> AsyncGenerator[str, None]:
        # Reset reasoning-block state at the start of every stream call
        self._in_reasoning = False
        # Intercept local images and convert them to base64 for the API
        processed_messages = []
        for msg in messages:
            if not isinstance(msg.get("content"), list):
                processed_messages.append(msg)
                continue
            
            new_content = []
            for item in msg["content"]:
                if item.get("type") == "image_url" and isinstance(item.get("image_url"), dict):
                    url = item["image_url"].get("url", "")
                    if url.startswith("/images/"):
                        file_name = url.split("/")[-1]
                        filepath = self.cfg.images_dir / file_name
                        if filepath.exists():
                            # Sadece API'ye giderken anlık olarak base64'e çeviriyoruz
                            try:
                                mime_type, _ = mimetypes.guess_type(filepath)
                                if not mime_type: mime_type = "image/png"
                                b64_data = base64.b64encode(filepath.read_bytes()).decode("utf-8")
                                new_content.append({
                                    "type": "image_url",
                                    "image_url": {"url": f"data:{mime_type};base64,{b64_data}"}
                                })
                                continue
                            except Exception:
                                pass
                new_content.append(item)
            processed_messages.append({"role": msg["role"], "content": new_content})

        payload = {
            "model":       self.cfg.model_id,
            "messages":    processed_messages,
            "stream":      True,
            "max_tokens":  self.cfg.max_tokens,
            "temperature": self.cfg.temperature,
        }
        last_exc: Exception | None = None

        for attempt in range(self.cfg.retry_max + 1):
            try:
                async with httpx.AsyncClient(timeout=90.0) as client:
                    async with client.stream(
                        "POST", self.cfg.api_url,
                        headers=self._headers(), json=payload
                    ) as r:
                        r.raise_for_status()
                        async for line in r.aiter_lines():
                            if not line.startswith("data: "):
                                continue
                            raw = line[6:].strip()
                            if raw == "[DONE]":
                                if getattr(self, "_in_reasoning", False):
                                    self._in_reasoning = False
                                    yield "\n```\n\n"
                                return
                            try:
                                d = json.loads(raw)["choices"][0]["delta"]
                                r_content = d.get("reasoning_content") or d.get("reasoning") or ""
                                content = d.get("content") or ""
                                
                                if r_content:
                                    if not getattr(self, "_in_reasoning", False):
                                        self._in_reasoning = True
                                        yield '```reasoning\n'
                                    yield r_content
                                    
                                if content:
                                    if getattr(self, "_in_reasoning", False):
                                        self._in_reasoning = False
                                        yield "\n```\n\n"
                                    yield content
                            except (json.JSONDecodeError, KeyError, IndexError):
                                if self.cfg.debug:
                                    console.print(f"[dim red]SSE parse skip: {raw[:80]}[/]")
                if getattr(self, "_in_reasoning", False):
                    self._in_reasoning = False
                    yield "\n```\n\n"
                return

            except httpx.HTTPStatusError as exc:
                last_exc = exc
                code = exc.response.status_code
                if code in (401, 403):
                    raise RuntimeError(
                        f"API yetki hatası ({code}): KROCKS_API_KEY'i kontrol edin"
                    ) from exc
                if code == 429:
                    wait = self.cfg.retry_base * (2 ** attempt) + random.uniform(0, 1.0)
                    console.print(f"[yellow]⟳ Rate-limit ({attempt+1}/{self.cfg.retry_max}) — {wait:.1f}s[/]")
                    await asyncio.sleep(wait)
                    continue
                try:
                    await exc.response.aread()
                    error_text = exc.response.text[:200]
                except Exception:
                    error_text = "Hata detayı okunamadı"
                raise RuntimeError(f"HTTP {code}: {error_text}") from exc

            except (httpx.NetworkError, httpx.TimeoutException) as exc:
                last_exc = exc
                if attempt == self.cfg.retry_max:
                    break
                wait = self.cfg.retry_base * (2 ** attempt) + random.uniform(0, 0.5)
                console.print(
                    f"[yellow]⟳ Ağ hatası, yeniden deneniyor "
                    f"({attempt+1}/{self.cfg.retry_max}) — {wait:.1f}s[/]"
                )
                await asyncio.sleep(wait)

        raise RuntimeError(
            f"API {self.cfg.retry_max} denemeden sonra başarısız: {last_exc}"
        ) from last_exc

    async def ping(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5.0) as c:
                r = await c.head(self.cfg.api_url, headers=self._headers())
                return r.status_code < 500
        except Exception:
            return False

# ═════════════════════════════════════════════════════════════════════════════
#  §5  TUI RENDERER
# ═════════════════════════════════════════════════════════════════════════════
class Renderer:

    @staticmethod
    def header(model: str) -> Panel:
        t = Text(justify="center")
        t.append("KROCK'S APEX  ", style="bold cyan")
        t.append("v6.3", style="bold white")
        t.append("  ·  macOS M4  ·  ", style="dim white")
        t.append(model, style="dim cyan")
        t.append("  ·  ", style="dim white")
        t.append(datetime.now().strftime("%d %b %Y  %H:%M"), style="dim cyan")
        return Panel(t, box=box.HEAVY, border_style="cyan")

    @staticmethod
    def dashboard(ai_text: str, actions: list[Action], meta: dict) -> Table:
        tbl = Table(
            box=box.ROUNDED, expand=True, border_style="cyan",
            padding=(0, 1), header_style="bold cyan"
        )
        tbl.add_column("🧠  RESPONSE",  ratio=3)
        tbl.add_column("⚡  PROTOCOLS", ratio=2)
        tbl.add_column("📊  METRICS",   ratio=1)

        protos = [
            f"[{_TAG_COLOR.get(a.tag,'white')}]{a.status} {a.tag.value}[/]"
            f" [dim]{esc(a.data[:38])}{'…' if len(a.data) > 38 else ''}[/]"
            for a in actions
        ] or ["[dim italic]◌  Passive monitoring mode[/]"]

        elapsed = meta.get("elapsed", 0.0)
        chunks  = meta.get("chunks",  0)
        tokens  = meta.get("tokens",  0)
        depth   = meta.get("depth",   0)
        tps     = f"{tokens / elapsed:.0f}" if elapsed > 0 else "—"

        metrics = [
            f"[cyan]⏱[/]  {elapsed:.1f}s",
            f"[cyan]🔤[/]  ~{tokens} tok",
            f"[cyan]⚡[/]  {tps} t/s",
            f"[cyan]📦[/]  {chunks} chunks",
        ]
        if depth > 0:
            metrics.append(f"[yellow]🔁[/]  depth {depth}/{meta.get('max_depth', 3)}")
        metrics.append(f"[dim]{datetime.now().strftime('%H:%M:%S')}[/]")

        # ── EKLENEN YENİ RENDER MOTORU ──
        # Markdown ile metni işler, listeleri ve formatları modernleştirir
        # Bozuk markdown durumunda crash olmaması için try/except ile korunur
        if ai_text:
            try:
                response_renderable = Markdown(ai_text, justify="left")
            except Exception:
                response_renderable = esc(ai_text)
        else:
            response_renderable = "[dim]Streaming…[/]"

        tbl.add_row(
            response_renderable,
            "\n".join(protos),
            "\n".join(metrics),
        )
        return tbl

    @staticmethod
    def error_panel(title: str, body: str) -> Panel:
        return Panel(
            esc(body), title=f"[bold red]✖  {esc(title)}[/]",
            border_style="red", box=box.ROUNDED
        )

# ═════════════════════════════════════════════════════════════════════════════
#  §6  MAIN AGENT
# ═════════════════════════════════════════════════════════════════════════════
_SYSTEM_PROMPT = """\
Sen 'Krock's' adında, macOS işletim sistemine tam entegre, mutasyona uğrayabilen
ve ekranı görebilen otonom bir Apex Agent'sın.
Sistem: macOS iMac M4 (8-Core CPU/GPU). Zekan: MiMo-V2.5 Pro.

Aksiyon formatları (yalnızca gerektiğinde kullan):
[CMD] komut [/CMD]                          — Terminal komutu çalıştır
[JXA] jxa_kodu [/JXA]                       — Native macOS API manipüle et
[TYPE] metin [/TYPE]                         — Donanımsal tuş vuruşu
[VISION] soru [/VISION]                      — Ekranı tara ve analiz et
[WEB] url_veya_sorgu [/WEB]                 — Web'de ara veya sayfayı oku
[EVOLVE] yetenek ||| python_kodu [/EVOLVE]  — Kalıcı modül yaz / öğren
[USE] yetenek ||| fonksiyon ||| args [/USE] — Öğrenilen yeteneği çalıştır

KESİN KURALLAR — İHLAL ETME:
1. Komut çıktıları "[SİSTEM OTOMATİK GERİ BİLDİRİMİ]" başlığıyla gelir. Bu çıktıyı
   aldıktan sonra HEDEFİNE ULAŞTIYSAN SAKIN yeni komut üretme. Cevabı ver ve dur.
2. Bir komutun çıktısı "dizin bulunamadı", "yok", "erişim hatası" veya benzeri bir
   hata veriyorsa AYNI veya BENZER komutu farklı path ile tekrar deneme. Kullanıcıya
   hatayı açıkla ve dur.
3. ASLA `ls`, `find`, `pwd`, `whoami` gibi keşif komutlarını birden fazla kez
   art arda çalıştırma. İlk çıktı yeterliyse devam komut üretme.
4. ASLA Markdown (```) kod blokları içinde komut verme — sadece köşeli parantezli
   tagleri kullan.
"""

_HOTKEYS: dict[str, str] = {
    "!help":           "Bu menü",
    "!save [isim]":    "Oturumu kaydet",
    "!load <isim>":    "Oturum yükle",
    "!sessions":       "Kayıtlı oturumları listele",
    "!export [dosya]": "Konuşmayı Markdown'a aktar",
    "!tokens":         "Tahmini token kullanımı",
    "!model <id>":     "Aktif modeli değiştir",
    "!config":         "Mevcut yapılandırmayı göster",
    "!status":         "API bağlantısını test et",
    "!reset":          "Sohbeti sıfırla (sistem korunur)",
    "!clear":          "Ekranı temizle",
    "!memory":         "Ajanın hafıza durumunu ve yeteneklerini sorgular",
    "exit / q":        "Çıkış + autosave",
}

MAX_INPUT_CHARS   = 32_000
MAX_FEEDBACK_RING = 128


class KrocksApexAgent:

    def __init__(self, voice_mode: bool = False, debug: bool = False) -> None:
        self.cfg           = Config(debug=debug)
        self.voice         = voice_mode
        self.api           = APIClient(self.cfg)
        self.sessions      = SessionManager(self.cfg)
        self.projects      = ProjectManager(self.cfg)
        self.render        = Renderer()
        self._hist         = HistoryManager(self.cfg)
        self.history: list[dict]            = [{"role": "system", "content": _SYSTEM_PROMPT}]
        self._tts_tasks: set[asyncio.Task]  = set() 
        self._fb_seen:   list[str]          = []      
        self.active_workspace: str | None   = None
        self._gen: int = 0

        if _MODULES_OK:
            self.interpreter = KrocksInterpreter()
            self.bridge      = NativeOSBridge()
            self.ui          = UIManipulator()
            self.evolution   = EvolutionEngine()
            self.vision      = OmniSight()
            self.indexer     = OmniIndexer()

    async def _cleanup(self) -> None:
        for task in list(self._tts_tasks):
            if not task.done():
                task.cancel()
        if self._tts_tasks:
            await asyncio.gather(*self._tts_tasks, return_exceptions=True)
        # SQLite bağlantılarını kapat — sadece modüller yüklüyse
        if _MODULES_OK:
            try:
                self.evolution.close()
            except Exception:
                pass
            try:
                self.indexer.close()
            except Exception:
                pass

    def _push(self, role: str, content: Any) -> None:
        # Aynı kullanıcı mesajı art arda 2 kez pushlanırsa ikinciyi yoksay
        if role == "user" and self.history and self.history[-1]["role"] == "user":
            prev_content = self.history[-1].get("content", "")
            if isinstance(content, str) and isinstance(prev_content, str):
                if content == prev_content:
                    return  # Duplicate — ignore
        if (self.history
                and self.history[-1]["role"] == role
                and role != "system"):
            if isinstance(content, str) and isinstance(self.history[-1]["content"], str):
                self.history[-1]["content"] += "\n" + content
                return

        # Gelen content içinde base64 resimler varsa onları fiziksel dosyaya kaydet
        if isinstance(content, list):
            new_content = []
            for item in content:
                if isinstance(item, dict) and item.get("type") == "image_url":
                    url = item.get("image_url", {}).get("url", "")
                    if url.startswith("data:image"):
                        local_path = _save_base64_to_disk(url, self.cfg)
                        new_content.append({"type": "image_url", "image_url": {"url": local_path}})
                    else:
                        new_content.append(item)
                else:
                    new_content.append(item)
            content = new_content

        self.history.append({"role": role, "content": content})

        if len(self.history) > self.cfg.history_max:
            keep = max(2, self.cfg.history_max // 2)
            # Trim'den önce düşecek mesajlardaki image blob'larını serbest bırak
            # (Sadece user mesajlarında images var, onlar büyük base64 içerir)
            for i in range(1, len(self.history) - keep):
                if "images" in self.history[i] and self.history[i]["images"]:
                    self.history[i]["images"] = None
                    self.history[i]["content"] = "[eski görsel budandı]"
            self.history = [self.history[0]] + self.history[-keep:]
            if len(self.history) > 1 and self.history[1]["role"] == "assistant":
                self.history.insert(1, {"role": "user", "content": "[Geçmiş kırpıldı]"})

    def _fire_tts(self, text: str) -> None:
        if not self.voice or not text.strip():
            return
        task = asyncio.create_task(self._speak(text))
        self._tts_tasks.add(task)
        task.add_done_callback(self._tts_tasks.discard)

    async def _speak(self, text: str) -> None:
        clean = re.sub(r'[*#_`\'"\\]', ' ', text)
        clean = re.sub(r'\s+', ' ', clean).strip()
        if not clean:
            return
        proc = None
        try:
            proc = await asyncio.create_subprocess_exec(
                'say', clean[:512],
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )
            await asyncio.wait_for(proc.communicate(), timeout=self.cfg.tts_timeout)
        except asyncio.TimeoutError:
            if proc:
                try:
                    proc.kill()
                    await proc.communicate()  # Pipe tamponlarını temizle
                except Exception:
                    pass
        except Exception:
            pass

    def _seen_feedback(self, text: str) -> bool:
        if text in self._fb_seen:
            return True
        self._fb_seen.append(text)
        if len(self._fb_seen) > MAX_FEEDBACK_RING:
            self._fb_seen.pop(0)
        return False

    async def _hotkey(self, cmd: str) -> bool:
        if cmd == "!help":
            t = Table(box=box.SIMPLE, show_header=False, padding=(0, 2))
            t.add_column(style="cyan bold", no_wrap=True)
            t.add_column(style="dim")
            for k, v in _HOTKEYS.items():
                t.add_row(k, v)
            console.print(t)
            return True

        if cmd == "!memory":
            if not _MODULES_OK:
                console.print("[red]✖ Hafıza modülü yüklenemedi.[/]")
                return True
            try:
                rows = self.indexer.get_all_memory()
                
                if not rows:
                    console.print("[yellow]🧠 Krock's hafızası boş. Henüz bir şey öğrenilmedi.[/]")
                    return True
                
                t = Table(title="🧠 Krock's Apex Hafıza İndeksi", box=box.ROUNDED, border_style="cyan")
                t.add_column("Kategori", style="cyan bold")
                t.add_column("Yetenek/Bilgi Adı", style="green bold")
                t.add_column("Değer/Kod Özeti", style="dim text", max_width=40)
                t.add_column("Son Güncelleme", style="magenta")
                
                for cat, key, val_str, ts in rows:
                    try:
                        val = json.loads(val_str)
                        if "code" in val:
                            summary = val["code"].strip().splitlines()[0]
                            if len(val["code"].strip().splitlines()) > 1:
                                summary += " ..."
                        else:
                            summary = str(val)
                    except Exception:
                        summary = val_str
                    t.add_row(cat, key, summary, ts)
                
                console.print(t)
            except Exception as e:
                console.print(f"[red]✖ Hafıza sorgulanırken hata oluştu: {e}[/]")
            return True

        if cmd == "!sessions":
            ss = self.sessions.list_sessions()
            if ss:
                for s in ss:
                    console.print(f"  [dim cyan]·[/] {s}")
            else:
                console.print("[dim]Kayıtlı oturum yok.[/]")
            return True

        if cmd.startswith("!save"):
            parts = cmd.split(None, 1)
            name  = parts[1].strip() if len(parts) > 1 else self.sessions.auto_name(self.history)
            p = self.sessions.save(self.history, name)
            console.print(f"[green]✔ Kaydedildi:[/] {p.name}")
            return True

        if cmd.startswith("!load"):
            parts = cmd.split(None, 1)
            if len(parts) < 2 or not parts[1].strip():
                console.print("[red]Kullanım: !load <oturum-ismi>[/]")
                return True
            stem = parts[1].strip()
            # Path traversal koruması: sadece basit dosya adlarına izin ver
            stem = re.sub(r'[^\w\-]', '_', stem)
            try:
                self.history = self.sessions.load(stem)
                console.print(f"[green]✔ Yüklendi:[/] {stem}  ({len(self.history)} mesaj)")
            except (FileNotFoundError, ValueError) as e:
                console.print(f"[red]✖ {esc(str(e))}[/]")
            return True

        if cmd.startswith("!export"):
            parts = cmd.split(None, 1)
            fname_raw = (parts[1].strip() if len(parts) > 1
                         else f"krocks_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md")
            # Path traversal koruması: sadece dosya adı kullan
            safe_fname = os.path.basename(fname_raw)
            if not safe_fname:
                safe_fname = f"krocks_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
            fname = safe_fname
            md = self._to_markdown()
            Path(fname).write_text(md, encoding="utf-8")
            console.print(f"[green]✔ Aktarıldı:[/] {fname}  ({len(md):,} karakter)")
            return True

        if cmd == "!tokens":
            total = sum(rough_tokens(_content_str(m["content"])) for m in self.history)
            console.print(
                f"[cyan]Tahmini token:[/] ~{total:,}  ([dim]{len(self.history)} mesaj[/])"
            )
            return True

        if cmd.startswith("!model"):
            parts = cmd.split(None, 1)
            if len(parts) < 2 or not parts[1].strip():
                console.print(f"[cyan]Aktif model:[/] {esc(self.cfg.model_id)}")
                return True
            self.cfg.model_id = parts[1].strip()
            console.print(f"[green]✔ Model değiştirildi:[/] {esc(self.cfg.model_id)}")
            return True

        if cmd.startswith("!config"):
            parts = cmd.split(None, 3)
            if len(parts) >= 3 and parts[1] == "set":
                key = parts[2]
                val = parts[3] if len(parts) > 3 else ""
                if hasattr(self.cfg, key):
                    current_type = type(getattr(self.cfg, key))
                    try:
                        if current_type == bool:
                            new_val = val.lower() in ("true", "1", "yes", "on")
                        else:
                            new_val = current_type(val)
                        setattr(self.cfg, key, new_val)
                        console.print(f"[green]✔ Config güncellendi:[/] {key} = {new_val}")
                    except Exception as e:
                        console.print(f"[red]✖ Geçersiz değer tipi:[/] {e}")
                else:
                    console.print(f"[red]✖ Bilinmeyen config anahtarı:[/] {key}")
                return True
            t = Table(box=box.SIMPLE, show_header=False, padding=(0, 2))
            t.add_column(style="cyan", no_wrap=True)
            t.add_column()
            for name, val in [
                ("model_id",       self.cfg.model_id),
                ("max_tokens",     str(self.cfg.max_tokens)),
                ("temperature",    str(self.cfg.temperature)),
                ("history_max",    str(self.cfg.history_max)),
                ("feedback_depth", str(self.cfg.feedback_depth)),
                ("retry_max",      str(self.cfg.retry_max)),
                ("tts_timeout",    str(self.cfg.tts_timeout)),
                ("debug",          str(self.cfg.debug)),
                ("enable_mouse",   str(self.cfg.enable_mouse)),
                ("enable_multi_monitor", str(self.cfg.enable_multi_monitor)),
                ("enable_file_upload", str(self.cfg.enable_file_upload)),
                ("enable_vision",  str(self.cfg.enable_vision)),
            ]:
                t.add_row(name, esc(str(val)))
            console.print(t)
            return True

        if cmd == "!status":
            console.print("[dim]API bağlantısı kontrol ediliyor…[/]")
            ok = await self.api.ping()
            if ok:
                console.print("[green]✔ API erişilebilir[/]")
            else:
                console.print(
                    "[red]✖ API erişilemiyor — URL ve API anahtarını kontrol edin.[/]"
                )
            return True

        if cmd == "!reset":
            self.history  = [self.history[0]]
            self._fb_seen.clear()
            self._gen += 1
            console.print("[yellow]Sohbet sıfırlandı (sistem prompt korundu).[/]")
            return True

        return False

    def _to_markdown(self) -> str:
        lines = [
            "# Krock's Apex — Konuşma Aktarımı\n",
            f"*{datetime.now().strftime('%Y-%m-%d %H:%M')}*\n\n---\n",
        ]
        role_map = {"system": "**[SYSTEM]**", "user": "**You**", "assistant": "**Krock's**"}
        for msg in self.history:
            label = role_map.get(msg["role"], msg["role"].upper())
            text  = _content_str(msg["content"])
            lines.append(f"### {label}\n{text}\n\n---\n")
        return "\n".join(lines)

    async def _execute(self, action: Action) -> str | dict | None:
        if not _MODULES_OK:
            return f"[Modül eksik — {action.tag.value} atlandı: {_MODULE_ERROR}]"

        try:
            if action.tag == ActionTag.CMD:
                out = await self.interpreter.execute_shell_async(action.data, cwd=self.active_workspace)
                out_str = out.strip() if out else ""
                if not out_str:
                    body = "(çıktı yok)"
                elif len(out_str) > 20000:
                    body = out_str[:10000] + "\n\n...[ÇIKTI ÇOK UZUNDU, ORTASI KESİLDİ]...\n\n" + out_str[-10000:]
                else:
                    body = out_str
                return f"CMD ▶ {action.data[:60]}\n{body}"

            if action.tag == ActionTag.JXA:
                out = await asyncio.to_thread(self.bridge.run_jxa_native, action.data)
                body = out.strip() if out and out.strip() else "(çıktı yok)"
                return f"JXA ▶ {body}"

            if action.tag == ActionTag.TYPE:
                safe_data = action.data.replace('"', '\\"')
                self.ui.hardware_keystroke(safe_data)
                return None

            if action.tag == ActionTag.MOUSE:
                if not self.cfg.enable_mouse:
                    return "Hata: Fare (MOUSE) kontrolü config üzerinden devre dışı bırakılmış. Lütfen '!config set enable_mouse true' ile aktif edin."
                self.ui.hardware_mouse_action(action.data)
                return None

            if action.tag == ActionTag.VISION:
                if not self.cfg.enable_vision:
                    return "Hata: Görüş (VISION) özelliği config üzerinden devre dışı bırakılmış."
                b64_list = self.vision.take_snapshot(multi_monitor=self.cfg.enable_multi_monitor)
                if not b64_list:
                    return "Görüş hatası: Ekran yakalanamadı veya boş."
                if isinstance(b64_list, str):
                    if "Hata" in b64_list: return f"Görüş hatası: {b64_list}"
                    b64_list = [b64_list]
                return {"__vision__": action.data, "__img_list__": b64_list}

            if action.tag == ActionTag.EVOLVE:
                res = self.evolution.write_and_learn_skill(action.data, action.extra.get("code", ""))
                return f"EVOLVE ▶ {res}"

            if action.tag == ActionTag.USE:
                parts = action.data.split(".", 1)
                args  = [a.strip() for a in action.extra.get("args", "").split(",") if a.strip()]
                res   = self.evolution.execute_skill(*parts, *args)
                return f"USE ▶ {action.data}: {res}"

            if action.tag == ActionTag.ASK:
                return None # The frontend will handle this by showing a modal to the user

            if action.tag == ActionTag.WEB:
                from krocks_web_engine import UltraWebEngine
                query = action.data.strip()
                if query.startswith("http://") or query.startswith("https://"):
                    return f"WEB(Fetch) ▶\n{UltraWebEngine.fetch(query)}"
                else:
                    return f"WEB(Search) ▶\n{UltraWebEngine.search(query)}"

        except Exception:
            tb = traceback.format_exc(limit=4)
            if self.cfg.debug:
                console.print(f"[dim red]{tb}[/]")
            return f"[Hata/{action.tag.value}]: {tb.splitlines()[-1]}"

        return None 

    async def _turn(
        self,
        prompt: str,
        img_b64: str | None = None,
        depth: int = 0,
    ) -> None:

        if not self.cfg.api_key:
            console.print(
                "[red]✖ API anahtarı ayarlanmamış![/]\n"
                "  [yellow]└ KROCKS_API_KEY ortam değişkenini ayarlayın veya .env dosyasını düzenleyin.[/]"
            )
            return

        content_items = [{"type": "text", "text": prompt}]
        if isinstance(img_b64, list):
            for b64 in img_b64:
                content_items.append({"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}})
        elif img_b64:
            content_items.append({"type": "image_url", "image_url": {"url": f"data:image/png;base64,{img_b64}"}})
            
        content: Any = content_items if len(content_items) > 1 else prompt
        history_len_before = len(self.history)
        self._push("user", content)

        full_text = ""
        chunks    = 0
        t0        = time.monotonic()

        try:
            with Live(console=console, refresh_per_second=20, transient=True) as live:
                async for chunk in self.api.stream(self.history):
                    full_text += chunk
                    chunks    += 1
                    clean, acts = parse_actions(full_text)
                    live.update(self.render.dashboard(
                        clean, acts,
                        {
                            "elapsed":   time.monotonic() - t0,
                            "chunks":    chunks,
                            "tokens":    rough_tokens(full_text),
                            "depth":     depth,
                            "max_depth": self.cfg.feedback_depth,
                        }
                    ))
        except RuntimeError as exc:
            console.print(self.render.error_panel("API Hatası", str(exc)))
            if len(self.history) > history_len_before:
                self.history.pop()
            return

        if not full_text.strip():
            console.print("[dim]Yanıt alınamadı.[/]")
            if len(self.history) > history_len_before:
                self.history.pop()
            return

        self._push("assistant", full_text)
        clean_text, actions = parse_actions(full_text)
        self._fire_tts(clean_text)

        final_meta = {
            "elapsed":   time.monotonic() - t0,
            "chunks":    chunks,
            "tokens":    rough_tokens(full_text),
            "depth":     depth,
            "max_depth": self.cfg.feedback_depth,
        }

        if not actions:
            console.print(self.render.dashboard(clean_text, [], final_meta))
            return

        feedbacks: list[str | dict] = []
        tokens_est = final_meta["tokens"]

        with Live(console=console, refresh_per_second=10, transient=False) as live:
            for act in actions:
                act.status = "🔄"
                elapsed = time.monotonic() - t0
                live.update(self.render.dashboard(
                    clean_text, actions,
                    {"elapsed": elapsed, "chunks": chunks,
                     "tokens": tokens_est, "depth": depth, "max_depth": self.cfg.feedback_depth}
                ))

                fb = await self._execute(act)
                act.status = "✖" if isinstance(fb, str) and fb.startswith("[Hata") else "✔"
                if fb is not None:
                    feedbacks.append(fb)

                elapsed = time.monotonic() - t0
                live.update(self.render.dashboard(
                    clean_text, actions,
                    {"elapsed": elapsed, "chunks": chunks,
                     "tokens": tokens_est, "depth": depth, "max_depth": self.cfg.feedback_depth}
                ))
                await asyncio.sleep(0.12)

        for fb in feedbacks:
            if isinstance(fb, dict) and "__vision__" in fb:
                await self._turn(
                    f"Ekran analizi: {fb['__vision__']}", fb.get("__img_list__") or fb.get("__img__"), depth=depth + 1
                )
            elif isinstance(fb, str) and fb.strip():
                # CMD çıktısını normalize ederek döngü tespiti yap
                fb_key = " ".join(fb.split())[:200]
                if self._seen_feedback(fb_key):
                    if self.cfg.debug:
                        console.print("[dim]Tekrarlayan geri bildirim — atlandı.[/]")
                    continue
                await self._turn(
                    f"[SİSTEM OTOMATİK GERİ BİLDİRİMİ]\n{fb}\n\n"
                    "NOT: Bu çıktıya dayanarak hedefine ulaştıysan yeni komut üretme, "
                    "sadece kullanıcıya nihai cevabı ver.",
                    depth=depth + 1
                )

    async def run(self) -> None:
        print("\033[H\033[J", end="")
        console.print(self.render.header(self.cfg.model_id))

        if not _MODULES_OK:
            console.print(Panel(
                f"[yellow]{esc(_MODULE_ERROR)}[/]",
                title="[yellow]⚠  Modül Uyarısı — Bazı aksiyonlar devre dışı[/]",
                border_style="yellow", box=box.ROUNDED,
            ))

        console.print(
            f"  [dim]!help[/dim] [dim cyan]yardım[/dim cyan]  ·  "
            f"Model: [cyan]{esc(self.cfg.model_id)}[/cyan]  ·  "
            f"Çok satır: [cyan]\\[/cyan] ile devam et\n"
        )

        loop = asyncio.get_running_loop()
        while True:
            try:
                console.print("[bold cyan]╭── [[/bold cyan][bold white]COMMAND_OVERRIDE[/bold white][bold cyan]][/bold cyan]")
                raw: str = await loop.run_in_executor(None, input, "╰─▶ ")
            except (EOFError, KeyboardInterrupt):
                console.print("\n[dim red]↩  Bağlantı kesiliyor — autosave...[/]")
                self.sessions.save(self.history, self.sessions.auto_name(self.history))
                await self._cleanup()
                break

            raw = raw.strip()
            if not raw:
                continue

            mission = raw
            while mission.endswith("\\"):
                mission = mission[:-1]
                try:
                    extra = await loop.run_in_executor(None, input, "   … ")
                    mission += "\n" + extra.strip()
                except (EOFError, KeyboardInterrupt):
                    break

            if mission.lower() in ("exit", "quit", "q"):
                console.print("[dim red]Çıkılıyor...[/]")
                self.sessions.save(self.history, self.sessions.auto_name(self.history))
                await self._cleanup()
                break

            if mission == "!clear":
                print("\033[H\033[J", end="")
                console.print(self.render.header(self.cfg.model_id))
                continue

            if mission.startswith("!") and await self._hotkey(mission):
                continue

            if len(mission) > MAX_INPUT_CHARS:
                console.print(
                    f"[red]Girdi çok uzun ({len(mission):,} karakter; "
                    f"max {MAX_INPUT_CHARS:,}).[/]"
                )
                continue

            preview = esc(mission[:120]) + ("…" if len(mission) > 120 else "")
            console.print(f"\n[dim cyan]▶ {preview}[/dim cyan]\n")
            await self._turn(mission)
            console.print()

if __name__ == "__main__":
    if "--web" in sys.argv:
        # Web arayüzü modunu başlat
        from krocks_web import run_web_server
        port = 7860
        for i, arg in enumerate(sys.argv):
            if arg == "--port" and i + 1 < len(sys.argv):
                try:
                    port = int(sys.argv[i + 1])
                except ValueError:
                    pass
        run_web_server(port=port)
    else:
        agent = KrocksApexAgent(
            voice_mode = "--voice" in sys.argv,
            debug      = "--debug" in sys.argv,
        )
        try:
            asyncio.run(agent.run())
        except KeyboardInterrupt:
            pass
