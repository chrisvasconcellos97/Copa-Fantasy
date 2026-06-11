import React, { useState } from 'react';

export default function CopyCode({ code }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // fallback
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="copy-code" onClick={handleClick}>
      <div className="copy-code__code">{code}</div>
      <div className="copy-code__hint">
        {copied ? '✓ Copied to clipboard!' : 'Tap to copy game code'}
      </div>
    </div>
  );
}
