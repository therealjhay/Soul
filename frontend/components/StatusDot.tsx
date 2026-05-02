"use client";

interface StatusDotProps {
  status: "active" | "pending" | "revoked";
  className?: string;
}

/**
 * Sharp status indicator dot.
 * active  → acid green, single-frame pulse (2s loop)
 * pending → amber, static
 * revoked → red, static
 */
export function StatusDot({ status, className = "" }: StatusDotProps) {
  const colors: Record<typeof status, string> = {
    active: "#A8FF3E",
    pending: "#FFB800",
    revoked: "#FF3E3E",
  };

  return (
    <span
      className={`inline-block ${className}`}
      style={{
        width: 7,
        height: 7,
        backgroundColor: colors[status],
        flexShrink: 0,
        animation: status === "active" ? "pulse-dot 2s steps(1) infinite" : "none",
      }}
      aria-label={`Status: ${status}`}
    />
  );
}
