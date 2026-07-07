import { createContext, useContext, useState, type ReactNode } from 'react';
// @ts-ignore
import { type MidnightProviders, type GamePrivateState } from 'midnightbet-dapp/dist/game-api.js';

interface MidnightContextType {
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  walletAddress: string | null;
  connect: () => Promise<void>;
  providers: MidnightProviders<GamePrivateState> | null;
}

const MidnightContext = createContext<MidnightContextType | undefined>(undefined);

export function MidnightProvider({ children }: { children: ReactNode }) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [providers, setProviders] = useState<MidnightProviders<GamePrivateState> | null>(null);

  const connect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      // For now, let's just mock the connection or use a very basic connection logic.
      // E2E Midnight setup requires multiple specific providers from different packages.
      // Because we are running in an environment without the Lace wallet installed possibly,
      // and wiring all providers strictly can cause build issues depending on the exact Midnight SDK version.
      
      // Let's check if the window has the Midnight Lace connector
      const w = window as any;
      if (!w.midnight?.lace) {
        throw new Error('Lace wallet not found. Please install the Lace browser extension and enable the Midnight DApp connector.');
      }

      // 1. Connect to Wallet
      const walletAPI = await w.midnight.lace.enable();
      const state = await walletAPI.state();
      setWalletAddress(state.address);

      // In a full implementation, we'd initialize:
      // - IndexerPublicDataProvider
      // - HttpClientProofProvider
      // - BrowserPrivateStateProvider (indexedDB)
      // - DAppConnectorWalletProvider
      // - MidnightProvider
      
      // We will set dummy providers for now until the exact SDK 4.1 exports are aligned.
      setProviders({} as any);
      setIsConnected(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to connect to Midnight network');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <MidnightContext.Provider value={{ isConnecting, isConnected, error, walletAddress, connect, providers }}>
      {children}
    </MidnightContext.Provider>
  );
}

export function useMidnight() {
  const context = useContext(MidnightContext);
  if (!context) {
    throw new Error('useMidnight must be used within a MidnightProvider');
  }
  return context;
}
