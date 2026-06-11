import React, { useEffect } from 'react';

export default function PokeToast({ message, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="poke-toast">
      <span>👋</span>
      <span>{message || "It's your turn to pick!"}</span>
      <button className="poke-toast__dismiss" onClick={onDismiss}>✕</button>
    </div>
  );
}
