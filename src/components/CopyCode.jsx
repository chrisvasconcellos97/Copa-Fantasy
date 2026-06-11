import { useState } from 'react'

export default function CopyCode({ code }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <div className="copy-code" onClick={copy}>
      <div className="code-label">Game Code</div>
      <div className="code-display">{code}</div>
      <div className="code-hint">{copied ? '✓ Copied!' : 'Tap to copy'}</div>
    </div>
  )
}
