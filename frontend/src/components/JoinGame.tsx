import { useState } from 'react';
import type { ViewState } from '../App';
import { formatError, useMidnight } from '../MidnightContext';
import { callFaucet, callJoinGame, decodeInviteLink } from 'midnightbet-dapp';

interface JoinGameProps {
  onNavigate: (view: ViewState) => void;
  walletConnected: boolean;
}

export function JoinGame({ onNavigate, walletConnected }: JoinGameProps) {
  const [address, setAddress] = useState(decodeInviteLink() ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { attachGame } = useMidnight();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!walletConnected) throw new Error('Wallet not connected');
      const trimmed = address.trim();
      if (!trimmed) throw new Error('Enter a contract address from an invite link');
      const instance = await attachGame(trimmed);
      try {
        await callFaucet(instance);
        await callJoinGame(instance);
      } catch (joinErr) {
        console.warn(joinErr);
      }
      onNavigate('arena');
    } catch (err) {
      setError(formatError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <button type="button" onClick={() => onNavigate('home')} className="text-slate-500 mb-6">
        Back
      </button>
      <div className="glass-card">
        <h2 className="text-2xl font-heading font-bold text-slate-800 mb-2">Join Game</h2>
        <p className="text-slate-500 text-sm mb-6">Paste the contract address from an invite URL (?game=…).</p>
        {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}
        <form onSubmit={handleJoin} className="space-y-4">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="input-field font-mono text-sm"
            placeholder="Contract address"
          />
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? 'Joining…' : 'Join & Enter Arena'}
          </button>
        </form>
      </div>
    </div>
  );
}
