import base64
import Quartz
import Cocoa

class OmniSight:
    def __init__(self):
        pass

    def take_snapshot(self) -> str:
        """macOS donanımını kullanarak bellek üzerinden tamamen sessizce anlık ekran görüntüsü alır."""
        try:
            # Ana ekranın ID'sini al
            display_id = Quartz.CGMainDisplayID()
            # Ekran görüntüsünü CGImage olarak yakala (in-memory)
            image = Quartz.CGDisplayCreateImage(display_id)
            if not image:
                return "Görüş Hatası: Ekran görüntüsü yakalanamadı (Boş CGImage)"
            
            # CGImage'i NSBitmapImageRep'e dönüştür
            bitmap = Cocoa.NSBitmapImageRep.alloc().initWithCGImage_(image)
            # PNG verisine dönüştür
            png_data = bitmap.representationUsingType_properties_(Cocoa.NSBitmapImageFileTypePNG, None)
            if not png_data:
                return "Görüş Hatası: Görüntü PNG formatına dönüştürülemedi"
            
            # Base64 olarak kodla
            encoded = base64.b64encode(png_data.bytes()).decode('utf-8')
            return encoded
        except Exception as e:
            return f"Görüş Hatası (Quartz): {e}"
