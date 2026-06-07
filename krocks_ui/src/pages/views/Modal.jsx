import React, { useEffect } from 'react';

export function Modal({ open, onClose, title, children, width = 520, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: width,
          background: 'rgb(31, 31, 30)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '14px',
          maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--t1)' }}>{title}</div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', color: 'var(--t3)',
              fontSize: '20px', cursor: 'pointer', padding: '0 4px', lineHeight: 1,
            }}
            aria-label="Close"
          >×</button>
        </div>
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>{children}</div>
        {footer && (
          <div style={{
            padding: '14px 20px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', justifyContent: 'flex-end', gap: '8px',
          }}>{footer}</div>
        )}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Onayla', danger = false }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width={420}
      footer={
        <>
          <button
            onClick={onClose}
            style={{
              padding: '8px 14px', background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px', color: 'var(--t2)', fontSize: '13px', cursor: 'pointer',
            }}
          >İptal</button>
          <button
            onClick={() => { onConfirm?.(); onClose?.(); }}
            style={{
              padding: '8px 14px',
              background: danger ? '#b14545' : 'var(--accent, #cc785c)',
              border: 'none', borderRadius: '8px',
              color: '#fff', fontSize: '13px', cursor: 'pointer', fontWeight: 500,
            }}
          >{confirmLabel}</button>
        </>
      }
    >
      <p style={{ margin: 0, fontSize: '14px', color: 'var(--t2)', lineHeight: 1.5 }}>{message}</p>
    </Modal>
  );
}

export function InfoModal({ open, onClose, title, children }) {
  return <Modal open={open} onClose={onClose} title={title} width={520}>{children}</Modal>;
}
