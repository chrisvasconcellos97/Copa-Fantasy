import React, { useState } from 'react';

export default function CopyCode({ code }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback
      const el = document.createElement('textarea');
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="copy-code">
      <div className="text-xs text-muted" style={{ letterSpacing: 1, textTransform: 'uppercase' }}>Game Code</div>
      <div className="copy-code__value" onClick={handleCopy} title="Click to copy">
        {code || '——'}
      </div>
      <div className="copy-code__hint">
        {copied ? '✓ Copied to clipboard!' : 'Tap to copy and share with friends'}
      </div>
    </div>
  );
}
