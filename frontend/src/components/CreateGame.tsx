import { useState } from 'react';
import type { ViewState } from '../App';
import { useMidnight } from '../useMidnight';
import { formatError } from '../error-utils';
import {
  callCreateRoom,
  callJoinRoom,
  encodeInviteLink,
  generateRoomCode,
  generateTargetNumber,
  loadOrCreateSecretKey,
} from 'midnightbet-dapp';

interface CreateGameProps {
  onNavigate: (view: ViewState) => void;
  walletConnected: boolean;
}

export function CreateGame({ onNavigate, walletConnected }: CreateGameProps) {
  const [players, setPlayers] = useState(2);
  const [minRange, setMinRange] = useState(1);
  const [maxRange, setMaxRange] = useState(100);
  const [stake, setStake] = useState(10);
  const [isCreating, setIsCreating] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [invite, setInvite] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { providers, deployed, setActiveRoomCode } = useMidnight();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError(null);
    try {
      if (!walletConnected) throw new Error('Please connect your Midnight wallet first.');
      if (!providers) throw new Error('Midnight wallet providers are not initialized.');
      if (!deployed) throw new Error('Connecting to Midnight game contract… please ensure your wallet is connected.');

      loadOrCreateSecretKey();
      const code = generateRoomCode();
      const targetNumber = generateTargetNumber(BigInt(minRange), BigInt(maxRange));
      const targetSalt = crypto.getRandomValues(new Uint8Array(32));

      await callCreateRoom(deployed, {
        roomCode: code,
        maxPlayers: BigInt(players),
        rangeMin: BigInt(minRange),
        rangeMax: BigInt(maxRange),
        stakeAmount: BigInt(stake),
        targetNumber,
        targetSalt,
      });

      try {
        await callJoinRoom(deployed, code);
      } catch (joinErr) {
        console.warn('auto-join on new room failed (non-fatal)', joinErr);
      }

      setRoomCode(code);
      setActiveRoomCode(code);
      setInvite(encodeInviteLink(code));
    } catch (err) {
      console.error(err);
      setError(formatError(err));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto animate-[fadeIn_0.3s_ease-out]">
      <div className="mb-8">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="text-slate-500 hover:text-primary flex items-center gap-2 font-medium transition-colors"
        >
          ← Back
        </button>
      </div>

      <div className="glass-card">
        <h2 className="text-2xl font-heading font-bold text-slate-800 mb-2">Create Room</h2>
        <p className="text-slate-500 text-sm mb-6">
          Set up a secret number guessing room. Challenge your friends to guess and win the pot!
        </p>

        {error && (
          <p className="mb-4 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg p-3">{error}</p>
        )}

        {roomCode && invite ? (
          <div className="space-y-6 text-center py-4">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Room Code</span>
              <div className="text-4xl font-mono font-black text-primary tracking-widest mt-1">
                {roomCode}
              </div>
            </div>

            <div className="text-left space-y-2">
              <label className="text-xs font-semibold text-slate-600">Shareable Invite Link</label>
              <input readOnly value={invite} className="input-field font-mono text-xs" />
            </div>

            <p className="text-xs text-slate-500">
              Your secret number is committed on-chain with Zero Knowledge. Share this code with your friends to join!
            </p>

            <button type="button" className="btn-primary w-full" onClick={() => onNavigate('arena')}>
              Enter Arena
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Number of Players</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="2"
                  max="10"
                  value={players}
                  onChange={(e) => setPlayers(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <span className="w-12 text-center font-heading font-bold text-slate-800 bg-slate-100 py-1 rounded-lg border border-slate-200">
                  {players}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Min Range</label>
                <input
                  type="number"
                  min="1"
                  max={maxRange - 1}
                  value={minRange}
                  onChange={(e) => setMinRange(parseInt(e.target.value))}
                  className="input-field font-mono font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Max Range</label>
                <input
                  type="number"
                  min={minRange + 1}
                  value={maxRange}
                  onChange={(e) => setMaxRange(parseInt(e.target.value))}
                  className="input-field font-mono font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Stake Amount (tNIGHT tokens)</label>
              <input
                type="number"
                min="1"
                value={stake}
                onChange={(e) => setStake(parseInt(e.target.value))}
                className="input-field font-mono font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className={`btn-primary w-full ${isCreating ? 'opacity-70 cursor-wait' : ''}`}
            >
              {isCreating ? 'Generating 6-char Room & Proving in ZK…' : 'Create Room'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
