import { useEffect } from 'react';

export default function PokeToast({ message, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss && onDismiss();
    }, 6000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div className="poke-toast" onClick={onDismiss} style={{ cursor: 'pointer' }}>
      <span style={{ fontSize: '1.3rem' }}>👉</span>
      <span>{message || "It's your turn to pick!"}</span>
      <span
        style={{ marginLeft: 'auto', fontSize: '0.75rem', opacity: 0.7 }}
        onClick={onDismiss}
      >
        ✕
      </span>
    </div>
  );
}
