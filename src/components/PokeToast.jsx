import React, { useEffect, useState } from 'react';

export default function PokeToast({ message, onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) return;
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => { if (onDismiss) onDismiss(); }, 350);
    }, 6000);
    return () => clearTimeout(t);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      className={`poke-toast ${visible ? 'poke-toast--visible' : ''}`}
      onClick={() => {
        setVisible(false);
        setTimeout(() => { if (onDismiss) onDismiss(); }, 350);
      }}
    >
      👋 {message}
    </div>
  );
}
