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
    <div className="copy-code-box">
      <div className="copy-code-text" onClick={handleCopy} title="Click to copy">
        {code}
      </div>
      <button className="btn btn-outline btn-sm" onClick={handleCopy}>
        {copied ? '✓ Copied!' : '📋 Copy Code'}
      </button>
      <p className="text-xs text-muted">Share this code with your friends to join</p>
    </div>
  );
}
