import React, { useState, useId } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Shield, Lock, CreditCard, Smartphone, Building2, Sparkles, CheckCircle2, ExternalLink, Printer } from 'lucide-react';
import { formatMoney } from '../../lib/utils.ts';
import { CurrencyCode } from '../../types/index.ts';
import { ApiClient } from '../../api/client.ts';
import { Vault3DDoor } from '../dashboard/Vault3DDoor.tsx';


export const DepositModal: React.FC = () => {
  const { isDepositModalOpen, setIsDepositModalOpen, vaults, user, simulation, preselectedVaultId, refreshState } = useApp();
  
  const amountId = useId();
  const vaultSelectId = useId();
  const lockSelectId = useId();

  const [selectedVaultId, setSelectedVaultId] = useState<string>(preselectedVaultId || (vaults[0]?.id || 'general'));
  const [amount, setAmount] = useState<string>('500');
  const [lockDays, setLockDays] = useState<number>(90);
  const [paymentMethod, setPaymentMethod] = useState<'paystack_card' | 'mobile_money' | 'bank_transfer'>('paystack_card');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'input' | 'review' | 'processing' | 'success'>('input');
  const [lastReceipt, setLastReceipt] = useState<any>(null);

  // Investment Engine Expanded States
  const [selectedProvider, setSelectedProvider] = useState<string>('DATABANK_MFUND');
  const [autoRedeem, setAutoRedeem] = useState<boolean>(true);

  // Paystack detailed states
  const [paystackRef, setPaystackRef] = useState<string>('');
  const [authUrl, setAuthUrl] = useState<string>('');
  const [verificationError, setVerificationError] = useState<string>('');
  const [pollingActive, setPollingActive] = useState<boolean>(false);

  // Derive Vault Tiers for 3D visual representing
  const selectedVault = vaults.find(v => v.id === selectedVaultId);
  const getTierForVault = (v: any) => {
    if (!v) return 'gold_premium';
    const days = Number(v.defaultLockPeriod || 90);
    const color = (v.color || '').toLowerCase();
    if (color === 'slate' || color === 'emerald' || color === 'green' || days <= 60) {
      return 'silver_starter';
    }
    if (color === 'amber' || color === 'yellow' || color === 'cyan' || days <= 180) {
      return 'gold_premium';
    }
    return 'platinum_elite';
  };
  const activeTierId = selectedVault ? getTierForVault(selectedVault) : 'gold_premium';

  // Sync selected vault if preselected changes
  React.useEffect(() => {
    if (preselectedVaultId) setSelectedVaultId(preselectedVaultId);
  }, [preselectedVaultId]);

  if (!isDepositModalOpen) return null;

  const currentCurrency: CurrencyCode = user?.currency || 'GHS';
  
  // Resolve dynamic provider settings from simulation
  const availableProviders = simulation?.providers || [
    { id: 'DATABANK_MFUND', name: 'Databank MFund (Tier-1 Licensed)', currentNAV: 2.4815, annualReturnPercentage: 19.2 },
    { id: 'EDC_FIXED_INCOME', name: 'EDC Fixed Income Fund (Tier-1 Licensed)', currentNAV: 1.5200, annualReturnPercentage: 20.5 },
    { id: 'STANBIC_CASH_TRUST', name: 'Stanbic Cash Trust (Tier-1 Licensed)', currentNAV: 3.1200, annualReturnPercentage: 18.0 },
    { id: 'VANGUARD_HALOSAVE_FUND', name: 'Vanguard HaloSave Growth Fund (Tier-1 Licensed)', currentNAV: 10.4500, annualReturnPercentage: 12.8 },
  ];
  
  const currentProv = availableProviders.find((p: any) => p.id === selectedProvider) || availableProviders[0];
  const nav = currentProv.currentNAV;
  const apy = currentProv.annualReturnPercentage;

  const numAmount = parseFloat(amount) || 0;
  const estimatedUnits = (numAmount / nav).toFixed(4);
  const unlockDateObj = new Date(Date.now() + lockDays * 24 * 3600 * 1000);
  const formattedUnlockDate = unlockDateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const handleReviewDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (numAmount < 10) return;
    setStep('review');
  };

  const handleConfirmDeposit = async () => {
    if (numAmount < 10) return;

    setIsSubmitting(true);
    setStep('processing');
    setVerificationError('');

    try {
      // 1. Initialize Paystack payment on our backend
      const initRes = await ApiClient.initializePayment({
        amount: numAmount,
        vaultId: selectedVaultId,
        lockDays: Number(lockDays),
        email: user?.email || '',
        currency: currentCurrency,
        investmentProvider: selectedProvider,
        autoRedeem: autoRedeem,
        paymentMethod: paymentMethod
      });

      if (initRes.success && initRes.authorizationUrl) {
        setPaystackRef(initRes.reference);
        setAuthUrl(initRes.authorizationUrl);
        setPollingActive(true);

        // 2. Open payment gateway popup
        const width = 500;
        const height = 650;
        const left = window.screenX + (window.innerWidth - width) / 2;
        const top = window.screenY + (window.innerHeight - height) / 2;
        const popup = window.open(
          initRes.authorizationUrl,
          'PaystackCheckout',
          `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
        );

        // 3. Setup polling interval to verify payment in our local DB
        const pollInterval = setInterval(async () => {
          try {
            const checkRes = await ApiClient.verifyPayment(initRes.reference);
            if (checkRes.success && checkRes.status === 'successful') {
              clearInterval(pollInterval);
              setPollingActive(false);
              
              // Close popup if still open
              if (popup && !popup.closed) {
                popup.close();
              }

              // Fetch detailed formatted receipt
              const receiptRes = await ApiClient.getReceipt(checkRes.transaction.id);
              if (receiptRes.success) {
                setLastReceipt(receiptRes.details);
              } else {
                setLastReceipt(checkRes.transaction);
              }

              // Trigger full AppContext state refresh (balance, tranches, etc.)
              await refreshState();

              setStep('success');
              setIsSubmitting(false);
            } else if (checkRes.status === 'failed') {
              clearInterval(pollInterval);
              setPollingActive(false);
              setVerificationError(checkRes.error || 'Payment failed on gateway.');
              setStep('input');
              setIsSubmitting(false);
            }
          } catch (err: any) {
            console.error('Polling check error:', err);
          }
        }, 2000);

        // Automatically clean up interval after 10 minutes to prevent memory leaks
        setTimeout(() => {
          clearInterval(pollInterval);
          setPollingActive(false);
        }, 10 * 60 * 1000);

        // Also listen for postMessage from Sandbox/Gateway window
        const messageListener = async (event: MessageEvent) => {
          if (event.data && event.data.reference === initRes.reference) {
            if (event.data.type === 'PAYSTACK_SUCCESS') {
              clearInterval(pollInterval);
              setPollingActive(false);
              window.removeEventListener('message', messageListener);

              // Instantly verify and fetch receipt
              const checkRes = await ApiClient.verifyPayment(initRes.reference);
              if (checkRes.success && checkRes.status === 'successful') {
                const receiptRes = await ApiClient.getReceipt(checkRes.transaction.id);
                setLastReceipt(receiptRes.success ? receiptRes.details : checkRes.transaction);
                await refreshState();
                setStep('success');
                setIsSubmitting(false);
              }
            } else if (event.data.type === 'PAYSTACK_CANCELLED') {
              clearInterval(pollInterval);
              setPollingActive(false);
              window.removeEventListener('message', messageListener);
              setVerificationError('Transaction was canceled.');
              setStep('input');
              setIsSubmitting(false);
            }
          }
        };
        window.addEventListener('message', messageListener);

      } else {
        throw new Error('Failed to obtain payment authorization URL.');
      }
    } catch (err: any) {
      console.error('Initialization payment error:', err);
      setVerificationError(err.message || 'Unable to connect to Paystack gateway.');
      setStep('input');
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsDepositModalOpen(false);
    setStep('input');
    setAmount('500');
    setVerificationError('');
    setPaystackRef('');
    setAuthUrl('');
  };


  const lockOptions = [
    { days: 30, label: '30 Days (Short Lock)' },
    { days: 60, label: '60 Days (Standard)' },
    { days: 90, label: '90 Days (Quarterly Lock 🔥)' },
    { days: 180, label: '180 Days (Half-Year Shield)' },
    { days: 365, label: '365 Days (Wealth Builder)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-start p-4 sm:p-8 bg-halo-cream/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-halo-card border border-halo-border rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative mt-8 sm:mt-12 mb-auto h-fit">
        
        {/* Background Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-halo-gold/10 rounded-full blur-3xl pointer-events-none" />

        {step === 'input' && (
          <form onSubmit={handleReviewDeposit} className="space-y-6 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-halo-gold/10 rounded-xl text-halo-gold border border-halo-gold/20">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-halo-dark">Deposit & Lock Savings</h3>
                  <p className="text-xs text-halo-text-tertiary">Powered by Paystack & Databank MFund</p>
                </div>
              </div>
              <button type="button" onClick={handleClose} className="text-halo-text-tertiary hover:text-halo-dark text-sm">✕</button>
            </div>

            {/* Target Vault Selector */}
            <div className="space-y-1.5">
              <label htmlFor={vaultSelectId} className="text-xs font-semibold uppercase tracking-wider text-halo-text-secondary">
                Destination Vault
              </label>
              <select
                id={vaultSelectId}
                value={selectedVaultId}
                onChange={(e) => setSelectedVaultId(e.target.value)}
                className="w-full bg-halo-cream border border-halo-border rounded-xl px-4 py-3 text-sm text-halo-dark focus:outline-none focus:border-halo-gold transition-colors"
              >
                {vaults.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} (Target: {formatMoney(v.targetAmount, currentCurrency)})
                  </option>
                ))}
              </select>
            </div>

            {/* Amount Input */}
            <div className="space-y-1.5">
              <label htmlFor={amountId} className="text-xs font-semibold uppercase tracking-wider text-halo-text-secondary flex justify-between">
                <span>Amount ({currentCurrency})</span>
                <span className="text-halo-gold font-mono">Min: {currentCurrency} 10.00</span>
              </label>
              <div className="relative">
                <span className="absolute left-5 top-3.5 text-halo-text-tertiary font-bold">{currentCurrency === 'GHS' ? 'GHS' : '$'}</span>
                <input
                  id={amountId}
                  type="number"
                  min="10"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-halo-cream border border-halo-border rounded-xl pl-16 pr-4 py-3 text-lg font-bold text-halo-dark focus:outline-none focus:border-halo-gold transition-colors font-mono"
                  placeholder="500.00"
                  required
                />
              </div>
              <div className="flex gap-2 pt-1">
                {[100, 250, 500, 1000, 5000].map(chip => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setAmount(chip.toString())}
                    className="flex-1 py-1 text-[11px] font-mono rounded-lg bg-halo-secondary/80 hover:bg-halo-tertiary text-halo-text-secondary transition-colors"
                  >
                    +{chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Strict Withdrawal Lock Period */}
            <div className="space-y-1.5">
              <label htmlFor={lockSelectId} className="text-xs font-semibold uppercase tracking-wider text-halo-text-secondary flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Strict Withdrawal Lock Horizon</span>
              </label>
              <select
                id={lockSelectId}
                value={lockDays}
                onChange={(e) => setLockDays(Number(e.target.value))}
                className="w-full bg-halo-cream border border-halo-border rounded-xl px-4 py-3 text-sm text-halo-dark focus:outline-none focus:border-halo-gold font-medium"
              >
                {lockOptions.map((opt) => (
                  <option key={opt.days} value={opt.days}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Licensed Mutual Fund Provider Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-halo-text-secondary flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-halo-gold" />
                <span>SEC-Licensed Mutual Fund Provider</span>
              </label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="w-full bg-halo-cream border border-halo-border rounded-xl px-4 py-3 text-sm text-halo-dark focus:outline-none focus:border-halo-gold font-medium"
              >
                {availableProviders.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (~{p.annualReturnPercentage}% APY)
                  </option>
                ))}
              </select>
            </div>

            {/* Auto Redemption Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-halo-cream border border-halo-border">
              <div className="space-y-0.5 max-w-[80%]">
                <span className="text-xs font-semibold text-halo-dark flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-halo-gold" /> Auto-Redemption on Maturity
                </span>
                <p className="text-[10px] text-halo-text-tertiary">
                  Automatically liquidate units at maturity and transfer value directly into your available cash balance.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRedeem}
                  onChange={(e) => setAutoRedeem(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-halo-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-halo-card after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-halo-gold"></div>
              </label>
            </div>

            {/* Instant Investment Engine Simulation Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-halo-gold/10 via-teal-500/5 to-slate-900 border border-halo-gold/20 space-y-2">
              <div className="flex items-center justify-between text-xs text-emerald-300 font-semibold">
                <span className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> Investment Allocation Preview</span>
                <span>NAV: {nav}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1 text-xs font-mono">
                <div className="bg-halo-cream/60 p-2.5 rounded-xl border border-halo-border">
                  <span className="text-halo-text-tertiary block text-[10px]">UNITS ALLOCATED</span>
                  <span className="text-halo-dark font-bold text-sm">{estimatedUnits} units</span>
                </div>
                <div className="bg-halo-cream/60 p-2.5 rounded-xl border border-halo-border">
                  <span className="text-halo-text-tertiary block text-[10px]">MATURITY UNLOCK</span>
                  <span className="text-amber-400 font-bold text-sm">{formattedUnlockDate}</span>
                </div>
              </div>
            </div>

            {/* Paystack Payment Method */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-halo-text-secondary block">Payment Gateway</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'paystack_card', label: 'Card Payment', icon: CreditCard },
                  { id: 'mobile_money', label: 'Mobile Money', icon: Smartphone },
                  { id: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
                ].map(m => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs gap-1.5 transition-all ${
                        paymentMethod === m.id
                          ? 'bg-halo-gold/15 border-halo-gold text-halo-dark font-bold'
                          : 'bg-halo-cream border-halo-border text-halo-text-tertiary hover:border-halo-border-hover'
                      }`}
                    >
                      <Icon className="w-4 h-4 text-halo-gold" />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Discipline Rule Notice */}
            <p className="text-[11px] text-halo-text-tertiary bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl leading-relaxed">
              ⚠️ **Discipline Mandate**: By initiating this deposit, you consent that these funds are strictly locked until maturity ({formattedUnlockDate}). No impulsive withdrawals are permitted.
            </p>

            {verificationError && (
              <div className="p-3.5 text-xs bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 font-medium">
                ⚠️ {verificationError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || numAmount < 10}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-halo-gold to-teal-600 hover:from-halo-gold hover:to-teal-500 text-halo-dark font-extrabold text-sm shadow-xl shadow-halo-gold/25 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              Review Deposit Details
            </button>
          </form>
        )}

        {step === 'review' && (
          <div className="space-y-6 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-halo-gold/10 rounded-xl text-halo-gold border border-halo-gold/20">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-halo-dark">Confirm Deposit Details</h3>
                  <p className="text-xs text-halo-text-tertiary">Please review before proceeding</p>
                </div>
              </div>
              <button type="button" onClick={handleClose} className="text-halo-text-tertiary hover:text-halo-dark text-sm">✕</button>
            </div>

            {/* 3D representation */}
            <div className="flex flex-col items-center justify-center py-2 bg-slate-950/60 rounded-2xl border border-halo-border/60 relative overflow-hidden">
              <div className="transform scale-[0.65] origin-center -my-6">
                <Vault3DDoor tier={activeTierId} isOpen={false} />
              </div>
              <span className="text-[10px] font-mono text-halo-gold font-bold uppercase tracking-widest mt-1">
                SECURE {activeTierId.replace('_', ' ').toUpperCase()} CHAMBER
              </span>
            </div>

            <div className="bg-halo-cream border border-halo-border rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-halo-text-secondary">Amount</span>
                <span className="font-bold text-halo-dark">{currentCurrency} {numAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-halo-text-secondary">Vault</span>
                <span className="font-medium text-halo-dark">{vaults.find(v => v.id === selectedVaultId)?.name || selectedVaultId}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-halo-text-secondary">Provider</span>
                <span className="font-medium text-halo-dark truncate max-w-[150px]">{currentProv.name}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-halo-text-secondary">Lock Duration</span>
                <span className="font-medium text-halo-dark">{lockDays} Days</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-halo-text-secondary">Payment Method</span>
                <span className="font-medium text-halo-dark capitalize">{paymentMethod.replace('_', ' ')}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('input')}
                className="flex-1 py-4 rounded-xl bg-halo-secondary hover:bg-halo-tertiary text-halo-text-secondary font-bold text-sm transition-all"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirmDeposit}
                disabled={isSubmitting}
                className="flex-[2] py-4 rounded-xl bg-gradient-to-r from-halo-gold to-teal-600 hover:from-halo-gold hover:to-teal-500 text-halo-dark font-extrabold text-sm shadow-xl shadow-halo-gold/25 active:scale-[0.99] transition-all disabled:opacity-50"
              >
                Confirm GHS {numAmount.toFixed(2)} Deposit 🔒
              </button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="flex flex-col items-center justify-center py-2 relative overflow-hidden w-full">
              <div className="transform scale-[0.75] origin-center -my-4">
                <Vault3DDoor tier={activeTierId} isOpen={true} isAnimating={true} />
              </div>
            </div>
            <h4 className="font-bold text-lg text-halo-dark">Handshaking Paystack Gateway...</h4>
            <p className="text-xs text-halo-text-tertiary max-w-xs leading-relaxed">
              Verifying transaction credentials, crediting vault, and allocating Databank MFund mutual units.
            </p>
            {pollingActive && (
              <div className="space-y-3 pt-6 w-full max-w-xs">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const checkRes = await ApiClient.verifyPayment(paystackRef);
                      if (checkRes.success && checkRes.status === 'successful') {
                        const receiptRes = await ApiClient.getReceipt(checkRes.transaction.id);
                        setLastReceipt(receiptRes.success ? receiptRes.details : checkRes.transaction);
                        await refreshState();
                        setStep('success');
                      } else {
                        alert('Payment is still pending. Please complete it in the opened window or authorize sandbox!');
                      }
                    } catch (err: any) {
                      alert('Error verifying payment: ' + (err.message || err));
                    }
                  }}
                  className="w-full py-2.5 rounded-xl bg-halo-gold hover:bg-halo-gold text-halo-dark font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  I have completed the payment
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPollingActive(false);
                    setStep('input');
                    setIsSubmitting(false);
                  }}
                  className="w-full text-center text-[11px] text-halo-text-tertiary hover:text-halo-text-secondary underline"
                >
                  Cancel and edit amount
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'success' && (
          <div className="py-6 flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center justify-center relative overflow-hidden w-full">
              <div className="transform scale-[0.75] origin-center -my-6">
                <Vault3DDoor tier={activeTierId} isOpen={true} isAnimating={false} />
              </div>
            </div>
            
            <div>
              <h3 className="font-extrabold text-2xl text-halo-dark">Vault Secured!</h3>
              <p className="text-xs text-halo-text-secondary mt-1">Your savings are actively compounding in Databank MFund</p>
            </div>

            <div className="w-full bg-halo-cream p-4 rounded-2xl border border-halo-border text-left space-y-2 text-xs font-mono">
              <div className="flex justify-between border-b border-halo-border pb-2">
                <span className="text-halo-text-tertiary">RECEIPT NO</span>
                <span className="text-halo-gold font-bold">{lastReceipt?.receiptNo || 'RC-' + paystackRef}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-halo-text-tertiary">AMOUNT DEPOSITED</span>
                <span className="text-halo-dark font-bold">{lastReceipt?.currency || currentCurrency} {Number(lastReceipt?.amount || numAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-halo-text-tertiary">UNITS PURCHASED</span>
                <span className="text-halo-dark font-bold">{Number(lastReceipt?.unitsAllocated || estimatedUnits).toFixed(4)} MFund Units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-halo-text-tertiary">UNLOCK HORIZON</span>
                <span className="text-amber-400 font-bold">
                  {lastReceipt?.maturesAt ? new Date(lastReceipt.maturesAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : formattedUnlockDate}
                </span>
              </div>
            </div>

            <div className="flex gap-3 w-full">
              { (lastReceipt?.transactionId || lastReceipt?.id) ? (
                <a
                  href={`/api/payments/receipt/${lastReceipt?.transactionId || lastReceipt?.id}/print?token=${localStorage.getItem('halosave_token') || ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-teal-500/10 to-halo-gold/10 hover:from-teal-500/20 hover:to-halo-gold/20 text-halo-gold border border-halo-gold/25 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Printer className="w-4 h-4" />
                  Print Receipt
                </a>
              ) : (
                <button
                  onClick={() => alert('Receipt ID not found. Return to dashboard and click receipt icon in history.')}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-teal-500/10 to-halo-gold/10 hover:from-teal-500/20 hover:to-halo-gold/20 text-halo-gold border border-halo-gold/25 font-bold text-xs flex items-center justify-center gap-1.5 transition-all opacity-50"
                >
                  <Printer className="w-4 h-4" />
                  Print Receipt
                </button>
              )}
              
              <button
                onClick={handleClose}
                className="flex-1 py-3 rounded-xl bg-halo-secondary hover:bg-halo-tertiary text-halo-dark font-bold text-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
