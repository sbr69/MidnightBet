import { useState } from 'react';
import type { ViewState } from '../App';
import { useMidnight } from '../useMidnight';
import { formatError } from '../error-utils';
import { callJoinRoom, decodeInviteLink } from 'midnightbet-dapp';

interface JoinGameProps {
  onNavigate: (view: ViewState) => void;
  walletConnected: boolean;
}

export function JoinGame({ onNavigate, walletConnected }: JoinGameProps) {
  const initial = decodeInviteLink();
  const [code, setCode] = useState(initial.roomCode ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    deployed,
    contractAddress,
    setActiveRoomCode,
  } = useMidnight();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!walletConnected) throw new Error('Wallet not connected');
      if (!contractAddress || !deployed) {
        throw new Error('Hub contract not connected. Please ensure the central contract is deployed.');
      }
      const trimmed = code.trim().toUpperCase();
      if (!trimmed || trimmed.length < 3) {
        throw new Error('Enter a valid 6-character room code');
      }

      setActiveRoomCode(trimmed);
      await callJoinRoom(deployed, trimmed);

      onNavigate('arena');
    } catch (err) {
      setError(formatError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <button
        type="button"
        onClick={() => onNavigate('home')}
        className="text-slate-500 hover:text-primary flex items-center gap-2 font-medium mb-6 transition-colors"
      >
        ← Back
      </button>

      <div className="glass-card">
        <h2 className="text-2xl font-heading font-bold text-slate-800 mb-2">Join Room</h2>
        <p className="text-slate-500 text-sm mb-6">
          Enter the 6-character room code from your host or invite URL (?room=…).
        </p>

        {error && <p className="mb-4 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg p-3">{error}</p>}

        <form onSubmit={handleJoin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Room Code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={10}
              className="input-field text-center font-mono text-2xl font-bold tracking-widest placeholder:text-slate-300"
              placeholder="e.g. K7X9PQ"
            />
          </div>

          <button
            type="submit"
            disabled={busy || !code.trim()}
            className={`btn-primary w-full ${busy ? 'opacity-70 cursor-wait' : ''}`}
          >
            {busy ? 'Joining Room & Proving in ZK…' : 'Join & Enter Arena'}
          </button>
        </form>
      </div>
    </div>
  );
}
