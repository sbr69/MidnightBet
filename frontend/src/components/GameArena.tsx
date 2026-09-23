import { useEffect, useMemo, useState } from 'react';
import type { ViewState } from '../App';
import { useMidnight } from '../useMidnight';
import { formatError } from '../error-utils';
import {
  callCancelRoom,
  callClaimRefund,
  callDeclareWinner,
  callGiveUp,
  callGuess,
  encodeInviteLink,
  hostRecordFor,
  subscribeRoomState,
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
    activeRoomCode,
    gameState,
    setGameState,
  } = useMidnight();

  const roomCode = activeRoomCode ?? 'DEFAULT';

  useEffect(() => {
    if (!providers || !contractAddress || !roomCode) return;
    return subscribeRoomState(providers, contractAddress, roomCode, setGameState, (e) => setError(e.message));
  }, [providers, contractAddress, roomCode, setGameState]);

  const host = hostRecordFor(roomCode);
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
      if (!deployed) throw new Error('No central contract attached');
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
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="text-slate-500 hover:text-primary font-medium flex items-center gap-1 transition-colors"
        >
          ← Leave Arena
        </button>

        <div className="flex gap-3 flex-wrap items-center">
          <div className="px-3.5 py-1.5 bg-primary/10 border border-primary/20 text-primary rounded-lg font-mono font-bold text-sm flex items-center gap-1.5">
            <span className="text-slate-400 font-sans font-normal text-xs uppercase">Room</span>
            {roomCode}
          </div>
          <div className="px-3.5 py-1.5 bg-white/70 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700">
            {phase}
          </div>
          <div className="px-3.5 py-1.5 bg-white/70 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700">
            Round {round || '—'}
          </div>
          <div className="px-3.5 py-1.5 bg-white/70 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700">
            Players: {gameState?.currentPlayerCount ?? 0}/{gameState?.maxPlayers ?? '—'}
          </div>
          <div className="px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg font-mono font-bold text-sm">
            Pool: {gameState?.totalPool ?? 0} M$
          </div>
        </div>
      </div>

      {error && (
        <p className="mb-4 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg p-3">{error}</p>
      )}

      {roomCode && (
        <div className="mb-6 flex items-center justify-between p-3 bg-white/60 border border-slate-200 rounded-xl text-xs font-mono text-slate-600">
          <span className="text-slate-400 font-sans">Shareable Invite:</span>
          <span className="font-bold text-primary">{encodeInviteLink(roomCode)}</span>
        </div>
      )}

      {phase === 'Finished' ? (
        <div className="glass-card text-center py-16">
          <h2 className="text-4xl font-heading font-black text-slate-800 mb-2">We have a Winner! 🎉</h2>
          <p className="text-lg text-slate-500 mb-6">
            Winner: <span className="font-mono text-primary font-bold">{gameState?.winner ? shortAddr(gameState.winner) : '—'}</span>
          </p>
          <div className="text-2xl font-mono font-bold text-emerald-600 mb-8">Prize: {gameState?.totalPool} M$</div>
          <button type="button" onClick={() => onNavigate('home')} className="btn-primary">
            Play Again
          </button>
        </div>
      ) : phase === 'Cancelled' ? (
        <div className="glass-card text-center py-12">
          <h2 className="text-2xl font-heading font-bold mb-4">Room Cancelled</h2>
          <p className="text-slate-500 mb-6">You can claim your stake refund on-chain.</p>
          <button
            type="button"
            disabled={busy}
            className="btn-primary"
            onClick={() => run(() => callClaimRefund(deployed!, roomCode))}
          >
            {busy ? 'Claiming Refund…' : 'Claim Refund'}
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="glass-card">
              <h3 className="text-xl font-heading font-bold text-slate-800 mb-1">
                {phase === 'WaitingForPlayers' ? 'Waiting for players to join' : `Round ${round} — Submit Your Guess`}
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                Range {gameState?.rangeMin ?? '—'}–{gameState?.rangeMax ?? '—'} · Stake {gameState?.stakeAmount ?? '—'} M$
              </p>

              {phase === 'InProgress' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const n = BigInt(guess);
                    void run(() => callGuess(deployed!, roomCode, n));
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
                    className="w-32 h-32 text-center text-5xl font-mono font-bold rounded-2xl border-2 border-slate-200 focus:border-primary focus:outline-none transition"
                  />
                  <button type="submit" disabled={!guess || busy} className="btn-primary w-full max-w-xs">
                    {busy ? 'Proving in ZK…' : 'Submit Guess'}
                  </button>
                </form>
              )}

              {phase === 'WaitingForPlayers' && (
                <div className="text-center py-8 space-y-4">
                  <div className="animate-pulse flex items-center justify-center gap-2 text-slate-400 font-semibold text-sm">
                    <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                    Waiting for players to join with Room Code <span className="font-mono text-primary font-bold">{roomCode}</span>…
                  </div>
                  {isHost && (
                    <button
                      type="button"
                      disabled={busy}
                      className="btn-secondary text-xs"
                      onClick={() => run(() => callCancelRoom(deployed!, roomCode))}
                    >
                      Cancel Room
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="glass-card py-4 px-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-slate-600">Round Progress</span>
                <span className="text-sm font-mono font-bold text-primary">
                  {guessedThisRound.length}/{players.length || 0} guessed
                </span>
              </div>
              <div className="flex gap-3 mt-4 flex-wrap">
                {players.map((p) => (
                  <div key={p} className="flex flex-col items-center gap-1 p-2 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-mono text-slate-500">{shortAddr(p)}</span>
                    <span className="text-[10px] font-bold text-primary">
                      {(gameState?.lastGuessedRound[p] ?? 0) >= round && round > 0 ? '✓ Guessed' : 'Waiting…'}
                    </span>
                  </div>
                ))}
                {players.length === 0 && <p className="text-sm text-slate-400">No players registered on-chain yet.</p>}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {isHost && matchingWinner && phase === 'InProgress' && (
              <div className="glass-card p-6 border-2 border-emerald-300 bg-emerald-50/50">
                <h4 className="font-heading font-bold text-emerald-800 mb-2">Target Match Found!</h4>
                <p className="text-xs text-emerald-700 mb-4">
                  Player <span className="font-mono font-bold">{shortAddr(matchingWinner)}</span> guessed the target!
                </p>
                <button
                  type="button"
                  disabled={busy}
                  className="btn-primary w-full"
                  onClick={() =>
                    run(() => callDeclareWinner(deployed!, roomCode, matchingWinner, BigInt(host!.targetNumber)))
                  }
                >
                  Declare Winner
                </button>
              </div>
            )}

            <div className="glass-card p-6">
              <h4 className="font-heading font-bold text-slate-800 mb-3 text-center">Room Actions</h4>
              {phase === 'InProgress' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => callGiveUp(deployed!, roomCode))}
                  className="w-full py-2.5 px-4 border border-rose-200 text-rose-500 font-semibold rounded-xl hover:bg-rose-50 transition"
                >
                  Give up
                </button>
              )}
              <p className="text-xs text-center text-slate-400 mt-4 leading-relaxed">
                Stakes are automatically refunded if all joined players give up or the host cancels before the game begins.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
