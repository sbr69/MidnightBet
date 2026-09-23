import { useState } from 'react';
import { useMidnight } from '../useMidnight';
import { deployHub, privateStateFor } from 'midnightbet-dapp';
import { formatError } from '../error-utils';

interface AdminDeployProps {
  onNavigate: (view: any) => void;
}

export function AdminDeploy({ onNavigate }: AdminDeployProps) {
  const {
    isConnected,
    walletAddress,
    walletName,
    providers,
    contractAddress,
    setContractAddress,
  } = useMidnight();

  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState<string | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [result, setResult] = useState<{ contractAddress: string; txHash?: string } | null>(null);

  const handleDeploy = async () => {
    if (!providers || !isConnected) {
      setDeployError('Please connect your 1AM Wallet first.');
      return;
    }

    try {
      setIsDeploying(true);
      setDeployError(null);
      setResult(null);

      setDeployStep('1/3: Preparing contract circuits and initial state...');
      const privateState = privateStateFor(undefined);

      setDeployStep('2/3: Generating ZK proof with proof server (takes ~30s)...');
      console.log('[AdminDeploy] Calling deployHub with providers...');

      const deploymentResult = await deployHub(providers, privateState);
      const address = deploymentResult.contractAddress;
      const txHash = (deploymentResult.deployed as any).deployTxData?.public?.txHash || 'confirmed';

      console.log('[AdminDeploy] Successfully deployed on-chain:', address);
      setDeployStep('3/3: Contract successfully deployed on Midnight Preview!');
      setResult({ contractAddress: address, txHash });

      // Automatically activate in app
      setContractAddress(address);

      // Attempt to save to frontend/.env and deployment.json via backend endpoint if available
      try {
        await fetch('/api/save-deployment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contractAddress: address, txHash }),
        });
      } catch {
        // Dev server fallback
      }
    } catch (err: any) {
      console.error('[AdminDeploy] Deployment failed:', err);
      setDeployError(formatError(err?.message || String(err)));
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-8 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-2xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 border border-amber-500/20 mb-2">
            Developer Setup (Run Once)
          </div>
          <h2 className="text-2xl font-heading font-bold text-slate-800">
            Deploy Single Hub Smart Contract
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Deploys the central MidnightBet contract using your connected 1AM Wallet.
          </p>
        </div>
        <button
          onClick={() => onNavigate('home')}
          className="text-xs text-slate-400 hover:text-slate-600 underline"
        >
          Back to Lobby
        </button>
      </div>

      <div className="space-y-4">
        {/* Connected Wallet Info */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500 font-medium">Deployer Wallet:</span>
            <span className="font-mono text-slate-700 font-semibold">
              {isConnected ? (
                <>
                  <span className="text-primary mr-1">[{walletName || '1AM Wallet'}]</span>
                  {walletAddress?.slice(0, 12)}...{walletAddress?.slice(-6)}
                </>
              ) : (
                <span className="text-rose-500 font-sans">Not Connected (Connect in Header)</span>
              )}
            </span>
          </div>

          <div className="flex justify-between text-xs">
            <span className="text-slate-500 font-medium">Current Active Hub:</span>
            <span className="font-mono text-slate-700">
              {contractAddress ? (
                <span className="text-emerald-600 font-bold">{contractAddress.slice(0, 10)}...{contractAddress.slice(-4)}</span>
              ) : (
                <span className="text-amber-600 font-sans italic">None set yet (deploy required)</span>
              )}
            </span>
          </div>
        </div>

        {/* Status / Step Message */}
        {isDeploying && (
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200/70 text-blue-800 text-sm space-y-2 animate-pulse">
            <div className="flex items-center gap-2 font-semibold">
              <span className="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
              Deployment in Progress...
            </div>
            <p className="text-xs text-blue-600 font-mono">{deployStep}</p>
            <p className="text-[11px] text-blue-500">
              Please watch for the 1AM Wallet popup to approve the transaction.
            </p>
          </div>
        )}

        {/* Error Box */}
        {deployError && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            <p className="font-semibold text-xs uppercase tracking-wider mb-1">Deployment Error</p>
            <p className="text-xs font-mono">{deployError}</p>
          </div>
        )}

        {/* Success Box */}
        {result && (
          <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3">
            <div className="flex items-center gap-2 text-base font-bold text-emerald-700">
              <span>🎉</span> Contract Deployed Successfully to Midnight Preview!
            </div>
            <div className="space-y-1 font-mono text-xs bg-white/70 p-3 rounded-lg border border-emerald-200/50">
              <div><span className="text-slate-500">Contract Address:</span> <strong className="text-slate-800 break-all">{result.contractAddress}</strong></div>
              {result.txHash && <div><span className="text-slate-500">Tx Hash:</span> <span className="text-slate-700 break-all">{result.txHash}</span></div>}
            </div>
            <p className="text-xs text-emerald-700">
              ✓ Contract address has been automatically applied to this browser session! Players can now create and join rooms.
            </p>
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className="btn-primary py-2 px-5 text-sm"
              >
                Go to Lobby (Create/Join Rooms)
              </button>
            </div>
          </div>
        )}

        {/* Deploy Action Button */}
        {!result && (
          <div className="pt-2">
            <button
              type="button"
              onClick={handleDeploy}
              disabled={isDeploying || !isConnected}
              className={`w-full py-4 px-6 rounded-xl font-bold text-white shadow-xl transition-all flex items-center justify-center gap-3 ${
                isDeploying || !isConnected
                  ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                  : 'bg-gradient-to-r from-primary to-accent-purple hover:opacity-95 hover:shadow-primary/30 active:scale-[0.99]'
              }`}
            >
              {isDeploying ? (
                <>
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Deploying Contract...
                </>
              ) : (
                <>
                  <span>🚀</span> Deploy Single Hub Contract (1AM Wallet)
                </>
              )}
            </button>
            <p className="text-center text-[11px] text-slate-400 mt-2">
              Note: This only needs to be run once by the developer. All players will use this contract.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
