import { useState } from 'react';

export default function CopyCode({ code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
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
  };

  return (
    <div className="copy-code">
      <div className="label text-center">Game Join Code</div>
      <div className="copy-code__code" onClick={handleCopy} title="Click to copy">
        {code}
      </div>
      {copied ? (
        <span className="copy-code__copied">✓ Copied to clipboard!</span>
      ) : (
        <span className="copy-code__hint">Click code to copy · Share with friends</span>
      )}
    </div>
  );
}
