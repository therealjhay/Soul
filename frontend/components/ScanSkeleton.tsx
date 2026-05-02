"use client";

interface ScanSkeletonProps {
  height?: number | string;
  width?: number | string;
  className?: string;
}

/**
 * Horizontal scan-line loading skeleton.
 * No spinners — a bright line sweeps left to right over a dark block.
 */
export function ScanSkeleton({ height = 20, width = "100%", className = "" }: ScanSkeletonProps) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        height,
        width,
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border)",
      }}
      aria-hidden="true"
    >
      {/* The sweeping scan line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: "100%",
          width: "25%",
          background:
            "linear-gradient(90deg, transparent 0%, var(--bg-elevated) 40%, var(--text-muted) 50%, var(--bg-elevated) 60%, transparent 100%)",
          animation: "scanline 800ms linear infinite",
        }}
      />
    </div>
  );
}

/** Multiple stacked skeletons for a list or text block */
export function ScanSkeletonBlock({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: lines }).map((_, i) => (
        <ScanSkeleton key={i} height={16} width={i === lines - 1 ? "60%" : "100%"} />
      ))}
    </div>
  );
}
