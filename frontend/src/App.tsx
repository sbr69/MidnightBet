import { useEffect, useState } from 'react';
import { Home } from './components/Home';
import { CreateGame } from './components/CreateGame';
import { GameArena } from './components/GameArena';
import { JoinGame } from './components/JoinGame';
import { AdminDeploy } from './components/AdminDeploy';
import { WalletModal } from './components/WalletModal';
import { useMidnight } from './useMidnight';
import { formatError } from './error-utils';
import { decodeInviteLink } from 'midnightbet-dapp';

export type ViewState = 'home' | 'create' | 'join' | 'arena' | 'admin-deploy';

function App() {
  const [currentView, setCurrentView] = useState<ViewState>(() => {
    if (typeof window !== 'undefined' && (window.location.hash === '#/admin-deploy' || window.location.hash === '#/deploy')) {
      return 'admin-deploy';
    }
    return 'home';
  });
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const {
    isConnected,
    isConnecting,
    walletAddress,
    walletName,
    networkId,
    contractAddress,
    error,
  } = useMidnight();

  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#/admin-deploy' || window.location.hash === '#/deploy') {
        setCurrentView('admin-deploy');
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  useEffect(() => {
    const invite = decodeInviteLink();
    if (invite.roomCode) {
      setCurrentView('join');
    }
  }, [isConnected]);

  const openWalletModal = () => {
    setIsWalletModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="p-6 flex justify-between items-center backdrop-blur-md bg-white/50 border-b border-white/20 sticky top-0 z-40">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('home')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-white font-heading font-bold text-xl">M</span>
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600">
              MidnightBet
            </h1>
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              Midnight {networkId}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {contractAddress && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-slate-100 text-slate-600 border border-slate-200" title={contractAddress}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Hub: {contractAddress.slice(0, 6)}…{contractAddress.slice(-4)}
            </div>
          )}

          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            Preview Net
          </div>

          {isConnected && walletAddress ? (
            <div className="px-4 py-2 rounded-lg bg-white/80 border border-slate-200 shadow-sm font-mono text-sm text-slate-600 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              {walletName && <span className="font-sans font-bold text-xs text-primary">{walletName}:</span>}
              {walletAddress.slice(0, 10)}...{walletAddress.slice(-4)}
            </div>
          ) : (
            <button
              type="button"
              onClick={openWalletModal}
              disabled={isConnecting}
              className="btn-primary py-2 px-6 text-sm"
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </header>

      <WalletModal isOpen={isWalletModalOpen} onClose={() => setIsWalletModalOpen(false)} />

      {error && (
        <div className="max-w-5xl mx-auto w-full px-6 pt-4">
          <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg p-3">{formatError(error)}</p>
        </div>
      )}

      <main className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-5xl mx-auto">
        {currentView === 'home' && (
          <Home onNavigate={setCurrentView} walletConnected={isConnected} connectWallet={openWalletModal} />
        )}
        {currentView === 'create' && <CreateGame onNavigate={setCurrentView} walletConnected={isConnected} />}
        {currentView === 'join' && <JoinGame onNavigate={setCurrentView} walletConnected={isConnected} />}
        {currentView === 'arena' && <GameArena onNavigate={setCurrentView} walletConnected={isConnected} />}
        {currentView === 'admin-deploy' && <AdminDeploy onNavigate={setCurrentView} />}
      </main>

      <footer className="p-6 text-center text-slate-500 text-sm font-medium">
        Powered by Midnight Blockchain • Zero Knowledge Number Guessing
      </footer>
    </div>
  );
}

export default App;
