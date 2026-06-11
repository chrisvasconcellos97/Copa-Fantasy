import React, { useState } from 'react';

/**
 * CopyCode – shows a large join code and a click-to-copy button.
 *
 * Props:
 *   code  string
 */
export default function CopyCode({ code }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Fallback for older browsers
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
      <p className="copy-code__label">Join Code</p>
      <div className="copy-code__box">
        <span className="copy-code__text">{code}</span>
        <button
          className={`btn copy-code__btn${copied ? ' copy-code__btn--copied' : ''}`}
          onClick={handleCopy}
          aria-label="Copy join code"
        >
          {copied ? '✓ Copied!' : '📋 Copy'}
        </button>
      </div>
      <p className="copy-code__hint">Share this code with friends to let them join your game.</p>

      <style>{`
        .copy-code {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }
        .copy-code__label {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-muted);
        }
        .copy-code__box {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: var(--dark-bg);
          border: 2px solid var(--gold);
          border-radius: var(--radius);
          padding: 0.75rem 1.5rem;
        }
        .copy-code__text {
          font-size: 2.5rem;
          font-weight: 900;
          letter-spacing: 0.18em;
          color: var(--gold);
          font-family: 'Courier New', monospace;
        }
        .copy-code__btn {
          padding: 0.5rem 1rem;
          background: rgba(255,215,0,0.1);
          border: 1px solid var(--gold);
          color: var(--gold);
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.18s ease;
          white-space: nowrap;
        }
        .copy-code__btn:hover {
          background: rgba(255,215,0,0.2);
        }
        .copy-code__btn--copied {
          background: rgba(34,197,94,0.1);
          border-color: var(--success);
          color: var(--success);
        }
        .copy-code__hint {
          font-size: 0.78rem;
          color: var(--text-muted);
          text-align: center;
        }
      `}</style>
    </div>
  );
}
