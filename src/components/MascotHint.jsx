import React, { useState, useEffect } from 'react';
import Mascot from './Mascot';

export default function MascotHint({ message, pose = 'idle', size = 72, style = {} }) {
  const [visible, setVisible] = useState(false);

  // Fade in on mount / message change
  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, [message]);

  if (!message) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 10,
        marginBottom: 20,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(6px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        ...style,
      }}
    >
      {/* Mascot */}
      <div style={{ flexShrink: 0 }}>
        <Mascot pose={pose} size={size} />
      </div>

      {/* Speech bubble */}
      <div style={{ position: 'relative', maxWidth: 280 }}>
        {/* Tail */}
        <div style={{
          position: 'absolute',
          bottom: 10,
          left: -8,
          width: 0,
          height: 0,
          borderTop: '7px solid transparent',
          borderBottom: '7px solid transparent',
          borderRight: '9px solid var(--border)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: 10,
          left: -6,
          width: 0,
          height: 0,
          borderTop: '7px solid transparent',
          borderBottom: '7px solid transparent',
          borderRight: '9px solid var(--card-bg)',
        }} />

        {/* Bubble */}
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          borderBottomLeftRadius: 4,
          padding: '10px 14px',
          fontSize: '0.85rem',
          lineHeight: 1.5,
          color: 'var(--text)',
        }}>
          {message}
        </div>
      </div>
    </div>
  );
}
