import urllib.request
import urllib.parse
import re
import json
import time
from html.parser import HTMLParser

class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text = []
        self.links = []
        self._hide = 0
        self._hide_tags = {'script', 'style', 'nav', 'footer', 'header', 'aside', 'noscript', 'iframe', 'form'}
        self.current_tag = None

    def handle_starttag(self, tag, attrs):
        if tag in self._hide_tags:
            self._hide += 1
        self.current_tag = tag
        if tag == 'a' and self._hide == 0:
            for k, v in attrs:
                if k == 'href' and v and not v.startswith(('javascript:', '#', 'mailto:')):
                    # Keep track of links but don't overwhelm
                    if len(self.links) < 30:
                        self.links.append(v)

    def handle_endtag(self, tag):
        if tag in self._hide_tags:
            self._hide -= 1

    def handle_data(self, data):
        if self._hide == 0:
            cleaned = data.strip()
            if cleaned:
                self.text.append(cleaned)

class UltraWebEngine:
    USER_AGENTS = [
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
    ]

    @staticmethod
    def _get_html(url: str) -> str:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": UltraWebEngine.USER_AGENTS[int(time.time()) % 3],
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5"
            }
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as response:
                return response.read().decode('utf-8', errors='ignore')
        except urllib.error.HTTPError as e:
            if e.code == 403:
                # Try Google Cache bypass
                cache_url = f"https://webcache.googleusercontent.com/search?q=cache:{urllib.parse.quote(url)}"
                req.full_url = cache_url
                try:
                    with urllib.request.urlopen(req, timeout=15) as res:
                        return res.read().decode('utf-8', errors='ignore')
                except:
                    pass
            return f"[Hata] Sunucu isteği reddetti veya ulaşılamadı. Kod: {e.code}"
        except Exception as e:
            return f"[Hata] Bağlantı kurulamadı: {str(e)}"

    @staticmethod
    def search(query: str) -> str:
        """Search DuckDuckGo HTML edition directly"""
        url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}"
        html = UltraWebEngine._get_html(url)
        
        if "[Hata]" in html:
            return html

        # Quick and dirty regex extraction for DDG HTML
        results = []
        pattern = r'<a class="result__url" href="([^"]+)">([^<]+)</a>.*?<a class="result__snippet[^>]*>(.*?)</a>'
        matches = re.findall(pattern, html, re.DOTALL | re.IGNORECASE)
        
        for i, match in enumerate(matches[:7]):
            link, title, snippet = match
            # Clean DDG redirect links
            if "uddg=" in link:
                try:
                    link = urllib.parse.unquote(link.split("uddg=")[1].split("&")[0])
                except:
                    pass
            
            # Clean HTML tags from snippet
            snippet = re.sub(r'<[^>]+>', '', snippet).strip()
            title = re.sub(r'<[^>]+>', '', title).strip()
            
            results.append(f"**{i+1}. [{title}]({link})**\n> {snippet}\n")
            
        if not results:
            return "[Bilgi] Sonuç bulunamadı veya site bot korumasına takıldı."
            
        return "## Web Arama Sonuçları:\n\n" + "\n".join(results)

    @staticmethod
    def fetch(url: str) -> str:
        """Fetch URL and extract main readable content"""
        html = UltraWebEngine._get_html(url)
        if "[Hata]" in html:
            return html
            
        extractor = TextExtractor()
        try:
            extractor.feed(html)
        except:
            return "[Hata] Sayfa yapısı çözümlenemedi."
            
        # Group text blocks heuristically
        content = "\n\n".join(extractor.text)
        
        # Limit size so we don't blow up LLM context
        if len(content) > 15000:
            content = content[:15000] + "\n\n... (Devamı kesildi) ..."
            
        result = f"## {url} İçeriği:\n\n{content}\n\n"
        
        if extractor.links:
            unique_links = list(dict.fromkeys(extractor.links))[:15]
            result += "### Sayfadaki Önemli Bağlantılar:\n"
            for link in unique_links:
                if link.startswith('/'):
                    from urllib.parse import urlparse
                    parsed = urlparse(url)
                    link = f"{parsed.scheme}://{parsed.netloc}{link}"
                result += f"- [{link}]({link})\n"
                
        return result
