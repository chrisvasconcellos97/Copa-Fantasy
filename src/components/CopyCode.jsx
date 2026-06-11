import { useState } from 'react';

export default function CopyCode({ code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
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
    <div className="copy-code-wrap" onClick={handleCopy} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && handleCopy()}>
      <div className="copy-code-label text-muted text-sm mb-1">Join Code</div>
      <div className="copy-code-value text-gold font-bold" style={{ fontSize: '2.5rem', letterSpacing: '0.15em' }}>
        {code}
      </div>
      <div className={`copy-code-hint text-sm ${copied ? 'text-gold' : 'text-muted'}`}>
        {copied ? '✓ Copied!' : 'Click to copy'}
      </div>
    </div>
  );
}
