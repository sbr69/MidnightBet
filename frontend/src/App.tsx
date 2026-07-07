import { useState } from 'react';
import { Home } from './components/Home';
import { CreateGame } from './components/CreateGame';
import { GameArena } from './components/GameArena';
import { useMidnight } from './MidnightContext';

export type ViewState = 'home' | 'create' | 'arena';

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const { isConnected, isConnecting, walletAddress, connect } = useMidnight();

  const connectWallet = async () => {
    if (!isConnected) {
      await connect();
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="p-6 flex justify-between items-center backdrop-blur-md bg-white/50 border-b border-white/20 sticky top-0 z-50">
        <div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => setCurrentView('home')}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-white font-heading font-bold text-xl">M</span>
          </div>
          <h1 className="text-2xl font-heading font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600">
            MidnightBet
          </h1>
        </div>
        
        <div>
          {isConnected && walletAddress ? (
            <div className="px-4 py-2 rounded-lg bg-white/80 border border-slate-200 shadow-sm font-mono text-sm text-slate-600 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              {walletAddress.slice(0,10)}...{walletAddress.slice(-4)}
            </div>
          ) : (
            <button onClick={connectWallet} disabled={isConnecting} className="btn-primary py-2 px-6 text-sm">
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-5xl mx-auto">
        {currentView === 'home' && (
          <Home 
            onNavigate={setCurrentView} 
            walletConnected={isConnected} 
            connectWallet={connectWallet} 
          />
        )}
        
        {currentView === 'create' && (
          <CreateGame 
            onNavigate={setCurrentView} 
            walletConnected={isConnected} 
          />
        )}

        {currentView === 'arena' && (
          <GameArena 
            onNavigate={setCurrentView} 
            walletConnected={isConnected} 
          />
        )}
      </main>
      
      {/* Footer */}
      <footer className="p-6 text-center text-slate-500 text-sm font-medium">
        Powered by Midnight Blockchain &bull; Zero Knowledge Number Guessing
      </footer>
    </div>
  );
}

export default App;
