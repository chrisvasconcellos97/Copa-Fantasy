import React, { useEffect } from 'react'

export default function PokeToast({ message, onDismiss }) {
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => {
      onDismiss && onDismiss()
    }, 6000)
    return () => clearTimeout(timer)
  }, [message, onDismiss])

  if (!message) return null

  return (
    <div className="poke-toast">
      <span style={{ fontSize: '1.25rem' }}>👋</span>
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--muted)',
          cursor: 'pointer',
          fontSize: '1rem',
          padding: '0 0.25rem',
        }}
      >
        ✕
      </button>
    </div>
  )
}
