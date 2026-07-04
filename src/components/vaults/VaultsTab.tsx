import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { 
  Vault as VaultIcon, Plus, Shield, Lock, Unlock, TrendingUp, Calendar, 
  CheckCircle2, ArrowUpRight, Flame, Sparkles, Award, Target, ChevronLeft, 
  ChevronRight, AlertTriangle, HelpCircle, Key, Info, ShieldAlert
} from 'lucide-react';
import { formatMoney, formatDate } from '../../lib/utils.ts';
import { Icon } from '../common/Icon.tsx';

export const VaultsTab: React.FC = () => {
  const { 
    vaults, tranches, user, transactions,
    setIsDepositModalOpen, setIsWithdrawModalOpen, setIsCreateVaultModalOpen 
  } = useApp();
  
  const currency = user?.currency || 'GHS';
  const streakDays = user?.savingsStreakDays || 0;
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  // State for Savings Calendar navigation
  // Current local time metadata says June 2026
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date(2026, 5, 27)); // June 27, 2026
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(27);
  const [emergencyAlertOpen, setEmergencyAlertOpen] = useState<boolean>(false);

  // Colors mapping for vaults
  const colorStyles: Record<string, { card: string; badge: string; ring: string; text: string; bg: string }> = {
    emerald: { card: 'from-emerald-950/40 via-slate-900 to-slate-900 border-halo-gold/30', badge: 'bg-halo-gold/10 text-halo-gold border-halo-gold/20', ring: 'bg-halo-gold', text: 'text-halo-gold', bg: 'bg-halo-gold' },
    cyan: { card: 'from-cyan-950/40 via-slate-900 to-slate-900 border-cyan-500/30', badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', ring: 'bg-cyan-500', text: 'text-cyan-400', bg: 'bg-cyan-500' },
    indigo: { card: 'from-indigo-950/40 via-slate-900 to-slate-900 border-indigo-500/30', badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', ring: 'bg-indigo-500', text: 'text-indigo-400', bg: 'bg-indigo-500' },
    amber: { card: 'from-amber-950/40 via-slate-900 to-slate-900 border-amber-500/30', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', ring: 'bg-amber-500', text: 'text-amber-400', bg: 'bg-amber-500' },
    rose: { card: 'from-rose-950/40 via-slate-900 to-slate-900 border-rose-500/30', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20', ring: 'bg-rose-500', text: 'text-rose-400', bg: 'bg-rose-500' },
    purple: { card: 'from-purple-950/40 via-slate-900 to-slate-900 border-purple-500/30', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20', ring: 'bg-purple-500', text: 'text-purple-400', bg: 'bg-purple-500' },
  };

  // Real-time Countdown Helper for tranches
  const [timeState, setTimeState] = useState<number>(Date.now());
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeState(Date.now());
    }, 60000); // update every minute
    return () => clearInterval(interval);
  }, []);

  const getTrancheCountdown = (unlockDateStr: string) => {
    const diffMs = new Date(unlockDateStr).getTime() - timeState;
    if (diffMs <= 0) return 'Matured';
    const totalMins = Math.floor(diffMs / 60000);
    const totalHours = Math.floor(totalMins / 60);
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    return `${days}d ${hours}h left`;
  };

  // Goal Milestones Config based on target amount
  const getGoalMilestone = (target: number) => {
    if (target >= 25000) return { name: 'Platinum Elite Milestone', badge: '🏆 Platinum', icon: 'Award', desc: 'Sovereign-tier wealth buffer plan.' };
    if (target >= 10000) return { name: 'Gold Citadel Milestone', badge: '🥇 Gold Savings', icon: 'Sparkles', desc: 'Securing medium-term capital reserves.' };
    if (target >= 5000) return { name: 'Silver Shield Milestone', badge: '🥈 Silver Buffer', icon: 'Shield', desc: 'Excellent emergency-defense target.' };
    return { name: 'Bronze Hearth Milestone', badge: '🥉 Bronze Starter', icon: 'Target', desc: 'Establishing disciplined compounding habits.' };
  };

  // Calendar Helpers
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday is 0
  const numDays = new Date(year, month + 1, 0).getDate(); // Days in current month

  const handlePrevMonth = () => {
    setCurrentCalendarDate(new Date(year, month - 1, 1));
    setSelectedCalendarDay(null);
  };
  const handleNextMonth = () => {
    setCurrentCalendarDate(new Date(year, month + 1, 1));
    setSelectedCalendarDay(null);
  };

  // Filter transactions and tranches occurring/maturing in the current calendar month
  const calendarEvents = React.useMemo(() => {
    const events: Record<number, { deposits: any[]; maturities: any[] }> = {};
    for (let d = 1; d <= numDays; d++) {
      events[d] = { deposits: [], maturities: [] };
    }

    // Map deposits
    transactions.forEach(tx => {
      if (tx.type === 'deposit') {
        const txDate = new Date(tx.createdAt);
        if (txDate.getFullYear() === year && txDate.getMonth() === month) {
          const day = txDate.getDate();
          if (events[day]) {
            events[day].deposits.push(tx);
          }
        }
      }
    });

    // Map lock maturities
    tranches.forEach(t => {
      if (t.status !== 'withdrawn') {
        const matDate = new Date(t.unlockDate);
        if (matDate.getFullYear() === year && matDate.getMonth() === month) {
          const day = matDate.getDate();
          if (events[day]) {
            events[day].maturities.push(t);
          }
        }
      }
    });

    return events;
  }, [transactions, tranches, year, month, numDays]);

  // Selected day details
  const selectedDayDetails = selectedCalendarDay ? calendarEvents[selectedCalendarDay] : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-24">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-halo-card p-6 sm:p-8 rounded-3xl border border-halo-border shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-halo-gold text-xs font-mono font-bold">
            <Shield className="w-4 h-4 animate-pulse" />
            <span>DATABANK M-FUND COMPENSATING SAVINGS HUB</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-halo-dark tracking-tight">
            Savings Vaults & Strategy
          </h1>
          <p className="text-xs text-halo-text-tertiary max-w-xl leading-relaxed">
            Configure insulated target containers, bypass early lock conditions via emergency modes, visualize your milestones, and keep track of your compounding calendar.
          </p>
        </div>

        <button
          onClick={() => setIsCreateVaultModalOpen(true)}
          className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-halo-gold to-teal-600 hover:from-halo-gold hover:to-teal-500 text-halo-dark font-extrabold text-xs shadow-xl shadow-halo-gold/20 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create New Vault</span>
        </button>
      </div>

      {/* Main Multi-Column Split Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Bento Vaults List (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-halo-border">
            <h2 className="text-sm font-bold uppercase tracking-widest text-halo-text-tertiary flex items-center gap-2">
              <VaultIcon className="w-4 h-4 text-halo-gold" />
              Active Insulated Vaults ({vaults.length})
            </h2>
            <span className="text-[10px] font-mono text-halo-text-muted">Maturity Dates Compounding Daily</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {vaults.map(v => {
              const styles = colorStyles[v.color] || colorStyles.emerald;
              const vTranches = tranches.filter(t => t.vaultId === v.id && t.status !== 'withdrawn');
              const maturedSum = vTranches.filter(t => t.status === 'matured').reduce((a, b) => a + b.currentValuation, 0);
              const lockedSum = vTranches.filter(t => t.status === 'locked').reduce((a, b) => a + b.currentValuation, 0);
              const progress = Math.min(100, Math.round((v.currentAmount / v.targetAmount) * 100)) || 0;
              const milestone = getGoalMilestone(v.targetAmount);

              // Find closest unlock tranche countdown
              const nextUnlockTranche = vTranches
                .filter(t => t.status === 'locked')
                .sort((a, b) => new Date(a.unlockDate).getTime() - new Date(b.unlockDate).getTime())[0];

              return (
                <div
                  key={v.id}
                  className={`p-6 rounded-3xl bg-gradient-to-br ${styles.card} border shadow-2xl flex flex-col justify-between space-y-5 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300`}
                >
                  <div>
                    {/* Header: Title & Milestone Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-halo-cream border border-halo-border text-halo-dark shadow-md">
                          <Icon name={v.icon} className="w-5 h-5 text-halo-dark" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-halo-dark text-sm leading-tight">{v.name}</h3>
                          <span className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded border font-bold inline-block mt-1 ${styles.badge}`}>
                            {milestone.badge}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-halo-text-tertiary mt-3 line-clamp-2 leading-relaxed min-h-[32px]">
                      {v.description || milestone.desc}
                    </p>

                    {/* Milestone Track description */}
                    <div className="mt-3 flex items-center gap-1.5 px-2.5 py-1.5 bg-halo-cream/40 rounded-xl border border-halo-border/50 text-[10px] text-halo-text-tertiary">
                      <Award className={`w-3.5 h-3.5 ${styles.text}`} />
                      <span className="truncate">{milestone.name} Target</span>
                    </div>

                    {/* Valuation Display */}
                    <div className="mt-4 bg-halo-cream p-3.5 rounded-2xl border border-halo-border/80 space-y-1.5 font-mono">
                      <div className="flex justify-between items-baseline">
                        <span className="text-[9px] text-halo-text-muted uppercase">VAULT VALUATION</span>
                        <span className="text-xl font-extrabold text-halo-dark">{formatMoney(v.currentAmount, currency)}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-halo-border text-[9px]">
                        <div>
                          <span className="text-halo-text-muted block text-[8px]">LOCKED</span>
                          <span className="text-amber-400 font-bold">{formatMoney(lockedSum, currency)}</span>
                        </div>
                        <div>
                          <span className="text-halo-text-muted block text-[8px]">MATURED</span>
                          <span className="text-halo-gold font-bold">{formatMoney(maturedSum, currency)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Target & Progress */}
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-halo-text-tertiary">Progress to Goal</span>
                        <span className="text-halo-dark font-bold">{progress}% of {formatMoney(v.targetAmount, currency)}</span>
                      </div>
                      <div className="w-full bg-halo-cream h-2 rounded-full overflow-hidden p-0.5 border border-halo-border">
                        <div className={`h-full rounded-full transition-all duration-700 ${styles.ring}`} style={{ width: `${progress}%` }} />
                      </div>
                    </div>

                    {/* Countdown Banner */}
                    {nextUnlockTranche ? (
                      <div className="mt-4 flex items-center justify-between px-2.5 py-1.5 bg-amber-500/5 rounded-xl border border-amber-500/10 text-[10px]">
                        <span className="text-halo-text-tertiary flex items-center gap-1 font-sans">
                          <Lock className="w-3 h-3 text-amber-400" />
                          Next Unlock countdown
                        </span>
                        <span className="text-amber-400 font-mono font-bold animate-pulse">
                          {getTrancheCountdown(nextUnlockTranche.unlockDate)}
                        </span>
                      </div>
                    ) : vTranches.length > 0 ? (
                      <div className="mt-4 flex items-center justify-between px-2.5 py-1.5 bg-halo-gold/5 rounded-xl border border-halo-gold/10 text-[10px]">
                        <span className="text-halo-text-tertiary flex items-center gap-1 font-sans">
                          <Unlock className="w-3 h-3 text-halo-gold animate-bounce" />
                          All tranches matured
                        </span>
                        <span className="text-halo-gold font-mono font-bold">READY</span>
                      </div>
                    ) : null}

                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setIsDepositModalOpen(true, v.id)}
                      className="flex-1 py-2.5 rounded-xl bg-halo-cream hover:bg-halo-secondary text-halo-dark font-bold text-xs border border-halo-border shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5 text-halo-gold" />
                      <span>Top-Up</span>
                    </button>

                    {maturedSum > 0 ? (
                      <button
                        onClick={() => setIsWithdrawModalOpen(true)}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-halo-gold to-teal-600 hover:from-halo-gold hover:to-teal-500 text-halo-dark font-extrabold text-xs transition-all flex items-center justify-center gap-1"
                      >
                        <span>Redeem</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsWithdrawModalOpen(true)}
                        className="px-3.5 py-2.5 rounded-xl bg-halo-cream text-halo-text-muted font-bold text-xs border border-halo-border hover:text-halo-text-secondary transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        title="Open Lock-Breaker Console"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-500/80" />
                        <span>Early Breach</span>
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Savings Calendar & Emergency Hub (1/3 width) */}
        <div className="space-y-6">
          
          {/* 1. Discipline & Emergency Hub Widget */}
          <div className="p-6 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-halo-border shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-halo-gold font-bold uppercase tracking-wider flex items-center gap-1">
                <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
                STREAK METRIC
              </span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-halo-cream border border-halo-border text-halo-text-tertiary">MFund Tier 1</span>
            </div>

            <div className="flex items-center gap-4 bg-halo-cream/80 p-4 rounded-2xl border border-halo-border/80">
              <div className="w-12 h-12 bg-amber-500/10 rounded-2xl border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/10">
                <Flame className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-extrabold text-halo-dark text-sm">Streak: {streakDays} Days 🔥</h4>
                <p className="text-[10px] text-halo-text-tertiary mt-0.5 leading-relaxed">
                  Keep saving consistently to multiply your referrals compounding bonuses!
                </p>
              </div>
            </div>

            {/* Emergency Mode Shield Banner */}
            {isAdmin && (
              <div className="p-4 bg-rose-500/5 rounded-2xl border border-rose-500/20 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <Shield className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <span className="text-xs font-extrabold text-halo-dark">Emergency Lock-Breaker Shield</span>
                    <p className="text-[10px] text-halo-text-tertiary mt-0.5 leading-relaxed">
                      Overriding locks without Super Admin approval is permitted under severe circumstances, subjecting the transaction to a 2.5% fee.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEmergencyAlertOpen(true)}
                  className="w-full py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-[10px] font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Toggle Emergency Shield Brief
                </button>
              </div>
            )}
          </div>

          {/* 2. Interactive Savings Calendar Widget */}
          <div className="p-5 rounded-3xl bg-halo-card border border-halo-border shadow-xl space-y-4">
            
            {/* Calendar Header */}
            <div className="flex items-center justify-between pb-2 border-b border-halo-border">
              <span className="text-xs font-extrabold text-halo-dark flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-halo-gold" />
                Savings Calendar
              </span>
              
              <div className="flex items-center gap-1 bg-halo-cream p-1 rounded-lg border border-halo-border">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 text-halo-text-tertiary hover:text-halo-dark transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono font-bold text-halo-text-secondary min-w-[70px] text-center">
                  {monthNames[month]} {year}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 text-halo-text-tertiary hover:text-halo-dark transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Days of week labels */}
            <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-halo-text-muted uppercase tracking-widest font-mono">
              <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
            </div>

            {/* Grid of Days */}
            <div className="grid grid-cols-7 gap-1.5 text-center font-mono text-[11px]">
              {/* Empty offset placeholders */}
              {Array.from({ length: firstDayIndex }).map((_, index) => (
                <div key={`offset-${index}`} className="aspect-square opacity-0" />
              ))}

              {/* Days of month */}
              {Array.from({ length: numDays }).map((_, idx) => {
                const day = idx + 1;
                const hasDeposit = calendarEvents[day]?.deposits.length > 0;
                const hasMaturity = calendarEvents[day]?.maturities.length > 0;
                const isSelected = selectedCalendarDay === day;

                return (
                  <button
                    key={`day-${day}`}
                    type="button"
                    onClick={() => setSelectedCalendarDay(day)}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-between p-1.5 transition-all relative ${
                      isSelected
                        ? 'bg-halo-gold text-halo-dark font-black scale-105 shadow-md shadow-halo-gold/20'
                        : 'bg-halo-cream hover:bg-halo-secondary text-halo-text-secondary border border-halo-border'
                    }`}
                  >
                    <span>{day}</span>
                    
                    {/* Visual dots indicators */}
                    <div className="flex gap-0.5 justify-center w-full">
                      {hasDeposit && (
                        <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-halo-cream' : 'bg-halo-gold animate-ping'}`} />
                      )}
                      {hasMaturity && (
                        <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-halo-cream' : 'bg-amber-400 animate-pulse'}`} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Compact Day Details Panel */}
            <div className="bg-halo-cream p-3 rounded-2xl border border-halo-border text-[10px] space-y-1.5 leading-relaxed">
              <div className="flex justify-between font-bold border-b border-halo-border/60 pb-1 text-halo-text-tertiary">
                <span>DETAILS: {monthNames[month]} {selectedCalendarDay || '??'}, {year}</span>
                {selectedCalendarDay && (calendarEvents[selectedCalendarDay].deposits.length > 0 || calendarEvents[selectedCalendarDay].maturities.length > 0) ? (
                  <span className="text-halo-gold">SAVINGS ACTIVE</span>
                ) : (
                  <span className="text-halo-text-tertiary">QUIET</span>
                )}
              </div>

              {selectedDayDetails ? (
                <div className="space-y-1.5 pt-0.5 max-h-[110px] overflow-y-auto font-mono text-[10px]">
                  {selectedDayDetails.deposits.length === 0 && selectedDayDetails.maturities.length === 0 && (
                    <span className="text-halo-text-muted block">No savings occurrences scheduled or recorded for this date.</span>
                  )}
                  
                  {selectedDayDetails.deposits.map((tx: any) => (
                    <div key={tx.id} className="flex justify-between items-center text-halo-gold">
                      <span className="flex items-center gap-1 text-[9px]">
                        <CheckCircle2 className="w-3 h-3" /> DEPOSIT
                      </span>
                      <span>+{formatMoney(tx.amount, currency)}</span>
                    </div>
                  ))}

                  {selectedDayDetails.maturities.map((tranche: any) => (
                    <div key={tranche.id} className="flex justify-between items-center text-amber-400">
                      <span className="flex items-center gap-1 text-[9px]">
                        <Key className="w-3 h-3" /> MATURITY
                      </span>
                      <span>{formatMoney(tranche.currentValuation || tranche.amount, currency)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-halo-text-muted block">Select any date on the savings calendar above to review deposit schedules or tranche maturation unlocks.</span>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* Emergency Mode Sheet Modal Overlay */}
      {emergencyAlertOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-halo-cream/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-halo-card border border-halo-border rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-rose-500">
              <ShieldAlert className="w-6 h-6 animate-bounce" />
              <h3 className="font-extrabold text-lg text-halo-dark">Emergency Lock override Brief</h3>
            </div>
            
            <p className="text-xs text-halo-text-secondary leading-relaxed">
              HaloSave is designed primarily as a strict visual lock savings environment to defeat impulsivity and foster structural capital aggregation.
            </p>

            <div className="p-4 bg-halo-cream rounded-2xl border border-rose-500/20 space-y-2.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-halo-text-tertiary">BYPASS LOCK QUEUE</span>
                <span className="text-halo-gold font-bold">YES (INSTANT)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-halo-text-tertiary">REGULATORY APP OVERRIDE</span>
                <span className="text-halo-gold font-bold">Bypasses Admin</span>
              </div>
              <div className="flex justify-between">
                <span className="text-halo-text-tertiary">LOCK-BREAKER PENALTY</span>
                <span className="text-rose-400 font-bold">2.5% of Gross value</span>
              </div>
            </div>

            <p className="text-[11px] text-halo-text-tertiary leading-relaxed">
              💡 **How to trigger**: Open the redemption modal, select any locked early savings tranche, check the **"Override locks & trigger instant emergency breakout"** option, and select liquidated amount. Your payout is issued instantly, skipping the regulatory admin review queue.
            </p>

            <button
              onClick={() => setEmergencyAlertOpen(false)}
              className="w-full py-3 rounded-xl bg-halo-secondary hover:bg-halo-tertiary text-halo-dark font-bold text-xs transition-colors"
            >
              Acknowledge & Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
