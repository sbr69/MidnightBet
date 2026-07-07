import { useState, useEffect } from 'react';
import type { ViewState } from '../App';

interface GameArenaProps {
  onNavigate: (view: ViewState) => void;
  walletConnected: boolean;
}

interface FeedEvent {
  id: number;
  player: string;
  event: 'joined' | 'guessed' | 'gaveup' | 'won';
  timestamp: string;
}

interface Player {
  address: string;
  hasGuessedThisRound: boolean;
  avatarSeed: string;
}

// Generate a short display address like "0x1A3...f89"
function shortAddr(addr: string) {
  return addr.slice(0, 6) + '...' + addr.slice(-3);
}

export function GameArena({ onNavigate }: GameArenaProps) {
  const [guess, setGuess] = useState('');
  const [isGuessing, setIsGuessing] = useState(false);
  const [gamePhase, setGamePhase] = useState<'waiting' | 'playing' | 'finished' | 'cancelled'>('playing');
  const [winner, setWinner] = useState<string | null>(null);
  const [currentRound, setCurrentRound] = useState(1);
  const [hasGuessedThisRound, setHasGuessedThisRound] = useState(false);

  // Mock player list: "me" + 2 others
  const myAddress = '0x1A3b4f89c2d';
  const [players, setPlayers] = useState<Player[]>([
    { address: myAddress, hasGuessedThisRound: false, avatarSeed: 'me' },
    { address: '0xDeAdBeEf001', hasGuessedThisRound: false, avatarSeed: 'player2' },
    { address: '0xFACE8000abc', hasGuessedThisRound: false, avatarSeed: 'player3' },
  ]);

  const [feedEvents, setFeedEvents] = useState<FeedEvent[]>([
    { id: 1, player: '0xDeAdBeEf001', event: 'joined', timestamp: '2m ago' },
    { id: 2, player: '0xFACE8000abc', event: 'joined', timestamp: '1m ago' },
    { id: 3, player: myAddress, event: 'joined', timestamp: '30s ago' },
  ]);

  const addFeedEvent = (player: string, event: FeedEvent['event']) => {
    setFeedEvents(prev => [
      { id: Date.now(), player, event, timestamp: 'Just now' },
      ...prev.slice(0, 14), // keep last 15 events
    ]);
  };

  // Count how many players have guessed this round
  const guessedCount = players.filter(p => p.hasGuessedThisRound).length;
  const allGuessed = guessedCount === players.length;

  // Simulate other players guessing after "me" guesses
  useEffect(() => {
    if (!hasGuessedThisRound) return;

    // Simulate the other two players guessing with delays
    const timers: ReturnType<typeof setTimeout>[] = [];

    players.forEach((p, i) => {
      if (p.address === myAddress) return;
      timers.push(
        setTimeout(() => {
          setPlayers(prev =>
            prev.map(pl => pl.address === p.address ? { ...pl, hasGuessedThisRound: true } : pl)
          );
          addFeedEvent(p.address, 'guessed');
        }, (i + 1) * 1200)
      );
    });

    return () => timers.forEach(clearTimeout);
  }, [hasGuessedThisRound]); // eslint-disable-line react-hooks/exhaustive-deps

  // Advance round once all players have guessed
  useEffect(() => {
    if (!allGuessed || gamePhase !== 'playing') return;

    const t = setTimeout(() => {
      setCurrentRound(r => r + 1);
      setHasGuessedThisRound(false);
      setGuess('');
      setPlayers(prev => prev.map(p => ({ ...p, hasGuessedThisRound: false })));
      addFeedEvent('system', 'joined'); // reuse joined as a round-start marker (handled in render)
    }, 800);

    return () => clearTimeout(t);
  }, [allGuessed, gamePhase]);

  const submitGuess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess || hasGuessedThisRound) return;

    setIsGuessing(true);

    setTimeout(() => {
      setIsGuessing(false);

      const num = parseInt(guess);

      // Mark me as guessed
      setHasGuessedThisRound(true);
      setPlayers(prev =>
        prev.map(p => p.address === myAddress ? { ...p, hasGuessedThisRound: true } : p)
      );
      addFeedEvent(myAddress, 'guessed');

      // If the secret is 42 and you found it — you win
      if (num === 42) {
        setGamePhase('finished');
        setWinner(shortAddr(myAddress));
        addFeedEvent(myAddress, 'won');
      }
    }, 1200);
  };

  const feedLabel = (e: FeedEvent): string => {
    const addr = e.player === 'system' ? 'System' : (e.player === myAddress ? 'You' : shortAddr(e.player));
    switch (e.event) {
      case 'joined': return e.player === 'system' ? '🔄 New round started' : `${addr} joined the game`;
      case 'guessed': return `${addr} submitted a guess`;
      case 'gaveup': return `${addr} gave up`;
      case 'won': return `🏆 ${addr} won the game!`;
    }
  };

  const feedColor = (e: FeedEvent): string => {
    switch (e.event) {
      case 'joined': return 'text-slate-600';
      case 'guessed': return 'text-primary-dark font-semibold';
      case 'gaveup': return 'text-rose-500';
      case 'won': return 'text-amber-600 font-bold';
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <button
          onClick={() => onNavigate('home')}
          className="text-slate-500 hover:text-primary font-medium flex items-center gap-2 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Leave Game
        </button>
        <div className="flex gap-3">
          <div className="px-4 py-2 bg-white/60 border border-slate-200 rounded-lg flex items-center gap-2 shadow-sm text-sm font-semibold text-slate-700">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Round {currentRound}
          </div>
          <div className="px-4 py-2 bg-white/60 border border-slate-200 rounded-lg flex items-center gap-2 shadow-sm text-sm font-semibold text-slate-700">
            Players: {players.length}
          </div>
          <div className="px-4 py-2 bg-primary/10 border border-primary/20 text-primary rounded-lg font-mono font-bold shadow-sm text-sm">
            Pool: 30 M$
          </div>
        </div>
      </div>

      {gamePhase === 'finished' ? (
        /* ── WIN SCREEN ── */
        <div className="glass-card text-center py-16">
          <div className="w-24 h-24 mx-auto mb-6 bg-amber-100 rounded-full flex items-center justify-center shadow-lg shadow-amber-200/50 text-5xl">
            🏆
          </div>
          <h2 className="text-4xl font-heading font-black text-slate-800 mb-2">We have a Winner!</h2>
          <p className="text-lg text-slate-500 mb-8">The secret number was <strong className="text-slate-800">42</strong>. Guessed in Round {currentRound}.</p>
          <div className="inline-flex flex-col gap-2 p-6 bg-slate-50 rounded-2xl border border-slate-200 mb-8">
            <p className="text-slate-600">Winner: <span className="font-mono font-bold text-primary">{winner}</span></p>
            <p className="text-slate-600">Prize: <span className="font-mono font-bold text-emerald-600">30 M$</span></p>
          </div>
          <div>
            <button onClick={() => onNavigate('home')} className="btn-primary">
              Play Again
            </button>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {/* ── MAIN PLAY AREA ── */}
          <div className="md:col-span-2 space-y-6">
            {/* Guess input card */}
            <div className="glass-card">
              <h3 className="text-xl font-heading font-bold text-slate-800 mb-1 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Round {currentRound} — Submit Your Guess
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                {hasGuessedThisRound
                  ? `Waiting for all players to guess… (${guessedCount}/${players.length})`
                  : 'Enter a number and submit. Next round starts once everyone has guessed.'}
              </p>

              <form onSubmit={submitGuess} className="flex flex-col items-center gap-6">
                <div className="text-center">
                  <p className="text-slate-500 text-sm font-medium mb-2">Range</p>
                  <div className="inline-flex items-center gap-4 bg-slate-50 px-6 py-2 rounded-full border border-slate-200 shadow-inner">
                    <span className="font-mono font-bold text-slate-700">1</span>
                    <span className="text-slate-400">–</span>
                    <span className="font-mono font-bold text-slate-700">100</span>
                  </div>
                </div>

                <input
                  id="guess-input"
                  type="number"
                  value={guess}
                  onChange={e => setGuess(e.target.value)}
                  placeholder="?"
                  min="1" max="100"
                  disabled={isGuessing || hasGuessedThisRound}
                  className={`w-32 h-32 text-center text-5xl font-mono font-bold rounded-2xl border-2 text-slate-800 shadow-inner outline-none transition-all
                    ${hasGuessedThisRound
                      ? 'border-slate-200 bg-slate-100 cursor-not-allowed text-slate-400'
                      : 'border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/20 bg-white'}`}
                />

                <button
                  type="submit"
                  disabled={!guess || isGuessing || hasGuessedThisRound}
                  className={`btn-primary w-full max-w-xs text-base flex justify-center items-center gap-2
                    ${(!guess || isGuessing || hasGuessedThisRound) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isGuessing ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Proving in ZK…
                    </>
                  ) : hasGuessedThisRound ? 'Waiting for others…' : 'Submit Guess'}
                </button>
              </form>
            </div>

            {/* Round progress bar */}
            <div className="glass-card py-4 px-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-slate-600">Round {currentRound} Progress</span>
                <span className="text-sm font-mono font-bold text-primary">{guessedCount}/{players.length} guessed</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-primary to-accent-purple transition-all duration-500"
                  style={{ width: `${players.length ? (guessedCount / players.length) * 100 : 0}%` }}
                />
              </div>

              {/* Per-player status dots */}
              <div className="flex gap-3 mt-4">
                {players.map(p => (
                  <div key={p.address} className="flex flex-col items-center gap-1">
                    <div className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all
                      ${p.hasGuessedThisRound ? 'border-primary shadow-md shadow-primary/30' : 'border-slate-200 opacity-60'}`}>
                      <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${p.avatarSeed}`} alt="avatar" />
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      {p.address === myAddress ? 'You' : shortAddr(p.address)}
                    </span>
                    <span className={`text-[10px] font-bold ${p.hasGuessedThisRound ? 'text-primary' : 'text-slate-400'}`}>
                      {p.hasGuessedThisRound ? '✓' : '…'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── SIDEBAR ── */}
          <div className="space-y-6">
            {/* Live activity feed */}
            <div className="glass-card p-6 max-h-[420px] overflow-y-auto">
              <h4 className="font-heading font-bold text-slate-800 mb-4 flex items-center justify-between sticky top-0 bg-white/70 backdrop-blur-sm py-1">
                Live Feed
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </span>
              </h4>

              <div className="space-y-3">
                {feedEvents.map(e => (
                  <div key={e.id} className="flex items-start gap-3 animate-[fadeIn_0.3s_ease-out]">
                    {e.player !== 'system' && (
                      <div className="w-7 h-7 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                        <img
                          src={`https://api.dicebear.com/7.x/identicon/svg?seed=${e.player}`}
                          alt="avatar"
                          className="w-full h-full"
                        />
                      </div>
                    )}
                    {e.player === 'system' && (
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm">
                        🔄
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${feedColor(e)}`}>{feedLabel(e)}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{e.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Give up option */}
            <div className="glass-card p-6">
              <h4 className="font-heading font-bold text-slate-800 mb-3 text-center">Options</h4>
              <button
                onClick={() => {
                  addFeedEvent(myAddress, 'gaveup');
                  setGamePhase('cancelled');
                }}
                className="w-full py-3 px-4 border border-rose-200 text-rose-500 font-semibold rounded-xl hover:bg-rose-50 transition-colors"
              >
                Give Up &amp; Refund
              </button>
              <p className="text-xs text-center text-slate-500 mt-3">
                If all players give up, the pool is refunded to everyone.
              </p>
            </div>
          </div>
        </div>
      )}

      {gamePhase === 'cancelled' && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-card max-w-md w-full mx-4 text-center py-12">
            <div className="text-5xl mb-4">😔</div>
            <h2 className="text-2xl font-heading font-bold text-slate-800 mb-2">Game Cancelled</h2>
            <p className="text-slate-500 mb-8">All stakes have been refunded to players.</p>
            <button onClick={() => onNavigate('home')} className="btn-primary">Back to Home</button>
          </div>
        </div>
      )}
    </div>
  );
}
