import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { ApiClient } from '../../api/client.ts';
import { 
  Users, Gift, Award, Calculator, Copy, Check, Sparkles, UserPlus, ArrowRight,
  TrendingUp, CircleDollarSign, CheckCircle2, RefreshCw, Star, Trophy, ShieldCheck
} from 'lucide-react';
import { formatMoney } from '../../lib/utils.ts';
import { motion, AnimatePresence } from 'motion/react';

export const ReferralsTab: React.FC = () => {
  const { user, referrals, showToast, refreshState } = useApp();

  const [customCode, setCustomCode] = useState('');
  const [isUpdatingCode, setIsUpdatingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Simulation States
  const [simName, setSimName] = useState('');
  const [simEmail, setSimEmail] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);

  // Commission Calculator States
  const [calcFriends, setCalcFriends] = useState(5);
  const [calcDeposit, setCalcDeposit] = useState(500);

  // Loading state
  const [isClaiming, setIsClaiming] = useState<number | null>(null);

  const currency = user?.currency || 'GHS';
  const referralCode = referrals?.code || `${user?.fullName.split(' ')[0].toUpperCase()}-HALOSAVE-99`;
  const referralLink = `${window.location.origin}/#/register?ref=${referralCode}`;

  const referralsCount = referrals?.referralsCount || 0;
  const totalEarnings = referrals?.totalEarnings || 0;
  const milestoneLevel = referrals?.milestoneLevel || 1;

  // Milestone Definitions
  const milestones = [
    { level: 1, title: 'Bronze Ambassador', req: 1, reward: 10, desc: 'Invite 1 friend. Earn GHS 10.00 cash bonus + 5% ongoing commission.' },
    { level: 2, title: 'Silver Ambassador', req: 5, reward: 50, desc: 'Invite 5 friends. Earn GHS 50.00 cash bonus + 6% ongoing commission.' },
    { level: 3, title: 'Gold Promoter', req: 10, reward: 150, desc: 'Invite 10 friends. Earn GHS 150.00 cash bonus + 8% ongoing commission.' },
    { level: 4, title: 'Diamond Partner', req: 20, reward: 500, desc: 'Invite 20 friends. Earn GHS 500.00 cash bonus + 10% ongoing commission.' },
    { level: 5, title: 'Crown Leader', req: 50, reward: 1500, desc: 'Invite 50 friends. Earn GHS 1,500.00 cash bonus + 12% ongoing commission.' },
  ];

  const handleCopy = (text: string, type: 'code' | 'link') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
    showToast({
      title: 'Copied successfully! 📋',
      description: `${type === 'code' ? 'Referral Code' : 'Sharing Link'} copied to your clipboard.`,
      type: 'success'
    });
  };

  const handleUpdateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCode) return;
    setIsUpdatingCode(true);
    try {
      const res = await ApiClient.updateReferralCode(customCode);
      if (res.success) {
        showToast({
          title: 'Code Updated! 🎉',
          description: `Your custom referral code is now ${res.code}.`,
          type: 'success'
        });
        setCustomCode('');
        await refreshState();
      }
    } catch (err: any) {
      showToast({
        title: 'Update failed',
        description: err.error || 'This code may already be in use.',
        type: 'error'
      });
    } finally {
      setIsUpdatingCode(false);
    }
  };

  const handleSimulateSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simName || !simEmail) return;
    setIsSimulating(true);
    try {
      const res = await ApiClient.simulateReferralSignup({ fullName: simName, email: simEmail });
      if (res.success) {
        showToast({
          title: 'Referral Registered! 🚀',
          description: `Successfully simulated referred sign-up for ${simName}. GHS 25 commission applied.`,
          type: 'success'
        });
        setSimName('');
        setSimEmail('');
        await refreshState();
      }
    } catch (err: any) {
      showToast({
        title: 'Simulation error',
        description: err.error || 'Failed to register referee.',
        type: 'error'
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleClaimMilestone = async (level: number) => {
    setIsClaiming(level);
    try {
      const res = await ApiClient.claimReferralMilestone(level);
      if (res.success) {
        showToast({
          title: 'Milestone Claimed! 🏆',
          description: res.message,
          type: 'success'
        });
        await refreshState();
      }
    } catch (err: any) {
      showToast({
        title: 'Claim failed',
        description: err.error || 'You have already claimed this milestone or do not meet requirements.',
        type: 'error'
      });
    } finally {
      setIsClaiming(null);
    }
  };

  // Calculator estimates
  const calculateCommissionEstimate = () => {
    const signupReward = calcFriends * 25; // GHS 25 per friend sign up
    let commissionTier = 0.05;
    if (calcFriends >= 50) commissionTier = 0.12;
    else if (calcFriends >= 20) commissionTier = 0.10;
    else if (calcFriends >= 10) commissionTier = 0.08;
    else if (calcFriends >= 5) commissionTier = 0.06;

    const residualCommission = calcFriends * calcDeposit * commissionTier;
    const milestoneBounties = milestones
      .filter(m => calcFriends >= m.req)
      .reduce((sum, m) => sum + m.reward, 0);

    return {
      signupReward,
      residualCommission,
      milestoneBounties,
      total: signupReward + residualCommission + milestoneBounties
    };
  };

  const estimates = calculateCommissionEstimate();

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-24 max-w-6xl mx-auto">
      
      {/* Hero Welcome */}
      <div className="relative overflow-hidden rounded-3xl border border-halo-border bg-halo-card p-8 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-halo-gold/10 blur-[100px]" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-teal-500/10 blur-[100px]" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-halo-gold/10 text-halo-gold border border-halo-gold/20 text-xs font-semibold uppercase tracking-wider font-mono">
              <Gift className="w-4 h-4 animate-bounce" />
              HaloSave Viral Referral Program
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-halo-dark leading-tight">
              Share the Wealth, <span className="bg-gradient-to-r from-halo-gold to-teal-400 bg-clip-text text-transparent">Grow Your Wallet</span>
            </h1>
            <p className="text-sm text-halo-text-tertiary leading-relaxed">
              Earn commissions instantly when friends save. Customize your personal sharing link, unlock premium Ambassador levels, and claim cash bounties in real-time.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 bg-halo-card/60 p-5 rounded-2xl border border-halo-border backdrop-blur-md w-full md:w-auto">
            <div className="text-center px-4 py-2 border-r border-halo-border/80">
              <p className="text-[10px] font-mono uppercase text-halo-text-muted tracking-widest">Total Invites</p>
              <p className="text-2xl font-bold text-halo-dark mt-1">{referralsCount}</p>
            </div>
            <div className="text-center px-4 py-2 border-r border-halo-border/80">
              <p className="text-[10px] font-mono uppercase text-halo-text-muted tracking-widest">Earnings Earned</p>
              <p className="text-2xl font-bold text-halo-gold mt-1 font-mono">
                {formatMoney(totalEarnings, currency)}
              </p>
            </div>
            <div className="text-center px-4 py-2">
              <p className="text-[10px] font-mono uppercase text-halo-text-muted tracking-widest">Ambassador Rank</p>
              <p className="text-xs font-bold text-amber-300 mt-2 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20">
                Lvl {milestoneLevel} • {milestones[milestoneLevel - 1]?.title || 'Ambassador'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Referral Links and Codes Manager */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="rounded-2xl border border-halo-border/80 bg-halo-card/20 p-6 space-y-6">
            <h2 className="text-lg font-bold text-halo-dark flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-halo-gold" />
              Your Invitation Assets
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Copy Referral Code Card */}
              <div className="bg-halo-cream/80 p-5 rounded-xl border border-halo-border hover:border-halo-border-hover transition-all space-y-4">
                <p className="text-xs font-mono uppercase text-halo-text-muted">Your Referral Code</p>
                <div className="flex items-center justify-between p-3 rounded-lg bg-halo-card border border-halo-border font-mono text-lg font-bold text-halo-dark tracking-widest">
                  <span>{referralCode}</span>
                  <button 
                    onClick={() => handleCopy(referralCode, 'code')}
                    className="p-1.5 rounded-md hover:bg-halo-secondary text-halo-text-tertiary hover:text-halo-dark transition-all"
                  >
                    {copiedCode ? <Check className="w-5 h-5 text-halo-gold" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-[11px] text-halo-text-muted leading-normal">
                  Give friends this code during their registration process to instantly link their accounts.
                </p>
              </div>

              {/* Copy Shareable Link Card */}
              <div className="bg-halo-cream/80 p-5 rounded-xl border border-halo-border hover:border-halo-border-hover transition-all space-y-4">
                <p className="text-xs font-mono uppercase text-halo-text-muted">Shareable Invitation Link</p>
                <div className="flex items-center justify-between p-3 rounded-lg bg-halo-card border border-halo-border text-sm font-mono text-halo-text-secondary truncate">
                  <span className="truncate mr-2">{referralLink}</span>
                  <button 
                    onClick={() => handleCopy(referralLink, 'link')}
                    className="p-1.5 rounded-md hover:bg-halo-secondary text-halo-text-tertiary hover:text-halo-dark transition-all shrink-0"
                  >
                    {copiedLink ? <Check className="w-5 h-5 text-halo-gold" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-[11px] text-halo-text-muted leading-normal">
                  Send this unique URL. Anyone who clicks and signs up will automatically credit you.
                </p>
              </div>

            </div>

            {/* Customize Referral Code Form */}
            <form onSubmit={handleUpdateCode} className="border-t border-halo-border/60 pt-5 space-y-3">
              <label className="block text-xs font-semibold text-halo-text-tertiary uppercase tracking-wider">
                Create a Custom Referral Code
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value)}
                    placeholder="e.g. SAVINGS-GURU"
                    maxLength={20}
                    className="w-full pl-4 pr-12 py-2.5 rounded-xl bg-halo-cream border border-halo-border text-halo-dark text-sm placeholder-halo-text-muted focus:outline-none focus:ring-2 focus:ring-halo-gold/20 focus:border-halo-gold transition-all font-mono uppercase"
                  />
                  <div className="absolute right-3 top-3 text-[10px] text-halo-text-muted font-mono uppercase">
                    Custom
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isUpdatingCode || !customCode}
                  className="px-5 rounded-xl bg-halo-secondary hover:bg-halo-tertiary text-halo-dark border border-halo-border-hover text-xs font-bold transition-all hover:text-halo-dark disabled:opacity-50 flex items-center gap-2"
                >
                  {isUpdatingCode ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Save Code'}
                </button>
              </div>
              <p className="text-[10px] font-mono text-halo-text-muted">
                Alphanumeric characters only. Maximum 20 characters. Will instantly invalidate previous codes.
              </p>
            </form>
          </div>

          {/* Ambassador Milestones Level Progress */}
          <div className="rounded-2xl border border-halo-border/80 bg-halo-card/20 p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-halo-dark flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                Ambassador Level Milestone Roadmap
              </h2>
              <span className="text-xs font-mono text-halo-text-tertiary">Rank Progress</span>
            </div>

            {/* Custom Milestone Progress Bar */}
            <div className="relative py-4">
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-halo-secondary -translate-y-1/2 rounded-full" />
              <div 
                className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-halo-gold via-teal-400 to-amber-400 -translate-y-1/2 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(100, Math.max(5, (referralsCount / 50) * 100))}%` }}
              />

              <div className="relative flex justify-between">
                {[0, 1, 5, 10, 20, 50].map((num, idx) => {
                  const isMet = referralsCount >= num;
                  return (
                    <div key={idx} className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 z-10 transition-all font-bold text-xs ${
                        isMet 
                          ? 'bg-halo-cream border-amber-400 text-amber-300 shadow-lg shadow-amber-500/10' 
                          : 'bg-halo-card border-halo-border text-halo-text-muted'
                      }`}>
                        {num}
                      </div>
                      <span className="text-[9px] font-mono text-halo-text-muted mt-2">
                        {num === 0 ? 'Start' : `${num} Refs`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Milestone Claiming Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {milestones.map((m) => {
                const isClaimedOrClaimable = referralsCount >= m.req;
                const isActiveLevel = milestoneLevel === m.level;

                return (
                  <div 
                    key={m.level}
                    className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 ${
                      isActiveLevel 
                        ? 'bg-gradient-to-br from-amber-500/10 via-transparent to-transparent border-amber-500/40 shadow-inner' 
                        : isClaimedOrClaimable 
                          ? 'bg-halo-cream/40 border-halo-border/80 text-halo-text-tertiary' 
                          : 'bg-halo-cream/20 border-halo-border opacity-60 text-halo-text-muted'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center">
                        <span className={`text-xs font-bold uppercase tracking-wider ${isActiveLevel ? 'text-amber-400' : 'text-halo-text-secondary'}`}>
                          Lvl {m.level}: {m.title}
                        </span>
                        <span className="text-xs font-mono font-bold text-halo-gold">
                          +{formatMoney(m.reward, currency)} Bonus
                        </span>
                      </div>
                      <p className="text-xs mt-1.5 leading-relaxed text-halo-text-tertiary">{m.desc}</p>
                    </div>

                    <button
                      onClick={() => handleClaimMilestone(m.level)}
                      disabled={isClaiming !== null || !isClaimedOrClaimable}
                      className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        isClaimedOrClaimable 
                          ? 'bg-amber-500 hover:bg-amber-400 text-halo-dark cursor-pointer shadow-lg shadow-amber-500/20' 
                          : 'bg-halo-secondary/40 border border-halo-border/80 text-halo-text-muted cursor-not-allowed'
                      }`}
                    >
                      {isClaiming === m.level ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Award className="w-4 h-4" />
                          Claim Milestone Reward
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Side Panels: Calculator and Simulation */}
        <div className="space-y-8">
          
          {/* Interactive Calculator */}
          <div className="rounded-2xl border border-halo-border/80 bg-halo-card/20 p-6 space-y-6">
            <h2 className="text-md font-bold text-halo-dark flex items-center gap-2">
              <Calculator className="w-5 h-5 text-halo-gold" />
              Commission Calculator
            </h2>

            <div className="space-y-5">
              
              {/* Slider 1 */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-halo-text-tertiary font-medium">Invited Friends</span>
                  <span className="font-bold text-halo-dark">{calcFriends} Friends</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={calcFriends}
                  onChange={(e) => setCalcFriends(Number(e.target.value))}
                  className="w-full accent-halo-gold h-1.5 bg-halo-secondary rounded-lg cursor-pointer"
                />
              </div>

              {/* Slider 2 */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-halo-text-tertiary font-medium">Average Deposit Per Friend</span>
                  <span className="font-bold text-halo-dark font-mono">{formatMoney(calcDeposit, currency)}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="5000"
                  step="50"
                  value={calcDeposit}
                  onChange={(e) => setCalcDeposit(Number(e.target.value))}
                  className="w-full accent-halo-gold h-1.5 bg-halo-secondary rounded-lg cursor-pointer"
                />
              </div>

              {/* Estimate Outputs */}
              <div className="border-t border-halo-border/80 pt-5 space-y-3.5">
                <div className="flex justify-between text-xs">
                  <span className="text-halo-text-muted font-mono">Sign-up Commission</span>
                  <span className="font-mono text-halo-text-secondary font-semibold">+{formatMoney(estimates.signupReward, currency)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-halo-text-muted font-mono">Residual Commission</span>
                  <span className="font-mono text-halo-text-secondary font-semibold">+{formatMoney(estimates.residualCommission, currency)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-halo-text-muted font-mono">Milestone Cash Bonuses</span>
                  <span className="font-mono text-halo-text-secondary font-semibold">+{formatMoney(estimates.milestoneBounties, currency)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-halo-border/60 pt-3">
                  <span className="text-xs font-bold text-halo-text-secondary">Potential Total Profit</span>
                  <span className="text-xl font-black text-halo-gold font-mono">
                    {formatMoney(estimates.total, currency)}
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Viral Signup Simulation Box */}
          <div className="rounded-2xl border border-halo-border/80 bg-halo-card/20 p-6 space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-halo-gold/10 text-halo-gold text-[10px] font-mono border border-halo-gold/20 font-bold uppercase tracking-wider mb-2">
                Viral Sandbox
              </div>
              <h2 className="text-md font-bold text-halo-dark flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-halo-gold" />
                Referral Simulator
              </h2>
              <p className="text-[11px] text-halo-text-tertiary leading-relaxed mt-1">
                Simulate a friend joining the HaloSave platform with your code to test reward calculations and unlock ranks!
              </p>
            </div>

            <form onSubmit={handleSimulateSignup} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-widest text-halo-text-muted">Friend's Full Name</label>
                <input
                  type="text"
                  required
                  value={simName}
                  onChange={(e) => setSimName(e.target.value)}
                  placeholder="e.g. Ama Mensah"
                  className="w-full px-4 py-2 rounded-xl bg-halo-cream border border-halo-border text-halo-dark text-xs focus:outline-none focus:ring-2 focus:ring-halo-gold/20 focus:border-halo-gold transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-widest text-halo-text-muted">Friend's Email</label>
                <input
                  type="email"
                  required
                  value={simEmail}
                  onChange={(e) => setSimEmail(e.target.value)}
                  placeholder="e.g. ama@gmail.com"
                  className="w-full px-4 py-2 rounded-xl bg-halo-cream border border-halo-border text-halo-dark text-xs focus:outline-none focus:ring-2 focus:ring-halo-gold/20 focus:border-halo-gold transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isSimulating || !simName || !simEmail}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-halo-gold to-teal-600 hover:from-halo-gold hover:to-teal-500 text-halo-dark font-bold text-xs shadow-lg shadow-halo-gold/20 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSimulating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Launch Signup Simulation</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

        </div>

      </div>

      {/* Referred Friends Table / Log list */}
      <div className="rounded-2xl border border-halo-border/80 bg-halo-card/20 p-6 space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-bold text-halo-dark flex items-center gap-2">
              <Users className="w-5 h-5 text-halo-gold" />
              Referred Connections ({referrals?.referredUsers?.length || 0})
            </h2>
            <p className="text-xs text-halo-text-tertiary mt-1">
              Complete history of users who registered using your custom assets.
            </p>
          </div>
          <button 
            onClick={() => refreshState()}
            className="px-4 py-1.5 rounded-lg border border-halo-border bg-halo-cream hover:bg-halo-card text-xs font-semibold text-halo-text-secondary flex items-center gap-2 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {referrals?.referredUsers && referrals.referredUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-halo-border text-[10px] font-mono uppercase tracking-wider text-halo-text-muted">
                  <th className="py-3 px-4">Referee Name</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Commissions Generated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-xs">
                {referrals.referredUsers.map((ref: any, index: number) => (
                  <tr key={index} className="hover:bg-halo-card/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-halo-dark">{ref.fullName}</td>
                    <td className="py-3.5 px-4 font-mono text-halo-text-tertiary">{ref.email}</td>
                    <td className="py-3.5 px-4 text-halo-text-tertiary">
                      {new Date(ref.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        ref.status === 'Active Saver'
                          ? 'bg-halo-gold/10 text-halo-gold border-halo-gold/20'
                          : ref.status === 'First Deposit'
                            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          ref.status === 'Active Saver' ? 'bg-halo-gold' : ref.status === 'First Deposit' ? 'bg-cyan-400' : 'bg-amber-400'
                        }`} />
                        {ref.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-halo-gold">
                      +{formatMoney(ref.commissionEarned, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 rounded-xl border border-dashed border-halo-border bg-halo-cream/20 space-y-3">
            <Users className="w-10 h-10 text-halo-text-tertiary mx-auto" />
            <p className="text-sm font-semibold text-halo-text-tertiary">No referred connections yet</p>
            <p className="text-xs text-halo-text-muted max-w-sm mx-auto">
              Be the first to share your invitation code or launch a registration simulation above to see live updates!
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
