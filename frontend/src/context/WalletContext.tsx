import { createContext, useContext, useMemo, useState, ReactNode } from 'react'
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Custom Headless Modal Context ────────────────────────────────────────
interface CustomWalletModalContextState {
  visible: boolean
  setVisible: (open: boolean) => void
}

const CustomWalletModalContext = createContext<CustomWalletModalContextState>({} as any)

export function useCustomWalletModal() {
  return useContext(CustomWalletModalContext)
}

function WalletConnectModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { wallets, select, connect } = useWallet()

  const handleConnect = async (walletName: any) => {
    try {
      select(walletName)
      await connect()
    } catch (e) {
      console.error("Connection failed", e)
    } finally {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            backgroundColor: 'rgba(10,10,10,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24, backdropFilter: 'none' // Strict: no backdrop-blur
          }}
        >
          <motion.div
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            exit={{ scaleY: 0 }}
            transition={{ duration: 0.2, ease: "linear" }}
            style={{
              backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
              width: '100%', maxWidth: 480, padding: 40, position: 'relative'
            }}
          >
            <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              [CLOSE]
            </button>
            <div className="label" style={{ marginBottom: 32 }}>CONNECT_WALLET</div>
            <h2 style={{ fontSize: 48, marginBottom: 32, lineHeight: 1 }}>SELECT NODE</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {wallets.map((wallet) => (
                <button
                  key={wallet.adapter.name}
                  className="btn"
                  onClick={() => handleConnect(wallet.adapter.name)}
                  style={{ width: '100%', justifyContent: 'space-between', padding: '24px 32px' }}
                >
                  <span style={{ fontSize: 24 }}>{wallet.adapter.name}</span>
                  <span className="label" style={{ color: 'var(--accent)' }}>{wallet.readyState === 'Installed' ? 'DETECTED' : ''}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Provider Context ─────────────────────────────────────────────────────

export function WalletCtxProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false)
  const endpoint = useMemo(() => clusterApiUrl('mainnet-beta'), [])
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <CustomWalletModalContext.Provider value={{ visible, setVisible }}>
          {children}
          <WalletConnectModal visible={visible} onClose={() => setVisible(false)} />
        </CustomWalletModalContext.Provider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

// ─── Helper Hooks ─────────────────────────────────────────────────────────

export function useWalletCtx() {
  const { publicKey, connected, disconnect } = useWallet()
  const { setVisible } = useCustomWalletModal()

  return {
    isConnected: connected,
    address: publicKey ? publicKey.toBase58() : null,
    connect: () => setVisible(true),
    disconnect: () => disconnect()
  }
}
