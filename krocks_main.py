# krocks_main.py
from __future__ import annotations

import sys, os, time, asyncio, json, re, readline, atexit, traceback, random
from pathlib import Path
from dataclasses import dataclass, field
from typing import AsyncGenerator, Any
from datetime import datetime
from enum import Enum

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
                              "KROCKS_MODEL", "@preset/mimos"))
    max_tokens:     int   = int(os.getenv("KROCKS_MAX_TOKENS", "4096"))
    temperature:    float = float(os.getenv("KROCKS_TEMP", "0.7"))
    history_max:    int   = 60
    retry_max:      int   = 3
    retry_base:     float = 1.5
    feedback_depth: int   = 3        
    tts_timeout:    float = 30.0     
    sessions_dir:   Path  = field(default_factory=lambda: Path.home() / ".krocks" / "sessions")
    history_file:   Path  = field(default_factory=lambda: Path.home() / ".krocks" / "cmd_history")
    debug:          bool  = False

    def __post_init__(self) -> None:
        self.sessions_dir.mkdir(parents=True, exist_ok=True)
        self.history_file.parent.mkdir(parents=True, exist_ok=True)

# ═════════════════════════════════════════════════════════════════════════════
#  §2  ACTION MODEL
# ═════════════════════════════════════════════════════════════════════════════
class ActionTag(str, Enum):
    CMD    = "CMD"
    JXA    = "JXA"
    TYPE   = "TYPE"
    VISION = "VISION"
    EVOLVE = "EVOLVE"
    USE    = "USE"

_TAG_COLOR: dict[ActionTag, str] = {
    ActionTag.CMD:    "blue",
    ActionTag.JXA:    "white",
    ActionTag.TYPE:   "red",
    ActionTag.VISION: "magenta",
    ActionTag.EVOLVE: "green",
    ActionTag.USE:    "yellow",
}

@dataclass
class Action:
    tag:    ActionTag
    data:   str
    extra:  dict = field(default_factory=dict)
    status: str  = "⏳"

_TAG_NAMES = "CMD|JXA|TYPE|VISION|EVOLVE|USE"
_STRIP_RE  = re.compile(rf'\[(?:{_TAG_NAMES})\].*?\[/(?:{_TAG_NAMES})\]', re.DOTALL)
_PATTERNS: dict[ActionTag, re.Pattern] = {
    ActionTag.VISION: re.compile(r'\[VISION\](.*?)\[/VISION\]',                  re.DOTALL),
    ActionTag.EVOLVE: re.compile(r'\[EVOLVE\](.*?)\|\|\|(.*?)\[/EVOLVE\]',        re.DOTALL),
    ActionTag.USE:    re.compile(r'\[USE\](.*?)\|\|\|(.*?)\|\|\|(.*?)\[/USE\]',   re.DOTALL),
    ActionTag.CMD:    re.compile(r'\[CMD\](.*?)\[/CMD\]',                         re.DOTALL),
    ActionTag.JXA:    re.compile(r'\[JXA\](.*?)\[/JXA\]',                         re.DOTALL),
    ActionTag.TYPE:   re.compile(r'\[TYPE\](.*?)\[/TYPE\]',                       re.DOTALL),
}

def parse_actions(text: str) -> tuple[str, list[Action]]:
    clean = _STRIP_RE.sub("", text).strip()
    found: list[tuple[int, Action]] = []
    for tag, pat in _PATTERNS.items():
        for m in pat.finditer(text):
            g = m.groups()
            if   tag == ActionTag.EVOLVE: act = Action(tag, g[0].strip(), {"code": g[1].strip()})
            elif tag == ActionTag.USE:    act = Action(tag, f"{g[0].strip()}.{g[1].strip()}", {"args": g[2]})
            else:                          act = Action(tag, g[0].strip())
            found.append((m.start(), act))
    found.sort(key=lambda x: x[0])
    return clean, [a for _, a in found]

