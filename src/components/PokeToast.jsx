import React, { useEffect } from 'react';

export default function PokeToast({ message, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss && onDismiss();
    }, 6000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <div style={{
      position: 'fixed',
      top: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--gold)',
      color: '#000',
      padding: '12px 24px',
      borderRadius: 'var(--radius)',
      fontWeight: 700,
      fontSize: 15,
      zIndex: 300,
      animation: 'slideDown 0.25s ease, goldPulse 1.6s infinite',
      boxShadow: '0 4px 20px rgba(255,215,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      maxWidth: '90vw',
      cursor: 'pointer',
    }}
      onClick={onDismiss}
    >
      <span>👈</span>
      <span>{message || "It's your turn to pick!"}</span>
      <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.7 }}>✕</span>
    </div>
  );
}
