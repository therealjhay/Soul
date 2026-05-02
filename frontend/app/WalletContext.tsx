"use client";

import { createContext, useContext, ReactNode } from "react";
import { createAppKit } from '@reown/appkit/react';
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { solana, solanaTestnet, solanaDevnet } from '@reown/appkit/networks';
import { useAppKit, useAppKitAccount, useDisconnect } from '@reown/appkit/react';

// Setup Solana Adapter
const solanaAdapter = new SolanaAdapter({
  wallets: [new PhantomWalletAdapter(), new SolflareWalletAdapter()]
});

// AppKit project ID
const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || "3102134499196a5e11d06c9dc445398f";

// Set up metadata
const metadata = {
  name: "SRGP",
  description: "SRGP AppKit Integration",
  url: "https://localhost:3000", // origin must match your domain & subdomain
  icons: ["https://avatars.githubusercontent.com/u/179229932"]
};

// Create AppKit instance
createAppKit({
  adapters: [solanaAdapter],
  networks: [solana, solanaTestnet, solanaDevnet],
  projectId,
  metadata,
  features: {
    analytics: true
  }
});

interface WalletContextType {
  address: string | null;
  walletLabel: string | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  walletLabel: null,
  isConnecting: false,
  isConnected: false,
  error: null,
  connect: async () => {},
  disconnect: () => {},
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { disconnect } = useDisconnect();

  const connect = async () => {
    try {
      await open();
    } catch (err) {
      console.error("Failed to open AppKit", err);
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  return (
    <WalletContext.Provider
      value={{
        address: address || null,
        walletLabel: isConnected ? "Reown Wallet" : null,
        isConnecting: false,
        isConnected,
        error: null,
        connect,
        disconnect: handleDisconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export const useWalletCtx = () => useContext(WalletContext);
