# Krock's Apex

Otonom, kendi kendini evrimleştiren macOS AI ajanı.

## Özellikler

- **Terminal TUI** — Rich tabanlı terminal arayüzü
- **Web Arayüzü** — FastAPI ile opsiyonel web UI (`--web` flag)
- **Ekran Görme** — Quartz ile ekran yakalama ve analiz
- **Native macOS** — JXA, AppleScript, Cocoa/AppKit entegrasyonu
- **Klavye Simülasyonu** — CGEvent ile donanımsal tuş vuruşları
- **Kendini Evrimleştirme** — Yeni yetenekler öğrenip kalıcı modüller yazma
- **Sandbox'lu Komut Çalıştırma** — Güvenlik kısıtlı shell

## Kurulum

```bash
# Bağımlılıkları yükle
pip install rich httpx fastapi uvicorn pyobjc

# Ortam değişkenlerini ayarla (.env dosyasından da okur)
export KROCKS_API_KEY="sk-or-v1-..."
```

## Kullanım

```bash
python krocks_main.py          # Terminal TUI ile
python krocks_main.py --web    # Web arayüzü ile
```

## Lisans

Copyright (C) 2026 Batın. All Rights Reserved.
