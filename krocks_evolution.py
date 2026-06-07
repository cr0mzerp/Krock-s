import os
import re
import json
import importlib
import traceback
from krocks_indexer import OmniIndexer

class EvolutionEngine:
    def __init__(self, skills_dir="skills", db_path="krocks_memory.db"):
        self.skills_dir = skills_dir
        if not os.path.exists(self.skills_dir):
            os.makedirs(self.skills_dir)
            # Python paketi olarak tanınması için __init__ oluştur
            with open(os.path.join(self.skills_dir, "__init__.py"), "w") as f:
                f.write("")
        
        self.indexer = OmniIndexer(db_path)
        self.learned_skills = {}
        self._load_existing_skills()

    def _load_existing_skills(self):
        """Krock's yeniden başladığında önceki mutasyonlarını/öğrendiklerini hatırlar."""
        loaded = set()
        for filename in os.listdir(self.skills_dir):
            if filename.endswith(".py") and filename != "__init__.py":
                skill_name = filename[:-3]
                if self._import_skill(skill_name):
                    loaded.add(skill_name)

        # SQLite'da kayıtlı ama diskte .py'si olmayan skilleri kurtar
        try:
            for row in self.indexer.get_memory_by_category("skills"):
                skill_name = row[0]
                if skill_name in loaded:
                    continue
                try:
                    value = json.loads(row[1])
                    code = value.get("code", "")
                    if code:
                        # Diske geri yaz
                        filepath = os.path.join(self.skills_dir, f"{skill_name}.py")
                        with open(filepath, "w", encoding="utf-8") as f:
                            f.write(code)
                        if self._import_skill(skill_name):
                            print(f"[+] Kurtarıldı: '{skill_name}' hafızadan geri yüklendi.")
                except (json.JSONDecodeError, KeyError):
                    pass
        except Exception:
            pass

    def _import_skill(self, skill_name):
        """Diskteki kodu Krock's'un sinir sistemine dinamik olarak bağlar."""
        try:
            module = importlib.import_module(f"{self.skills_dir}.{skill_name}")
            importlib.reload(module) # Eğer güncellendiyse yeni versiyonu yükle
            self.learned_skills[skill_name] = module
            return True
        except Exception as e:
            print(f"[-] Yetenek yükleme hatası ({skill_name}): {e}")
            return False

    def write_and_learn_skill(self, skill_name: str, python_code: str) -> str:
        """Krock's'un yeni bir özellik kodlayıp kendine enjekte ettiği fonksiyon."""
        # Path traversal koruması: sadece basit dosya adlarına izin ver
        safe_name = os.path.basename(skill_name)
        safe_name = re.sub(r'[^\w\-]', '_', safe_name)
        if not safe_name:
            return "[-] Başarısız: Geçersiz yetenek adı."
        filepath = os.path.join(self.skills_dir, f"{safe_name}.py")
        
        try:
            # 1. Kodu diske yaz
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(python_code)
            
            # 2. Modülü canlı olarak sisteme çek (safe_name kullan—skill_name değil)
            success = self._import_skill(safe_name)
            if success:
                # 3. SQLite veritabanına kaydet / indeksle
                try:
                    self.indexer.memorize(
                        category="skills",
                        key=safe_name,
                        value={"code": python_code, "updated_at": os.path.getmtime(filepath)}
                    )
                except Exception as db_err:
                    return f"[+] Başarılı: '{safe_name}' modülü yazıldı ve sinir ağına entegre edildi. (SQLite İndeksleme Hatası: {db_err})"
                
                return f"[+] Başarılı: '{safe_name}' modülü yazıldı, sinir ağına entegre edildi ve hafızaya kaydedildi."
            else:
                return f"[-] Başarısız: Kod yazıldı ancak syntax/import hatası var."
        except Exception:
            return f"[-] Evrim Hatası:\n{traceback.format_exc()}"

    def close(self):
        """Kaynakları temizler (SQLite bağlantısını kapatır)."""
        self.indexer.close()

    def execute_skill(self, skill_name: str, function_name: str, *args, **kwargs):
        """Öğrenilen yeni yeteneği çalıştırır."""
        if skill_name in self.learned_skills:
            module = self.learned_skills[skill_name]
            if hasattr(module, function_name):
                func = getattr(module, function_name)
                return func(*args, **kwargs)
            return f"Hata: {skill_name} modülünde '{function_name}' fonksiyonu yok."
        return f"Hata: {skill_name} yeteneği henüz öğrenilmedi."

    # ── Customize panel API ─────────────────────────────────────────────────
    def list_skills(self) -> list[dict]:
        """Tüm skill'leri metadata enriched olarak listele (Customize UI için)."""
        out = []
        for name, module in self.learned_skills.items():
            funcs = [n for n, o in vars(module).items()
                     if callable(o) and not n.startswith("_") and n != "logger"]
            try:
                filepath = os.path.join(self.skills_dir, f"{name}.py")
                mtime = os.path.getmtime(filepath) if os.path.exists(filepath) else 0
            except OSError:
                mtime = 0
            desc = (getattr(module, "__doc__", "") or "").strip().split("\n")[0] or f"Skill: {name}"
            out.append({
                "name":        name,
                "description": desc,
                "functions":   funcs,
                "size_bytes":  os.path.getsize(os.path.join(self.skills_dir, f"{name}.py")) if os.path.exists(os.path.join(self.skills_dir, f"{name}.py")) else 0,
                "last_used":   mtime,
                "source":      "learned",
            })
        return sorted(out, key=lambda s: s["name"])

    def get_skill_code(self, skill_name: str) -> str | None:
        """Skill kaynak kodunu döndür (Customize edit modal için)."""
        path = os.path.join(self.skills_dir, f"{skill_name}.py")
        if not os.path.isfile(path):
            return None
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def delete_skill(self, skill_name: str) -> dict:
        """Skill'i diskten ve DB'den sil. Başarı + hata mesajı döndür."""
        safe = re.sub(r'[^\w\-]', '_', os.path.basename(skill_name))
        if not safe:
            return {"ok": False, "msg": "Geçersiz skill adı."}
        path = os.path.join(self.skills_dir, f"{safe}.py")
        try:
            if os.path.isfile(path):
                os.remove(path)
            self.learned_skills.pop(safe, None)
            # Modülü sys.modules'den de düşür (yeniden import'ta stale cache olmasın)
            import sys as _sys
            _sys.modules.pop(f"{self.skills_dir}.{safe}", None)
            # SQLite'tan da sil
            try:
                with self.indexer.lock:
                    self.indexer.cursor.execute(
                        "DELETE FROM system_knowledge WHERE category='skills' AND key_name=?",
                        (safe,)
                    )
                    self.indexer.conn.commit()
            except Exception:
                pass
            return {"ok": True, "msg": f"'{safe}' silindi."}
        except Exception as e:
            return {"ok": False, "msg": str(e)}

    def update_skill_code(self, skill_name: str, new_code: str) -> dict:
        """Mevcut skill'in kodunu güncelle (Customize edit için). Önce syntax check yapar."""
        safe = re.sub(r'[^\w\-]', '_', os.path.basename(skill_name))
        if not safe:
            return {"ok": False, "msg": "Geçersiz skill adı."}
        # 1. Syntax check (import etmeden önce yakala)
        try:
            import ast
            ast.parse(new_code)
        except SyntaxError as e:
            return {"ok": False, "msg": f"Syntax hatası (satır {e.lineno}): {e.msg}"}
        # 2. write_and_learn_skill zaten re-import + DB update yapıyor
        msg = self.write_and_learn_skill(safe, new_code)
        ok = "Başarılı" in msg
        return {"ok": ok, "msg": msg}
