import { useState } from 'react';

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
      <div className="label">Game Code</div>
      <div className="copy-code__value">{code}</div>
      <button className="btn btn-secondary" onClick={handleCopy}>
        {copied ? '✓ Copied!' : '📋 Copy Code'}
      </button>
    </div>
  );
}
