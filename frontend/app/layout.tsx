import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const displayFont = Sora({ subsets: ["latin"], variable: "--font-display" });
const bodyFont = Manrope({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "SOUL — Reputation Passport Protocol",
  description: "Portable on-chain reputation passports for Solana wallets",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`min-h-screen antialiased ${displayFont.variable} ${bodyFont.variable}`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
