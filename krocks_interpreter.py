import asyncio
import shlex
import traceback

# Çalıştırılması yasaklı komutlar (güvenlik nedeniyle)
_FORBIDDEN_COMMANDS = {
    "rm", "sudo", "doas", "su", "shutdown", "reboot", "halt", "poweroff",
    "dd", "mkfs", "fdisk", "format", "mount", "umount",
    "chmod", "chown", "chattr", "passwd",
    "kill", "killall", "pkill",
    "wget", "curl", "nc", "netcat", "ncat",
    "bash", "zsh", "sh", "dash", "fish",
    "telnet", "ssh", "scp", "rsync",
}

class KrocksInterpreter:
    def __init__(self):
        self.history = []

    async def execute_shell_async(self, command: str) -> str:
        """Asenkron (non-blocking) shell yürütme. Sistemi kilitlemez."""
        try:
            # Komutu argüman listesine ayır
            try:
                args = shlex.split(command)
            except ValueError:
                return f"Geçersiz komut: {command[:100]}"

            if not args:
                return "Komut girilmedi."

            base_cmd = args[0].lower()

            # Yasaklı komut kontrolü
            if base_cmd in _FORBIDDEN_COMMANDS:
                return (f"Güvenlik: '{base_cmd}' komutunun çalıştırılmasına izin verilmiyor. "
                        "Bu komut Krock's'un güvenlik politikası tarafından engellenmiştir.")

            # `ls -la /some/path` gibi komutları create_subprocess_exec ile çalıştır
            process = await asyncio.create_subprocess_exec(
                *args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            # Maksimum 30 saniye zaman aşımı
            try:
                stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=30.0)
            except asyncio.TimeoutError:
                try:
                    process.kill()
                    await process.communicate()  # Pipe tamponlarını temizle
                except Exception:
                    pass
                return f"Zaman aşımı: '{command[:60]}' 30 saniyede tamamlanamadı."

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
