import { useEffect, useMemo, useState } from 'react';
import type { ViewState } from '../App';
import { formatError, useMidnight } from '../MidnightContext';
import {
  callCancelGame,
  callClaimRefund,
  callDeclareWinner,
  callGiveUp,
  callGuess,
  encodeInviteLink,
  hostRecordFor,
  subscribeGameState,
} from 'midnightbet-dapp';

interface GameArenaProps {
  onNavigate: (view: ViewState) => void;
  walletConnected: boolean;
}

function shortAddr(addr: string) {
  if (addr.length < 12) return addr;
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}

export function GameArena({ onNavigate, walletConnected }: GameArenaProps) {
  const [guess, setGuess] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    providers,
    deployed,
    contractAddress,
    gameState,
    setGameState,
  } = useMidnight();

  useEffect(() => {
    if (!providers || !contractAddress) return;
    return subscribeGameState(providers, contractAddress, setGameState, (e) => setError(e.message));
  }, [providers, contractAddress, setGameState]);

  const host = contractAddress ? hostRecordFor(contractAddress) : undefined;
  const isHost = Boolean(host);
  const phase = gameState?.phase ?? 'WaitingForPlayers';
  const players = gameState?.players ?? [];
  const round = gameState?.currentRound ?? 0;
  const guessedThisRound = players.filter((p) => (gameState?.lastGuessedRound[p] ?? 0) >= round && round > 0);

  const matchingWinner = useMemo(() => {
    if (!host || !gameState) return null;
    const target = Number(host.targetNumber);
    return Object.entries(gameState.latestGuesses).find(([, n]) => n === target)?.[0] ?? null;
  }, [host, gameState]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      if (!walletConnected) throw new Error('Wallet not connected');
      if (!deployed) throw new Error('No contract attached');
      await fn();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-3">
        <button type="button" onClick={() => onNavigate('home')} className="text-slate-500 font-medium">
          Leave Game
        </button>
        <div className="flex gap-3 flex-wrap">
          <div className="px-4 py-2 bg-white/60 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700">
            {phase}
          </div>
          <div className="px-4 py-2 bg-white/60 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700">
            Round {round || '—'}
          </div>
          <div className="px-4 py-2 bg-white/60 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700">
            Players: {gameState?.currentPlayerCount ?? 0}/{gameState?.maxPlayers ?? '—'}
          </div>
          <div className="px-4 py-2 bg-primary/10 border border-primary/20 text-primary rounded-lg font-mono font-bold text-sm">
            Pool: {gameState?.totalPool ?? 0} M$
          </div>
        </div>
      </div>

      {error && (
        <p className="mb-4 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg p-3">{error}</p>
      )}

      {contractAddress && (
        <p className="mb-4 text-xs font-mono text-slate-500 break-all">
          Invite: {encodeInviteLink(contractAddress)}
        </p>
      )}

      {phase === 'Finished' ? (
        <div className="glass-card text-center py-16">
          <h2 className="text-4xl font-heading font-black text-slate-800 mb-2">We have a Winner!</h2>
          <p className="text-lg text-slate-500 mb-8">
            Winner: <span className="font-mono">{gameState?.winner ? shortAddr(gameState.winner) : '—'}</span>
          </p>
          <p className="text-slate-600 mb-8">Prize: {gameState?.totalPool} M$</p>
          <button type="button" onClick={() => onNavigate('home')} className="btn-primary">
            Play Again
          </button>
        </div>
      ) : phase === 'Cancelled' ? (
        <div className="glass-card text-center py-12">
          <h2 className="text-2xl font-heading font-bold mb-4">Game Cancelled</h2>
          <p className="text-slate-500 mb-6">Claim your stake refund on-chain.</p>
          <button
            type="button"
            disabled={busy}
            className="btn-primary"
            onClick={() => run(() => callClaimRefund(deployed!))}
          >
            Claim Refund
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="glass-card">
              <h3 className="text-xl font-heading font-bold text-slate-800 mb-1">
                {phase === 'WaitingForPlayers' ? 'Waiting for players' : `Round ${round} — Submit Your Guess`}
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                Range {gameState?.rangeMin ?? '—'}–{gameState?.rangeMax ?? '—'} · Stake {gameState?.stakeAmount ?? '—'}
              </p>

              {phase === 'InProgress' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const n = BigInt(guess);
                    void run(() => callGuess(deployed!, n));
                  }}
                  className="flex flex-col items-center gap-6"
                >
                  <input
                    type="number"
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    min={gameState?.rangeMin}
                    max={gameState?.rangeMax}
                    disabled={busy}
                    className="w-32 h-32 text-center text-5xl font-mono font-bold rounded-2xl border-2 border-slate-200"
                  />
                  <button type="submit" disabled={!guess || busy} className="btn-primary w-full max-w-xs">
                    {busy ? 'Proving in ZK…' : 'Submit Guess'}
                  </button>
                </form>
              )}

              {phase === 'WaitingForPlayers' && isHost && (
                <button
                  type="button"
                  disabled={busy}
                  className="btn-secondary w-full"
                  onClick={() => run(() => callCancelGame(deployed!))}
                >
                  Cancel lobby
                </button>
              )}
            </div>

            <div className="glass-card py-4 px-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-slate-600">Round progress</span>
                <span className="text-sm font-mono font-bold text-primary">
                  {guessedThisRound.length}/{players.length || 0} guessed
                </span>
              </div>
              <div className="flex gap-3 mt-4 flex-wrap">
                {players.map((p) => (
                  <div key={p} className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-mono text-slate-500">{shortAddr(p)}</span>
                    <span className="text-[10px] font-bold text-primary">
                      {(gameState?.lastGuessedRound[p] ?? 0) >= round && round > 0 ? 'guessed' : '…'}
                    </span>
                  </div>
                ))}
                {players.length === 0 && <p className="text-sm text-slate-400">No players on-chain yet.</p>}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {isHost && matchingWinner && phase === 'InProgress' && (
              <div className="glass-card p-6">
                <h4 className="font-heading font-bold mb-3">A guess matches the target</h4>
                <button
                  type="button"
                  disabled={busy}
                  className="btn-primary w-full"
                  onClick={() =>
                    run(() => callDeclareWinner(deployed!, matchingWinner, BigInt(host!.targetNumber)))
                  }
                >
                  Declare winner {shortAddr(matchingWinner)}
                </button>
              </div>
            )}

            <div className="glass-card p-6">
              <h4 className="font-heading font-bold text-slate-800 mb-3 text-center">Options</h4>
              {phase === 'InProgress' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => callGiveUp(deployed!))}
                  className="w-full py-3 px-4 border border-rose-200 text-rose-500 font-semibold rounded-xl hover:bg-rose-50"
                >
                  Give up
                </button>
              )}
              <p className="text-xs text-center text-slate-500 mt-3">
                Refunds are paid only after the game is Cancelled (all players give up, or the host cancels the lobby).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
