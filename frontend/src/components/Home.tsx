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
    else onNavigate('arena'); // Normally would prompt for game ID or handle invite link
  };

  return (
    <div className="flex flex-col items-center justify-center w-full animate-[fadeIn_0.5s_ease-out]">
      <div className="text-center max-w-2xl mb-12">
        <h2 className="text-5xl md:text-7xl font-heading font-black mb-6 tracking-tight text-slate-800">
          Zero Knowledge <br/>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent-purple">Number Guessing</span>
        </h2>
        <p className="text-xl text-slate-600 font-body leading-relaxed max-w-xl mx-auto">
          Create a game, challenge your friends, and win the pot. Powered by ZK Proofs on the Midnight blockchain to ensure fairness and privacy.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 w-full max-w-3xl">
        <div className="glass-card flex flex-col items-center text-center group cursor-pointer hover:border-primary/40 transition-colors" onClick={handleCreate}>
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h3 className="text-2xl font-heading font-bold text-slate-800 mb-2">Create Game</h3>
          <p className="text-slate-500 mb-6 flex-1">Start a new game, set the rules, and invite your friends to play.</p>
          <button className="btn-primary w-full shadow-md shadow-primary/20">Start Hosting</button>
        </div>

        <div className="glass-card flex flex-col items-center text-center group cursor-pointer hover:border-accent-purple/40 transition-colors" onClick={handleJoin}>
          <div className="w-16 h-16 rounded-2xl bg-accent-purple/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <svg className="w-8 h-8 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h3 className="text-2xl font-heading font-bold text-slate-800 mb-2">Join Game</h3>
          <p className="text-slate-500 mb-6 flex-1">Have an invite link? Join an existing game and try to guess the secret number.</p>
          <button className="btn-secondary w-full">Enter Arena</button>
        </div>
      </div>
    </div>
  );
}
