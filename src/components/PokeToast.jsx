import React, { useEffect } from 'react';

export default function PokeToast({ message, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onDismiss) onDismiss();
    }, 6000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: 'var(--card-bg)',
        border: '1.5px solid var(--gold)',
        borderRadius: 'var(--radius)',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 0 30px rgba(255,215,0,0.3), 0 8px 32px rgba(0,0,0,0.5)',
        animation: 'slideDown 0.3s ease, goldPulse 2s ease-in-out infinite',
        maxWidth: '90vw',
        cursor: 'pointer',
      }}
      onClick={onDismiss}
    >
      <span style={{ fontSize: '1.5rem' }}>👋</span>
      <div>
        <div style={{ fontWeight: 700, color: 'var(--gold)', fontSize: '0.95rem' }}>
          It&apos;s your turn!
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 2 }}>
          {message || "It's your turn to pick!"}
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          fontSize: '1.1rem',
          padding: 0,
          marginLeft: 8,
        }}
      >
        ×
      </button>
    </div>
  );
}
