import { createContext } from 'react';
import type {
  DeployedHub,
  GamePrivateState,
  GameProviders,
  GameState,
  WalletInfo,
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
  activeRoomCode: string | null;
  deployed: DeployedHub | null;
  gameState: GameState | null;
  connect: (walletId?: string) => Promise<void>;
  deployCentralHub: () => Promise<string>;
  setContractAddress: (address: string | null) => void;
  setActiveRoomCode: (code: string | null) => void;
  setDeployed: (d: DeployedHub | null) => void;
  setGameState: (s: GameState | null) => void;
  clearError: () => void;
}

export const MidnightContext = createContext<MidnightContextType | undefined>(undefined);
