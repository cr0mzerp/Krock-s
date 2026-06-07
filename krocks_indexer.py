# krocks_indexer.py
import subprocess
import sqlite3
import json
import threading

class OmniIndexer:
    def __init__(self, db_path="krocks_memory.db"):
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.cursor = self.conn.cursor()
        self.lock = threading.Lock()
        self._init_db()

    def _init_db(self):
        """Ajanın yerel belleğini (şemasını) oluşturur."""
        with self.lock:
            self.cursor.execute('''
                CREATE TABLE IF NOT EXISTS system_knowledge (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    category TEXT,
                    key_name TEXT UNIQUE,
                    value_data TEXT,
                    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            self.conn.commit()

    def spotlight_search(self, query: str) -> list:
        """macOS'un native mdfind komutu ile diski saniyeler içinde tarar."""
        try:
            result = subprocess.run(['mdfind', query], capture_output=True, text=True, timeout=10.0)
            files = result.stdout.split('\n')
            return [f for f in files if f] # Boş satırları temizle
        except Exception as e:
            return [f"Arama hatası: {str(e)}"]

    def memorize(self, category: str, key: str, value: dict):
        """Ajanın öğrendiği yapılandırmaları SQLite'a gömer."""
        val_str = json.dumps(value)
        with self.lock:
            self.cursor.execute('''
                INSERT INTO system_knowledge (category, key_name, value_data)
                VALUES (?, ?, ?)
                ON CONFLICT(key_name) DO UPDATE SET value_data=excluded.value_data, last_updated=CURRENT_TIMESTAMP
            ''', (category, key, val_str))
            self.conn.commit()

    def get_all_memory(self):
        """Tüm hafızayı güvenli şekilde getirir."""
        with self.lock:
            self.cursor.execute("SELECT category, key_name, value_data, last_updated FROM system_knowledge ORDER BY last_updated DESC")
            return self.cursor.fetchall()

    def get_memory_by_category(self, category: str):
        """Belirli bir kategoriye ait hafızayı güvenli şekilde getirir."""
        with self.lock:
            self.cursor.execute("SELECT key_name, value_data FROM system_knowledge WHERE category = ?", (category,))
            return self.cursor.fetchall()

    def delete_memory(self, key_name: str) -> bool:
        """Bir key'i (memory fact) siler. Başarı durumunu döndürür."""
        try:
            with self.lock:
                self.cursor.execute(
                    "DELETE FROM system_knowledge WHERE key_name = ?",
                    (key_name,)
                )
                self.conn.commit()
            return self.cursor.rowcount > 0
        except Exception:
            return False

    def add_fact(self, category: str, content: str, source: str = "user") -> str:
        """Memory fact ekle. key_name otomatik üretilir (timestamp bazlı)."""
        import time as _t
        key = f"{category}_{int(_t.time() * 1000)}"
        try:
            self.memorize(category, key, {"content": content, "source": source})
            return key
        except Exception as e:
            return ""

    def list_facts(self, category: str | None = None) -> list[dict]:
        """Tüm fact'leri veya kategoriye göre fact'leri getir."""
        if category:
            rows = self.get_memory_by_category(category)
        else:
            rows = self.get_all_memory()
        out = []
        for row in rows:
            try:
                if category:
                    key_name, value_data = row
                else:
                    _, key_name, value_data, last_updated = row
                value = json.loads(value_data) if isinstance(value_data, str) else value_data
                if not isinstance(value, dict):
                    continue
                # Customize için sadece kullanıcı-facing kategoriler
                if category and category not in ("user_prefs", "project_info", "code_conventions", "memory"):
                    continue
                if not category and "content" not in value:
                    continue
                out.append({
                    "id":         key_name,
                    "category":   value.get("category", category) if not category else category,
                    "content":    value.get("content", ""),
                    "source":     value.get("source", "auto"),
                    "last_used":  value.get("updated_at", value.get("last_updated", 0)),
                })
            except (json.JSONDecodeError, KeyError, TypeError):
                continue
        return out

    def close(self):
        """SQLite bağlantısını kapatır."""
        try:
            self.conn.close()
        except Exception:
            pass

# Kullanım Örneği:
# indexer = OmniIndexer()
# bulgular = indexer.spotlight_search("kind:python")
