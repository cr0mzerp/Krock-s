import React, { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useKrocksWS } from '@/api/krocks_ws';
import Sidebar from '../components/chat/Sidebar';
import WelcomeScreen from '../components/chat/WelcomeScreen';
import MessageBubble, { KrocksIcon } from '../components/chat/MessageBubble';
import ChatInput from '../components/chat/ChatInput';
import CoderWorkspace from '../components/chat/CoderWorkspace';

import QuizModal from '../components/chat/QuizModal';
import ProjectsView from './views/ProjectsView';
import ArtifactsView from './views/ArtifactsView';
import CustomizeView from './views/CustomizeView';

import ChatsView from './views/ChatsView';

const MODELS = [
  '@preset/deepseekv4-flash',
  '@preset/minimax-m3',
  '@preset/minimax-m1',
  'claude-3-5-sonnet-20241022',
  'gpt-4o',
  'gpt-4o-mini',
];

// Bellek koruması: mesaj sayısını bu sayıda tut, eski mesajlar otomatik düşer
const MAX_MESSAGES = 500;

function ActionChip({ action }) {
  const colors = { CMD:'#60a5fa', JXA:'#a78bfa', TYPE:'#34d399', VISION:'#fb923c', EVOLVE:'#f472b6', USE:'#facc15' };
  const icons  = { pending:'⏳', running:'🔄', ok:'✔', err:'✖' };
  const c = colors[action.tag] ?? '#a3a19d';
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:'6px',
      padding:'3px 10px', borderRadius:'20px',
      background:'rgba(255,255,255,0.05)', border:`1px solid ${c}44`,
      fontSize:'12px', color:c, marginRight:'6px', marginBottom:'4px' }}>
      <span>{icons[action.status] ?? '⏳'}</span>
      <span style={{ fontWeight:600 }}>{action.tag}</span>
      <span style={{ color:'var(--t2)', maxWidth:'260px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {action.data?.slice(0, 70)}
      </span>
    </div>
  );
}
const TIPS_DATA = {
  Write: {
    icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.89 1.147l-2.83.944.943-2.83a4.5 4.5 0 011.147-1.89L16.862 4.487z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L16.862 4.487" /></svg>,
    prompts: [
      { title: "Draft a professional email", prompt: "Could you help me draft a professional email?" },
      { title: "Write a blog post", prompt: "I need to write a blog post about..." },
      { title: "Brainstorm ideas", prompt: "Let's brainstorm some ideas for..." }
    ]
  },
  Learn: {
    icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" /></svg>,
    prompts: [
      { title: "Explain a concept", prompt: "Can you explain this concept in simple terms?" },
      { title: "Help me study", prompt: "I am studying for a test on..." },
      { title: "Learn a new language", prompt: "I want to learn..." }
    ]
  },
  Code: {
    icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg>,
    prompts: [
      { title: "Review my code", prompt: "Can you review this code for me?" },
      { title: "Explain this code", prompt: "What does this code do?" },
      { title: "Write a function", prompt: "Write a function that..." }
    ]
  },
  "Life stuff": {
    icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>,
    prompts: [
      { title: "Plan home improvements", prompt: "Hi Claude! Could you plan home improvements? If you need more information from me, ask me 1-2 key questions right away. If you think I should give you more context..." },
      { title: "Track personal goals", prompt: "I want to track my personal goals..." },
      { title: "Plan healthy meals", prompt: "Can you help me plan healthy meals for the week?" },
      { title: "Create cleaning routines", prompt: "I need a weekly cleaning routine..." },
      { title: "Organize my living space", prompt: "Give me tips to organize my living space." }
    ]
  },
  "Krock's choice": {
    icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>,
    prompts: [
      { title: "Tell me a story", prompt: "Tell me a short story about..." },
      { title: "Play a game", prompt: "Let's play a text-based game." },
      { title: "Surprise me", prompt: "Teach me something interesting." }
    ]
  }
};

