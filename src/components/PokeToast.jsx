import { useEffect } from 'react'

export default function PokeToast({ message, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div className="poke-toast" onClick={onDismiss}>
      <span className="toast-icon">🔔</span>
      <span className="toast-message">{message}</span>
      <button className="toast-close">×</button>
    </div>
  )
}
