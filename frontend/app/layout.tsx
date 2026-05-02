import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "SOUL — Soulbound Reputation Protocol",
  description:
    "A living identity layer. Reputation earned on-chain, bound to your wallet, permanent. SOUL aggregates soulbound credentials across the Solana ecosystem into a single cryptographic passport.",
  keywords: ["Solana", "soulbound", "reputation", "NFT", "passport", "DeFi", "Web3"],
  openGraph: {
    title: "SOUL — Soulbound Reputation Protocol",
    description: "On-chain reputation. Permanent identity.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400&family=IBM+Plex+Mono:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
