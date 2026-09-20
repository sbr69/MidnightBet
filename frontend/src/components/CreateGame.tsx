import { useState } from 'react';
import type { ViewState } from '../App';
import { formatError, useMidnight } from '../MidnightContext';
import {
  callFaucet,
  callJoinGame,
  deployGame,
  encodeInviteLink,
  generateTargetNumber,
  loadOrCreateSecretKey,
  rememberHostGame,
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
  const [invite, setInvite] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { providers, setContractAddress, setDeployed } = useMidnight();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError(null);
    try {
      if (!walletConnected) throw new Error('Wallet not connected');
      if (!providers) throw new Error('Midnight providers are not initialized');

      const secretKey = loadOrCreateSecretKey();
      const targetNumber = generateTargetNumber(BigInt(minRange), BigInt(maxRange));
      const targetSalt = crypto.getRandomValues(new Uint8Array(32));

      const { deployed, contractAddress } = await deployGame(
        providers,
        { secretKey, targetSalt, targetNumber },
        {
          maxPlayers: BigInt(players),
          rangeMin: BigInt(minRange),
          rangeMax: BigInt(maxRange),
          stakeAmount: BigInt(stake),
          targetNumber,
          targetSalt,
        },
      );

      rememberHostGame({
        contractAddress,
        targetSaltHex: Array.from(targetSalt).map((b) => b.toString(16).padStart(2, '0')).join(''),
        targetNumber: targetNumber.toString(),
      });
      setContractAddress(contractAddress);
      setDeployed(deployed);
      setInvite(encodeInviteLink(contractAddress));

      try {
        await callFaucet(deployed);
        await callJoinGame(deployed);
      } catch (joinErr) {
        console.warn('faucet/join after deploy failed', joinErr);
        setError(
          `Game deployed but faucet/join failed: ${formatError(joinErr)}. You can still enter the arena.`,
        );
      }
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
          Back
        </button>
      </div>

      <div className="glass-card">
        <h2 className="text-2xl font-heading font-bold text-slate-800 mb-2">Game Settings</h2>
        <p className="text-slate-500 text-sm mb-6">Configure the rules. The secret target is committed on-chain.</p>

        {error && (
          <p className="mb-4 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg p-3">{error}</p>
        )}

        {invite ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Share this invite. The target stays private in this browser.</p>
            <input readOnly value={invite} className="input-field font-mono text-xs" />
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
              <label className="block text-sm font-semibold text-slate-700 mb-2">Stake Amount (in-contract tokens)</label>
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
              {isCreating ? 'Deploying ZK contract…' : 'Create Game & Deploy'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
