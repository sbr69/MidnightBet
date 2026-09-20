import type { ViewState } from '../App';

interface HomeProps {
  onNavigate: (view: ViewState) => void;
  walletConnected: boolean;
  connectWallet: () => void;
}

export function Home({ onNavigate, walletConnected, connectWallet }: HomeProps) {
  const handleCreate = () => {
    if (!walletConnected) connectWallet();
    else onNavigate('create');
  };

  const handleJoin = () => {
    if (!walletConnected) connectWallet();
    else onNavigate('join');
  };

  return (
    <div className="flex flex-col items-center justify-center w-full animate-[fadeIn_0.5s_ease-out]">
      <div className="text-center max-w-2xl mb-12">
        <h2 className="text-5xl md:text-7xl font-heading font-black mb-6 tracking-tight text-slate-800">
          Zero Knowledge <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent-purple">
            Number Guessing
          </span>
        </h2>
        <p className="text-xl text-slate-600 font-body leading-relaxed max-w-xl mx-auto mb-6">
          Create a game, challenge your friends, and win the pot. Powered by ZK proofs on Midnight.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Midnight Preview Network
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            Supports 1AM Wallet &amp; Lace
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
            ZK ProofStation Ready
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 w-full max-w-3xl">
        <div className="glass-card flex flex-col items-center text-center cursor-pointer" onClick={handleCreate}>
          <h3 className="text-2xl font-heading font-bold text-slate-800 mb-2">Create Game</h3>
          <p className="text-slate-500 mb-6 flex-1">Start a new game, set the rules, and invite friends.</p>
          <button type="button" className="btn-primary w-full">Start Hosting</button>
        </div>

        <div className="glass-card flex flex-col items-center text-center cursor-pointer" onClick={handleJoin}>
          <h3 className="text-2xl font-heading font-bold text-slate-800 mb-2">Join Game</h3>
          <p className="text-slate-500 mb-6 flex-1">Have an invite link? Join and guess the secret number.</p>
          <button type="button" className="btn-secondary w-full">Enter Arena</button>
        </div>
      </div>
    </div>
  );
}
