import React, { useEffect } from 'react';

export default function PokeToast({ message, onDismiss }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      if (onDismiss) onDismiss();
    }, 6000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div className="poke-toast">
      <span>👋</span>
      <span>{message}</span>
      <button
        onClick={onDismiss}
        style={{
          background: 'rgba(0,0,0,0.2)',
          border: 'none',
          borderRadius: '50%',
          width: 24,
          height: 24,
          cursor: 'pointer',
          color: '#000',
          fontWeight: 700,
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}
