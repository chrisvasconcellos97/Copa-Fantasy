import React, { useEffect } from 'react';

export default function PokeToast({ message, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onDismiss) onDismiss();
    }, 6000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <div className="poke-toast">
      <span style={{ fontSize: '1.4rem' }}>👋</span>
      <span style={{ flex: 1 }}>{message || "It's your turn to pick!"}</span>
      <button
        onClick={onDismiss}
        style={{
          background: 'rgba(0,0,0,0.2)',
          border: 'none',
          borderRadius: '50%',
          width: 28,
          height: 28,
          cursor: 'pointer',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#0a0a0f',
          fontWeight: 700,
        }}
      >
        ✕
      </button>
    </div>
  );
}
