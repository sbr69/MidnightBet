import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  applyNetworkId,
  buildBrowserProviders,
  connectMidnightWallet,
  connectToGame,
  decodeInviteLink,
  getAvailableWallets,
  loadOrCreateSecretKey,
  NETWORK_CONFIG,
  privateStateFor,
  type DeployedGame,
  type GamePrivateState,
  type GameProviders,
  type GameState,
  type WalletInfo,
} from 'midnightbet-dapp';

interface MidnightContextType {
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  walletAddress: string | null;
  walletName: string | null;
  availableWallets: WalletInfo[];
  networkId: string;
  providers: GameProviders | null;
  privateState: GamePrivateState;
  contractAddress: string | null;
  deployed: DeployedGame | null;
  gameState: GameState | null;
  connect: (walletId?: string) => Promise<void>;
  attachGame: (address: string) => Promise<DeployedGame>;
  setContractAddress: (address: string | null) => void;
  setDeployed: (d: DeployedGame | null) => void;
  setGameState: (s: GameState | null) => void;
  clearError: () => void;
}

const MidnightContext = createContext<MidnightContextType | undefined>(undefined);

export function MidnightProvider({ children }: { children: ReactNode }) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [availableWallets, setAvailableWallets] = useState<WalletInfo[]>([]);
  const [activeNetwork, setActiveNetwork] = useState<string>(String(NETWORK_CONFIG.networkId));
  const [providers, setProviders] = useState<GameProviders | null>(null);
  const [contractAddress, setContractAddress] = useState<string | null>(() => decodeInviteLink());
  const [deployed, setDeployed] = useState<DeployedGame | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const privateState = useMemo(() => privateStateFor(contractAddress ?? undefined), [contractAddress]);

  // Scan for available wallets on load and window focus
  useEffect(() => {
    const scan = () => {
      const found = getAvailableWallets();
      setAvailableWallets(found);
    };
    scan();
    const interval = setInterval(scan, 1000);
    window.addEventListener('focus', scan);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', scan);
    };
  }, []);

  const connect = useCallback(async (walletId?: string) => {
    setIsConnecting(true);
    setError(null);
    try {
      applyNetworkId(String(NETWORK_CONFIG.networkId));
      loadOrCreateSecretKey();
      const { api, address, networkId, walletName: connectedWalletName } = await connectMidnightWallet(
        walletId,
        String(NETWORK_CONFIG.networkId),
      );
      applyNetworkId(networkId);
      setActiveNetwork(networkId);
      setWalletName(connectedWalletName);
      const nextProviders = await buildBrowserProviders(api, address);
      setProviders(nextProviders);
      setWalletAddress(address);
      setIsConnected(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to connect to Midnight';
      setError(message);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const attachGame = useCallback(
    async (address: string) => {
      if (!providers) {
        throw new Error('Connect your Midnight wallet (1AM or Lace) first');
      }
      setContractAddress(address);
      const found = await connectToGame(providers, address, privateStateFor(address));
      setDeployed(found);
      return found;
    },
    [providers],
  );

  return (
    <MidnightContext.Provider
      value={{
        isConnecting,
        isConnected,
        error,
        walletAddress,
        walletName,
        availableWallets,
        networkId: activeNetwork,
        providers,
        privateState,
        contractAddress,
        deployed,
        gameState,
        connect,
        attachGame,
        setContractAddress,
        setDeployed,
        setGameState,
        clearError: () => setError(null),
      }}
    >
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

export function formatError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/wallet not found|lace|1am/i.test(message)) {
    return 'No Midnight wallet detected. Please install 1AM Wallet (1am.xyz) or Lace (lace.io).';
  }
  if (/dust|fee|balance/i.test(message)) {
    return 'Insufficient DUST or tNIGHT on Midnight Preview. Request testnet tokens from the faucet.';
  }
  if (/Compact output missing|compile/i.test(message)) {
    return 'Contract not compiled. Compact compilation artifacts are required.';
  }
  if (/fetch failed|proof-server|6300|connection refused|Failed to fetch/i.test(message)) {
    return 'Could not reach ZK proof server (port 6300). Lace requires a local Docker proof server, or use 1AM Wallet which includes automatic remote ZK proving.';
  }
  return message;
}
