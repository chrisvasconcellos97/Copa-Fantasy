import React, { useState } from 'react';

export default function CopyCode({ code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
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
  };

  return (
    <div style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
        Join Code
      </div>
      <div style={{
        fontSize: 40,
        fontWeight: 900,
        letterSpacing: '0.2em',
        color: 'var(--gold)',
        fontFamily: 'monospace',
      }}>
        {code}
      </div>
      <button
        className="btn btn-outline"
        onClick={handleCopy}
        style={{ minWidth: 130, color: copied ? 'var(--success)' : undefined, borderColor: copied ? 'var(--success)' : undefined }}
      >
        {copied ? '✓ Copied!' : '📋 Copy Code'}
      </button>
    </div>
  );
}
