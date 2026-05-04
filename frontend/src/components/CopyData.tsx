import { useState, useCallback } from 'react'
import { truncateAddress } from '../lib/mockData'

interface CopyDataProps {
  value: string
  display?: string
  truncate?: boolean
  className?: string
}

export function CopyData({ value, display, truncate = true, className = '' }: CopyDataProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      // clipboard not available
    }
  }, [value])

  const shown = display ?? (truncate ? truncateAddress(value) : value)

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={handleCopy}
      onKeyDown={(e) => e.key === 'Enter' && handleCopy()}
      title={`Click to copy: ${value}`}
      className={`font-mono text-data transition-all duration-[120ms] ${className}`}
      style={{
        cursor: 'pointer',
        userSelect: 'none',
        color: copied ? 'var(--bg-base)' : 'var(--text-primary)',
        backgroundColor: copied ? 'var(--accent)' : 'transparent',
        padding: copied ? '2px 6px' : '2px 0',
        borderRadius: '2px',
        fontWeight: copied ? 500 : 400,
      }}
    >
      {copied ? 'COPIED' : shown}
    </span>
  )
}
