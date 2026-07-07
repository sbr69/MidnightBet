import { useState } from 'react';
import type { ViewState } from '../App';
import { useMidnight } from '../MidnightContext';
// @ts-ignore
import { createContractInstance, computeTargetHash, generateTargetNumber, type GamePrivateState } from 'midnightbet-dapp/dist/game-api';

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
  const { providers } = useMidnight();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    
    try {
      if (!walletConnected) throw new Error("Wallet not connected");

      // Generate target number
      const targetNumber = generateTargetNumber(BigInt(minRange), BigInt(maxRange));
      const targetSalt = crypto.getRandomValues(new Uint8Array(32));
      const secretKey = crypto.getRandomValues(new Uint8Array(32));
      
      const targetHash = await computeTargetHash(targetNumber, targetSalt);
      console.log('Target generated:', targetNumber, 'Salt:', targetSalt);

      const privateState: GamePrivateState = {
        secretKey,
        targetSalt,
        targetNumber
      };

      const contract = createContractInstance(privateState);

      if (providers && providers.midnightProvider) {
        console.log("Deploying contract to Midnight network...");
        const deployed = await providers.midnightProvider.deploy(
          contract,
          contract.initialState({} as any, BigInt(players), BigInt(minRange), BigInt(maxRange), BigInt(stake), targetHash)
        );
        console.log("Deployed contract address:", deployed.deployTxData.public.contractAddress);
        // Normally we'd store the contract address here
      } else {
        console.warn("Midnight providers not fully initialized. Simulating deployment.");
        await new Promise(r => setTimeout(r, 2000));
      }

      onNavigate('arena');
    } catch (err) {
      console.error(err);
      alert("Failed to deploy: " + String(err));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto animate-[fadeIn_0.3s_ease-out]">
      <div className="mb-8">
        <button 
          onClick={() => onNavigate('home')}
          className="text-slate-500 hover:text-primary flex items-center gap-2 font-medium transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
      </div>

      <div className="glass-card">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-heading font-bold text-slate-800">Game Settings</h2>
            <p className="text-slate-500 text-sm">Configure the rules for your guessing game</p>
          </div>
        </div>

        <form onSubmit={handleCreate} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Number of Players</label>
            <div className="flex items-center gap-4">
              <input 
                type="range" min="2" max="10" 
                value={players} onChange={e => setPlayers(parseInt(e.target.value))}
                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="w-12 text-center font-heading font-bold text-slate-800 bg-slate-100 py-1 rounded-lg border border-slate-200">{players}</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Maximum 10 players supported by ZK circuits</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Min Range</label>
              <input 
                type="number" min="1" max={maxRange-1} value={minRange}
                onChange={e => setMinRange(parseInt(e.target.value))}
                className="input-field font-mono font-medium"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Max Range</label>
              <input 
                type="number" min={minRange+1} value={maxRange}
                onChange={e => setMaxRange(parseInt(e.target.value))}
                className="input-field font-mono font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Stake Amount (Tokens)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-slate-400 font-bold">M$</span>
              </div>
              <input 
                type="number" min="1" value={stake}
                onChange={e => setStake(parseInt(e.target.value))}
                className="input-field pl-12 font-mono font-medium"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isCreating}
            className={`btn-primary w-full shadow-lg shadow-primary/20 flex items-center justify-center gap-2 ${isCreating ? 'opacity-70 cursor-wait' : ''}`}
          >
            {isCreating ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Deploying ZK Contract...
              </>
            ) : (
              'Create Game & Deploy'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
