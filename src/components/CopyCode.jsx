import React, { useState } from 'react';

export default function CopyCode({ code }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // fallback for non-secure contexts
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
    <div className="copy-code" onClick={copy}>
      <div className="code-label">Game Code</div>
      <div className="code-display">{code}</div>
      <div className="code-hint">{copied ? '✓ Copied!' : 'Tap to copy'}</div>
    </div>
  );
}
