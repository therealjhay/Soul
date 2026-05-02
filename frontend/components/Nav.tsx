"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWalletCtx } from "../app/WalletContext";

const NAV_LINKS = [
  { href: "/dashboard", label: "OVERVIEW" },
  { href: "/passport", label: "PASSPORT" },
  { href: "/issuers", label: "ISSUERS" },
  { href: "/recovery", label: "RECOVERY" },
];

export function Nav() {
  const pathname = usePathname();
  const { isConnected } = useWalletCtx();
  const [isFlashing, setIsFlashing] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const isLanding = pathname === "/";

  return (
    <nav
      id="main-nav"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        borderBottom: "1px solid var(--border)",
        backgroundColor: isFlashing ? "var(--text-primary)" : "var(--bg-base)",
        transition: "background-color 80ms",
        animation: "wipe-left 240ms var(--ease-in) both",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          height: 56,
          borderBottom: "none",
        }}
      >
        {/* Wordmark */}
        <Link
          href="/"
          id="nav-wordmark"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 28,
            color: isFlashing ? "var(--bg-base)" : "var(--text-primary)",
            textDecoration: "none",
            letterSpacing: "0.08em",
            lineHeight: 1,
          }}
        >
          SOUL
        </Link>

        {/* Nav Links — hidden on landing */}
        {!isLanding && (
          <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
            {NAV_LINKS.map(({ href, label }) => {
              const active = pathname?.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  id={`nav-${label.toLowerCase()}`}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: active ? "var(--accent)" : "var(--text-secondary)",
                    textDecoration: "none",
                    transition: "color 120ms",
                    borderBottom: active ? "1px solid var(--accent)" : "1px solid transparent",
                    paddingBottom: 2,
                  }}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        )}

        {/* Wallet State */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* @ts-ignore */}
          <appkit-button />
        </div>
      </div>

      <style jsx>{`
        @keyframes blink {
          50% { opacity: 0; }
        }
      `}</style>
    </nav>
  );
}
