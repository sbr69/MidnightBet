import { useState, useEffect } from 'react';
import type { ViewState } from '../App';

interface GameArenaProps {
  onNavigate: (view: ViewState) => void;
  walletConnected: boolean;
}

export function GameArena({ onNavigate }: GameArenaProps) {
  const [guess, setGuess] = useState('');
  const [isGuessing, setIsGuessing] = useState(false);
  const [gamePhase, setGamePhase] = useState<'waiting' | 'playing' | 'finished'>('playing');
  const [winner, setWinner] = useState<string | null>(null);

  // Mock checking if someone won
  useEffect(() => {
    if (isGuessing && parseInt(guess) === 42) {
      setTimeout(() => {
        setIsGuessing(false);
        setGamePhase('finished');
        setWinner('You');
      }, 1500);
    } else if (isGuessing) {
      setTimeout(() => {
        setIsGuessing(false);
        setGuess('');
        // Show wrong guess toast in a real app
      }, 1000);
    }
  }, [isGuessing, guess]);

  const submitGuess = (e: React.FormEvent) => {
    e.preventDefault();
    if (guess) setIsGuessing(true);
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-[fadeIn_0.5s_ease-out]">
      {/* Header Stats */}
      <div className="flex justify-between items-center mb-8">
        <button onClick={() => onNavigate('home')} className="text-slate-500 hover:text-primary font-medium flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Leave Game
        </button>
        <div className="flex gap-4">
          <div className="px-4 py-2 bg-white/60 border border-slate-200 rounded-lg flex items-center gap-2 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-sm font-semibold text-slate-700">Players: 2/10</span>
          </div>
          <div className="px-4 py-2 bg-primary/10 border border-primary/20 text-primary-dark rounded-lg flex items-center gap-2 font-mono font-bold shadow-sm">
            Pool: 20 M$
          </div>
        </div>
      </div>

      {gamePhase === 'finished' ? (
        <div className="glass-card text-center py-16 animate-[fadeIn_0.5s_ease-out]">
          <div className="w-24 h-24 mx-auto mb-6 bg-yellow-100 rounded-full flex items-center justify-center shadow-lg shadow-yellow-200/50">
            <span className="text-5xl">🏆</span>
          </div>
          <h2 className="text-4xl font-heading font-black text-slate-800 mb-2">We have a Winner!</h2>
          <p className="text-xl text-slate-600 mb-8 font-body">The secret number was <strong>42</strong>.</p>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 inline-block">
            <p className="text-slate-700 font-medium">Winner: <span className="font-mono text-primary font-bold">{winner}</span></p>
            <p className="text-slate-700 font-medium">Prize: <span className="font-mono text-accent-green font-bold">20 M$</span></p>
          </div>
          <div className="mt-8">
            <button onClick={() => onNavigate('home')} className="btn-primary">Play Again</button>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Play Area */}
          <div className="md:col-span-2 glass-card">
            <h3 className="text-xl font-heading font-bold text-slate-800 mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Submit Your Guess
            </h3>
            
            <form onSubmit={submitGuess} className="flex flex-col items-center">
              <div className="text-center mb-8">
                <p className="text-slate-500 font-medium mb-2">Range</p>
                <div className="inline-flex items-center gap-4 bg-slate-50 px-6 py-2 rounded-full border border-slate-200 shadow-inner">
                  <span className="font-mono font-bold text-slate-700">1</span>
                  <span className="text-slate-400">to</span>
                  <span className="font-mono font-bold text-slate-700">100</span>
                </div>
              </div>
              
              <input 
                type="number" 
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="?"
                className="w-32 h-32 text-center text-5xl font-mono font-bold rounded-2xl border-2 border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/20 text-slate-800 mb-8 shadow-inner"
                disabled={isGuessing}
                min="1" max="100"
              />
              
              <button 
                type="submit" 
                disabled={!guess || isGuessing}
                className={`btn-primary w-full max-w-sm text-lg flex justify-center items-center gap-2 ${(!guess || isGuessing) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isGuessing ? (
                   <>
                   <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                   </svg>
                   Proving in ZK...
                 </>
                ) : 'Submit Guess'}
              </button>
            </form>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h4 className="font-heading font-bold text-slate-800 mb-4 flex items-center justify-between">
                Live Feed
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              </h4>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                    <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=0x123`} alt="avatar" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">0x123... joined</p>
                    <p className="text-xs text-slate-500">2 mins ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                    <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=0x456`} alt="avatar" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">0x456... submitted guess</p>
                    <p className="text-xs text-slate-500">Just now</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card p-6">
              <h4 className="font-heading font-bold text-slate-800 mb-4 text-center">Options</h4>
              <button className="w-full py-3 px-4 border border-rose-200 text-rose-500 font-semibold rounded-lg hover:bg-rose-50 transition-colors">
                Give Up & Refund
              </button>
              <p className="text-xs text-center text-slate-500 mt-3">If all players give up, the pool is refunded.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
