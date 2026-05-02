"use client";

/**
 * ReputationDashboard — legacy component stub.
 * The full dashboard is now at /app/dashboard/page.tsx.
 * This file is kept to avoid breaking the layout.test.ts import.
 */
export function ReputationDashboard({ identityId }: { identityId: number }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        color: "var(--text-muted)",
        padding: "24px 0",
        letterSpacing: "0.1em",
      }}
    >
      IDENTITY #{identityId} — VIEW FULL DASHBOARD AT /DASHBOARD
    </div>
  );
}
