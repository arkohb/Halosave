import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Shield, ShieldAlert, TrendingUp, Lock, ArrowUpRight, Flame, PieChart, CalendarClock, Zap, CheckCircle2, AlertTriangle, Sparkles, Plus, Play, ChevronRight, Coins } from 'lucide-react';
import { formatMoney, formatDate } from '../../lib/utils.ts';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart as RePieChart, Pie } from 'recharts';
import { Icon } from '../common/Icon.tsx';
import { Vault3DDoor } from './Vault3DDoor.tsx';

const SUBSCRIPTION_TIERS = [
  {
    id: 'silver_starter' as const,
    name: 'Silver Starter Vault',
    color: 'slate',
    apy: 12,
    lockPeriods: [30, 60],
    description: 'Perfect for flexible, short-term buffers and standard liquidity reserves.',
    features: ['12% Annual Yield Rate', 'Sovereign Lock Enforcement', 'Standard Liquidity Buffer', 'Emergency Liquidate Option'],
    minDeposit: 100,
    accent: 'slate-400',
    icon: 'Shield',
  },
  {
    id: 'gold_premium' as const,
    name: 'Gold Premium Safe',
    color: 'amber',
    apy: 18,
    lockPeriods: [90, 180],
    description: 'Our flagship dual-custody vault optimized for strategic high-yield targets.',
    features: ['18% Premium Compounding APY', 'Dual-Custody Protection', 'SEC-Licensed Custodian Backed', 'Flexible Locking Increments'],
    minDeposit: 500,
    accent: 'amber-400',
    icon: 'Award',
  },
  {
    id: 'platinum_elite' as const,
    name: 'Platinum Elite Chamber',
    color: 'indigo',
    apy: 25,
    lockPeriods: [270, 365, 730],
    description: 'VIP vault tier with institutional sovereign-grade backing and peak yields.',
    features: ['25% High-Net-Worth VIP APY', 'Priority Supervisor Payouts', 'Autonomous AI Wealth Tuning', 'Zero-Penalty Rollover Privileges'],
    minDeposit: 2500,
    accent: 'cyan-400',
    icon: 'Gem',
  }
];

