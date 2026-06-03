import AppKit
import ApplicationServices
import Quartz
import re
import time

_KEY_CODES = {
    "return": 36,
    "enter": 36,
    "tab": 48,
    "space": 49,
    "backspace": 51,
    "delete": 51,
    "escape": 53,
    "esc": 53,
    "left": 123,
    "right": 124,
    "down": 125,
    "up": 126,
    "f1": 122,
    "f2": 120,
    "f3": 99,
    "f4": 118,
    "f5": 96,
    "f6": 97,
    "f7": 98,
    "f8": 100,
    "f9": 101,
    "f10": 109,
    "f11": 103,
    "f12": 111,
}

_ALPHA_NUM_KEY_CODES = {
    'a': 0, 's': 1, 'd': 2, 'f': 3, 'h': 4, 'g': 5, 'z': 6, 'x': 7, 'c': 8, 'v': 9,
    'b': 11, 'q': 12, 'w': 13, 'e': 14, 'r': 15, 'y': 16, 't': 17, '1': 18, '2': 19,
    '3': 20, '4': 21, '6': 22, '5': 23, '9': 25, '7': 26, '8': 28, '0': 29, 'o': 31,
    'u': 32, 'i': 34, 'p': 35, 'l': 37, 'j': 38, 'k': 40, 'n': 45, 'm': 46
}

_MODIFIER_MASKS = {
    "cmd": Quartz.kCGEventFlagMaskCommand,
    "command": Quartz.kCGEventFlagMaskCommand,
    "shift": Quartz.kCGEventFlagMaskShift,
    "option": Quartz.kCGEventFlagMaskAlternate,
    "opt": Quartz.kCGEventFlagMaskAlternate,
    "alt": Quartz.kCGEventFlagMaskAlternate,
    "ctrl": Quartz.kCGEventFlagMaskControl,
    "control": Quartz.kCGEventFlagMaskControl,
}

class UIManipulator:
    def __init__(self):
        self.workspace = AppKit.NSWorkspace.sharedWorkspace()

    def check_accessibility_permissions(self):
        options = {ApplicationServices.kAXTrustedCheckOptionPrompt: True}
        return ApplicationServices.AXIsProcessTrustedWithOptions(options)

    def _type_plain_text(self, text: str):
        """Metni unicode CGEvent olarak tek tek tuşlar."""
        for char in text:
            event_down = Quartz.CGEventCreateKeyboardEvent(None, 0, True)
            Quartz.CGEventKeyboardSetUnicodeString(event_down, 1, char)
            Quartz.CGEventPost(Quartz.kCGHIDEventTap, event_down)
            
            event_up = Quartz.CGEventCreateKeyboardEvent(None, 0, False)
            Quartz.CGEventKeyboardSetUnicodeString(event_up, 1, char)
            Quartz.CGEventPost(Quartz.kCGHIDEventTap, event_up)
            
            time.sleep(0.01)

    def hardware_keystroke(self, text: str):
        """
        US/TR klavye farklılıklarını ve arayüz kısıtlamalarını by-pass eder.
        Metni doğrudan CoreGraphics donanım event'leri olarak sisteme basar.
        Özel etiketleri (örn. <cmd+space>, <enter>) parse ederek makro komutları tetikler.
        """
        if not self.check_accessibility_permissions():
            return (
                "[HATA] Erişilebilirlik izni yok! Sistem Ayarları > "
                "Gizlilik ve Güvenlik > Erişilebilirlik'ten "
                "bu uygulamaya izin verin."
            )
        # Köşeli/Açılı ayraçlar <...> içindeki özel tuş kombinasyonlarını yakala
        pattern = re.compile(r'(<[^>]+>)')
        parts = pattern.split(text)
        
        for i, part in enumerate(parts):
            if not part:
                continue
            
            # Tek sayılı indeksler etiketlerdir (örn. <cmd+space>)
            if i % 2 == 1:
                content = part[1:-1].strip().lower()
                sub_parts = re.split(r'\+|-', content)
                primary = sub_parts[-1]
                mods = sub_parts[:-1]
                
                key_code = None
                if primary in _KEY_CODES:
                    key_code = _KEY_CODES[primary]
                elif len(primary) == 1 and primary in _ALPHA_NUM_KEY_CODES:
                    key_code = _ALPHA_NUM_KEY_CODES[primary]
                
                if key_code is not None:
                    flags = 0
                    for mod in mods:
                        flags |= _MODIFIER_MASKS.get(mod, 0)
                    
                    # KEY DOWN
                    event_down = Quartz.CGEventCreateKeyboardEvent(None, key_code, True)
                    if flags:
                        Quartz.CGEventSetFlags(event_down, flags)
                    Quartz.CGEventPost(Quartz.kCGHIDEventTap, event_down)
                    
                    # KEY UP
                    event_up = Quartz.CGEventCreateKeyboardEvent(None, key_code, False)
                    if flags:
                        Quartz.CGEventSetFlags(event_up, flags)
                    Quartz.CGEventPost(Quartz.kCGHIDEventTap, event_up)
                    
                    time.sleep(0.05)
                else:
                    # Bilinmeyen etiket ise düz yazı gibi bas
                    self._type_plain_text(part)
            else:
                # Düz metin kısmı
                self._type_plain_text(part)
