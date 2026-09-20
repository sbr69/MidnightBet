import { useMidnight } from '../MidnightContext';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { availableWallets, connect, isConnecting } = useMidnight();

  if (!isOpen) return null;

  const handleConnect = async (walletId?: string) => {
    try {
      await connect(walletId);
      onClose();
    } catch {
      // Error is set in MidnightContext
    }
  };

  const has1AM = availableWallets.some((w) => /1am/i.test(w.name) || /1am/i.test(w.id));
  const hasLace = availableWallets.some((w) => /lace/i.test(w.name) || /lace/i.test(w.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6 relative">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
              ✦
            </div>
            <div>
              <h3 className="text-xl font-heading font-bold text-slate-800">Connect Wallet</h3>
              <p className="text-xs text-slate-500">Midnight Preview Network</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            ✕
          </button>
        </div>

        {availableWallets.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Detected Wallets
            </p>

            {/* 1AM Wallet */}
            {has1AM && (
              <button
                type="button"
                onClick={() => handleConnect('1AM')}
                disabled={isConnecting}
                className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary text-white font-heading font-black text-sm flex items-center justify-center shadow-md shadow-primary/30">
                    1AM
                  </div>
                  <div>
                    <div className="font-heading font-bold text-slate-800 group-hover:text-primary transition">
                      1AM Wallet
                    </div>
                    <div className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Native Remote Prover (No Docker required)
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold text-primary px-2.5 py-1 rounded-full bg-primary/10">
                  Recommended
                </span>
              </button>
            )}

            {/* Lace Wallet */}
            {hasLace && (
              <button
                type="button"
                onClick={() => handleConnect('lace')}
                disabled={isConnecting}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 text-white font-heading font-bold text-sm flex items-center justify-center">
                    L
                  </div>
                  <div>
                    <div className="font-heading font-bold text-slate-800 group-hover:text-slate-900 transition">
                      Lace Wallet
                    </div>
                    <div className="text-xs text-slate-500">Midnight DApp Connector</div>
                  </div>
                </div>
                <span className="text-slate-400 group-hover:translate-x-0.5 transition">→</span>
              </button>
            )}

            {/* Other generic wallets */}
            {availableWallets
              .filter((w) => !/1am/i.test(w.name) && !/lace/i.test(w.name))
              .map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => handleConnect(w.id)}
                  disabled={isConnecting}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition text-left"
                >
                  <div className="font-heading font-bold text-slate-800">{w.name}</div>
                  <span className="text-slate-400">→</span>
                </button>
              ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 text-xl font-bold">
              !
            </div>
            <h4 className="font-heading font-bold text-slate-800 mb-1">No Wallet Detected</h4>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Install a Midnight-compatible browser extension to connect to the Preview network.
            </p>

            <div className="space-y-2">
              <a
                href="https://1am.xyz"
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-between p-3 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition text-left"
              >
                <div>
                  <div className="font-heading font-bold text-xs text-primary">Get 1AM Wallet (Recommended)</div>
                  <div className="text-[11px] text-slate-500">Built-in remote ZK proving & DUST sponsorship</div>
                </div>
                <span className="text-xs text-primary font-bold">Install ↗</span>
              </a>

              <a
                href="https://www.lace.io"
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition text-left"
              >
                <div>
                  <div className="font-heading font-bold text-xs text-slate-800">Get Lace Wallet</div>
                  <div className="text-[11px] text-slate-500">Official IOG Midnight wallet extension</div>
                </div>
                <span className="text-xs text-slate-600 font-bold">Install ↗</span>
              </a>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleConnect()}
                className="text-xs text-slate-400 hover:text-slate-600 transition"
              >
                Already installed? Try connecting anyway
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
