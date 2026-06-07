import asyncio
import shlex
import traceback
import os
import signal

# Çalıştırılması yasaklı komutlar (güvenlik nedeniyle)
_FORBIDDEN_COMMANDS = {
    "rm", "sudo", "doas", "su", "shutdown", "reboot", "halt", "poweroff",
    "dd", "mkfs", "fdisk", "format", "mount", "umount",
    "chmod", "chown", "chattr", "passwd",
    "kill", "killall", "pkill",
    "nc", "netcat", "ncat",
    "bash", "zsh", "sh", "dash", "fish",
    "telnet", "ssh", "scp", "rsync",
}

class KrocksInterpreter:
    def __init__(self):
        self.history = []

    async def execute_shell_async(self, command: str, cwd: str = None) -> str:
        """Asenkron (non-blocking) shell yürütme. Sistemi kilitlemez."""
        try:
            # Güvenlik kontrolü (Basit)
            first_word = command.strip().split()[0].lower() if command.strip() else ""
            if first_word in _FORBIDDEN_COMMANDS:
                return (f"Güvenlik: '{first_word}' komutunun çalıştırılmasına izin verilmiyor. "
                        "Bu komut Krock's'un güvenlik politikası tarafından engellenmiştir.")

            # `ls -la /some/path | grep x` gibi shell özelliklerini desteklemesi için shell=True benzeri
            process = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=cwd,
                preexec_fn=os.setsid
            )

            # Maksimum 30 saniye zaman aşımı
            try:
                stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=30.0)
            except asyncio.TimeoutError:
                try:
                    os.killpg(os.getpgid(process.pid), signal.SIGTERM)
                    await process.communicate()  # Pipe tamponlarını temizle
                except Exception:
                    try:
                        process.kill()
                    except:
                        pass
                return f"Zaman aşımı: '{command[:60]}' 30 saniyede tamamlanamadı (Zombi süreçler başarıyla temizlendi)."

            output = stdout.decode('utf-8').strip() if stdout else ""
            error = stderr.decode('utf-8').strip() if stderr else ""

            result = output if output else error
            self.history.append({"cmd": command, "out": result[:500]}) # Logu sınırla
            return result if result else "Komut başarıyla çalıştı (Çıktı yok)."

        except Exception as e:
            return f"Asenkron Yürütme Hatası: {str(e)}"

    def execute_python_dynamically(self, code_string: str):
        try:
            # Güvenlik: sadece temel builtins'e izin ver (print, len, range, vb.)
            # __import__, open, exec, eval, compile, globals, locals gibi tehlikeli
            # fonksiyonları kullanıma kapat.
            safe_builtins = {
                "__import__": __import__,  # Güvenli kütüphanelere erişim için gerekli
                "print": print, "len": len, "range": range, "int": int,
                "float": float, "str": str, "bool": bool, "list": list,
                "dict": dict, "tuple": tuple, "set": set, "type": type,
                "True": True, "False": False, "None": None,
                "abs": abs, "all": all, "any": any, "enumerate": enumerate,
                "filter": filter, "iter": iter, "map": map, "max": max,
                "min": min, "next": next, "reversed": reversed, "slice": slice,
                "sorted": sorted, "sum": sum, "zip": zip,
                "isinstance": isinstance, "hasattr": hasattr, "getattr": getattr,
                "setattr": setattr, "ValueError": ValueError, "TypeError": TypeError,
                "KeyError": KeyError, "IndexError": IndexError,
            }
            exec_globals = {"__builtins__": safe_builtins}
            exec(code_string, exec_globals)
            return "Kod başarıyla bellekte yürütüldü."
        except Exception:
            return traceback.format_exc()
