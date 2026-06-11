import React, { useState } from 'react';

export default function CopyCode({ code }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        padding: '24px',
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Join Code
      </div>
      <div
        style={{
          fontSize: '3rem',
          fontWeight: 800,
          letterSpacing: '0.15em',
          color: 'var(--gold)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {code}
      </div>
      <button
        className="btn btn-secondary"
        onClick={handleCopy}
        style={{
          minWidth: 140,
          borderColor: copied ? 'var(--success)' : undefined,
          color: copied ? 'var(--success)' : undefined,
        }}
      >
        {copied ? '✓ Copied!' : '📋 Copy Code'}
      </button>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        Share this code with your friends to join the game
      </div>
    </div>
  );
}
