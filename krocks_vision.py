import base64
import Quartz
import Cocoa

class OmniSight:
    def __init__(self):
        pass

    def take_snapshot(self, multi_monitor: bool = False) -> list[str] | str:
        """macOS donanımını kullanarak bellek üzerinden tamamen sessizce anlık ekran görüntüsü alır."""
        try:
            if not multi_monitor:
                displays = [Quartz.CGMainDisplayID()]
                count = 1
            else:
                max_displays = 16
                (err, active_displays, count) = Quartz.CGGetActiveDisplayList(max_displays, None, None)
                if err != 0 or count == 0:
                    displays = [Quartz.CGMainDisplayID()]
                    count = 1
                else:
                    displays = active_displays
                    
            encoded_images = []
            for i in range(count):
                display_id = displays[i]
                image = Quartz.CGDisplayCreateImage(display_id)
                if not image:
                    continue
                
                bitmap = Cocoa.NSBitmapImageRep.alloc().initWithCGImage_(image)
                png_data = bitmap.representationUsingType_properties_(Cocoa.NSBitmapImageFileTypePNG, None)
                if not png_data:
                    continue
                
                encoded = base64.b64encode(png_data.bytes()).decode('utf-8')
                encoded_images.append(encoded)
                
            if not encoded_images:
                return "Görüş Hatası: Ekran görüntüsü yakalanamadı"
                
            return encoded_images if multi_monitor else encoded_images[0]
        except Exception as e:
            return f"Görüş Hatası (Quartz): {e}"
