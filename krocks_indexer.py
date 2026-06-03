# krocks_indexer.py
import subprocess
import sqlite3
import json

class OmniIndexer:
    def __init__(self, db_path="krocks_memory.db"):
        self.conn = sqlite3.connect(db_path)
        self.cursor = self.conn.cursor()
        self._init_db()

    def _init_db(self):
        """Ajanın yerel belleğini (şemasını) oluşturur."""
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
            result = subprocess.run(['mdfind', query], capture_output=True, text=True)
            files = result.stdout.split('\n')
            return [f for f in files if f] # Boş satırları temizle
        except Exception as e:
            return [f"Arama hatası: {str(e)}"]

    def memorize(self, category: str, key: str, value: dict):
        """Ajanın öğrendiği yapılandırmaları SQLite'a gömer."""
        val_str = json.dumps(value)
        self.cursor.execute('''
            INSERT INTO system_knowledge (category, key_name, value_data)
            VALUES (?, ?, ?)
            ON CONFLICT(key_name) DO UPDATE SET value_data=excluded.value_data, last_updated=CURRENT_TIMESTAMP
        ''', (category, key, val_str))
        self.conn.commit()

    def close(self):
        """SQLite bağlantısını kapatır."""
        try:
            self.conn.close()
        except Exception:
            pass

# Kullanım Örneği:
# indexer = OmniIndexer()
# bulgular = indexer.spotlight_search("kind:python")
