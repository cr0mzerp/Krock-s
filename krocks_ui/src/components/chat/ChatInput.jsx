import React, { useState, useRef, useEffect } from 'react';
import ModelSelector from './ModelSelector';
import AttachmentMenu from './AttachmentMenu';

export default function ChatInput({ value, onChange, onSend, isStreaming, onStop, model, onModelChange, onReadLast, onTakeScreenshot, screenshotEvent, projects, skills, connectors, plugins, onOpenCustomize }) {
  const taRef = useRef(null);
  const fileInputRef = useRef(null);
  const [attachedFiles, setAttachedFiles] = useState([]); // { name, content }
  const [isListening, setIsListening] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState('Normal');
  const recognition = useRef(null);

  useEffect(() => {
    if (screenshotEvent) {
       const dataUrl = screenshotEvent;
       const img = new Image();
       img.onload = () => {
         const MAX = 200;
         const scale = Math.min(MAX / img.width, MAX / img.height, 1);
         const w = Math.max(1, Math.round(img.width * scale));
         const h = Math.max(1, Math.round(img.height * scale));
         const canvas = document.createElement('canvas');
         canvas.width = w;
         canvas.height = h;
         const ctx = canvas.getContext('2d');
         ctx.drawImage(img, 0, 0, w, h);
         const thumb = canvas.toDataURL('image/jpeg', 0.7);
         setAttachedFiles(prev => {
           if (prev.some(f => f.content === dataUrl && f.name.startsWith('Screenshot_'))) return prev;
           return [...prev, { name: `Screenshot_${new Date().getTime()}.png`, content: dataUrl, previewUrl: thumb, isImage: true }];
         });
       };
       img.onerror = () => {
         setAttachedFiles(prev => {
           if (prev.some(f => f.content === dataUrl && f.name.startsWith('Screenshot_'))) return prev;
           return [...prev, { name: `Screenshot_${new Date().getTime()}.png`, content: dataUrl, previewUrl: dataUrl, isImage: true }];
         });
       };
       img.src = dataUrl;
    }
  }, [screenshotEvent]);

  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = '24px';
      taRef.current.style.height = Math.min(taRef.current.scrollHeight, 250) + 'px';
    }
  }, [value]);

  useEffect(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.onresult = (e) => {
        let t = '';
        for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
        onChange(t);
      };
      rec.onend = () => setIsListening(false);
      recognition.current = rec;
    }
  }, [onChange]);

  const toggleMic = () => {
    if (!recognition.current) return;
    if (isListening) { recognition.current.stop(); }
    else { onChange(''); recognition.current.start(); setIsListening(true); }
  };

  const send = () => {
    if ((!value.trim() && attachedFiles.length === 0) || isStreaming) return;
    onSend(value.trim(), false, attachedFiles, { webSearch: webSearchEnabled, style: selectedStyle });
    setAttachedFiles([]);
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isStreaming) {
        onStop && onStop();
      } else {
        send();
      }
    }
  };

  // Görsel için max 200x200 thumbnail üret (hafıza dostu)
  const makeImageThumb = (file) => new Promise((resolve) => {
    const blobUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const MAX = 200;
      const scale = Math.min(MAX / img.width, MAX / img.height, 1);
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const thumb = canvas.toDataURL('image/jpeg', 0.7);
      URL.revokeObjectURL(blobUrl); // Orijinal blob URL hemen serbest
      resolve(thumb);
    };
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      resolve(URL.createObjectURL(file)); // Fallback (ama kısa süreli kullanılacak)
    };
    img.src = blobUrl;
  });

  const processFiles = async (filesArray) => {
    const readFile = (file) => new Promise((resolve) => {
      // Image dosyaları için base64 + thumbnail, diğerleri için text
      const isImageExt = /\.(jpeg|jpg|png|gif|webp|svg|heic)$/i.test(file.name);
      if (file.type.startsWith('image/') || isImageExt) {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const fullBase64 = ev.target.result;
          const thumb = await makeImageThumb(file);
          resolve({
            name: file.name,
            content: fullBase64,   // LLM'e gönderilecek (full)
            previewUrl: thumb,      // Mesajda gösterilecek (küçük)
            isImage: true
          });
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = (ev) => resolve({ name: file.name, content: ev.target.result, isImage: false });
        reader.onerror = () => resolve({ name: file.name, content: `[File could not be read: ${file.name}]`, isImage: false });
        reader.readAsText(file, 'utf-8');
      }
    });

    const results = await Promise.all(filesArray.map(readFile));
    setAttachedFiles(prev => {
      // Filtreleme: Aynı isimli dosya zaten eklendiyse tekrar ekleme
      const newFiles = results.filter(r => !prev.some(p => p.name === r.name));
      return [...prev, ...newFiles];
    });
  };

  // Dosyaları '+' butonu ile seçince
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    await processFiles(files);
  };

  // Pano (Clipboard) üzerinden yapıştırma (Cmd+V / Ctrl+V)
  useEffect(() => {
    const handlePaste = async (e) => {
      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        // Eğer input textarea dışındaysa bile yakalamak için preventDefault kullanılabilir,
        // ama sadece textarea içerisindeyken dosyaları yakalamak daha güvenlidir.
        // Biz genel doküman seviyesinde yakalayacağız ki kullanıcı her yerde yapıştırabilsin.
        const files = Array.from(e.clipboardData.files);
        await processFiles(files);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  const removeFile = (i) => setAttachedFiles(prev => prev.filter((_, j) => j !== i));

  const hasContent = value.trim() || attachedFiles.length > 0;

  return (
    <div className="inp-card">
      {/* Attached files chips */}
      {attachedFiles.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '8px 14px 0' }}>
          {attachedFiles.map((f, i) => {
            if (f.isImage) {
              return (
                <div key={i} className="img-thumbnail-container" onClick={(e) => e.stopPropagation()}>
                  <img src={f.previewUrl} alt={f.name} />
                  <div className="img-remove-btn" onClick={() => removeFile(i)}>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="12" height="12">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
              );
            }
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '20px', padding: '4px 10px', fontSize: '12px', color: 'var(--t1)',
                maxWidth: '200px',
              }}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="12" height="12" style={{ flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                <button onClick={() => removeFile(i)} style={{
                  background: 'none', border: 'none', color: 'var(--t3)',
                  cursor: 'pointer', padding: 0, display: 'flex', flexShrink: 0,
                }}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="11" height="11">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="inp-top">
        <textarea
          ref={taRef}
          className="inp-ta"
          placeholder="How can I help you today?"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKey}
          rows={1}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-gramm="false"
          data-gramm_editor="false"
          data-enable-grammarly="false"
          style={{ overflow: 'hidden' }}
        />
      </div>

      <div className="inp-bot">
        {/* Attachment Popover */}
        <AttachmentMenu
          onAddFiles={() => fileInputRef.current?.click()}
          onTakeScreenshot={onTakeScreenshot}
          webSearchEnabled={webSearchEnabled}
          onToggleWebSearch={setWebSearchEnabled}
          selectedStyle={selectedStyle}
          onSelectStyle={setSelectedStyle}
          projects={projects}
          skills={skills}
          connectors={connectors}
          plugins={plugins}
          onOpenCustomize={onOpenCustomize}
          onAddInstruction={(text) => {
             // Append text to the input value
             const newValue = value ? `${value}\n\n${text}` : text;
             onChange(newValue);
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <div className="inp-spacer" />

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <ModelSelector value={model} onChange={onModelChange} />

          <button className="inp-ic" onClick={toggleMic} style={{ color: isListening ? '#f87171' : 'rgb(219, 219, 217)' }} title="Type with voice">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          </button>

          {isStreaming ? (
            <button className="send-btn" onClick={onStop} style={{ marginLeft: '4px' }}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
              </svg>
            </button>
          ) : !hasContent ? (
            <button className="inp-ic" onClick={onReadLast} title="Read last message aloud" style={{ color: 'rgb(219, 219, 217)' }}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" style={{width: 20, height: 20}}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12M8 9v6M16 9v6M4 11v2M20 11v2" />
              </svg>
            </button>
          ) : (
            <button className="send-btn" onClick={send} style={{
              transition: 'all 0.2s', background: '#d97757', color: '#ffffff',
              borderRadius: '10px', width: '32px', height: '32px',
              border: 'none', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', marginLeft: '4px',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5M5 12l7-7 7 7"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