export const OverviewTab: React.FC = () => {
  const { user, summary, vaults, tranches, simulation, setActiveTab, setIsDepositModalOpen, setIsWithdrawModalOpen, createVault, processDeposit } = useApp();
  const [chartHorizon, setChartHorizon] = useState<'6M' | '1Y' | '3Y'>('1Y');

  // Vault Selection, Open/Close, and Deposit states
  const [selectedVaultForDeposit, setSelectedVaultForDeposit] = useState<string | null>(null);
  const [isVaultDoorOpen, setIsVaultDoorOpen] = useState<boolean>(false);
  const [depositAmount, setDepositAmount] = useState<string>('500');
  const [depositPaymentMethod, setDepositPaymentMethod] = useState<string>('paystack_sandbox');
  const [isSecuringDeposit, setIsSecuringDeposit] = useState<boolean>(false);
  const [depositSuccessState, setDepositSuccessState] = useState<boolean>(false);

  // Custom configuration states for New Vault Creator Tier Selection
  const [selectedTierForNewVault, setSelectedTierForNewVault] = useState<'silver_starter' | 'gold_premium' | 'platinum_elite'>('gold_premium');
  const [newVaultName, setNewVaultName] = useState<string>('Gold Premium Safe 🪙');
  const [newVaultTargetAmount, setNewVaultTargetAmount] = useState<string>('5000');
  const [newVaultLockDays, setNewVaultLockDays] = useState<string>('90');
  const [isInitializingVault, setIsInitializingVault] = useState<boolean>(false);

  // Synchronize new vault name & default lock days when selected tier changes
  React.useEffect(() => {
    if (selectedTierForNewVault === 'silver_starter') {
      setNewVaultLockDays('30');
      setNewVaultName('Silver Growth Vault 🛡️');
    } else if (selectedTierForNewVault === 'gold_premium') {
      setNewVaultLockDays('90');
      setNewVaultName('Gold Premium Safe 🪙');
    } else if (selectedTierForNewVault === 'platinum_elite') {
      setNewVaultLockDays('365');
      setNewVaultName('Platinum Elite Chamber 💎');
    }
  }, [selectedTierForNewVault]);

  // Cinematic auto-selection when a new vault is created!
  const [prevVaultsCount, setPrevVaultsCount] = useState<number>(vaults.length);
  React.useEffect(() => {
    if (vaults.length > prevVaultsCount) {
      const newestVault = vaults[vaults.length - 1];
      if (newestVault) {
        setSelectedVaultForDeposit(newestVault.id);
        setTimeout(() => {
          setIsVaultDoorOpen(true);
        }, 500);
      }
    }
    setPrevVaultsCount(vaults.length);
  }, [vaults, prevVaultsCount]);

  const handleLaunchVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInitializingVault(true);
    try {
      const days = parseInt(newVaultLockDays) || 90;
      const targetDate = new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();
      const tierDetails = SUBSCRIPTION_TIERS.find(t => t.id === selectedTierForNewVault);

      await createVault({
        name: newVaultName.trim() || `${selectedTierForNewVault === 'silver_starter' ? 'Silver' : selectedTierForNewVault === 'gold_premium' ? 'Gold' : 'Platinum'} Vault`,
        color: selectedTierForNewVault === 'silver_starter' ? 'slate' : selectedTierForNewVault === 'gold_premium' ? 'amber' : 'indigo',
        icon: selectedTierForNewVault === 'silver_starter' ? 'Shield' : selectedTierForNewVault === 'gold_premium' ? 'Award' : 'Gem',
        targetAmount: parseFloat(newVaultTargetAmount) || 5000,
        targetDate,
        defaultLockPeriod: days,
        description: `${selectedTierForNewVault.toUpperCase()} subscription tier savings vault with ${tierDetails?.apy}% target APY.`
      });
    } catch (err) {
      console.error('Failed to launch vault:', err);
    } finally {
      setIsInitializingVault(false);
    }
  };

  const handleSecuredDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVaultForDeposit) return;
    
    const targetVault = vaults.find(v => v.id === selectedVaultForDeposit);
    if (!targetVault) return;

    setIsSecuringDeposit(true);
    try {
      const result = await processDeposit({
        vaultId: selectedVaultForDeposit,
        amount: parseFloat(depositAmount) || 100,
        currency,
        lockDays: targetVault.defaultLockPeriod || 90,
        paymentMethod: depositPaymentMethod
      });

      if (result && result.success) {
        setDepositSuccessState(true);
        // Play metallic closing animation after brief successful message view
        setTimeout(() => {
          setIsVaultDoorOpen(false); // Shuts in real time!
          
          // Clear focus and return to overview after door finishes slamming shut
          setTimeout(() => {
            setSelectedVaultForDeposit(null);
            setDepositSuccessState(false);
            setDepositAmount('500');
          }, 1500);
        }, 1200);
      }
    } catch (err) {
      console.error('Secure deposit process failed:', err);
    } finally {
      setIsSecuringDeposit(false);
    }
  };

  const getTierForVault = (v: any) => {
    const days = Number(v.defaultLockPeriod || 90);
    const color = (v.color || '').toLowerCase();
    if (color === 'slate' || color === 'emerald' || color === 'green' || days <= 60) {
      return SUBSCRIPTION_TIERS[0]; // Silver Starter
    }
    if (color === 'amber' || color === 'yellow' || color === 'cyan' || days <= 180) {
      return SUBSCRIPTION_TIERS[1]; // Gold Premium
    }
    return SUBSCRIPTION_TIERS[2]; // Platinum Elite
  };

  const currency = user?.currency || 'GHS';
  const nav = simulation?.currentNAV || 2.4815;
  const apy = simulation?.annualReturnPercentage || 19.2;

  // Find nearest upcoming unlock
  const lockedTranches = tranches.filter(t => t.status === 'locked');
  const nearestUnlockTranche = [...lockedTranches].sort((a, b) => new Date(a.unlockDate).getTime() - new Date(b.unlockDate).getTime())[0];
  
  const daysToNextUnlock = nearestUnlockTranche
    ? Math.max(0, Math.ceil((new Date(nearestUnlockTranche.unlockDate).getTime() - Date.now()) / (1000 * 3600 * 24)))
    : null;

  // Calculate Emergency Fund Health Score
  const emergVault = vaults.find(v => (v.name || '').toLowerCase().includes('emergency')) || vaults[0];
  const emergencyScore = emergVault && emergVault.targetAmount > 0
    ? Math.min(100, Math.round((emergVault.currentAmount / emergVault.targetAmount) * 100))
    : 50;

  // Generate MFund forecast curve data
  const forecastData = [
    { month: 'Jan', deposited: summary.totalDeposited * 0.4, value: summary.totalDeposited * 0.41 },
    { month: 'Feb', deposited: summary.totalDeposited * 0.7, value: summary.totalDeposited * 0.73 },
    { month: 'Mar', deposited: summary.totalDeposited, value: summary.totalCurrentValue },
    { month: 'Jun (Est)', deposited: summary.totalDeposited + 3000, value: (summary.totalDeposited + 3000) * (1 + apy/100 * 0.25) },
    { month: 'Sep (Est)', deposited: summary.totalDeposited + 6000, value: (summary.totalDeposited + 6000) * (1 + apy/100 * 0.5) },
    { month: 'Dec (Est)', deposited: summary.totalDeposited + 9000, value: (summary.totalDeposited + 9000) * (1 + apy/100 * 1.0) },
  ];

  // Portfolio Allocation Pie Data
  const pieColors = ['#10b981', '#6366f1', '#06b6d4', '#f59e0b', '#ec4899'];
  const portfolioData = vaults.map((v, i) => ({
    name: v.name,
    value: v.currentAmount || 1,
    color: pieColors[i % pieColors.length],
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-20">
      
      {/* KYC Verification Pending Alert (Admin Only) */}
      {user && !user.isConfirmed && user.role === 'super_admin' && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/20 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-5 animate-pulse">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-halo-dark tracking-wide">
                Verification Required: KYC Credentials Pending Confirmation 🛡️
              </h4>
              <p className="text-xs text-halo-text-secondary mt-1 leading-relaxed">
                User accounts are pending central bank KYC confirmation.
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              setActiveTab('admin');
              window.history.pushState({}, '', '/admin');
            }} 
            className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-halo-dark font-extrabold text-xs transition-all shadow-lg shadow-amber-500/10 shrink-0 whitespace-nowrap"
          >
            Open Admin to Confirm KYC
          </button>
        </div>
      )}

      {/* Top Banner Greeting & Savings Streak */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-8 rounded-xl bg-halo-cream border border-halo-border shadow-sm relative overflow-hidden">
        
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="badge-premium">
              ● DATABANK MFUND ONLINE
            </span>
            <span className="text-xs text-halo-text-tertiary font-mono">NAV: {nav} ({apy}% APY)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-halo-dark tracking-tight">
            Welcome back, {user?.fullName.split(' ')[0] || 'Bismark'} 👋
          </h1>
          <p className="text-sm text-halo-text-secondary max-w-lg">
            Your automated halosave locks are active. You have prevented impulsive spending and earned <strong className="text-halo-gold">{formatMoney(summary.totalProfit, currency)}</strong> in profit.
          </p>
        </div>

        <div className="flex items-center gap-4 self-stretch sm:self-auto bg-halo-card p-4 rounded-xl border border-halo-border shrink-0 z-10">
          <div className="p-3 bg-halo-tertiary rounded-lg text-halo-gold border border-halo-gold/30">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-halo-text-tertiary uppercase block">SAVINGS STREAK</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-halo-dark font-mono">{user?.savingsStreakDays || 48}</span>
              <span className="text-xs text-amber-400 font-bold">DAYS 🔥</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Revolut-Grade Stat Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Card 1: Total Investment Valuation */}
        <div className="md:col-span-2 card-premium relative flex flex-col justify-between overflow-hidden bg-halo-cream">
          
          <div>
            <div className="flex items-center justify-between text-halo-text-secondary">
              <span className="text-xs font-mono uppercase tracking-wider font-semibold">Current Portfolio Valuation</span>
              <span className="flex items-center gap-1 text-xs font-bold text-halo-gold bg-halo-gold/10 px-2.5 py-1 rounded-full border border-halo-gold/20">
                <TrendingUp className="w-3.5 h-3.5" /> +{apy}% APY Growth
              </span>
            </div>
            
            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-4xl sm:text-5xl font-extrabold text-halo-dark tracking-tight font-mono">
                {formatMoney(summary.totalCurrentValue, currency)}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-halo-text-tertiary">
                <span>Total Deposited:</span>
                <span className="text-halo-dark font-semibold">{formatMoney(summary.totalDeposited, currency)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-halo-text-tertiary">
                <span>Accrued MFund Profit:</span>
                <span className="text-halo-gold font-bold">+{formatMoney(summary.totalProfit, currency)}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-3 pt-6 border-t border-halo-border/80 z-10">
            <button
              onClick={() => setIsDepositModalOpen(true)}
              className="flex-1 btn-primary flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              <span>+ Add Deposit</span>
            </button>
            <button
              onClick={() => setIsWithdrawModalOpen(true)}
              className="btn-secondary flex items-center gap-1.5"
            >
              <span>Redeem Payout</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Card 2: Lock Status & Countdown */}
        <div className="card-standard flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-halo-text-tertiary">DISCIPLINE LOCK ENGINE</span>
              <Lock className="w-4 h-4 text-halo-gold" />
            </div>

            <div className="mt-4 space-y-3">
              <div className="bg-halo-tertiary p-4 rounded-lg border border-halo-gold/20">
                <span className="text-[10px] font-mono text-halo-text-secondary block">LOCKED SAVINGS (IMMUNE)</span>
                <span className="text-xl font-extrabold text-halo-dark font-mono">{formatMoney(summary.lockedBalance, currency)}</span>
              </div>

              <div className="bg-halo-secondary p-4 rounded-lg border border-halo-border">
                <span className="text-[10px] font-mono text-halo-text-tertiary block">MATURED & AVAILABLE</span>
                <span className="text-xl font-extrabold text-halo-gold font-mono">{formatMoney(summary.availableBalance, currency)}</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-halo-tertiary border border-halo-gold/20 flex items-center gap-3">
            <CalendarClock className="w-6 h-6 text-halo-gold shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] font-mono text-halo-gold font-bold block">NEAREST MATURITY UNLOCK</span>
              {daysToNextUnlock !== null ? (
                <span className="text-sm font-extrabold text-halo-dark block truncate">
                  In {daysToNextUnlock} Days ({nearestUnlockTranche ? formatDate(nearestUnlockTranche.unlockDate) : ''})
                </span>
              ) : (
                <span className="text-xs text-halo-text-secondary">All tranches matured! 🎉</span>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Row 2: Emergency Fund Health Score & AI Coach Teaser */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Emergency Fund Health Score Widget */}
        <div className="p-6 sm:p-8 rounded-3xl bg-halo-card border border-halo-border shadow-xl flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-halo-gold/10 rounded-xl text-halo-gold">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-halo-dark text-base">Emergency Health Score</h3>
              </div>
              <span className="text-2xl font-extrabold font-mono text-halo-gold">{emergencyScore}%</span>
            </div>
            <p className="text-xs text-halo-text-tertiary mt-2">
              Based on your target of {formatMoney(emergVault?.targetAmount || 0, currency)} inside the {emergVault?.name || 'Emergency'} vault.
            </p>
          </div>

          {/* Progress gauge */}
          <div className="space-y-2">
            <div className="w-full bg-halo-cream h-3 rounded-full overflow-hidden p-0.5 border border-halo-border">
              <div
                className="h-full bg-gradient-to-r from-halo-gold to-teal-400 rounded-full transition-all duration-1000"
                style={{ width: `${emergencyScore}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-halo-text-tertiary">
              <span>Current: {formatMoney(emergVault?.currentAmount || 0, currency)}</span>
              <span>Target: {formatMoney(emergVault?.targetAmount || 0, currency)}</span>
            </div>
          </div>

          <button
            onClick={() => setIsDepositModalOpen(true, emergVault?.id)}
            className="w-full py-2.5 rounded-xl bg-halo-secondary hover:bg-halo-tertiary text-halo-dark font-bold text-xs transition-colors"
          >
            Top Up Emergency Vault Shield
          </button>
        </div>

        {/* Investment Engine Recharts Growth Forecast */}
        <div className="md:col-span-2 p-6 sm:p-8 rounded-3xl bg-halo-card border border-halo-border shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-halo-dark text-base flex items-center gap-2">
                <span>📈 Mutual Fund Compounding Forecast</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                  Tier-1 MFund Provider
                </span>
              </h3>
              <p className="text-xs text-halo-text-tertiary">Simulating daily unit compounding vs standard uninvested cash</p>
            </div>
            
            <div className="flex gap-1 bg-halo-cream p-1 rounded-xl border border-halo-border self-start sm:self-auto">
              {(['6M', '1Y', '3Y'] as const).map(h => (
                <button
                  key={h}
                  onClick={() => setChartHorizon(h)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-colors ${
                    chartHorizon === h ? 'bg-halo-gold text-halo-dark' : 'text-halo-text-tertiary hover:text-halo-dark'
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          {/* Recharts Curve */}
          <div className="h-48 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="mfundGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="cashGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#64748b" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#64748b" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={(val) => `GHS ${val/1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                  formatter={(val: any) => [formatMoney(val, currency), 'Valuation']}
                />
                <Area type="monotone" dataKey="deposited" name="Cash Principle" stroke="#64748b" fillOpacity={1} fill="url(#cashGlow)" />
                <Area type="monotone" dataKey="value" name="MFund Compounded" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#mfundGlow)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Row 3: Majestic 3D Subscription Vaults Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="securing-vault-dashboard">
        
        {/* Dynamic 3D Vault Center (2/3 width) */}
        <div className="lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg text-halo-dark tracking-tight">Your High-Yield Subscription Vaults</h3>
              <p className="text-xs text-halo-text-tertiary">Select, open, and deposit secure locked capital into SEC-Licensed micro-funds</p>
            </div>
            {vaults.length > 0 && !selectedVaultForDeposit && (
              <button 
                onClick={() => {
                  // Direct clean creator mode trigger
                  setSelectedVaultForDeposit('CREATE_NEW_WIZARD');
                  setIsVaultDoorOpen(false);
                }} 
                className="px-3.5 py-1.5 rounded-xl bg-halo-gold/10 text-halo-gold border border-halo-gold/20 hover:bg-gold/20 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Launch New Tier</span>
              </button>
            )}
          </div>

          {/* ACTIVE DEPOSIT MODE: Focused Vault Open View */}
          {selectedVaultForDeposit && selectedVaultForDeposit !== 'CREATE_NEW_WIZARD' ? (
            (() => {
              const v = vaults.find(vault => vault.id === selectedVaultForDeposit);
              if (!v) return null;
              const tier = getTierForVault(v);
              const progress = Math.min(100, Math.round((v.currentAmount / v.targetAmount) * 100)) || 0;

              return (
                <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-halo-card to-halo-secondary/50 border border-halo-gold/30 shadow-2xl space-y-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                  {/* Glowing background grid */}
                  <div className="absolute inset-0 bg-radial from-halo-gold/5 via-transparent to-transparent pointer-events-none opacity-40" />

                  <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                    {/* Real-time 3D Interactive Vault representation */}
                    <div className="shrink-0 flex flex-col items-center justify-center space-y-3">
                      <Vault3DDoor 
                        tier={tier.id} 
                        isOpen={isVaultDoorOpen} 
                        isAnimating={isSecuringDeposit} 
                      />
                      <div className="text-center">
                        <span className="text-[10px] font-mono tracking-widest text-halo-text-tertiary uppercase block">SECURE IDENTIFIER</span>
                        <span className="text-xs font-bold text-halo-dark font-mono bg-halo-cream/40 border border-halo-border px-2.5 py-0.5 rounded-lg inline-block mt-0.5">{v.id}</span>
                      </div>
                    </div>

                    {/* Deposit controller dashboard */}
                    <div className="flex-1 w-full space-y-5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-halo-gold bg-halo-gold/10 px-2.5 py-1 rounded-full border border-halo-gold/20 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> {tier.name}
                          </span>
                          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                            {tier.apy}% Compounding APY
                          </span>
                        </div>
                        <h4 className="text-xl font-extrabold text-halo-dark mt-2.5">{v.name}</h4>
                        <p className="text-xs text-halo-text-secondary mt-1">{v.description || tier.description}</p>
                      </div>

                      {/* Progress Metrics bar */}
                      <div className="p-4 rounded-2xl bg-halo-cream/50 border border-halo-border space-y-2">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-halo-text-secondary">Current Balance: <strong className="text-halo-dark">{formatMoney(v.currentAmount, currency)}</strong></span>
                          <span className="text-halo-text-tertiary">Goal: {formatMoney(v.targetAmount, currency)}</span>
                        </div>
                        <div className="w-full bg-halo-cream h-2.5 rounded-full overflow-hidden p-0.5">
                          <div className="h-full bg-halo-gold rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-halo-text-tertiary pt-0.5 font-mono">
                          <span>Progress Rate: <strong className="text-halo-dark">{progress}%</strong></span>
                          <span>Locks Period: <strong>{v.defaultLockPeriod} days</strong></span>
                        </div>
                      </div>

                      {/* Live Transaction Control State */}
                      {depositSuccessState ? (
                        <div className="p-5 rounded-2xl bg-emerald-400/10 border border-emerald-500/20 text-center space-y-2 animate-in zoom-in-95 duration-200">
                          <span className="text-3xl">🛡️🔒</span>
                          <h5 className="font-extrabold text-emerald-400 text-sm">DEPOSIT SECURED SUCCESSFULLY!</h5>
                          <p className="text-xs text-halo-text-secondary leading-relaxed">
                            Secured and locked successfully. Slamming heavy door locks in real-time. Stand clear...
                          </p>
                        </div>
                      ) : (
                        <form onSubmit={handleSecuredDepositSubmit} className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Deposit Input */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-mono tracking-wider font-bold text-halo-text-secondary block uppercase">Deposit Value ({currency})</label>
                              <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-halo-text-secondary text-sm">{currency}</span>
                                <input 
                                  type="number"
                                  min={tier.minDeposit}
                                  max="500000"
                                  value={depositAmount}
                                  onChange={(e) => setDepositAmount(e.target.value)}
                                  className="w-full bg-halo-cream border border-halo-border rounded-xl pl-12 pr-4 py-3 text-sm text-halo-dark font-mono font-bold focus:outline-none focus:border-halo-gold"
                                  required
                                  disabled={isSecuringDeposit}
                                />
                              </div>
                              <span className="text-[9px] text-halo-text-tertiary block italic font-mono">Minimum required deposit: {currency} {tier.minDeposit}</span>
                            </div>

                            {/* Payment Provider Selection */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-mono tracking-wider font-bold text-halo-text-secondary block uppercase font-mono">Settlement Route</label>
                              <select
                                value={depositPaymentMethod}
                                onChange={(e) => setDepositPaymentMethod(e.target.value)}
                                className="w-full bg-halo-cream border border-halo-border rounded-xl px-4 py-3 text-sm text-halo-dark focus:outline-none focus:border-halo-gold font-bold"
                                disabled={isSecuringDeposit}
                              >
                                <option value="paystack_sandbox">⚡ Paystack Instant (Sandbox Simulator)</option>
                                <option value="mobile_money">📱 MTN / Telecel Mobile Money route</option>
                                <option value="bank_transfer">🏦 Central Bank Electronic Wire Transfer</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setIsVaultDoorOpen(false);
                                setTimeout(() => {
                                  setSelectedVaultForDeposit(null);
                                }, 500);
                              }}
                              className="px-5 py-3 rounded-xl bg-halo-cream hover:bg-halo-border text-xs font-bold text-halo-text-secondary border border-halo-border"
                              disabled={isSecuringDeposit}
                            >
                              Abort & Close Door
                            </button>

                            <button
                              type="submit"
                              className="flex-1 btn-primary flex items-center justify-center gap-2"
                              disabled={isSecuringDeposit}
                            >
                              {isSecuringDeposit ? (
                                <>
                                  <div className="w-4 h-4 rounded-full border-2 border-slate-900 border-t-transparent animate-spin" />
                                  <span>Locking Safe & Securing Seals...</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-4 h-4 text-slate-950" />
                                  <span>LOCK DEPOSIT IN VAULT</span>
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()
          ) : selectedVaultForDeposit === 'CREATE_NEW_WIZARD' || vaults.length === 0 ? (
            /* NEW REGISTRATION OR EXPLICIT LAUNCH WIZARD MODE: Subscription Tier Vault Creator */
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-halo-card to-halo-secondary/30 border border-halo-border shadow-2xl space-y-6 relative animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-halo-border pb-5">
                <div>
                  <h4 className="font-extrabold text-base text-halo-dark flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-halo-gold" />
                    <span>Initialize High-Yield Subscription Vault</span>
                  </h4>
                  <p className="text-xs text-halo-text-tertiary">Select one of our three secure tiers backed by institutional portfolios</p>
                </div>
                {vaults.length > 0 && (
                  <button 
                    onClick={() => setSelectedVaultForDeposit(null)} 
                    className="text-xs text-halo-text-secondary font-bold hover:underline"
                  >
                    ← Back to Active Vaults
                  </button>
                )}
              </div>

              {/* Tiers selection buttons */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {SUBSCRIPTION_TIERS.map(tier => {
                  const isSelected = selectedTierForNewVault === tier.id;
                  const borderClass = isSelected 
                    ? tier.id === 'platinum_elite' ? 'border-cyan-400 ring-2 ring-cyan-500/20 bg-cyan-950/5' : tier.id === 'gold_premium' ? 'border-amber-400 ring-2 ring-amber-500/20 bg-amber-950/5' : 'border-slate-400 ring-2 ring-slate-500/20 bg-slate-950/5'
                    : 'border-halo-border hover:border-halo-border-hover bg-halo-card/40';

                  const badgeClass = tier.id === 'platinum_elite' ? 'bg-cyan-400/15 text-cyan-400 border-cyan-400/20' : tier.id === 'gold_premium' ? 'bg-amber-400/15 text-amber-400 border-amber-400/20' : 'bg-slate-400/15 text-slate-400 border-slate-400/20';

                  return (
                    <div
                      key={tier.id}
                      onClick={() => setSelectedTierForNewVault(tier.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-3 flex flex-col justify-between ${borderClass}`}
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-extrabold border uppercase ${badgeClass}`}>
                            {tier.id === 'platinum_elite' ? '👑 PLATINUM' : tier.id === 'gold_premium' ? '🏆 GOLD' : '🛡️ SILVER'}
                          </span>
                          <span className="text-xs font-mono font-bold text-halo-gold">{tier.apy}% APY</span>
                        </div>
                        <h5 className="font-extrabold text-sm text-halo-dark mt-2">{tier.name}</h5>
                        <p className="text-[11px] text-halo-text-tertiary mt-1 leading-relaxed">{tier.description}</p>
                      </div>

                      <div className="border-t border-halo-border/60 pt-2 space-y-1 text-[10px] text-halo-text-secondary">
                        <div className="flex justify-between">
                          <span>Lock Periods:</span>
                          <span className="font-bold text-halo-dark">{tier.lockPeriods.join(', ')} Days</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Min Entry:</span>
                          <span className="font-bold text-halo-dark">{currency} {tier.minDeposit}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Configure and initialize form */}
              <form onSubmit={handleLaunchVault} className="space-y-4 pt-2 bg-halo-cream/40 p-5 rounded-2xl border border-halo-border">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Vault Custom Name */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono tracking-wider font-bold text-halo-text-secondary block uppercase">Custom Vault Goal Name</label>
                    <input 
                      type="text"
                      placeholder="e.g. Zanzibar Escapade 🌴"
                      value={newVaultName}
                      onChange={(e) => setNewVaultName(e.target.value)}
                      className="w-full bg-halo-cream border border-halo-border rounded-xl px-3.5 py-2.5 text-xs text-halo-dark font-bold focus:outline-none focus:border-halo-gold"
                      required
                    />
                  </div>

                  {/* Target Goal value */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono tracking-wider font-bold text-halo-text-secondary block uppercase">Target Goal Amount ({currency})</label>
                    <input 
                      type="number"
                      min="10"
                      value={newVaultTargetAmount}
                      onChange={(e) => setNewVaultTargetAmount(e.target.value)}
                      className="w-full bg-halo-cream border border-halo-border rounded-xl px-3.5 py-2.5 text-xs text-halo-dark font-mono font-bold focus:outline-none focus:border-halo-gold"
                      required
                    />
                  </div>

                  {/* Lock period mapped to tier */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono tracking-wider font-bold text-halo-text-secondary block uppercase font-mono">Maturity Lock Period</label>
                    <select
                      value={newVaultLockDays}
                      onChange={(e) => setNewVaultLockDays(e.target.value)}
                      className="w-full bg-halo-cream border border-halo-border rounded-xl px-3.5 py-2.5 text-xs text-halo-dark font-bold focus:outline-none focus:border-halo-gold"
                    >
                      {SUBSCRIPTION_TIERS.find(t => t.id === selectedTierForNewVault)?.lockPeriods.map(days => (
                        <option key={days} value={days}>{days} Days Locked ({SUBSCRIPTION_TIERS.find(t => t.id === selectedTierForNewVault)?.apy}% Return)</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Live Vault Preview Info */}
                <div className="p-3.5 rounded-xl bg-halo-gold/10 border border-halo-gold/20 flex items-start gap-3">
                  <span className="text-xl">📊</span>
                  <div className="text-xs text-halo-dark">
                    <p className="font-bold">Tier Allocation Overview:</p>
                    <p className="text-halo-text-secondary mt-0.5 leading-relaxed">
                      This plan locks your initial capital for <strong className="text-halo-dark">{newVaultLockDays} days</strong>. It guarantees a sovereign-backed compounding interest return of <strong className="text-emerald-400">{SUBSCRIPTION_TIERS.find(t => t.id === selectedTierForNewVault)?.apy}% APY</strong>. Perfect for shielding your wealth from inflation and impulsive spending!
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  {vaults.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedVaultForDeposit(null)}
                      className="px-5 py-2.5 rounded-xl bg-halo-cream hover:bg-halo-border text-xs font-bold text-halo-text-secondary border border-halo-border"
                    >
                      Cancel Wizard
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-halo-gold hover:bg-halo-gold/90 text-slate-900 text-xs font-extrabold flex items-center gap-2 transition-all shadow-md"
                    disabled={isInitializingVault}
                  >
                    {isInitializingVault ? (
                      <>
                        <div className="w-3 h-3 rounded-full border border-slate-900 border-t-transparent animate-spin" />
                        <span>Launching Chamber...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
                        <span>LAUNCH VAULT CHAMBER</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* STANDARD VIEW: Grid List of Active Vaults with 3D Subscription Doors! */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 animate-in fade-in duration-300">
              {vaults.map(v => {
                const tier = getTierForVault(v);
                const progress = Math.min(100, Math.round((v.currentAmount / v.targetAmount) * 100)) || 0;

                return (
                  <div
                    key={v.id}
                    className="p-5 sm:p-6 rounded-3xl bg-halo-card/95 hover:bg-halo-secondary/70 border border-halo-border hover:border-halo-border-hover shadow-lg flex flex-col justify-between space-y-5 transition-all group duration-300 hover:scale-[1.01]"
                  >
                    {/* Header: Name and Tier badge */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-2xl bg-halo-cream border border-halo-border text-halo-gold group-hover:rotate-12 transition-transform`}>
                          <Icon name={v.icon || tier.icon} />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-halo-dark text-sm leading-tight">{v.name}</h4>
                          <span className="text-[10px] font-mono text-halo-text-tertiary">Maturity Lock: {v.defaultLockPeriod} Days</span>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-mono font-extrabold border tracking-wider shrink-0 uppercase ${
                        tier.id === 'platinum_elite' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : tier.id === 'gold_premium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                      }`}>
                        {tier.id === 'platinum_elite' ? 'PLATINUM VIP' : tier.id === 'gold_premium' ? 'GOLD PREMIUM' : 'SILVER STANDARD'}
                      </span>
                    </div>

                    {/* Central 3D representation */}
                    <div className="py-2 flex justify-center relative">
                      <div className="transform scale-[0.8] hover:scale-[0.85] transition-all origin-center">
                        <Vault3DDoor tier={tier.id} isOpen={false} />
                      </div>
                      {/* APY floating glow */}
                      <span className="absolute bottom-2 right-2 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-500/20 shadow-md">
                        {tier.apy}% APY
                      </span>
                    </div>

                    {/* Progress details */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-halo-text-secondary">Secured: <strong className="text-halo-dark">{formatMoney(v.currentAmount, currency)}</strong></span>
                        <span className="text-halo-text-tertiary">Goal: {formatMoney(v.targetAmount, currency)}</span>
                      </div>
                      <div className="w-full bg-halo-cream h-2 rounded-full overflow-hidden p-0.5">
                        <div className="h-full bg-halo-gold rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <button
                      onClick={() => {
                        setSelectedVaultForDeposit(v.id);
                        // Delay opening for cinematic spinning dial effect!
                        setTimeout(() => {
                          setIsVaultDoorOpen(true);
                        }, 250);
                      }}
                      className="w-full py-2.5 rounded-xl bg-halo-cream hover:bg-halo-gold text-halo-dark text-xs font-extrabold transition-all border border-halo-border hover:border-transparent flex items-center justify-center gap-1.5 shadow-sm group-hover:shadow-md"
                    >
                      <Lock className="w-3.5 h-3.5 text-halo-gold group-hover:text-slate-900 transition-colors" />
                      <span>OPEN & DEPOSIT CAPITAL</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>


        {/* Portfolio Allocation Recharts Pie */}
        <div className="p-6 rounded-3xl bg-halo-card border border-halo-border shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <h3 className="font-bold text-halo-dark text-base flex items-center gap-2">
              <PieChart className="w-4 h-4 text-halo-gold" />
              <span>Portfolio Allocation</span>
            </h3>
            <p className="text-xs text-halo-text-tertiary">Distribution across vault goals</p>
          </div>

          <div className="h-44 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={portfolioData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {portfolioData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                  formatter={(val: any) => [formatMoney(val, currency), 'Balance']}
                />
              </RePieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-halo-border">
            {portfolioData.length === 0 || summary.totalCurrentValue === 0 ? (
              <div className="py-6 text-center text-xs text-halo-text-tertiary italic">
                No capital allocated. Launch a vault to start compounding!
              </div>
            ) : (
              portfolioData.map(item => (
                <div key={item.name} className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-halo-text-secondary truncate">{item.name}</span>
                  </div>
                  <span className="text-halo-dark font-bold">{formatMoney(item.value, currency)}</span>
                </div>
              ))
            )}
          </div>

        </div>

      </div>

      {/* Dynamic Multi-Provider Holdings Summary */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg text-halo-dark">Dynamic SEC-Licensed Mutual Fund Holdings</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(() => {
            const provs = simulation?.providers || [
              { id: 'DATABANK_MFUND', name: 'Databank MFund', currentNAV: 2.4815, annualReturnPercentage: 19.2 },
              { id: 'EDC_FIXED_INCOME', name: 'EDC Fixed Income Fund', currentNAV: 1.52, annualReturnPercentage: 20.5 },
              { id: 'STANBIC_CASH_TRUST', name: 'Stanbic Cash Trust', currentNAV: 3.12, annualReturnPercentage: 18.0 },
              { id: 'VANGUARD_HALOSAVE_FUND', name: 'Vanguard HaloSave Growth Fund', currentNAV: 10.45, annualReturnPercentage: 12.8 }
            ];

            return provs.map((prov: any) => {
              // Find total units of this provider in active tranches
              const activeTranches = tranches.filter((t: any) => (t.investmentProvider === prov.id || (!t.investmentProvider && prov.id === 'DATABANK_MFUND')) && t.status !== 'withdrawn');
              const unitsSum = activeTranches.reduce((sum: number, t: any) => sum + (t.investmentUnits || 0), 0);
              const valSum = activeTranches.reduce((sum: number, t: any) => sum + (t.currentValuation || 0), 0);
              const profitSum = activeTranches.reduce((sum: number, t: any) => sum + (t.profitEarned || 0), 0);

              const isHolding = unitsSum > 0;

              const badgeColorMap: any = {
                DATABANK_MFUND: 'bg-halo-gold/10 text-halo-gold border-halo-gold/20',
                EDC_FIXED_INCOME: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
                STANBIC_CASH_TRUST: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
                VANGUARD_HALOSAVE_FUND: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              };

              const borderMap: any = {
                DATABANK_MFUND: 'border-halo-gold/20',
                EDC_FIXED_INCOME: 'border-indigo-500/20',
                STANBIC_CASH_TRUST: 'border-cyan-500/20',
                VANGUARD_HALOSAVE_FUND: 'border-amber-500/20'
              };

              return (
                <div
                  key={prov.id}
                  className={`p-5 rounded-3xl bg-halo-card border ${borderMap[prov.id] || 'border-halo-border'} space-y-4 relative overflow-hidden transition-all hover:scale-[1.02]`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-[9px] font-mono font-bold text-halo-text-tertiary uppercase block">PROVIDER HOLDING</span>
                      <h4 className="font-bold text-sm text-halo-dark truncate max-w-[130px]">{prov.name}</h4>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-extrabold border shrink-0 ${badgeColorMap[prov.id] || 'bg-halo-secondary text-halo-text-tertiary border-halo-border-hover'}`}>
                      ~{prov.annualReturnPercentage}% APY
                    </span>
                  </div>

                  <div className="pt-1">
                    {isHolding ? (
                      <div className="space-y-1">
                        <span className="text-2xl font-extrabold text-halo-dark font-mono">{formatMoney(valSum, currency)}</span>
                        <div className="flex justify-between text-[10px] text-halo-text-tertiary font-mono">
                          <span>{unitsSum.toFixed(3)} units</span>
                          <span className="text-halo-gold font-bold">+{formatMoney(profitSum, currency)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-2 text-center">
                        <span className="text-halo-text-muted text-xs block italic">No Active Units</span>
                        <button onClick={() => setIsDepositModalOpen(true)} className="text-xs text-halo-gold font-bold hover:underline mt-1 block w-full">
                          + Purchase Units
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-halo-border/60 flex justify-between text-[10px] font-mono text-halo-text-tertiary">
                    <span>NAV: {prov.currentNAV.toFixed(4)}</span>
                    <span className="text-halo-gold">Daily Compounding</span>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Row 4: Savings Locks Timeline with visual progress bars and auto-redemption status */}
      <div className="p-6 sm:p-8 rounded-3xl bg-halo-card border border-halo-border shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-halo-dark text-lg flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-halo-gold" />
              <span>HaloSave Savings & Investment Timeline</span>
            </h3>
            <p className="text-xs text-halo-text-tertiary">Your independent lock contracts and their dynamic compounding growth timeline</p>
          </div>
          <button onClick={() => setActiveTab('transactions')} className="text-xs text-halo-gold font-semibold hover:underline">
            View Ledger History →
          </button>
        </div>

        <div className="space-y-4">
          {tranches.length === 0 ? (
            <div className="py-12 text-center rounded-2xl bg-halo-cream border border-halo-border/60">
              <p className="text-sm text-halo-text-tertiary">No active savings tranches found.</p>
              <button onClick={() => setIsDepositModalOpen(true)} className="mt-3 px-4 py-2 rounded-xl bg-halo-gold text-halo-dark font-extrabold text-xs">
                Make your First Deposit
              </button>
            </div>
          ) : (
            tranches.map((t: any) => {
              const start = new Date(t.depositedAt || t.lockedAt || Date.now()).getTime();
              const end = new Date(t.unlockDate || t.maturesAt || Date.now()).getTime();
              const now = Date.now();
              const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 3600 * 24)));
              const daysPassed = Math.max(0, Math.ceil((now - start) / (1000 * 3600 * 24)));
              const progressPercent = Math.min(100, Math.round((daysPassed / totalDays) * 100));
              const daysRemaining = Math.max(0, Math.ceil((end - now) / (1000 * 3600 * 24)));

              const isMatured = daysRemaining <= 0;
              const providerName = t.providerName || 'Databank MFund';
              const isAuto = t.status === 'locked_auto';

              return (
                <div
                  key={t.id}
                  className="p-5 rounded-3xl bg-halo-cream border border-halo-border/80 hover:border-halo-border-hover transition-all space-y-4 relative overflow-hidden group"
                >
                  {/* Subtle Top glow for auto-redemption */}
                  {isAuto && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-500 to-indigo-500 animate-pulse" />
                  )}

                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="p-3 bg-halo-card border border-halo-border rounded-2xl text-halo-gold group-hover:scale-110 transition-transform">
                        <Lock className={`w-5 h-5 ${isMatured ? 'text-halo-gold' : 'text-amber-400'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-base text-halo-dark">{t.vaultName || 'General Vault'}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-halo-card border border-halo-border text-halo-text-tertiary rounded-md">
                            {t.id}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-halo-text-tertiary flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                          <span>Allocated into: <strong className="text-halo-text-secondary">{providerName}</strong></span>
                          <span>•</span>
                          <span>Purchase NAV: {t.purchaseNAV?.toFixed(4) || '2.4815'}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-stretch md:self-auto justify-between md:justify-start">
                      <div className="text-right font-mono">
                        <span className="text-halo-text-muted text-[10px] block uppercase">CURRENT VALUE</span>
                        <span className="text-base font-extrabold text-halo-dark">{formatMoney(t.currentValuation || t.amount, currency)}</span>
                        <span className="text-xs text-halo-gold block font-bold">+{formatMoney(t.profitEarned || 0, currency)}</span>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-mono font-extrabold border ${
                          isMatured
                            ? 'bg-halo-gold/10 text-emerald-300 border-halo-gold/20'
                            : isAuto
                            ? 'bg-teal-500/10 text-teal-300 border-teal-500/20'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                        }`}>
                          {isMatured ? 'MATURED' : isAuto ? 'LOCKED (AUTO-PAYOUT)' : 'LOCKED (MANUAL)'}
                        </span>

                        <span className="text-xs font-mono text-halo-text-tertiary">
                          {isMatured ? 'Maturity Met 🎉' : `${daysRemaining} days remaining`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Horizontal visual timeline progress bar */}
                  <div className="space-y-1.5">
                    <div className="w-full bg-halo-card h-2.5 rounded-full overflow-hidden p-0.5 border border-halo-border">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          isMatured
                            ? 'bg-gradient-to-r from-halo-gold to-teal-400'
                            : 'bg-gradient-to-r from-amber-500 to-halo-gold'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-halo-text-tertiary">
                      <span>Deposited: {new Date(t.depositedAt || t.lockedAt || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                      <span className="font-bold text-halo-text-secondary">{progressPercent}% Completed</span>
                      <span>Matures: {new Date(t.unlockDate || t.maturesAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* SEC-Licensed Provider Comparison Matrix */}
      <div className="p-6 sm:p-8 rounded-3xl bg-halo-card border border-halo-border shadow-xl space-y-5">
        <div>
          <h3 className="font-bold text-halo-dark text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-halo-gold" />
            <span>SEC-Licensed Mutual Fund Marketplace</span>
          </h3>
          <p className="text-xs text-halo-text-tertiary">Compare Tier-1 yield platforms integrated within the HaloSave investment engine</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { id: 'DATABANK_MFUND', name: 'Databank MFund', class: 'Money Market Fund', baseAPY: '19.2%', risk: 'Low', min: 'GHS 50', desc: 'The gold standard for conservative liquidity compounding in West Africa.' },
            { id: 'EDC_FIXED_INCOME', name: 'EDC Fixed Income', class: 'Fixed Income Fund', baseAPY: '20.5%', risk: 'Low-Medium', min: 'GHS 100', desc: 'Optimized high-yield treasury note allocation managed by Ecobank.' },
            { id: 'STANBIC_CASH_TRUST', name: 'Stanbic Cash Trust', class: 'Money Market Trust', baseAPY: '18.0%', risk: 'Low', min: 'GHS 50', desc: 'Capital preservation with steady yield compounding for emergency cushions.' },
            { id: 'VANGUARD_HALOSAVE_FUND', name: 'Vanguard HaloSave Growth', class: 'Equity Growth Fund', baseAPY: '12.8%', risk: 'Medium', min: 'GHS 200', desc: 'Micro-equity tracker compounding long-term savings into corporate bonds.' }
          ].map(p => (
            <div key={p.id} className="p-5 rounded-3xl bg-halo-cream border border-halo-border/80 space-y-3 relative group overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-halo-gold/5 rounded-full blur-2xl pointer-events-none group-hover:bg-halo-gold/10 transition-colors" />
              <div>
                <span className="text-[9px] font-mono px-2 py-0.5 bg-halo-gold/10 text-halo-gold rounded-md border border-halo-gold/20 font-bold">
                  SEC APPROVED
                </span>
                <h4 className="font-bold text-sm text-halo-dark mt-2.5">{p.name}</h4>
                <span className="text-[10px] text-halo-text-tertiary font-mono">{p.class}</span>
              </div>
              <p className="text-xs text-halo-text-secondary leading-relaxed min-h-[50px]">{p.desc}</p>
              <div className="pt-3.5 border-t border-halo-border/80 grid grid-cols-2 gap-2 text-[10px] font-mono">
                <div>
                  <span className="text-halo-text-muted block">BASE APY</span>
                  <span className="text-halo-gold font-bold text-xs">{p.baseAPY}</span>
                </div>
                <div>
                  <span className="text-halo-text-muted block">MINIMUM</span>
                  <span className="text-halo-dark font-semibold">{p.min}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
