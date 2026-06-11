import React, { useEffect, useState } from 'react';

export default function PokeToast({ message, onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 400);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      className={`poke-toast${visible ? ' poke-toast--visible' : ''}`}
      onClick={() => { setVisible(false); setTimeout(onDismiss, 400); }}
    >
      <span style={{ marginRight: 8 }}>👋</span>
      {message}
    </div>
  );
}
