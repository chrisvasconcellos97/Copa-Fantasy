import React, { useState } from 'react';

export default function CopyCode({ code }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="copy-code">
      <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Game Code</div>
      <div className="copy-code__value" onClick={handleCopy} title="Click to copy">
        {code}
      </div>
      <div className="copy-code__hint">
        {copied ? '✅ Copied!' : 'Tap to copy and share with friends'}
      </div>
    </div>
  );
}
