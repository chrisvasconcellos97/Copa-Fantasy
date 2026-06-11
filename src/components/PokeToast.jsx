import React, { useEffect } from 'react';

/**
 * PokeToast – fixed top gold pulsing toast, auto-dismisses after 6s.
 *
 * Props:
 *   message   string
 *   onDismiss function
 */
export default function PokeToast({ message, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="poke-toast animate-slide-down-in">
      <span className="poke-toast__icon">👋</span>
      <span className="poke-toast__msg">{message || "It's your turn to pick!"}</span>
      <button className="poke-toast__close" onClick={onDismiss} aria-label="Dismiss">✕</button>

      <style>{`
        .poke-toast {
          position: fixed;
          top: 1rem;
          left: 50%;
          transform: translateX(-50%);
          z-index: 500;
          background: var(--card-bg);
          border: 2px solid var(--gold);
          border-radius: var(--radius);
          padding: 0.75rem 1.25rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          box-shadow: 0 0 32px rgba(255,215,0,0.35);
          animation: pulse-gold 2s ease-in-out infinite, slide-down-in 0.3s ease;
          min-width: 260px;
          max-width: 90vw;
        }
        .poke-toast__icon { font-size: 1.3rem; flex-shrink: 0; }
        .poke-toast__msg {
          flex: 1;
          font-weight: 600;
          font-size: 0.9rem;
          color: var(--gold);
        }
        .poke-toast__close {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 0.85rem;
          padding: 0.1rem 0.25rem;
          line-height: 1;
          flex-shrink: 0;
        }
        .poke-toast__close:hover { color: var(--text); }
        @keyframes slide-down-in {
          from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
