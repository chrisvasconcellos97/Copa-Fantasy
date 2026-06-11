import React, { useEffect } from 'react';

export default function PokeToast({ message, visible, onDismiss }) {
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [visible, onDismiss]);

  return (
    <div className={`poke-toast${visible ? ' visible' : ''}`} onClick={onDismiss}>
      👋 {message || "It's your turn to pick!"}
    </div>
  );
}
