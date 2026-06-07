import React from 'react';
import { TextField, TextAreaField, SelectField, SliderField, ToggleField } from './FormFields';

const THEME_OPTIONS = [
  { value: 'dark',  label: '🌙 Koyu (Dark)' },
  { value: 'light', label: '☀️ Açık (Light)' },
];

const LANG_OPTIONS = [
  { value: 'tr-TR', label: 'Türkçe' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'de-DE', label: 'Deutsch' },
];

export default function GeneralTab({ settings, onChange, model, models, onModelChange }) {
  const update = (patch) => onChange({ ...settings, ...patch });

  return (
    <div>
      <SectionHeader title="Profile" />
      <TextField
        label="User Name"
        value={settings.userName}
        onChange={v => update({ userName: v })}
        placeholder="Lord"
        hint="Krock's seni bu isimle hitap eder."
      />
      <SelectField
        label="Arayüz dili"
        value={settings.language}
        onChange={v => update({ language: v })}
        options={LANG_OPTIONS}
        hint="Dil seçimi yanıt ve sistem mesajlarını etkiler."
      />
      <SelectField
        label="Tema"
        value={settings.theme}
        onChange={v => update({ theme: v })}
        options={THEME_OPTIONS}
        hint="Koyu veya açık tema. Anında uygulanır."
      />

      <SectionHeader title="Voice" />
      <ToggleField
        label="Sesli okuma"
        desc="Asistan yanıtlarını sesli oku (tts)."
        value={settings.voiceEnabled}
        onChange={v => update({ voiceEnabled: v })}
      />
      <SelectField
        label="Ses dili"
        value={settings.voiceLang}
        onChange={v => update({ voiceLang: v })}
        options={LANG_OPTIONS}
      />
      <SliderField
        label="Ses hızı"
        value={settings.voiceSpeed}
        onChange={v => update({ voiceSpeed: v })}
        min={0.5} max={2.0} step={0.1}
        format={v => `${v.toFixed(1)}x`}
        hint="1.0x normal hız."
      />

      <SectionHeader title="Model" />
      <SelectField
        label="Varsayılan model"
        value={settings.defaultModel || model}
        onChange={v => { update({ defaultModel: v }); onModelChange?.(v); }}
        options={models.map(m => ({ value: m, label: m }))}
        hint="Her yeni oturum için varsayılan model."
      />

      <SectionHeader title="Generation" />
      <SliderField
        label="Temperature"
        value={settings.temperature}
        onChange={v => update({ temperature: v })}
        min={0} max={2} step={0.05}
        format={v => v.toFixed(2)}
        hint="0 = deterministik, 2 = çok yaratıcı."
      />
      <SliderField
        label="Max Tokens"
        value={settings.maxTokens}
        onChange={v => update({ maxTokens: v })}
        min={256} max={8192} step={128}
        format={v => v.toLocaleString()}
        hint="Yanıt başına üst token sınırı."
      />
      <SliderField
        label="Feedback Depth"
        value={settings.feedbackDepth}
        onChange={v => update({ feedbackDepth: v })}
        min={1} max={5} step={1}
        format={v => `Seviye ${v}`}
        hint="Ajanın hata düzeltme derinliği (1=hafif, 5=agresif)."
      />

      <SectionHeader title="System Prompt Override" />
      <TextAreaField
        label="Özel sistem prompt'u (opsiyonel)"
        value={settings.systemPromptOverride}
        onChange={v => update({ systemPromptOverride: v })}
        placeholder="Boş bırakırsan varsayılan sistem prompt kullanılır."
        rows={6}
        hint="Bu prompt, mod bazlı prompt'un önüne eklenir."
      />
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <div style={{
      fontSize: '11px', color: 'var(--t3)', textTransform: 'uppercase',
      letterSpacing: '0.6px', marginTop: '32px', marginBottom: '12px',
      fontWeight: 500,
    }}>{title}</div>
  );
}
