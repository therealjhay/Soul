import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RGP — Reputational Graph Protocol",
  description: "Soulbound reputation built on Monad",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
