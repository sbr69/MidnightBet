import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  applyNetworkId,
  buildBrowserProviders,
  connectMidnightWallet,
  connectToHub,
  decodeInviteLink,
  deployHub,
  getAvailableWallets,
  loadOrCreateSecretKey,
  NETWORK_CONFIG,
  privateStateFor,
  type DeployedHub,
  type GameProviders,
  type GameState,
  type WalletInfo,
} from 'midnightbet-dapp';
import { MidnightContext } from './midnight-context';

const CENTRAL_CONTRACT_KEY = 'midnightbet:centralContract';

export function MidnightProvider({ children }: { children: ReactNode }) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [availableWallets, setAvailableWallets] = useState<WalletInfo[]>([]);
  const [activeNetwork, setActiveNetwork] = useState<string>(String(NETWORK_CONFIG.networkId));
  const [providers, setProviders] = useState<GameProviders | null>(null);

  const initialInvite = useMemo(() => decodeInviteLink(), []);
  const [contractAddress, setContractAddressState] = useState<string | null>(() => {
    if (initialInvite.contractAddress) return initialInvite.contractAddress;
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(CENTRAL_CONTRACT_KEY) || (import.meta as any).env?.VITE_CONTRACT_ADDRESS || null;
    }
    return null;
  });

  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(() => initialInvite.roomCode);
  const [deployed, setDeployed] = useState<DeployedHub | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const privateState = useMemo(() => privateStateFor(activeRoomCode ?? contractAddress ?? undefined), [activeRoomCode, contractAddress]);

  const setContractAddress = useCallback((addr: string | null) => {
    setContractAddressState(addr);
    if (typeof localStorage !== 'undefined') {
      if (addr) localStorage.setItem(CENTRAL_CONTRACT_KEY, addr);
      else localStorage.removeItem(CENTRAL_CONTRACT_KEY);
    }
  }, []);

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

  // Auto-connect to hub when providers and contractAddress are ready
  useEffect(() => {
    if (!providers || !contractAddress) return;
    let cancelled = false;

    connectToHub(providers, contractAddress, privateState)
      .then((instance) => {
        if (!cancelled) {
          setDeployed(instance);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn('Failed connecting to hub contract', err);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [providers, contractAddress, privateState]);

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

  const deployCentralHub = useCallback(async () => {
    if (!providers) {
      throw new Error('Connect your Midnight wallet first');
    }
    const { deployed: newDeployed, contractAddress: newAddress } = await deployHub(providers, privateState);
    setDeployed(newDeployed);
    setContractAddress(newAddress);
    return newAddress;
  }, [providers, privateState, setContractAddress]);

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
        activeRoomCode,
        deployed,
        gameState,
        connect,
        deployCentralHub,
        setContractAddress,
        setActiveRoomCode,
        setDeployed,
        setGameState,
        clearError: () => setError(null),
      }}
    >
      {children}
    </MidnightContext.Provider>
  );
}