# ═════════════════════════════════════════════════════════════════════════════
#  §3  UTILITIES
# ═════════════════════════════════════════════════════════════════════════════
def rough_tokens(text: str) -> int:
    return max(1, len(text.encode("utf-8")) // 4)

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

    def save(self, history: list[dict], name: str | None = None) -> Path:
        stem = name or f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        stem = re.sub(r'[^\w\-]', '_', stem)[:64]
        p    = self.dir / f"{stem}.json"
        p.write_text(json.dumps(history, ensure_ascii=False, indent=2), encoding="utf-8")
        return p

    def load(self, stem: str) -> list[dict]:
        p = self.dir / f"{stem}.json"
        if not p.exists():
            raise FileNotFoundError(f"Oturum bulunamadı: {stem}")
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            raise ValueError(f"Oturum dosyası bozuk ({stem}): {e}") from e

    def list_sessions(self) -> list[str]:
        return sorted(p.stem for p in self.dir.glob("*.json"))

    def auto_name(self, history: list[dict]) -> str:
        for msg in history:
            if msg.get("role") == "user":
                text = _content_str(msg["content"])[:40]
                slug = re.sub(r'\s+', '_', text.strip())
                slug = re.sub(r'[^\w\-]', '', slug)
                ts   = datetime.now().strftime("%Y%m%d_%H%M%S")
                return f"{slug}_{ts}" if slug else f"session_{ts}"
        return f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

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
        payload = {
            "model":       self.cfg.model_id,
            "messages":    messages,
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
                                return
                            try:
                                delta = json.loads(raw)["choices"][0]["delta"].get("content") or ""
                                if delta:
                                    yield delta
                            except (json.JSONDecodeError, KeyError, IndexError):
                                if self.cfg.debug:
                                    console.print(f"[dim red]SSE parse skip: {raw[:80]}[/]")
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
                raise RuntimeError(f"HTTP {code}: {exc.response.text[:200]}") from exc

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
[EVOLVE] yetenek ||| python_kodu [/EVOLVE]  — Kalıcı modül yaz / öğren
[USE] yetenek ||| fonksiyon ||| args [/USE] — Öğrenilen yeteneği çalıştır

DIKKAT: Çalıştırdığın komutların çıktıları sana "[SİSTEM OTOMATİK GERİ BİLDİRİMİ]" 
başlığıyla, toplu halde dönecektir. Eğer gönderilen bu sistem çıktıları sonucunda 
hedefine/cevaba ulaştıysan SAKIN yeni bir komut veya aksiyon üretme! Görevi bitir ve
sadece kullanıcıya nihai cevabı/özeti söyleyerek dur. ASLA Markdown (```) kod blokları 
içinde komut verme, sadece köşeli parantezli tagleri kullan.
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
        self.render        = Renderer()
        self._hist         = HistoryManager(self.cfg)
        self.history: list[dict]            = [{"role": "system", "content": _SYSTEM_PROMPT}]
        self._tts_tasks: set[asyncio.Task]  = set() 
        self._fb_seen:   list[str]          = []      

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
        # SQLite bağlantılarını kapat
        self.evolution.close()
        self.indexer.close()

    def _push(self, role: str, content: Any) -> None:
        if (self.history
                and self.history[-1]["role"] == role
                and role != "system"):
            if isinstance(content, str) and isinstance(self.history[-1]["content"], str):
                self.history[-1]["content"] += "\n" + content
                return

        self.history.append({"role": role, "content": content})

        if len(self.history) > self.cfg.history_max:
            keep = max(2, self.cfg.history_max // 2)
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
                self.indexer.cursor.execute("SELECT category, key_name, value_data, last_updated FROM system_knowledge")
                rows = self.indexer.cursor.fetchall()
                
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

        if cmd == "!config":
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
                out = await self.interpreter.execute_shell_async(action.data)
                body = out.strip()[-800:] if out and out.strip() else "(çıktı yok)"
                return f"CMD ▶ {action.data[:60]}\n{body}"

            if action.tag == ActionTag.JXA:
                out = self.bridge.run_jxa_native(action.data)
                body = out.strip() if out and out.strip() else "(çıktı yok)"
                return f"JXA ▶ {body}"

            if action.tag == ActionTag.TYPE:
                self.ui.hardware_keystroke(action.data)
                return None

            if action.tag == ActionTag.VISION:
                b64 = self.vision.take_snapshot()
                return ({"__vision__": action.data, "__img__": b64}
                        if "Hata" not in b64 else f"Görüş hatası: {b64}")

            if action.tag == ActionTag.EVOLVE:
                res = self.evolution.write_and_learn_skill(action.data, action.extra.get("code", ""))
                return f"EVOLVE ▶ {res}"

            if action.tag == ActionTag.USE:
                parts = action.data.split(".", 1)
                args  = [a.strip() for a in action.extra.get("args", "").split(",") if a.strip()]
                res   = self.evolution.execute_skill(*parts, *args)
                return f"USE ▶ {action.data}: {res}"

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

        if depth > self.cfg.feedback_depth:
            console.print(
                "[dim yellow]⚠ Maksimum geri bildirim derinliğine ulaşıldı "
                f"({self.cfg.feedback_depth}) — döngü durduruldu.[/]"
            )
            return

        if not self.cfg.api_key:
            console.print(
                "[red]✖ API anahtarı ayarlanmamış![/]\n"
                "  [yellow]└ KROCKS_API_KEY ortam değişkenini ayarlayın veya .env dosyasını düzenleyin.[/]"
            )
            return

        content: Any = (
            [{"type": "text",      "text": prompt},
             {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{img_b64}"}}]
            if img_b64 else prompt
        )
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
                    f"Ekran analizi: {fb['__vision__']}", fb["__img__"], depth=depth + 1
                )
            elif isinstance(fb, str) and fb.strip():
                if self._seen_feedback(fb):
                    if self.cfg.debug:
                        console.print("[dim]Tekrarlayan geri bildirim — atlandı.[/]")
                    continue
                await self._turn(fb, depth=depth + 1)

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
    agent = KrocksApexAgent(
        voice_mode = "--voice" in sys.argv,
        debug      = "--debug" in sys.argv,
    )
    try:
        asyncio.run(agent.run())
    except KeyboardInterrupt:
        pass
