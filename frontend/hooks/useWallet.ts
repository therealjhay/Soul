"use client";

import { useState, useEffect, useCallback } from "react";

export interface WalletState {
  address: string | null;
  walletLabel: string | null;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

interface SolanaProvider {
  isPhantom?: boolean;
  publicKey?: { toString: () => string };
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener: (event: string, listener: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    solana?: SolanaProvider;
  }
}

export function useWallet(): WalletState {
  const [address, setAddress] = useState<string | null>(null);
  const [walletLabel, setWalletLabel] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    if (!window.solana) {
      setError("No Solana wallet detected. Please install Phantom.");
      return;
    }
    setIsConnecting(true);
    setError(null);
    try {
      await window.solana.connect();
      const wallet = window.solana.publicKey?.toString() ?? null;
      setAddress(wallet);
      setWalletLabel(window.solana.isPhantom ? "Phantom" : "Solana Wallet");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (window.solana) {
      void window.solana.disconnect();
    }
    setAddress(null);
    setWalletLabel(null);
  }, []);

  useEffect(() => {
    if (!window.solana) return;

    const handleConnect = () => {
      const wallet = window.solana?.publicKey?.toString() ?? null;
      setAddress(wallet);
    };

    const handleDisconnect = () => {
      setAddress(null);
      setWalletLabel(null);
    };

    window.solana.on("connect", handleConnect);
    window.solana.on("disconnect", handleDisconnect);

    return () => {
      window.solana?.removeListener("connect", handleConnect);
      window.solana?.removeListener("disconnect", handleDisconnect);
    };
  }, []);

  return { address, walletLabel, isConnecting, error, connect, disconnect };
}
