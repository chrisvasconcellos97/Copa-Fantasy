import { useEffect } from 'react';

export default function PokeToast({ message, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss && onDismiss();
    }, 6000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <div className="poke-toast">
      <span className="poke-toast__icon">👋</span>
      <span className="poke-toast__msg">{message || "It's your turn to pick!"}</span>
      <button className="btn btn-ghost btn-sm" onClick={onDismiss}>✕</button>
    </div>
  );
}