export default function Home() {
  const [activeView,     setActiveView]     = useState('chat');
  const [activeSessionName, setActiveSessionName] = useState(null);
  const [sidebarOpen,    setSidebarOpen]    = useState(true);
  const [chatMessages,    setChatMessages]    = useState([]);
  const [codeMessages,    setCodeMessages]    = useState([]);
  const [projectMessages, setProjectMessages] = useState([]);
  const [chatIsStreaming,    setChatIsStreaming]    = useState(false);
  const [codeIsStreaming,    setCodeIsStreaming]    = useState(false);
  const [projectIsStreaming, setProjectIsStreaming] = useState(false);
  const messages   = activeView === 'code' ? codeMessages : activeView === 'projects' ? projectMessages : chatMessages;
  const isStreaming = activeView === 'code' ? codeIsStreaming : activeView === 'projects' ? projectIsStreaming : chatIsStreaming;
  const streamingViewRef = useRef('chat');
  const viewsNeedReset = useRef({ chat: true, code: true, projects: true });
  const getViewSetters = (key) => {
    if (key === 'code') return { msgs: setCodeMessages, stream: setCodeIsStreaming };
    if (key === 'projects') return { msgs: setProjectMessages, stream: setProjectIsStreaming };
    return { msgs: setChatMessages, stream: setChatIsStreaming };
  };
  const [sessions,        setSessions]        = useState([]);
  const [pendingActions, setPendingActions] = useState([]);
  const [activeQuiz,     setActiveQuiz]     = useState(null);
  const [model,          setModel]          = useState('@preset/deepseekv4-flash');
  const [lastElapsed,    setLastElapsed]    = useState(0);
  const [lastTokens,     setLastTokens]     = useState(0);
  const [settings,       setSettings]       = useState({ theme:'dark', temperature:0.7, maxTokens:16384, feedbackDepth:3 });
  const [inputText,      setInputText]      = useState('');
  const [activeTip,      setActiveTip]      = useState(null);
  const [screenshotEvent, setScreenshotEvent] = useState(null);
  const msgsEndRef = useRef(null);
  const autoScrollEnabled = useRef(true);
  const autosaveState = useRef({ chat: { saved: false, count: 0, name: null }, code: { saved: false, count: 0, name: null }, projects: { saved: false, count: 0, name: null } });
  const chunkBufferRef = useRef('');
  const chunkTimerRef = useRef(null);
  const pendingActionsTimerRef = useRef(null);
  // Yeni sohbet/oturum açıldığında artar. Eski stream'den gelen chunk/done event'leri
  // bu ref ile eşleşmezse görmezden gelinir (context sızıntısını önler).
  const generationRef = useRef(0);
  const userName = 'Lord';

  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // If we are within 50px of the bottom, auto scroll is enabled
    autoScrollEnabled.current = scrollHeight - scrollTop - clientHeight < 50;
  }, []);

  const scrollToBottom = useCallback((force = false) => {
    if (force || autoScrollEnabled.current) {
      setTimeout(() => msgsEndRef.current?.scrollIntoView({ behavior:'smooth' }), 50);
    }
  }, []);

  const onChunk = useCallback((text, gen) => {
    if (gen !== undefined && gen !== generationRef.current) return;
    chunkBufferRef.current += text;
    if (!chunkTimerRef.current) {
      chunkTimerRef.current = setTimeout(() => {
        const newText = chunkBufferRef.current;
        chunkBufferRef.current = '';
        const { msgs: setter } = getViewSetters(streamingViewRef.current);
        setter(prev => {
          if (!prev.length) return prev;
          const last = prev[prev.length - 1];
          if (last.role !== 'assistant') return prev;
          return [...prev.slice(0, -1), { ...last, content: last.content + newText }];
        });
        chunkTimerRef.current = null;
        scrollToBottom();
      }, 80);
    }
  }, [scrollToBottom]);

  const activeSessionNameRef = useRef(activeSessionName);
  useEffect(() => { activeSessionNameRef.current = activeSessionName; }, [activeSessionName]);
  const activeViewRef = useRef(activeView);
  useEffect(() => { activeViewRef.current = activeView; }, [activeView]);

  const onSaveOk = useCallback((name) => {
    setActiveSessionName(name);
  }, []);

  const onDone = useCallback((data, gen) => {
    if (gen !== undefined && gen !== generationRef.current) return;
    if (chunkTimerRef.current) {
      clearTimeout(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }
    if (chunkBufferRef.current) {
      const newText = chunkBufferRef.current;
      chunkBufferRef.current = '';
      const { msgs: setter } = getViewSetters(streamingViewRef.current);
      setter(prev => {
        if (!prev.length) return prev;
        const last = prev[prev.length - 1];
        if (last.role !== 'assistant') return prev;
        return [...prev.slice(0, -1), { ...last, content: last.content + newText }];
      });
    }
    const { stream: setterIs } = getViewSetters(streamingViewRef.current);
    setterIs(false);
    setLastElapsed(data.elapsed ?? 0);
    setLastTokens(data.tokens ?? 0);
    scrollToBottom();
  }, [scrollToBottom]);

  const onAction = useCallback((data) => {
    if (data.tag === 'ASK' && data.status === 'pending') {
      try {
        let quizData;
        try {
          quizData = JSON.parse(data.data);
        } catch (e) {
          // Attempt to fix common LLM JSON syntax errors (like trailing commas) safely instead of using eval
          const fixedData = data.data.replace(/,\s*([\]}])/g, '$1');
          quizData = JSON.parse(fixedData);
        }
        setActiveQuiz(quizData);
      } catch(e) {
        console.error("Failed to parse ASK JSON", e);
      }
      return;
    }

    setPendingActions(prev => {
      const idx = prev.findIndex(a => a.tag === data.tag && a.data === data.data);
      if (idx >= 0) { const n=[...prev]; n[idx]=data; return n; }
      return [...prev, data];
    });
    if (data.status === 'ok' || data.status === 'err') {
      if (pendingActionsTimerRef.current) clearTimeout(pendingActionsTimerRef.current);
      pendingActionsTimerRef.current = setTimeout(() => {
        setPendingActions(prev => prev.filter(a => a.status==='pending'||a.status==='running').length ? prev : []);
        pendingActionsTimerRef.current = null;
      }, 2500);
    }
  }, []);

  const onSystem = useCallback((text) => {
    const lower = text.toLowerCase();

    // Rutin bildirimleri (kullanıcının görmek istemediklerini) tamamen gizle
    if (lower.includes('krock\'s apex') ||
        lower.includes('💾 saved') ||
        lower.includes('🔄 chat reset') ||
        lower.includes('📁 folder:') ||
        lower.includes('oturum yüklendi') ||
        lower.includes('aktarıldı') ||
        lower.includes('işlem durduruldu') ||
        lower.includes('ekran analizi')) {
      return; // Hiçbir şey gösterme
    }

    toast(text, { duration: 2500 });
  }, []);

  const onError        = useCallback((text) => { toast.error(text); getViewSetters(streamingViewRef.current).stream(false); }, []);
  const onSessions     = useCallback((ss) => setSessions(ss), []);
  const onHistoryLoaded = useCallback((history) => {
    const msgs = history.filter(m => m.role !== 'system').map(m => {
      let textContent = '';
      let imagesList = [];

      if (typeof m.content === 'string') {
        textContent = m.content;
      } else if (Array.isArray(m.content)) {
        textContent = m.content.map(item => {
          if (item.type === 'text') return item.text;
          if (item.type === 'image_url') {
             if (item.image_url && item.image_url.url && item.image_url.url.startsWith('/images/')) {
                 imagesList.push(item.image_url.url);
             }
             return '';
          }
          return '';
        }).join('\n').trim();
      } else {
        textContent = JSON.stringify(m.content);
      }
      return {
        role: m.role,
        content: textContent,
        images: imagesList,
        timestamp: new Date().toISOString(),
      };
    }).filter(m => {
      // Hide internal feedback messages from the UI
      if (m.role === 'user' && typeof m.content === 'string') {
        const c = m.content.trim();
        if (c.startsWith('CMD ▶') || c.startsWith('JXA ▶') || c.startsWith('USE ▶') || 
            c.startsWith('EVOLVE ▶') || c.startsWith('Ekran analizi:') || c.startsWith('[Hata/')) {
          return false;
        }
      }
      return true;
    });
    const key = activeViewRef.current === 'code' ? 'code' : activeViewRef.current === 'projects' ? 'projects' : 'chat';
    getViewSetters(key).msgs(msgs);
    scrollToBottom(true);
  }, [scrollToBottom]);
  const onStatus = useCallback((data) => toast[data.ok ? 'success' : 'error'](data.text), []);
  const [projects,       setProjects]       = useState([]);
  const [skills,         setSkills]         = useState([]);
  const [connectors,     setConnectors]     = useState([]);
  const [plugins,        setPlugins]        = useState([]);

  const onProjects   = useCallback((projList) => setProjects(projList), []);
  const onSkills     = useCallback((data) => setSkills(data), []);
  const onConnectors = useCallback((data) => setConnectors(data), []);
  const onPlugins    = useCallback((data) => setPlugins(data), []);

  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [gitBranches, setGitBranches] = useState([]);
  const [currentGitBranch, setCurrentGitBranch] = useState('main');

  const onFolderChosen = useCallback((path) => {
    setActiveWorkspace(path);
  }, []);

  const onWorkspaceChange = useCallback((path) => {
    setActiveWorkspace(path);
  }, []);

  const onBranchChange = useCallback((branch) => {
    setCurrentGitBranch(branch);
  }, []);

  const onBranches = useCallback((branches, current) => {
    setGitBranches(branches);
    setCurrentGitBranch(current);
  }, []);

  const onScreenshotTaken = useCallback((base64) => {
    toast.dismiss("screenshot-toast");
    setScreenshotEvent(base64);
  }, []);

  const ws = useKrocksWS({
    onChunk, onDone, onAction, onSystem, onError, onSessions,
    onHistoryLoaded, onStatus, onSaveOk, onProjects, onFolderChosen,
    onBranches, onScreenshotTaken, onSkills, onConnectors, onPlugins,
    generationRef
  });

  // When active workspace changes, we should ask for branch list
  useEffect(() => {
    if (activeWorkspace && ws.connected) {
      ws.sendRaw({ type: 'list_branches', workspace: activeWorkspace });
    }
  }, [activeWorkspace, ws.connected]);

  // Initial fetch of projects, skills, etc.
  useEffect(() => {
    if (ws.connected) {
      ws.sendRaw({ type: 'list_projects' });
      ws.sendRaw({ type: 'get_skills' });
      ws.sendRaw({ type: 'get_connectors' });
      ws.sendRaw({ type: 'get_plugins' });
    }
  }, [ws.connected]);

  const CHAT_SYSTEM_PROMPT = `Sen Krock's — akıllı, sıcak ve direkt bir AI asistanısın.
Kullanıcıyla samimi, doğal bir dil kullan. Türkçe konuşuyorsan Türkçe, İngilizce konuşuyorsan İngilizce yanıt ver.
İnternette bilgi araman veya bir web sitesine bakman gerekirse, senin yerleşik, ultra güçlü bir web motorun var. Bunun için [WEB]aranacak kelime veya url[/WEB] etiketini kullan. Gerekirse sayfa sayfa gezerek konuyu derinlemesine araştırabilirsin.
DİKKAT: Kullanıcıya web araması sonuçlarını sunarken, uzun URL'leri ASLA açıkça metin içine yazma. Her zaman kısa ve tıklanabilir Markdown bağlantıları (Örn: [Site Adı](https://...)) kullan ve alıntıları > blockquote içinde zarifçe göster.
Sadece temel araçları kullan ve gereksiz araç döngüsüne ASLA girme.
Kısa, net ve kullanışlı yanıtlar ver. Gereksiz uzatma.
Eğer kullanıcının isteği çok belirsizse veya karar vermesi gereken bir seçenek varsa, [ASK] {"q": "Soru metni", "options": ["Seçenek 1", "Seçenek 2"]} [/ASK] etiketini kullanarak şık bir Quiz sunabilirsin. Soru sorunca yanıt bekle ve dur. Art arda birden fazla soru sorma.
Görev tamamlandığında DURUR ve kullanıcıya açıklama yaparsın.`;

  const CODE_SYSTEM_PROMPT = `Sen Krock's — gerçek bir sistem üzerinde çalışan, tam yetkili bir AI geliştirme ajanısın.

## SEN BİR CHATBOT DEĞİLSİN — SEN BİR AJANSSIN

Sana önemli bir gerçeği net anlat:
- [CMD]komut[/CMD] yazdığında bu komutu SEN çalıştırıyorsun. Backend Python süreci bu komutu gerçek terminalde execute ediyor.
- [VISION]açıklama[/VISION] yazdığında ekranı SEN tarayıp analiz ediyorsun.
- Dosya bul, oku, yaz komutlarını SEN veriyorsun ve sonuçları SEN alıyorsun.
- Kullanıcıya "şu komutu çalıştır", "terminale şunu yaz" DEME. O işlemi kendin yap.
- Kullanıcı sana "bu dosyayı bul" derse → [CMD]find / -name "dosya" 2>/dev/null[/CMD] ile SEN bulursun.
- Kullanıcı "şu scripti çalıştır" derse → [CMD]python script.py[/CMD] ile SEN çalıştırırsın.
- DİKKAT: Dosyaları okuman gerektiğinde ASLA tüm projeyi veya çok büyük dosyaları tek seferde cat ile tamamen okumaya çalışma! Model hafızası (context window) dolar ve hata verirsin.
- Büyük dosyalarda sadece spesifik yerleri okumak için grep veya sed kullan. (Örn: [CMD]grep -n "def main" script.py[/CMD]).
- ASLA aynı anda 2'den fazla komut çalıştırma! Komutu gönder, çıktısını bekle, sonra sıradaki adımı düşün.
- Çıktı sana USER mesajı olarak döner, analiz et ve sadece gerekliyse yeni komut üret.

## ARAÇLARIN
- [CMD]terminal komutu[/CMD] → Gerçek terminal'de çalışır (bash/zsh, macOS)
- [VISION]ne görmek istediğin[/VISION] → Ekran görüntüsü analizi
- [WEB]url veya sorgu[/WEB] → İnternette derinlemesine arama yapar, sayfalardaki reklamları ezip saf metni okur (Okuyucu modu). Bilgi aradığında kullan.
- [ASK] {"q": "Soru metni", "options": ["Seçenek 1", "Seçenek 2"]} [/ASK] → Mimari bir kararda veya belirsizlikte kullanıcıya çoktan seçmeli soru sorar. KESİNLİKLE kullan! Soru sorunca yanıt bekle. Lütfen ASLA art arda birden fazla soru sorma; bir defalık detaylı sor.

## ZORUNLU KURALLAR — İHLAL ETME
- Görev tamamlanınca özetle ve DUR. Ekstra eylem yapma.
- Her adımda: "Bu gerekli mi? Daha önce yaptım mı?" diye kontrol et.

## ÇALIŞMA TARZI
1. Görevi anla
2. Gerekli komutları [CMD]...[/CMD] ile KENDIN çalıştır
3. Çıktıyı analiz et
4. Gerekirse bir sonraki adıma geç
5. Görev bitince kısa özet ver ve DUR

Teknik ve profesyonel dil kullan. Kodları tam ve çalışır yaz. Adım adım düşün.`;

  const PROJECT_SYSTEM_PROMPT = `Sen Krock's — gerçek bir sistem üzerinde çalışan, tam yetkili bir Proje Geliştirme Ajanısın (Project Development Agent).

## SEN BIR PROJE AJANISIN — CHATBOT DEĞİL

Bu projede kullanıcıyla birlikte geliştirme yapıyorsun. Projenin dosyalarına, talimatlarına ve bağlamına tam hakimsin.

## ARAÇLARIN (Hepsini Kullanabilirsin)
- [CMD]terminal komutu[/CMD] → Gerçek macOS terminalinde çalışır. Dosya oku/yaz, git işlemleri, kod çalıştır, test et, derle — HER ŞEYİ yapabilirsin.
- [VISION]ne görmek istediğin[/VISION] → Ekranı tara, UI'ı kontrol et, hata mesajlarını ve logları görsel olarak analiz et.
- [WEB]url veya sorgu[/WEB] → İnternette arama yap, dokümantasyon oku, en güncel API referanslarını çek.
- [TYPE]yazılacak metin[/TYPE] → Kullanıcı arayüzüne metin yaz, form doldur, terminal komutu gir.
- [EVOLVE]yetenek_adi ||| python_kodu[/EVOLVE] → Kendine yeni yetenekler yazıp kalıcı olarak öğren. Projeye özel yardımcı fonksiyonlar oluştur.
- [USE]yetenek ||| fonksiyon ||| argümanlar[/USE] → Önceden öğrendiğin yetenekleri çalıştır.
- [ASK] {"q": "Soru metni", "options": ["Seçenek 1", "Seçenek 2"]} [/ASK] → Mimari kararlarda veya belirsizlikte kullanıcıya sor. Soru sorunca CEVABI BEKLE. Asla art arda 2 soru sorma.

## ZORUNLU KURALLAR
1. Kullanıcıya "şu komutu çalıştır", "şunu terminale yaz" ASLA deme. Komutları KENDİN çalıştır.
2. [CMD] yazdığında komut gerçekten çalışır. Çıktıyı analiz et, sıradaki adıma geç.
3. Dosyaları okurken ASLA tüm projeyi cat ile okuma! Büyük dosyalarda grep/sed kullanarak sadece ihtiyacın olan kısmı oku.
4. ASLA aynı anda 2'den fazla komut çalıştırma. Çıktıyı bekle, sonra devam et.
5. Projenin mevcut yapısını bozma. Yeni dosya eklerken/mevcutları düzenlerken projenin bütünlüğünü koru.
6. Görev TAMAMLANDIĞINDA özetle ve DUR. Ekstra, gereksiz işlem yapma.
7. Her adımda "Bu gerçekten gerekli mi? Daha önce yaptım mı?" diye kontrol et.

## ÇALIŞMA TARZI
1. Proje bağlamını ve kullanıcının isteğini anla
2. Proje dosyalarını tara/oku ([CMD]find, grep, head[/CMD])
3. Değişiklikleri yap ([CMD] ile dosya düzenle/oluştur)
4. Test et/doğrula ([CMD] ile çalıştır)
5. Özetle ve DUR

## PROJE BAĞLAMI
Kullanıcının mesajı proje bağlamıyla birlikte gelir (Proje adı, açıklaması, talimatlar, dosyalar).
Bu bağlamı DAİMA hesaba kat. Talimatlar varsa onlara UY.
Proje dosyalarını [CMD] ile oku, değiştir, yeniden oluştur — tam yetkin var.

Teknik, profesyonel ve İngilizce ağırlıklı dil kullan. Kodları eksiksiz ve çalışır halde yaz.`;


  const handleSend = useCallback(async (text, isCodeModeParam = false, fileContents = [], options = {}) => {
    const isCodeMode = activeView === 'code' || isCodeModeParam;
    if (!text.trim() && fileContents.length === 0) return;
    setInputText('');
    setActiveTip(null);
    if (!ws.connected) { toast.error('Not connected'); return; }

    const textFiles = fileContents.filter(f => !f.isImage);
    const imageFiles = fileContents.filter(f => f.isImage);
    const imageBase64s = imageFiles.map(f => f.content);

    const imagePreviews = imageFiles.map(f => f.previewUrl);

    let fullText = text.trim();
    if (textFiles.length > 0) {
      const fileSection = textFiles.map(f => `\n\n--- File: ${f.name} ---\n${f.content}`).join('');
      fullText = fullText ? `${fullText}${fileSection}` : `Please review these file(s):${fileSection}`;
    }
    if (imageFiles.length > 0 && !fullText) {
      fullText = "Please review the attached image.";
    }

    const viewKey = isCodeMode ? 'code' : activeView === 'projects' ? 'projects' : 'chat';
    const { msgs: msgSetter, stream: streamSetter } = getViewSetters(viewKey);
    streamingViewRef.current = viewKey;

    if (viewsNeedReset.current[viewKey]) {
      viewsNeedReset.current[viewKey] = false;
      ws.resetChat();
    }

    msgSetter(prev => {
      const next = [
        ...prev,
        { role:'user',      content: text.trim() || (textFiles.length > 0 ? `[${textFiles.map(f=>f.name).join(', ')}]` : ''), images: imagePreviews, timestamp:new Date().toISOString() },
        { role:'assistant', content:'',   timestamp:new Date().toISOString() },
      ];
      return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
    });
    streamSetter(true);
    setPendingActions([]);
    autoScrollEnabled.current = true;
    scrollToBottom(true);

    let systemPrompt = options.systemPromptOverride || CHAT_SYSTEM_PROMPT;
    if (!options.systemPromptOverride) {
      if (isCodeMode) {
        systemPrompt = CODE_SYSTEM_PROMPT;
      } else if (activeView === 'projects') {
        systemPrompt = PROJECT_SYSTEM_PROMPT;
        if (options.projectContext) {
          systemPrompt += `\n\n## MEVCUT PROJE\n${options.projectContext}`;
        }
      }
    }

    if (options.webSearch) {
      systemPrompt += "\n\n[DİKKAT] Kullanıcı bu mesaj için WEB ARAMASI özelliğini aktif etti. Lütfen yanıtını hazırlarken [WEB]aranacak kelime veya url[/WEB] aracı ile internetten en güncel bilgileri çekerek araştırma yap ve kaynak göstererek yanıtla.";
    }

    if (options.style && options.style !== 'Normal') {
      const styles = {
        'Learning': '\n\n[DİKKAT] Kullanıcı "Learning" (Öğrenici) stilini seçti. Yanıtlarında adım adım açıkla, kavramları basitleştir ve öğretici bir ton kullan.',
        'Concise': '\n\n[DİKKAT] Kullanıcı "Concise" (Kısa ve Öz) stilini seçti. Yanıtlarında doğrudan sonuca git, gereksiz nezaket sözcüklerini veya uzun açıklamaları atla. Mümkün olan en kısa cevabı ver.',
        'Explanatory': '\n\n[DİKKAT] Kullanıcı "Explanatory" (Açıklayıcı) stilini seçti. Yanıtlarında bolca detay ver, örnekler kullan ve konunun mantığını derinlemesine anlat.',
        'Formal': '\n\n[DİKKAT] Kullanıcı "Formal" (Resmi) stilini seçti. Yanıtlarında resmi, ciddi ve kurumsal bir dil kullan.'
      };
      if (styles[options.style]) systemPrompt += styles[options.style];
    }

    ws.sendMessage(fullText, { 
      model, 
      temperature: settings.temperature, 
      max_tokens: settings.maxTokens, 
      feedback_depth: settings.feedbackDepth, 
      system_prompt: systemPrompt,
      images: imageBase64s,
      workspace: activeWorkspace
    });
  }, [ws, model, settings, scrollToBottom, activeView, inputText, activeWorkspace]);

  const hasResetOnMount = useRef(false);
  useEffect(() => {
    if (ws.connected && !hasResetOnMount.current) {
      ws.resetChat();
      hasResetOnMount.current = true;
    }
  }, [ws.connected, ws]);

  // View değiştiğinde veya bağlantı kurulduğunda, aktif view'a uygun system prompt'u backend'e gönder
  // Böylece chat↔code view arası geçişte history[0] eski prompt'ta kalmıyor
  useEffect(() => {
    if (!ws.connected) return;
    let sp = CHAT_SYSTEM_PROMPT;
    if (activeView === 'code') sp = CODE_SYSTEM_PROMPT;
    else if (activeView === 'projects') sp = PROJECT_SYSTEM_PROMPT;
    ws.sendConfig({ system_prompt: sp });
  }, [activeView, ws.connected]);

  // Otomatik kaydetme effect'i
  useEffect(() => {
    if (!isStreaming && messages.length > 0 && ws.connected) {
      const userMsgs = messages.filter(m => m.role === 'user');
      const userCount = userMsgs.length;
      const viewKey = activeView === 'code' ? 'code' : activeView === 'projects' ? 'projects' : 'chat';
      const as = autosaveState.current[viewKey];

      if (!activeSessionName && userCount > 0 && !as.saved) {
        as.saved = true;
        as.count = userCount;
        ws.saveSession('', activeView);
      }
      else if (activeSessionName && as.saved && userCount > as.count) {
        as.count = userCount;
        as.name = activeSessionName;
        ws.saveSession(activeSessionName, activeView);
      }
    }
  }, [isStreaming, messages.length, ws, activeSessionName, activeView]);

  const handleNewChat     = () => {
    generationRef.current++;
    if (chunkTimerRef.current) { clearTimeout(chunkTimerRef.current); chunkTimerRef.current = null; }
    chunkBufferRef.current = '';
    setSidebarOpen(true);
    let viewKey = activeView === 'code' ? 'code' : activeView === 'projects' ? 'projects' : 'chat';
    autosaveState.current[viewKey] = { saved: false, count: 0, name: null };
    viewsNeedReset.current[viewKey] = true;
    if (activeView === 'code') { setCodeMessages([]); setCodeIsStreaming(false); }
    else if (activeView === 'projects') { setProjectMessages([]); setProjectIsStreaming(false); }
    else { setChatMessages([]); setChatIsStreaming(false); }
    setPendingActions([]);
    setActiveView('chat');
    setInputText('');
    setActiveTip(null);
    ws.resetChat();
    setActiveSessionName(null);
  };
  const handleLoadSession = (name) => {
    generationRef.current++;
    if (chunkTimerRef.current) { clearTimeout(chunkTimerRef.current); chunkTimerRef.current = null; }
    chunkBufferRef.current = '';
    setSidebarOpen(true);
    let isCodeSession = (name.startsWith('Code_') || name.startsWith('Code '));
    let isProjSession = (name.startsWith('Project_') || name.startsWith('Project '));
    let viewKey = isCodeSession ? 'code' : isProjSession ? 'projects' : 'chat';
    autosaveState.current[viewKey] = { saved: true, count: 0, name };
    viewsNeedReset.current[viewKey] = false; // session yüklendi, backend zaten dolacak
    if (isCodeSession) { setCodeMessages([]); setCodeIsStreaming(false); }
    else if (isProjSession) { setProjectMessages([]); setProjectIsStreaming(false); }
    else { setChatMessages([]); setChatIsStreaming(false); }
    setPendingActions([]);
    ws.loadSession(name);
    if (isCodeSession) setActiveView('code');
    else if (isProjSession) setActiveView('projects');
    else setActiveView('chat');
    setActiveSessionName(name);
  };

  // Unmount'ta bekleyen transient timer'ları temizle (memory leak prevention)
  useEffect(() => {
    return () => {
      if (pendingActionsTimerRef.current) {
        clearTimeout(pendingActionsTimerRef.current);
        pendingActionsTimerRef.current = null;
      }
      if (chunkTimerRef.current) {
        clearTimeout(chunkTimerRef.current);
        chunkTimerRef.current = null;
      }
    };
  }, []);
  const handleDeleteSession = (name) => { ws.deleteSession(name); if (activeSessionName === name) handleNewChat(); };
  const handleModelChange = (m) => { setModel(m); ws.sendConfig({ model: m }); };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme || 'dark');
  }, [settings.theme]);

  const handleReadLast = useCallback(() => {
    const ast = [...messages].reverse().find(m => m.role === 'assistant');
    if (ast && ast.content) {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      } else {
        const u = new SpeechSynthesisUtterance(ast.content);
        u.lang = 'tr-TR';
        window.speechSynthesis.speak(u);
      }
    } else {
      toast.error('No message to read aloud');
    }
  }, [messages]);

  const handleTakeScreenshot = useCallback(() => {
    if (ws.connected) {
      toast.loading("Select an area for the screenshot...", { id: "screenshot-toast" });
      ws.sendRaw({ type: 'take_screenshot' });
    }
  }, [ws]);

  const chatStarted = messages.some(m => m.role === 'user' || m.role === 'assistant');

  return (
    <div id="app">
      {/* ── SIDEBAR ── */}
      <Sidebar
        isOpen={sidebarOpen}
        activeView={activeView}
        onViewChange={(view) => {
          setSidebarOpen(true);
          setActiveView(view);
        }}
        recentSessions={sessions}
        onLoadSession={handleLoadSession}
        onDeleteSession={handleDeleteSession}
        onNewChat={handleNewChat}
        onOpenSettings={() => {
          setSidebarOpen(false);
          setActiveView('customize');
        }}
        userName="Lord"
        activeSessionName={activeSessionName}
      />

      {/* ── MAIN ── */}
      <div id="main" style={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
        
        <AnimatePresence mode="wait">
          {activeView === 'chat' && (
            <motion.div key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              style={{ flex: 1, flexDirection: 'column', position: 'relative', minWidth: 0, display: 'flex' }}>
          
          {/* Top left sidebar toggle & new chat */}
          <div style={{ position:'absolute', top:14, left:14, zIndex:15, display:'flex', gap:'8px' }}>
          <button 
            className="sb-btn" 
            style={{ color:'var(--t2)', background: sidebarOpen ? 'transparent' : 'var(--bg)', border: sidebarOpen ? 'none' : '1px solid var(--b1)' }}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle Sidebar"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width:18, height:18}}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.75 3v18M3.75 3h16.5a1.5 1.5 0 0 1 1.5 1.5v15a1.5 1.5 0 0 1-1.5 1.5H3.75V3Z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 3v18" />
            </svg>
          </button>
          {!sidebarOpen && (
            <button className="sb-btn" style={{ color:'var(--t2)', background:'var(--bg)', border:'1px solid var(--b1)' }} onClick={handleNewChat} title="New Chat">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width:18, height:18}}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>

        {/* Top pill (only in chat view) */}
        {activeView === 'chat' && (
          <div id="topbar">
            {/* Top Right Profile Icon */}
            <div style={{ position: 'absolute', right: '24px', top: '14px', pointerEvents: 'auto' }}>
              <button className="sb-btn" onClick={handleNewChat} style={{ width: '32px', height: '32px', border: '1px solid var(--b1)', borderRadius: '6px', color: 'var(--t2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" style={{width: 16, height: 16}}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>
              </button>
            </div>
          </div>
        )}

        {/* ── WELCOME HEADER & CHAT INPUT (Unified for smooth transition) ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {/* Chat Messages */}
          <div id="msgs" style={{ display: chatStarted ? 'flex' : 'none' }} onScroll={handleScroll}>
            <div style={{ height:56 }} />
            {(() => {
              let lastAstIdx = -1;
              for (let i = messages.length - 1; i >= 0; i--) {
                if (messages[i].role === 'assistant') { lastAstIdx = i; break; }
              }
              return messages.map((msg, i) => (
                <MessageBubble
                  key={i}
                  message={msg}
                  userName={userName}
                  isStreaming={isStreaming && i === messages.length - 1 && msg.role === 'assistant'}
                  showAvatar={i === lastAstIdx}
                  onRetry={msg.role === 'assistant' ? (() => {
                    const prev = messages[i - 1];
                    if (prev && prev.role === 'user') handleSend(prev.content, activeView === 'code');
                  }) : undefined}
                />
              ));
            })()}
            <div ref={msgsEndRef} />
          </div>

          {/* Input Area (Centered if empty, bottom if chat started) */}
          <motion.div 
            id="inp-area" 
            layout 
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            className={chatStarted ? '' : 'centered'}
          >
            <AnimatePresence>
              {!chatStarted && (
                <motion.div 
                  id="welcome-header"
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, filter: 'blur(4px)' }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="greeting-wrap" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0px' }}>
                    <div style={{ width: 32, height: 32, color: '#d97757' }}>
                      <KrocksIcon />
                    </div>
                    <h1 className="greeting" style={{ fontFamily: 'var(--f-serif)', fontSize: '38px', fontWeight: 300, color: 'rgb(195, 194, 184)', textShadow: '0 0 1px rgb(110, 109, 104)', letterSpacing: '0.02em', margin: 0 }}>Back at it, {userName || 'Lord'}</h1>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>



            <AnimatePresence>
              {activeQuiz && (
                <QuizModal 
                  askData={activeQuiz}
                  onAnswer={(answer) => {
                    setActiveQuiz(null);
                    handleSend(`Q: ${activeQuiz.q}\nA: ${answer}`);
                  }}
                  onSkip={() => {
                    setActiveQuiz(null);
                    handleSend(`Q: ${activeQuiz.q}\nA: [Skipped]`);
                  }}
                />
              )}
            </AnimatePresence>
            
            <motion.div layout className="inp-wrap" style={{ width: '100%', zIndex: 10 }}>
              <ChatInput 
                value={inputText}
                onChange={setInputText}
                onSend={handleSend} 
                isStreaming={isStreaming} 
onStop={() => { getViewSetters(streamingViewRef.current).stream(false); ws.abortStream(); }}
                model={model} 
                onModelChange={handleModelChange} 
                onReadLast={handleReadLast}
                onTakeScreenshot={handleTakeScreenshot}
                screenshotEvent={screenshotEvent}
                projects={projects}
                skills={skills}
                connectors={connectors}
                plugins={plugins}
              />
            </motion.div>

            <AnimatePresence mode="wait">
              {!chatStarted && !activeTip && (
                <motion.div 
                  key="chips"
                  className="chips"
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {Object.entries(TIPS_DATA).map(([tipName, data]) => (
                    <button key={tipName} className="chip" onClick={() => setActiveTip(tipName)}>
                      {data.icon}{tipName}
                    </button>
                  ))}
                </motion.div>
              )}
              {!chatStarted && activeTip && (
                <motion.div
                  key="tip-dropdown"
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  style={{ width: '100%', maxWidth: '768px', margin: '16px auto 0', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--b1)', overflow: 'hidden' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--b1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--t2)', fontSize: '13px', flex: 1 }}>
                      <span style={{ width: 16, height: 16, display: 'flex' }}>{TIPS_DATA[activeTip].icon}</span>
                      {activeTip}
                    </div>
                    <button onClick={() => setActiveTip(null)} style={{ background: 'transparent', border: 'none', color: 'var(--t2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {TIPS_DATA[activeTip].prompts.map((p, i) => (
                      <button 
                        key={i} 
                        onClick={() => setInputText(p.prompt)}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'transparent', border: 'none', borderBottom: i < TIPS_DATA[activeTip].prompts.length - 1 ? '1px solid var(--b1)' : 'none', color: 'var(--t1)', fontSize: '14px', cursor: 'pointer', textAlign: 'left' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {p.title}
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14" strokeWidth="2" style={{ color: 'var(--t3)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
            </div>
          </motion.div>
        )}
          {activeView === 'code' && (
            <motion.div key="code"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.12 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <CoderWorkspace
                ws={ws}
                sessions={sessions}
                messages={messages}
                currentModel={model}
                isStreaming={isStreaming}
                userName={settings.userName || 'Lord'}
                activeWorkspace={activeWorkspace}
                gitBranches={gitBranches}
                currentGitBranch={currentGitBranch}
                onWorkspaceChange={onWorkspaceChange}
                onBranchChange={onBranchChange}
                onStop={() => { getViewSetters(streamingViewRef.current).stream(false); ws.abortStream(); }}
                onSend={(text) => { handleSend(text, true); }}
              />
          </motion.div>
        )}
          {activeView === 'projects' && (
            <motion.div key="projects"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.12 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <ProjectsView ws={ws} projects={projects} messages={messages} isStreaming={isStreaming} onSend={handleSend} onStop={() => { getViewSetters(streamingViewRef.current).stream(false); ws.abortStream(); }} />
          </motion.div>
        )}
          {activeView === 'artifacts' && (
            <motion.div key="artifacts"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.12 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <ArtifactsView
                ws={ws}
                onTemplateSelect={(prompt) => { setActiveView('code'); handleSend(prompt, true); }}
              />
          </motion.div>
        )}
          {activeView === 'chats' && (
            <motion.div key="chats"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.12 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <ChatsView sessions={sessions} onLoadSession={handleLoadSession} onNewChat={handleNewChat} onDeleteSession={handleDeleteSession} />
          </motion.div>
        )}
          {activeView === 'customize' && (
            <motion.div key="customize"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.12 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <CustomizeView ws={ws} settings={settings} onSettingsChange={setSettings} model={model} onModelChange={handleModelChange} />
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </div>
  );
}
