"use client";

import { useState, useCallback } from "react";
import { truncateAddress } from "../lib/mockData";

interface CopyDataProps {
  value: string;
  display?: string;
  truncate?: boolean;
  className?: string;
}

/**
 * Renders a piece of data (address, hash, score).
 * On click: briefly inverts colors and shows "COPIED" for 1200ms.
 */
export function CopyData({ value, display, truncate = true, className = "" }: CopyDataProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // clipboard not available
    }
  }, [value]);

  const shown = display ?? (truncate ? truncateAddress(value) : value);

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={handleCopy}
      onKeyDown={(e) => e.key === "Enter" && handleCopy()}
      title={`Click to copy: ${value}`}
      className={`cursor-pointer select-none font-mono text-[13px] transition-all duration-[120ms] ${className}`}
      style={{
        color: copied ? "var(--bg-base)" : "var(--text-primary)",
        backgroundColor: copied ? "var(--accent)" : "transparent",
        padding: copied ? "0 4px" : "0",
      }}
    >
      {copied ? "COPIED" : shown}
    </span>
  );
}
