import React from 'react';

const MODEL_META = {
  '@preset/deepseekv4-flash':   { provider: 'preset',   context: '128K',  cost: 'low'  },
  '@preset/minimax-m3':         { provider: 'preset',   context: '128K',  cost: 'low'  },
  '@preset/minimax-m1':         { provider: 'preset',   context: '128K',  cost: 'low'  },
  'claude-3-5-sonnet-20241022': { provider: 'anthropic',context: '200K',  cost: 'med'  },
  'gpt-4o':                     { provider: 'openai',   context: '128K',  cost: 'med'  },
  'gpt-4o-mini':                { provider: 'openai',   context: '128K',  cost: 'low'  },
};

const PROVIDER_LABELS = { preset: 'Krock\'s', anthropic: 'Anthropic', openai: 'OpenAI' };
const COST_COLORS = { low: '#4ade80', med: '#facc15', high: '#f87171' };

export default function ModelsTab({ model, models, onChange }) {
  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 500, color: 'var(--t1)', margin: '0 0 4px' }}>Models</h2>
      <p style={{ fontSize: '13.5px', color: 'var(--t3)', margin: '0 0 24px' }}>Select the active model. All new sessions will use this model.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {models.map(m => {
          const meta = MODEL_META[m] || { provider: 'unknown', context: '?', cost: 'med' };
          const isActive = m === model;
          return (
            <div
              key={m}
              onClick={() => onChange?.(m)}
              style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                padding: '14px 18px',
                background: isActive ? 'rgba(204,120,92,0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isActive ? 'rgba(204,120,92,0.4)' : 'var(--b1)'}`,
                borderRadius: '12px', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                width: '18px', height: '18px', borderRadius: '50%',
                border: `2px solid ${isActive ? 'var(--accent, #cc785c)' : 'rgba(255,255,255,0.2)'}`,
                background: isActive ? 'var(--accent, #cc785c)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {isActive && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <code style={{ fontSize: '14px', color: 'var(--t1)', fontFamily: 'ui-monospace, monospace' }}>{m}</code>
                <div style={{ fontSize: '11.5px', color: 'var(--t3)', marginTop: '2px' }}>
                  {PROVIDER_LABELS[meta.provider] || meta.provider} · {meta.context} context
                </div>
              </div>
              <span style={{
                fontSize: '11px', padding: '3px 8px', borderRadius: '4px',
                background: `${COST_COLORS[meta.cost]}22`, color: COST_COLORS[meta.cost],
                fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.4px',
              }}>{meta.cost}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
