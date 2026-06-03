# krocks_native_bridge.py
import OSAKit
import Foundation
import subprocess

class NativeOSBridge:
    @staticmethod
    def run_jxa_native(script: str) -> str:
        """osascript kullanmadan, OSAScript bellek objesiyle JavaScript (JXA) çalıştırır."""
        try:
            # İşletim sistemine kodun AppleScript değil, JavaScript olduğunu açıkça belirtiyoruz
            language = OSAKit.OSALanguage.languageForName_("JavaScript")
            
            if not language:
                return "JXA Hatası: JavaScript dili sistem motorunda bulunamadı."
                
            osa_script = OSAKit.OSAScript.alloc().initWithSource_language_(script, language)
            result, error = osa_script.executeAndReturnError_(None)
            
            if error:
                # Hatayı sözlükten temiz bir şekilde çek
                err_msg = error.get('NSAppleScriptErrorMessage', str(error))
                return f"Native JXA Hatası: {err_msg}"
                
            if result:
                val = result.stringValue()
                return str(val) if val else "İşlem başarılı."
                
            return "İşlem başarılı."
            
        except Exception as e:
            return f"OSAKit Köprü Hatası: {str(e)}"

    @staticmethod
    def query_metadata(query_string: str) -> list[str]:
        """Spotlight motorunu kullanarak disk üzerinde yüksek performanslı arama yapar."""
        try:
            # Spotlight mdfind sorgusunu güvenli subprocess ile çalıştır
            result = subprocess.run(
                ['mdfind', query_string],
                capture_output=True,
                text=True,
                timeout=10.0,
                check=True
            )
            files = [f.strip() for f in result.stdout.split('\n') if f.strip()]
            return files
        except subprocess.TimeoutExpired:
            return ["[Hata]: Spotlight arama zaman aşımına uğradı (10s)"]
        except subprocess.CalledProcessError as e:
            return [f"[Hata]: Spotlight arama hatası (Kod {e.returncode}): {e.stderr}"]
        except Exception as e:
            return [f"[Hata]: Spotlight beklenmedik hata: {str(e)}"]
