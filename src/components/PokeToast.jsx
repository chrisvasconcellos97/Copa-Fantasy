import React, { useEffect } from 'react';

export default function PokeToast({ message, onDismiss }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div className="poke-toast">
      <span className="poke-toast__icon">👋</span>
      <span className="poke-toast__msg">{message}</span>
      <button className="poke-toast__close" onClick={onDismiss}>×</button>
    </div>
  );
}
