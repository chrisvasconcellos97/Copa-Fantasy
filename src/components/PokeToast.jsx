import { useEffect } from 'react';

export default function PokeToast({ message, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="poke-toast" onClick={onDismiss}>
      <span className="text-xl">👆</span>
      <span className="font-bold">{message || 'You have been poked!'}</span>
      <span className="text-muted text-sm" style={{ marginLeft: '8px' }}>Click to dismiss</span>
    </div>
  );
}
