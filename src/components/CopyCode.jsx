import React, { useState } from 'react';

export default function CopyCode({ code }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text
    }
  }

  return (
    <div className="copy-code">
      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Game Code
      </div>
      <div className="copy-code__value">{code}</div>
      <button className="btn btn-secondary" onClick={handleCopy}>
        {copied ? '✓ Copied!' : '📋 Copy Code'}
      </button>
      <div className="copy-code__feedback">{copied ? 'Copied to clipboard!' : ''}</div>
    </div>
  );
}
