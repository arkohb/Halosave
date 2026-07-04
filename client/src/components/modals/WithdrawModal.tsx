import React, { useState, useId } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Lock, ShieldAlert, CheckCircle2, AlertTriangle, Timer, AlertOctagon, HelpCircle, ArrowRightLeft } from 'lucide-react';
import { formatMoney } from '../../lib/utils.ts';

export const WithdrawModal: React.FC = () => {
  const { isWithdrawModalOpen, setIsWithdrawModalOpen, tranches, user, processWithdraw } = useApp();
  
  const destId = useId();
  const trancheSelectId = useId();
  const amountInputId = useId();

  const [selectedTrancheId, setSelectedTrancheId] = useState<string>('');
  const [destAccount, setDestAccount] = useState('MTN Mobile Money (+233 54 *** 4567)');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultState, setResultState] = useState<{ success?: boolean; error?: string; message?: string; payoutAmount?: number; pendingApproval?: boolean } | null>(null);
  const [isEmergency, setIsEmergency] = useState<boolean>(false);

  const currentTranche = tranches.find(t => t.id === selectedTrancheId) || tranches[0];
  const isMatured = currentTranche?.status === 'matured';
  const currency = user?.currency || 'GHS';

  React.useEffect(() => {
    if (tranches.length > 0 && !selectedTrancheId) {
      // Prefer selecting a matured tranche if available
      const matured = tranches.find(t => t.status === 'matured');
      setSelectedTrancheId(matured ? matured.id : tranches[0].id);
    }
  }, [tranches, selectedTrancheId]);

  React.useEffect(() => {
    setIsEmergency(false);
  }, [selectedTrancheId, isWithdrawModalOpen]);

  React.useEffect(() => {
    // Current tranche changed, reset any local state if needed
  }, [currentTranche]);

  if (!isWithdrawModalOpen) return null;

  const handleWithdrawAttempt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTranche) return;
    
    if (!isMatured && !isEmergency) {
      alert("Withdrawals are strictly locked until the maturity date has elapsed.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await processWithdraw(currentTranche.id, destAccount, currentTranche.currentValuation, isEmergency);
      setResultState(res);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsWithdrawModalOpen(false);
    setResultState(null);
  };

  const getCountdownString = (unlockDateStr: string) => {
    const diffMs = new Date(unlockDateStr).getTime() - Date.now();
    if (diffMs <= 0) return 'Matured & Compounding';
    const totalSecs = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSecs / (3600 * 24));
    const hours = Math.floor((totalSecs % (3600 * 24)) / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    return `${days}d ${hours}h ${mins}m remaining`;
  };

  // Live simulation variables
  const simulatedPayout = currentTranche?.currentValuation || 0;
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';
  const canSubmit = isMatured || (isEmergency && !isMatured);

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-start p-4 sm:p-8 bg-halo-cream/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-halo-card border border-halo-border rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative mt-8 sm:mt-12 mb-auto h-fit">
        
        <div className="flex items-center justify-between pb-4 border-b border-halo-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-halo-gold/10 rounded-xl text-halo-gold border border-halo-gold/20">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-halo-dark">Redeem & Withdraw</h3>
              <p className="text-xs text-halo-text-tertiary">Strict Lock Validation Engine</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-halo-text-tertiary hover:text-halo-dark text-sm">✕</button>
        </div>

        {!resultState && (
          <form onSubmit={handleWithdrawAttempt} className="space-y-4 pt-4">
            
            {/* Select Tranche */}
            <div className="space-y-1.5">
              <label htmlFor={trancheSelectId} className="text-[10px] font-bold uppercase tracking-wider text-halo-text-tertiary">
                Select Savings Tranche
              </label>
              <select
                id={trancheSelectId}
                value={selectedTrancheId}
                onChange={(e) => setSelectedTrancheId(e.target.value)}
                className="w-full bg-halo-cream border border-halo-border rounded-xl px-4 py-3 text-xs text-halo-dark focus:outline-none focus:border-amber-500 font-mono"
              >
                {tranches.filter(t => t.status !== 'withdrawn' && t.status !== 'pending_approval').map(t => (
                  <option key={t.id} value={t.id}>
                    [{t.status.toUpperCase()}] {t.vaultName} — {formatMoney(t.currentValuation, currency)}
                  </option>
                ))}
              </select>
            </div>

            {/* Tranche Details */}
            {currentTranche && (
              <div className={`p-4 rounded-2xl border text-xs space-y-2 font-mono ${
                isMatured
                  ? 'bg-halo-gold/10 border-halo-gold/30 text-emerald-200'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
              }`}>
                <div className="flex justify-between font-bold text-sm">
                  <span className="flex items-center gap-1">
                    STATUS: {currentTranche.status.toUpperCase()}
                  </span>
                  <span>{formatMoney(currentTranche.currentValuation, currency)}</span>
                </div>
                
                <div className="flex justify-between text-halo-text-tertiary">
                  <span>UNITS PURCHASED</span>
                  <span>{currentTranche.investmentUnits ? currentTranche.investmentUnits.toFixed(4) : '0.0000'} Units</span>
                </div>
                <div className="flex justify-between text-halo-text-tertiary">
                  <span>PROFIT ACCRUED</span>
                  <span className="text-halo-gold">+{formatMoney(currentTranche.profitEarned || 0, currency)}</span>
                </div>

                <div className="flex justify-between text-halo-text-tertiary pt-1.5 border-t border-halo-border/80">
                  <span className="flex items-center gap-1">
                    <Timer className="w-3.5 h-3.5 text-amber-400" />
                    LOCK COUNTDOWN
                  </span>
                  <span className={isMatured ? 'text-halo-gold font-bold' : 'text-amber-400 font-bold'}>
                    {getCountdownString(currentTranche.unlockDate)}
                  </span>
                </div>
              </div>
            )}

            {/* Live Fee / Simulation breakdown */}
            {currentTranche && (
              <div className="p-3 bg-halo-cream rounded-xl border border-halo-border/80 space-y-1.5 font-mono text-[10px]">
                <div className="flex justify-between text-halo-text-tertiary">
                  <span>LIQUIDATION GROSS</span>
                  <span className="text-halo-dark font-bold">{formatMoney(simulatedPayout, currency)}</span>
                </div>
                {isEmergency && !isMatured && (
                  <div className="flex justify-between text-rose-400">
                    <span>LOCK-BREAKER PENALTY (2.5%)</span>
                    <span>-{formatMoney(simulatedPayout * 0.025, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-halo-gold pt-1 border-t border-halo-border">
                  <span>NET PAYOUT ESTIMATE</span>
                  <span className="text-xs font-extrabold">
                    {formatMoney(isEmergency && !isMatured ? simulatedPayout * 0.975 : simulatedPayout, currency)}
                  </span>
                </div>
              </div>
            )}

            {!isMatured && isAdmin && (
              <div className="p-3.5 rounded-2xl bg-rose-500/5 border border-rose-500/25 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="emergency-override"
                    checked={isEmergency}
                    onChange={(e) => setIsEmergency(e.target.checked)}
                    className="w-4 h-4 rounded border-halo-border text-rose-500 focus:ring-rose-500 cursor-pointer"
                  />
                  <label htmlFor="emergency-override" className="text-xs font-bold text-rose-400 cursor-pointer select-none">
                    Override locks & trigger instant emergency breakout
                  </label>
                </div>
                <p className="text-[10px] text-halo-text-tertiary leading-relaxed pl-6">
                  ⚠️ Authorizing this breakout instantly liquidates early savings units, subjects the transfer to a 2.5% penalty, and bypasses standard regulatory admin queues.
                </p>
              </div>
            )}

            {!isMatured && !isEmergency && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-950/40 border border-amber-500/20 text-halo-text-secondary text-[11px]">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  This tranche has not matured. Withdrawals are strictly locked until the maturity date has elapsed. {isAdmin && "Check the emergency breakout option above to override."}
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor={destId} className="text-[10px] font-bold uppercase tracking-wider text-halo-text-tertiary">
                Payout Destination Account
              </label>
              <input
                id={destId}
                type="text"
                value={destAccount}
                onChange={(e) => setDestAccount(e.target.value)}
                className="w-full bg-halo-cream border border-halo-border rounded-xl px-4 py-2.5 text-xs text-halo-dark focus:outline-none focus:border-halo-gold font-mono"
                required
                disabled={!canSubmit}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !canSubmit}
              className={`w-full py-3.5 rounded-xl font-extrabold text-xs shadow-xl transition-all flex items-center justify-center gap-1.5 ${
                canSubmit
                  ? isEmergency && !isMatured
                    ? 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-500 hover:to-rose-400 text-white'
                    : 'bg-gradient-to-r from-halo-gold to-teal-600 hover:from-halo-gold hover:to-teal-500 text-halo-dark'
                  : 'bg-halo-secondary text-halo-text-muted cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                'Processing Liquidation...'
              ) : isMatured ? (
                <span>Redeem & Pay Out 💰</span>
              ) : isEmergency ? (
                <span>Force Emergency Breakout 🚨</span>
              ) : (
                <span>Locked 🔒</span>
              )}
            </button>
          </form>
        )}

        {/* Success / Error Outcome View */}
        {resultState && (
          <div className="py-6 flex flex-col items-center justify-center text-center space-y-5 animate-in zoom-in-95">
            {resultState.pendingApproval || resultState.success || resultState.payoutAmount ? (
              <>
                <div className="w-14 h-14 bg-halo-gold/20 rounded-full flex items-center justify-center text-halo-gold border border-halo-gold/40">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                
                {resultState.pendingApproval ? (
                  <>
                    <h3 className="font-extrabold text-xl text-halo-dark">Exception Requested</h3>
                    <div className="text-xs text-halo-text-secondary max-w-sm space-y-2 leading-relaxed">
                      <p>
                        Your standard early redemption request of <strong className="text-amber-400 font-mono">{formatMoney(resultState.payoutAmount || 0, currency)}</strong> has been queued.
                      </p>
                      <p className="p-3 rounded-xl bg-halo-cream/60 border border-halo-border/80 text-[11px] text-halo-text-tertiary">
                        🛡️ For savings discipline, a Super Admin must authorize this early release. Your request will be queued for Admin review.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="font-extrabold text-xl text-halo-dark">Redemption Complete!</h3>
                    <div className="text-xs text-halo-text-secondary max-w-sm space-y-2 leading-relaxed">
                      <p>
                        Successfully liquidated and paid out <strong className="text-halo-gold font-mono">{formatMoney(resultState.payoutAmount || 0, currency)}</strong> to <strong className="text-halo-dark font-mono text-[11px]">{destAccount}</strong>.
                      </p>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="w-14 h-14 bg-rose-500/20 rounded-full flex items-center justify-center text-rose-400 border border-rose-500/40">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <h3 className="font-extrabold text-lg text-rose-400">Liquidation Blocked</h3>
                <p className="text-xs text-halo-text-secondary bg-halo-cream p-4 rounded-xl border border-rose-500/20 max-w-sm leading-relaxed">
                  {resultState.message || 'HaloSave discipline rules prevented early lock dissolution.'}
                </p>
              </>
            )}

            <button
              onClick={handleClose}
              className="w-full py-3 rounded-xl bg-halo-secondary hover:bg-halo-tertiary text-halo-dark font-bold text-xs transition-all"
            >
              Done
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
