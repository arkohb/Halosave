import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { 
  ShieldCheck, 
  ToggleLeft, 
  ToggleRight, 
  Sliders, 
  Database, 
  Save, 
  CheckCircle2, 
  Users, 
  UserCheck, 
  Check, 
  X, 
  Hourglass, 
  FileText, 
  ArrowUpRight, 
  AlertTriangle, 
  Sparkles, 
  Lock, 
  ArrowLeft,
  LayoutDashboard,
  ArrowLeftRight,
  Coins,
  FileSpreadsheet,
  Send,
  Settings,
  TrendingUp,
  PieChart as PieIcon,
  HelpCircle,
  Briefcase,
  Cpu
} from 'lucide-react';
import { formatDateTime, formatMoney } from '../../lib/utils.ts';
import { motion, AnimatePresence } from 'motion/react';
import { SecurityTab } from './SecurityTab.tsx';
import { JobsTab } from './JobsTab.tsx';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export const AdminTab: React.FC = () => {
  const { 
    featureFlags, 
    simulation, 
    auditLogs, 
    updateAdminSettings, 
    user,
    adminUsers,
    adminWithdrawals,
    adminTransactions,
    adminVaults,
    adminTranches,
    fetchAdminData,
    confirmUser,
    approveWithdrawal,
    rejectWithdrawal,
    broadcastNotification,
    showToast,
    login,
    updateUserRole
  } = useApp();
  
  // Tab control
  const [activeSubTab, setActiveSubTab] = useState<
    'dashboard' | 'users' | 'transactions' | 'investments' | 'providers' | 'flags' | 'reports' | 'broadcast' | 'audit' | 'settings' | 'analytics' | 'security' | 'jobs'
  >('dashboard');
  
  // Simulator state: allow standard user to simulate being a Super Admin to test the features!
  const [isSimulatingSuperAdmin, setIsSimulatingSuperAdmin] = useState(user?.role === 'super_admin');

  // Admin login credentials input states
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Filters and searches
  const [userSearch, setUserSearch] = useState('');
  const [kycFilter, setKycFilter] = useState<'all' | 'verified' | 'pending'>('all');
  const [txSearch, setTxSearch] = useState('');
  const [txFilter, setTxFilter] = useState<'all' | 'deposit' | 'withdrawal' | 'interest' | 'fee'>('all');

  // Broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState<'general' | 'deposit' | 'withdrawal' | 'unlock' | 'achievement'>('general');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Settings form states
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [feeRate, setFeeRate] = useState(1.5);
  const [earlyPenalty, setEarlyPenalty] = useState(5.0);
  const [minDeposit, setMinDeposit] = useState(10);
  const [platformCurrency, setPlatformCurrency] = useState('GHS');

  useEffect(() => {
    if (user?.role === 'super_admin') {
      setIsSimulatingSuperAdmin(true);
    }
  }, [user]);

  // Fetch admin data on mount
  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData, activeSubTab]);

  const [flagsState, setFlagsState] = useState(featureFlags || {
    investmentEngine: true,
    loans: false,
    insurance: false,
    groupSavings: true,
    corporateSavings: false,
    aiCoach: true,
    referrals: true,
    treasuryBills: true,
  });

  const [simState, setSimState] = useState(simulation || {
    providerName: 'Databank MFund (Tier-1 Licensed)',
    currentNAV: 2.4815,
    annualReturnPercentage: 19.2,
    dailyGrowthRate: 0.0526,
    managementFeePercentage: 1.0,
    compoundingFrequency: 'daily',
    redemptionDelayHours: 0,
    lastValuationDate: new Date().toISOString(),
  });

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleToggleFlag = (key: string) => {
    setFlagsState(prev => ({ ...prev, [key]: !(prev as any)[key] }));
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      await updateAdminSettings({ flags: flagsState, simulation: simState });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const flagLabels: Record<string, { title: string; desc: string }> = {
    investmentEngine: { title: 'Modular Investment Engine', desc: 'Routes locked balances into Databank MFund mutual units.' },
    loans: { title: 'Overdraft Loans Module', desc: 'Allows borrowing against locked halosave balances (Beta).' },
    insurance: { title: 'Life Shield Insurance', desc: 'Automatic deposit deposit insurance micro-coverage.' },
    groupSavings: { title: 'Group HaloSave Vaults', desc: 'Multi-user collaborative communal vaults.' },
    corporateSavings: { title: 'Corporate Payroll HaloSave', desc: 'Employer direct salary deduction vaults.' },
    aiCoach: { title: 'Gemini AI Savings Coach', desc: 'Generative wealth advisory bot in Navbar.' },
    referrals: { title: 'Viral Referral Engine', desc: 'Commission rewards and milestone tracking.' },
    treasuryBills: { title: 'Government Treasury Bills', desc: '91-day and 182-day T-Bill provider switch.' },
  };

  const handleConfirmUserClick = async (userId: string) => {
    if (!isSimulatingSuperAdmin) {
      showToast({ 
        title: '🔒 Access Control Restriction', 
        description: 'You must enable "Super Admin Simulator Mode" at the top to confirm users.', 
        type: 'lock' 
      });
      return;
    }
    await confirmUser(userId);
  };

  const handleApproveWithdrawalClick = async (reqId: string) => {
    if (!isSimulatingSuperAdmin) {
      showToast({ 
        title: '🔒 Access Control Restriction', 
        description: 'You must enable "Super Admin Simulator Mode" at the top to approve payouts.', 
        type: 'lock' 
      });
      return;
    }
    await approveWithdrawal(reqId);
  };

  const handleRejectWithdrawalClick = async (reqId: string) => {
    if (!isSimulatingSuperAdmin) {
      showToast({ 
        title: '🔒 Access Control Restriction', 
        description: 'You must enable "Super Admin Simulator Mode" at the top to decline payouts.', 
        type: 'lock' 
      });
      return;
    }
    await rejectWithdrawal(reqId);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsLoggingIn(true);
    try {
      const success = await login(emailInput, passwordInput);
      if (success) {
        showToast({
          title: 'Authorized 🛡️',
          description: 'Logged in successfully as Super Admin.',
          type: 'success'
        });
      } else {
        setAuthError('Invalid administrator credentials.');
      }
    } catch (err) {
      setAuthError('Authentication handshake failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAutoLoginBismark = async () => {
    setAuthError('');
    setIsLoggingIn(true);
    try {
      const success = await login('beamark54@gmail.com', 'admin123');
      if (success) {
        showToast({
          title: 'Welcome Bismark Arko-Ofori 🛡️',
          description: 'Official Super Admin credentials authenticated.',
          type: 'success'
        });
      } else {
        setAuthError('Pre-seeded administrator Bismark Arko-Ofori not found.');
      }
    } catch (err) {
      setAuthError('Authentication failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMessage) {
      showToast({ title: 'Validation Alert', description: 'Please fill out both broadcast title and message.', type: 'info' });
      return;
    }
    if (!isSimulatingSuperAdmin) {
      showToast({ title: 'Security Guard', description: 'Super Admin simulator mode must be enabled to dispatch broadcasts.', type: 'lock' });
      return;
    }
    setIsBroadcasting(true);
    try {
      const success = await broadcastNotification(broadcastTitle, broadcastMessage, broadcastType);
      if (success) {
        setBroadcastTitle('');
        setBroadcastMessage('');
        setBroadcastType('general');
      }
    } finally {
      setIsBroadcasting(false);
    }
  };

  const pendingUsersCount = adminUsers.filter(u => !u.isKycVerified).length;
  const pendingWithdrawalsCount = adminWithdrawals.filter(r => r.status === 'pending').length;

  // Standalone Access Control Gate
  const isAuthorized = user?.role === 'super_admin' || isSimulatingSuperAdmin;

  // Stats on-the-fly calculations
  const totalAUM = adminVaults.reduce((sum, v) => sum + Number(v.balance || 0), 0);
  const totalUsers = adminUsers.length;
  const verifiedUsersCount = adminUsers.filter(u => u.isKycVerified).length;
  const activeVaultsCount = adminVaults.length;
  const totalTransactionsCount = adminTransactions.length;
  
  const depositsTotal = adminTransactions
    .filter(t => t.type === 'deposit' && t.status === 'completed')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const withdrawalsTotal = adminTransactions
    .filter(t => t.type === 'withdrawal' && t.status === 'completed')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const interestTotal = adminTransactions
    .filter(t => t.type === 'interest')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  // Filters computed states
  const filteredUsers = adminUsers.filter(u => {
    const uSearch = (userSearch || '').toLowerCase();
    const matchesSearch = (u.fullName || '').toLowerCase().includes(uSearch) || 
                          (u.email || '').toLowerCase().includes(uSearch);
    const matchesKyc = kycFilter === 'all' ? true :
                       kycFilter === 'verified' ? u.isKycVerified : !u.isKycVerified;
    return matchesSearch && matchesKyc;
  });

  const filteredTransactions = adminTransactions.filter(t => {
    const tSearch = (txSearch || '').toLowerCase();
    const matchesSearch = (t.userFullName || '').toLowerCase().includes(tSearch) || 
                          (t.userEmail || '').toLowerCase().includes(tSearch) ||
                          (t.id || '').toLowerCase().includes(tSearch);
    const matchesType = txFilter === 'all' ? true : t.type === txFilter;
    return matchesSearch && matchesType;
  });

  // Analytics mock fallback values for stunning visual graphs
  const mockAUMTrend = [
    { name: 'Mon', value: totalAUM * 0.85 || 15400 },
    { name: 'Tue', value: totalAUM * 0.89 || 18900 },
    { name: 'Wed', value: totalAUM * 0.92 || 22100 },
    { name: 'Thu', value: totalAUM * 0.94 || 25400 },
    { name: 'Fri', value: totalAUM * 0.97 || 28900 },
    { name: 'Sat', value: totalAUM * 0.99 || 32000 },
    { name: 'Sun', value: totalAUM || 35600 },
  ];

  const mockTxByDay = [
    { name: 'Deposits', value: depositsTotal || 45000, fill: '#10b981' },
    { name: 'Withdrawals', value: withdrawalsTotal || 12000, fill: '#f43f5e' },
    { name: 'Interest paid', value: interestTotal || 3500, fill: '#06b6d4' }
  ];

  // Country stats distribution
  const countryCounts: Record<string, number> = {};
  adminUsers.forEach(u => {
    const c = u.country || 'Ghana';
    countryCounts[c] = (countryCounts[c] || 0) + 1;
  });
  
  const mockCountryData = Object.keys(countryCounts).length > 0
    ? Object.keys(countryCounts).map(name => ({ name, value: countryCounts[name] }))
    : [
        { name: 'Ghana', value: 75 },
        { name: 'Nigeria', value: 15 },
        { name: 'Ivory Coast', value: 10 }
      ];

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];

  if (!isAuthorized) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 animate-in fade-in duration-500 max-w-xl mx-auto">
        <div className="bg-halo-card border border-halo-border rounded-[32px] p-6 sm:p-10 w-full shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/5 rounded-full filter blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/5 rounded-full filter blur-2xl pointer-events-none" />
          
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-600 p-0.5 shadow-xl shadow-rose-500/10 flex items-center justify-center">
              <div className="w-full h-full bg-halo-cream rounded-[14px] flex items-center justify-center">
                <Lock className="w-6 h-6 text-rose-400 animate-pulse" />
              </div>
            </div>
            
            <div>
              <div className="text-[10px] font-mono tracking-widest text-rose-400 font-bold uppercase">
                SECURE PLATFORM GATEWAY
              </div>
              <h2 className="text-xl font-extrabold text-halo-dark mt-1 tracking-tight">
                Super Admin Access Restricted
              </h2>
              <p className="text-xs text-halo-text-tertiary mt-2 leading-relaxed">
                This administrative console is designated strictly for regulatory auditing and platform operations. Please authorize to proceed.
              </p>
            </div>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4 mt-8">
            <div className="space-y-1.5">
              <label className="text-[10px] text-halo-text-tertiary font-mono uppercase font-bold">Admin Email Address</label>
              <input
                type="email"
                placeholder="admin@halosave.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full bg-halo-cream border border-halo-border focus:border-rose-500/50 rounded-xl px-4 py-3 text-xs text-halo-dark placeholder-halo-text-muted focus:outline-none transition-all font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-halo-text-tertiary font-mono uppercase font-bold">Security Passphrase</label>
              <input
                type="password"
                placeholder="••••••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-halo-cream border border-halo-border focus:border-rose-500/50 rounded-xl px-4 py-3 text-xs text-halo-dark placeholder-halo-text-muted focus:outline-none transition-all font-mono"
                required
              />
            </div>

            {authError && (
              <p className="text-[11px] text-rose-400 font-mono text-center bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                ⚠️ {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-400 hover:to-amber-500 text-halo-dark font-extrabold text-xs transition-all shadow-lg shadow-rose-500/20"
            >
              {isLoggingIn ? 'Verifying Handshake...' : 'Authenticate Administration clearance'}
            </button>
          </form>

          {/* Quick Sandbox Tools */}
          <div className="mt-6 pt-6 border-t border-halo-border/80 space-y-3">
            <div className="text-[10px] font-mono font-bold text-halo-text-muted text-center uppercase tracking-wider">
              Sandbox Assessment Quick-Actions
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleAutoLoginBismark}
                className="p-3 bg-halo-cream hover:bg-halo-secondary/80 rounded-xl border border-halo-border text-left transition-all group"
              >
                <span className="text-[9px] font-mono text-halo-text-muted block uppercase font-bold">OFFICIAL CREDENTIALS</span>
                <span className="text-[11px] font-bold text-halo-text-secondary group-hover:text-halo-gold flex items-center gap-1 mt-0.5">
                  Bismark Arko-Ofori <ArrowUpRight className="w-3 h-3 opacity-60" />
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsSimulatingSuperAdmin(true);
                  showToast({
                    title: 'Simulator Bypass Active ⚙️',
                    description: 'Granted full administrative dashboard clearance.',
                    type: 'success'
                  });
                }}
                className="p-3 bg-halo-cream hover:bg-halo-secondary/80 rounded-xl border border-halo-border text-left transition-all group"
              >
                <span className="text-[9px] font-mono text-halo-text-muted block uppercase font-bold">PREVIEW SANDBOX</span>
                <span className="text-[11px] font-bold text-halo-text-secondary group-hover:text-amber-400 flex items-center gap-1 mt-0.5">
                  Sandbox Bypass <Sparkles className="w-3 h-3 text-amber-400" />
                </span>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <a 
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-halo-text-muted hover:text-halo-text-secondary transition-colors font-mono"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to HaloSave Client App</span>
            </a>
          </div>

        </div>
      </div>
    );
  }

  // Define sidebar navigation tabs configuration
  const sidebarTabs: Array<{ id: string; label: string; icon: any; badge?: number }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users, badge: pendingUsersCount > 0 ? pendingUsersCount : undefined },
    { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
    { id: 'investments', label: 'Investments', icon: Coins },
    { id: 'providers', label: 'Providers', icon: Database },
    { id: 'flags', label: 'Feature Flags', icon: Sliders },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
    { id: 'broadcast', label: 'Broadcast', icon: Send },
    { id: 'audit', label: 'Audit Logs', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'security', label: 'Security Portal', icon: ShieldCheck },
    { id: 'jobs', label: 'Background Jobs', icon: Cpu },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-24 max-w-7xl mx-auto px-4 sm:px-6">
      
      {/* Standalone Route Navigation Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <a 
          href="/" 
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-halo-card/80 hover:bg-halo-secondary border border-halo-border rounded-xl text-xs font-mono text-halo-text-secondary hover:text-halo-dark transition-all shadow-lg"
        >
          <ArrowLeft className="w-4 h-4 text-halo-gold" />
          <span>Exit to HaloSave Client App</span>
        </a>
        <div className="text-[10px] font-mono text-halo-text-muted flex items-center gap-2 bg-halo-card/40 px-3 py-1.5 rounded-lg border border-halo-border">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          <span>CONTROL PANEL SECURE SESSION</span>
        </div>
      </div>

      {/* Header Bar */}
      <div className="bg-halo-card p-6 sm:p-8 rounded-3xl border border-halo-border shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-halo-gold/5 rounded-full filter blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-rose-400 text-xs font-mono font-bold">
            <ShieldCheck className="w-4 h-4 text-rose-400" />
            <span>DEVSECOPS & REGULATORY SUPERVISOR</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-halo-dark tracking-tight mt-1">
            Superintendent Administration Console
          </h1>
          <p className="text-xs text-halo-text-tertiary max-w-2xl mt-1 leading-relaxed">
            Manage KYC, verify early redemptions, hot-swap feature modules, broadcast compliance alerts, track mutual fund compounding NAVs, and audit overall reserve ratios.
          </p>
        </div>

        {/* Super Admin Sandbox Mode Controller */}
        <div className="bg-halo-cream p-4 rounded-2xl border border-halo-border flex flex-col gap-2 shrink-0 relative z-10 w-full lg:w-auto">
          <div className="flex items-center justify-between gap-6">
            <div>
              <span className="text-halo-text-muted block text-[10px] font-mono font-bold uppercase">PREVIEW SANDBOX ACCESS</span>
              <span className="text-halo-dark text-xs font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Super Admin Simulation Mode
              </span>
            </div>
            <button
              onClick={() => {
                if (user?.role === 'super_admin') {
                  showToast({ 
                    title: 'System Safeguard', 
                    description: 'You are logged in with actual Super Admin credentials (Bismark Arko-Ofori). Simulation remains locked to active.', 
                    type: 'info' 
                  });
                  return;
                }
                setIsSimulatingSuperAdmin(!isSimulatingSuperAdmin);
                showToast({
                  title: !isSimulatingSuperAdmin ? 'Key Granted 🔑' : 'Sandbox Revoked 🔒',
                  description: !isSimulatingSuperAdmin 
                    ? 'Super Admin clearance granted! You can now approve withdrawals and confirm users.' 
                    : 'Returned to regular user clearance.',
                  type: 'info'
                });
              }}
              className="relative shrink-0"
            >
              {isSimulatingSuperAdmin ? (
                <ToggleRight className="w-10 h-10 text-halo-gold animate-in zoom-in-50 duration-250" />
              ) : (
                <ToggleLeft className="w-10 h-10 text-halo-text-tertiary" />
              )}
            </button>
          </div>
          <div className="text-[10px] text-halo-text-tertiary max-w-[240px] leading-snug font-mono border-t border-halo-border pt-2 flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSimulatingSuperAdmin ? 'bg-halo-gold animate-pulse' : 'bg-rose-500'}`} />
            <span>
              {isSimulatingSuperAdmin 
                ? 'Role: Simulating SUPER_ADMIN (Bismark)' 
                : 'Role: Read-Only User Panel'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Administrative Layout with Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Navigation Sidebar Panel */}
        <div className="lg:col-span-3 bg-halo-card rounded-3xl border border-halo-border p-4 space-y-2 lg:sticky lg:top-6 shadow-xl">
          <div className="px-3 py-2 border-b border-halo-border/80 mb-3">
            <div className="text-[10px] font-mono font-bold text-halo-text-muted uppercase tracking-widest">
              Control Panel Subsystems
            </div>
          </div>
          <nav className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible gap-1 pb-2 lg:pb-0 scrollbar-none">
            {sidebarTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id as any)}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-xs font-semibold transition-all relative ${
                    isActive 
                      ? 'bg-gradient-to-r from-halo-gold/20 to-halo-gold-hover/5 text-emerald-300 border border-halo-gold/20 font-bold' 
                      : 'text-halo-text-tertiary hover:text-halo-dark hover:bg-halo-secondary/50 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-halo-gold' : 'text-halo-text-muted'}`} />
                  <span className="whitespace-nowrap lg:inline">{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span className="ml-auto bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full animate-pulse shrink-0">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Dynamic Content Panel */}
        <div className="lg:col-span-9 space-y-8 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSubTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              
              {/* SUB-TAB: Dashboard */}
              {activeSubTab === 'dashboard' && (
                <div className="space-y-8">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    
                    <div className="bg-halo-card p-6 rounded-3xl border border-halo-border shadow-lg relative overflow-hidden group hover:border-halo-border-hover transition-all">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-halo-gold/5 rounded-full filter blur-xl" />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase font-bold text-halo-text-tertiary tracking-wider">Assets Locked (AUM)</span>
                        <div className="p-2 bg-halo-gold/10 text-halo-gold rounded-lg"><Coins className="w-4 h-4" /></div>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-2xl font-black text-halo-dark font-mono tracking-tight">{formatMoney(totalAUM || 35600, 'GHS')}</h3>
                        <p className="text-[10px] text-halo-text-muted mt-1 flex items-center gap-1">
                          <span className="text-halo-gold font-bold"> Ghana Cedis </span> aggregate volume in mutual tranches.
                        </p>
                      </div>
                    </div>

                    <div className="bg-halo-card p-6 rounded-3xl border border-halo-border shadow-lg relative overflow-hidden group hover:border-halo-border-hover transition-all">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full filter blur-xl" />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase font-bold text-halo-text-tertiary tracking-wider">Active Platform Users</span>
                        <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg"><Users className="w-4 h-4" /></div>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-2xl font-black text-halo-dark font-mono tracking-tight">{totalUsers} Users</h3>
                        <p className="text-[10px] text-halo-text-muted mt-1">
                          <span className="text-halo-gold font-bold font-mono">{verifiedUsersCount} Verified KYC ({totalUsers ? Math.round((verifiedUsersCount/totalUsers)*100) : 0}%)</span>
                        </p>
                      </div>
                    </div>

                    <div className="bg-halo-card p-6 rounded-3xl border border-halo-border shadow-lg relative overflow-hidden group hover:border-halo-border-hover transition-all">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full filter blur-xl" />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase font-bold text-halo-text-tertiary tracking-wider">Redemptions Requested</span>
                        <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg"><Hourglass className="w-4 h-4" /></div>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-2xl font-black text-halo-dark font-mono tracking-tight">{pendingWithdrawalsCount} Pending</h3>
                        <p className="text-[10px] text-halo-text-muted mt-1">
                          Value: <span className="text-rose-400 font-bold font-mono">{formatMoney(adminWithdrawals.filter(w=>w.status==='pending').reduce((s,w)=>s+Number(w.amount||0),0), 'GHS')}</span>
                        </p>
                      </div>
                    </div>

                  </div>

                  {/* Redemptions queue has priority */}
                  <div className="bg-halo-card p-6 sm:p-8 rounded-3xl border border-halo-border shadow-xl space-y-6">
                    <div className="flex items-center justify-between border-b border-halo-border pb-4">
                      <div>
                        <h3 className="font-bold text-halo-dark text-lg flex items-center gap-2">
                          <Hourglass className="w-5 h-5 text-amber-400" />
                          <span>Redemption Authorization Queue</span>
                        </h3>
                        <p className="text-xs text-halo-text-tertiary">Review, decline, or process early lock-breaker payouts via Mobile Money integration</p>
                      </div>
                      <span className="text-xs font-mono px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20 font-bold">
                        {pendingWithdrawalsCount} Queue Requests
                      </span>
                    </div>

                    {adminWithdrawals.length === 0 ? (
                      <div className="p-8 text-center text-halo-text-muted border-2 border-dashed border-halo-border rounded-2xl">
                        <CheckCircle2 className="w-10 h-10 text-halo-text-tertiary mx-auto mb-2" />
                        <p className="text-sm">Redemption queue is currently empty. No pending payouts.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {adminWithdrawals.map((req) => {
                          const isPending = req.status === 'pending';
                          return (
                            <div 
                              key={req.id} 
                              className={`p-5 rounded-2xl border transition-all ${
                                !isPending 
                                  ? 'bg-halo-cream/40 border-halo-border/60 opacity-60' 
                                  : req.isEarly 
                                  ? 'bg-rose-950/10 border-rose-500/20 hover:border-rose-500/30' 
                                  : 'bg-halo-cream/80 border-halo-border hover:border-halo-border-hover'
                              }`}
                            >
                              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="space-y-2 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                                    <span className="font-bold uppercase text-halo-text-secondary bg-halo-secondary px-2 py-0.5 rounded border border-halo-border-hover">
                                      REQ: {req.id}
                                    </span>
                                    {req.isEarly ? (
                                      <span className="font-extrabold text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3 text-rose-400" /> EARLY LOCK BREAK EXEMPTION
                                      </span>
                                    ) : (
                                      <span className="font-extrabold text-emerald-300 bg-halo-gold/10 px-2 py-0.5 rounded border border-halo-gold/20">
                                        MATURED DEPOSIT PAYOUT
                                      </span>
                                    )}
                                    <span className={`px-2 py-0.5 rounded font-extrabold ${
                                      req.status === 'approved' 
                                        ? 'bg-halo-gold/10 text-halo-gold border border-halo-gold/20' 
                                        : req.status === 'rejected' 
                                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    }`}>
                                      {req.status.toUpperCase()}
                                    </span>
                                  </div>

                                  <h4 className="text-base font-extrabold text-halo-dark flex flex-wrap items-center gap-x-2">
                                    <span>{req.userFullName}</span>
                                    <span className="text-halo-text-muted text-xs font-normal">({req.userEmail})</span>
                                  </h4>

                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-1 text-xs font-mono text-halo-text-tertiary">
                                    <div>
                                      <span className="text-halo-text-muted block text-[10px]">VAULT SOURCE</span>
                                      <span className="text-halo-text-secondary font-bold">{req.vaultName}</span>
                                    </div>
                                    <div>
                                      <span className="text-halo-text-muted block text-[10px]">PAYOUT METHOD</span>
                                      <span className="text-amber-400 truncate block">{req.destinationAccount}</span>
                                    </div>
                                    <div>
                                      <span className="text-halo-text-muted block text-[10px]">SUBMITTED AT</span>
                                      <span>{formatDateTime(req.requestedAt)}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between lg:justify-center gap-4 border-t lg:border-t-0 border-halo-border pt-4 lg:pt-0 shrink-0">
                                  <div className="text-left sm:text-right font-mono">
                                    <span className="text-halo-text-muted text-[10px] block font-semibold uppercase">PAYOUT DISBURSEMENT</span>
                                    <span className="text-xl font-extrabold text-halo-gold">
                                      {formatMoney(req.amount, req.currency)}
                                    </span>
                                  </div>

                                  {isPending && (
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => handleRejectWithdrawalClick(req.id)}
                                        className="p-2 px-3 rounded-xl bg-halo-cream hover:bg-rose-950/40 border border-halo-border hover:border-rose-500/40 text-rose-400 hover:text-rose-200 transition-all flex items-center gap-1 text-xs font-bold"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                        <span>Decline</span>
                                      </button>
                                      <button
                                        onClick={() => handleApproveWithdrawalClick(req.id)}
                                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-halo-gold to-teal-600 hover:from-halo-gold hover:to-teal-500 text-halo-dark transition-all flex items-center gap-1 text-xs font-extrabold shadow-lg shadow-halo-gold/15"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Approve & Pay</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUB-TAB: Users */}
              {activeSubTab === 'users' && (
                <div className="bg-halo-card p-6 sm:p-8 rounded-3xl border border-halo-border shadow-xl space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-halo-border pb-5">
                    <div>
                      <h3 className="font-bold text-halo-dark text-lg">Platform Users Management</h3>
                      <p className="text-xs text-halo-text-tertiary">Perform compliance confirmations, view statistics, and manage role credentials</p>
                    </div>
                    <span className="text-xs font-mono px-3 py-1 bg-halo-gold/10 text-halo-gold rounded-full border border-halo-gold/20 font-bold">
                      {totalUsers} Registered Accounts
                    </span>
                  </div>

                  {/* Filters and Search */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
                    <div className="sm:col-span-2">
                      <input 
                        type="text" 
                        placeholder="Search users by name, email, account..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="w-full bg-halo-cream border border-halo-border focus:border-halo-gold/50 rounded-xl px-4 py-3 text-xs text-halo-dark placeholder-halo-text-muted focus:outline-none transition-all"
                      />
                    </div>
                    <div>
                      <select
                        value={kycFilter}
                        onChange={(e) => setKycFilter(e.target.value as any)}
                        className="w-full bg-halo-cream border border-halo-border rounded-xl px-4 py-3 text-xs text-halo-text-secondary outline-none focus:border-halo-gold/50 cursor-pointer"
                      >
                        <option value="all">ALL KYC STATES</option>
                        <option value="verified">VERIFIED ONLY</option>
                        <option value="pending">UNVERIFIED ONLY</option>
                      </select>
                    </div>
                  </div>

                  {filteredUsers.length === 0 ? (
                    <div className="p-8 text-center text-halo-text-muted border border-halo-border rounded-2xl">
                      <p className="text-sm font-mono">No accounts matched your filters.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className="border-b border-halo-border text-halo-text-tertiary">
                            <th className="pb-3 pl-2">USER ACCOUNT</th>
                            <th className="pb-3">PHONE & COUNTRY</th>
                            <th className="pb-3">SAVINGS STREAK</th>
                            <th className="pb-3">SECURITY LEVEL</th>
                            <th className="pb-3 text-right pr-2">KYC STATUS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {filteredUsers.map((u) => {
                            const isConfirmed = !!u.isKycVerified;
                            return (
                              <tr key={u.id} className="hover:bg-halo-secondary/20 transition-colors">
                                <td className="py-3.5 pl-2">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-halo-cream flex items-center justify-center font-bold text-halo-gold border border-halo-border uppercase shrink-0">
                                      {u.fullName.substring(0, 2)}
                                    </div>
                                    <div className="min-w-0">
                                      <span className="font-bold text-halo-dark block truncate max-w-[150px] sm:max-w-xs">{u.fullName}</span>
                                      <span className="text-[10px] text-halo-text-tertiary block truncate max-w-[150px] sm:max-w-xs">{u.email}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3.5 text-halo-text-secondary">
                                  <span className="block">{u.phone || 'No phone'}</span>
                                  <span className="text-[10px] text-halo-text-tertiary block">{u.country || 'Ghana'}</span>
                                </td>
                                <td className="py-3.5 text-halo-text-secondary">
                                  <span className="block text-halo-gold font-bold">{u.savingsStreakDays || 0} Day Streak 🔥</span>
                                  <span className="text-[10px] text-halo-text-tertiary block">Target: {formatMoney(Number(u.monthlyTarget || 5000), u.currency || 'GHS')}/mo</span>
                                </td>
                                <td className="py-3.5">
                                  <select
                                    value={u.role || 'user'}
                                    disabled={!isSimulatingSuperAdmin}
                                    onChange={async (e) => {
                                      const newRole = e.target.value as 'user' | 'admin' | 'super_admin';
                                      await updateUserRole(u.id, newRole);
                                    }}
                                    className="bg-halo-cream border border-halo-border rounded-lg text-[10px] font-mono text-halo-dark px-2 py-1 outline-none focus:border-halo-gold/50 cursor-pointer disabled:opacity-75"
                                  >
                                    <option value="user">USER</option>
                                    <option value="admin">ADMIN</option>
                                    <option value="super_admin">SUPER ADMIN</option>
                                  </select>
                                </td>
                                <td className="py-3.5 text-right pr-2">
                                  {isConfirmed ? (
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-halo-gold/10 text-halo-gold border border-halo-gold/20 inline-flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3 text-halo-gold" /> VERIFIED
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleConfirmUserClick(u.id)}
                                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-halo-dark font-extrabold text-[10px] transition-all flex items-center gap-1 ml-auto"
                                    >
                                      <UserCheck className="w-3.5 h-3.5" />
                                      <span>Confirm KYC</span>
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* SUB-TAB: Transactions */}
              {activeSubTab === 'transactions' && (
                <div className="bg-halo-card p-6 sm:p-8 rounded-3xl border border-halo-border shadow-xl space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-halo-border pb-5">
                    <div>
                      <h3 className="font-bold text-halo-dark text-lg">System Transaction Ledger</h3>
                      <p className="text-xs text-halo-text-tertiary">Complete immutable record of all deposits, redemptions, compound interest allocations and system fees</p>
                    </div>
                    <span className="text-xs font-mono px-3 py-1 bg-halo-gold/10 text-halo-gold rounded-full border border-halo-gold/20 font-bold">
                      {totalTransactionsCount} Total Audited Entries
                    </span>
                  </div>

                  {/* Filters and Search */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
                    <div className="sm:col-span-2">
                      <input 
                        type="text" 
                        placeholder="Search ledger by transaction reference, user email..."
                        value={txSearch}
                        onChange={(e) => setTxSearch(e.target.value)}
                        className="w-full bg-halo-cream border border-halo-border focus:border-halo-gold/50 rounded-xl px-4 py-3 text-xs text-halo-dark placeholder-halo-text-muted focus:outline-none transition-all"
                      />
                    </div>
                    <div>
                      <select
                        value={txFilter}
                        onChange={(e) => setTxFilter(e.target.value as any)}
                        className="w-full bg-halo-cream border border-halo-border rounded-xl px-4 py-3 text-xs text-halo-text-secondary outline-none focus:border-halo-gold/50 cursor-pointer"
                      >
                        <option value="all">ALL TYPES</option>
                        <option value="deposit">DEPOSITS ONLY</option>
                        <option value="withdrawal">WITHDRAWALS ONLY</option>
                        <option value="interest">COMPOUND INTERESTS</option>
                        <option value="fee">PLATFORM FEES</option>
                      </select>
                    </div>
                  </div>

                  {filteredTransactions.length === 0 ? (
                    <div className="p-8 text-center text-halo-text-muted border border-halo-border rounded-2xl">
                      <p className="text-sm font-mono">No transactions found matching criteria.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className="border-b border-halo-border text-halo-text-tertiary">
                            <th className="pb-3 pl-2">TRANSACTION ID</th>
                            <th className="pb-3">USER ACCOUNT</th>
                            <th className="pb-3">VAULT / TARGET</th>
                            <th className="pb-3">TYPE</th>
                            <th className="pb-3">AMOUNT</th>
                            <th className="pb-3 text-right pr-2">STATUS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {filteredTransactions.map((tx) => {
                            const isDeposit = tx.type === 'deposit';
                            const isInterest = tx.type === 'interest';
                            const isFee = tx.type === 'fee';
                            
                            return (
                              <tr key={tx.id} className="hover:bg-halo-secondary/20 transition-colors">
                                <td className="py-3.5 pl-2 text-halo-text-tertiary">
                                  <span className="block font-bold text-halo-text-secondary">{tx.id}</span>
                                  <span className="text-[10px] text-halo-text-muted block">{formatDateTime(tx.createdAt)}</span>
                                </td>
                                <td className="py-3.5">
                                  <span className="font-bold text-halo-dark block">{tx.userFullName || 'System'}</span>
                                  <span className="text-[10px] text-halo-text-muted block">{tx.userEmail || 'system@halosave.com'}</span>
                                </td>
                                <td className="py-3.5 text-halo-text-secondary">
                                  <span className="block font-semibold">{tx.vaultName || 'Corporate Ledger'}</span>
                                  <span className="text-[10px] text-halo-text-muted block">ID: {tx.vaultId || 'N/A'}</span>
                                </td>
                                <td className="py-3.5">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                    isDeposit ? 'bg-halo-gold/10 text-halo-gold border border-halo-gold/20' :
                                    isInterest ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                                    isFee ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                    'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  }`}>
                                    {tx.type.toUpperCase()}
                                  </span>
                                </td>
                                <td className="py-3.5 font-bold text-halo-dark">
                                  {formatMoney(Number(tx.amount), tx.currency || 'GHS')}
                                </td>
                                <td className="py-3.5 text-right pr-2">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                    tx.status === 'completed' || tx.status === 'successful' ? 'bg-halo-gold/10 text-halo-gold' :
                                    tx.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                                    'bg-rose-500/10 text-rose-400'
                                  }`}>
                                    {tx.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* SUB-TAB: Investments */}
              {activeSubTab === 'investments' && (
                <div className="bg-halo-card p-6 sm:p-8 rounded-3xl border border-halo-border shadow-xl space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-halo-border pb-5">
                    <div>
                      <h3 className="font-bold text-halo-dark text-lg">Compounding Investment Tranches</h3>
                      <p className="text-xs text-halo-text-tertiary">Review all active interest-bearing units locks currently routed through mutual fund assets</p>
                    </div>
                    <span className="text-xs font-mono px-3 py-1 bg-halo-gold/10 text-halo-gold rounded-full border border-halo-gold/20 font-bold font-semibold">
                      {adminTranches.length} Tranche Accounts
                    </span>
                  </div>

                  {adminTranches.length === 0 ? (
                    <div className="p-8 text-center text-halo-text-muted border border-halo-border rounded-2xl">
                      <p className="text-sm font-mono">No active investment tranches registered.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className="border-b border-halo-border text-halo-text-tertiary">
                            <th className="pb-3 pl-2">TRANCHE ID</th>
                            <th className="pb-3">INVESTOR / VAULT</th>
                            <th className="pb-3">LOCKED AMOUNT</th>
                            <th className="pb-3">UNITS / NAV</th>
                            <th className="pb-3">MATURES ON</th>
                            <th className="pb-3 text-right pr-2">STATUS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {adminTranches.map((t) => (
                            <tr key={t.id} className="hover:bg-halo-secondary/20 transition-colors">
                              <td className="py-3.5 pl-2 text-halo-text-tertiary">
                                <span className="block font-bold text-halo-text-secondary">{t.id}</span>
                                <span className="text-[10px] text-halo-text-muted block">Locked: {t.lockedAt.split('T')[0]}</span>
                              </td>
                              <td className="py-3.5">
                                <span className="font-bold text-halo-dark block">{t.userFullName}</span>
                                <span className="text-[10px] text-halo-text-muted block">Vault: {t.vaultName}</span>
                              </td>
                              <td className="py-3.5 font-bold text-halo-gold">
                                {formatMoney(Number(t.amount), 'GHS')}
                              </td>
                              <td className="py-3.5 text-halo-text-secondary">
                                <span className="block font-semibold">{t.units ? Number(t.units).toFixed(4) : 'N/A'} Units</span>
                                <span className="text-[10px] text-halo-text-muted block">NAV: {t.purchaseNav || '2.4815'} GHS</span>
                              </td>
                              <td className="py-3.5 text-halo-text-secondary">
                                {t.maturesAt.split('T')[0]}
                              </td>
                              <td className="py-3.5 text-right pr-2">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  t.status === 'locked' ? 'bg-amber-500/10 text-amber-400' :
                                  t.status === 'mature' ? 'bg-halo-gold/10 text-halo-gold animate-pulse' :
                                  'bg-halo-secondary text-halo-text-tertiary'
                                }`}>
                                  {t.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* SUB-TAB: Providers */}
              {activeSubTab === 'providers' && (
                <div className="space-y-8">
                  {/* Databank Simulation Engine Configurator */}
                  <div className="bg-halo-card p-6 sm:p-8 rounded-3xl border border-halo-border shadow-xl space-y-6">
                    <div className="border-b border-halo-border pb-4">
                      <h3 className="font-bold text-halo-dark text-lg flex items-center gap-2">
                        <Database className="w-5 h-5 text-cyan-400" />
                        <span>Investment Provider Settings</span>
                      </h3>
                      <p className="text-xs text-halo-text-tertiary">Manage institutional partners, adjust APYs, NAV rates, compounding indexes, and provider status</p>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-halo-cream border border-halo-border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <span className="text-[10px] font-mono text-halo-gold block font-bold uppercase">PRIMARY PROVIDER</span>
                          <span className="text-sm font-bold text-halo-dark block mt-0.5">{simState.providerName}</span>
                          <span className="text-[10px] text-halo-text-muted block">Licensing: SEC Ghana Licensed Tier-1 Custodian</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-halo-gold bg-halo-gold/10 px-2 py-1 rounded border border-halo-gold/20">ACTIVE</span>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleSaveConfig} className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 font-mono">
                        <div className="space-y-1.5">
                          <label className="text-xs text-halo-text-secondary block font-semibold uppercase">Current NAV (GHS)</label>
                          <input
                            type="number"
                            step="0.0001"
                            value={simState.currentNAV}
                            onChange={(e) => setSimState({ ...simState, currentNAV: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-halo-cream border border-halo-border rounded-xl px-4 py-3 text-sm text-halo-dark font-bold"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs text-halo-text-secondary block font-semibold uppercase">Annual APY Return (%)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={simState.annualReturnPercentage}
                            onChange={(e) => setSimState({ ...simState, annualReturnPercentage: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-halo-cream border border-halo-border rounded-xl px-4 py-3 text-sm text-halo-gold font-bold"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs text-halo-text-secondary block font-semibold uppercase">Management Fee (%)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={simState.managementFeePercentage}
                            onChange={(e) => setSimState({ ...simState, managementFeePercentage: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-halo-cream border border-halo-border rounded-xl px-4 py-3 text-sm text-rose-300 font-bold"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-halo-border">
                        {savedSuccess ? (
                          <span className="text-xs text-halo-gold font-bold flex items-center gap-1.5 animate-in fade-in">
                            <CheckCircle2 className="w-4 h-4" /> Provider parameters updated successfully!
                          </span>
                        ) : <span />}

                        <button
                          type="submit"
                          disabled={isSaving}
                          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-halo-gold to-teal-600 hover:from-halo-gold hover:to-teal-500 text-halo-dark font-extrabold text-xs shadow-xl shadow-halo-gold/20 transition-all flex items-center gap-2"
                        >
                          <Save className="w-4 h-4" />
                          <span>{isSaving ? 'Saving...' : 'Apply Changes'}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* SUB-TAB: Feature Flags */}
              {activeSubTab === 'flags' && (
                <form onSubmit={handleSaveConfig} className="bg-halo-card p-6 sm:p-8 rounded-3xl border border-halo-border shadow-xl space-y-6">
                  <div className="flex items-center justify-between border-b border-halo-border pb-4">
                    <div>
                      <h3 className="font-bold text-halo-dark text-lg flex items-center gap-2">
                        <Sliders className="w-5 h-5 text-halo-gold" />
                        <span>Feature Flags Control Plane</span>
                      </h3>
                      <p className="text-xs text-halo-text-tertiary">Toggle system modules instantly in real-time across the entire application workspace</p>
                    </div>
                    <span className="text-xs font-mono px-3 py-1 bg-halo-gold/10 text-halo-gold rounded-full border border-halo-gold/20 font-bold">
                      Hot-Swappable
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.keys(flagsState).map(key => {
                      const isOn = (flagsState as any)[key];
                      const meta = flagLabels[key] || { title: key, desc: 'Platform module toggle' };
                      return (
                        <div
                          key={key}
                          onClick={() => handleToggleFlag(key)}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-4 select-none ${
                            isOn
                              ? 'bg-halo-cream/80 border-halo-gold/40 shadow-lg shadow-halo-gold/5'
                              : 'bg-halo-cream/40 border-halo-border/80 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <div className="min-w-0 font-mono">
                            <h4 className="font-bold text-sm text-halo-dark truncate">{meta.title}</h4>
                            <p className="text-[11px] text-halo-text-tertiary mt-0.5 line-clamp-1">{meta.desc}</p>
                          </div>
                          <div className="shrink-0 text-halo-gold">
                            {isOn ? <ToggleRight className="w-8 h-8 text-halo-gold" /> : <ToggleLeft className="w-8 h-8 text-halo-text-tertiary" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-halo-border">
                    {savedSuccess ? (
                      <span className="text-xs text-halo-gold font-bold flex items-center gap-1.5 animate-in fade-in">
                        <CheckCircle2 className="w-4 h-4" /> Feature flags hot-swapped!
                      </span>
                    ) : <span />}

                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-3 rounded-2xl bg-gradient-to-r from-halo-gold to-teal-600 hover:from-halo-gold hover:to-teal-500 text-halo-dark font-extrabold text-xs shadow-xl shadow-halo-gold/20 transition-all flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSaving ? 'Applying...' : 'Save Module Flags'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* SUB-TAB: Reports */}
              {activeSubTab === 'reports' && (
                <div className="bg-halo-card p-6 sm:p-8 rounded-3xl border border-halo-border shadow-xl space-y-6">
                  <div className="border-b border-halo-border pb-4">
                    <h3 className="font-bold text-halo-dark text-lg">Platform Compliance Reports</h3>
                    <p className="text-xs text-halo-text-tertiary">Compile financial statistics and export regulatory summaries for security oversight</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-5 bg-halo-cream border border-halo-border rounded-2xl space-y-3 font-mono">
                      <h4 className="font-bold text-sm text-halo-dark">Q2 Reserve Ratio Statement</h4>
                      <p className="text-[11px] text-halo-text-tertiary">Calculates overall liquid assets in Ghana mutual index vs locked HaloSave user balances.</p>
                      <button 
                        onClick={() => {
                          showToast({ title: 'Report Generated 📄', description: 'Q2 reserve compliance check passed! Liquid ratio: 112.4%', type: 'success' });
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-halo-card hover:bg-halo-secondary border border-halo-border text-[10px] text-halo-gold font-extrabold transition-all"
                      >
                        Generate PDF Check
                      </button>
                    </div>

                    <div className="p-5 bg-halo-cream border border-halo-border rounded-2xl space-y-3 font-mono">
                      <h4 className="font-bold text-sm text-halo-dark">Maturity Ledger Audit</h4>
                      <p className="text-[11px] text-halo-text-tertiary">Tracks locking timelines, maturities distribution, and penalties accrued on broken locks.</p>
                      <button 
                        onClick={() => {
                          showToast({ title: 'Statement Ready 📄', description: 'Early break penalties collected: GHS 1,420.00.', type: 'info' });
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-halo-card hover:bg-halo-secondary border border-halo-border text-[10px] text-halo-gold font-extrabold transition-all"
                      >
                        Compile Ledger Report
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-TAB: Broadcast */}
              {activeSubTab === 'broadcast' && (
                <div className="bg-halo-card p-6 sm:p-8 rounded-3xl border border-halo-border shadow-xl space-y-6">
                  <div className="border-b border-halo-border pb-4">
                    <h3 className="font-bold text-halo-dark text-lg">📢 Global Broadcast Center</h3>
                    <p className="text-xs text-halo-text-tertiary">Dispatch platform-wide alerts, push updates, compliance mandates, and trigger email logs for all users</p>
                  </div>

                  <form onSubmit={handleBroadcastSubmit} className="space-y-4 font-mono">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-halo-text-tertiary uppercase font-bold">Alert Category Type</label>
                      <select
                        value={broadcastType}
                        onChange={(e) => setBroadcastType(e.target.value as any)}
                        className="w-full bg-halo-cream border border-halo-border focus:border-halo-gold/50 rounded-xl px-4 py-3 text-xs text-halo-text-secondary outline-none cursor-pointer"
                      >
                        <option value="general">📢 GENERAL PLATFORM NOTICE</option>
                        <option value="deposit">💸 NEW DEPOSIT SYSTEM POLICY</option>
                        <option value="withdrawal">🚨 PAYOUT DISBURSEMENT ANNOUNCEMENT</option>
                        <option value="unlock">🔒 VAULT LOCK REGULATION CHANGE</option>
                        <option value="achievement">🏆 SPECIAL COMMUNITY CHALLENGE</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-halo-text-tertiary uppercase font-bold">Broadcast Title</label>
                      <input 
                        type="text" 
                        placeholder="e.g., Scheduled Maintenance or New APY Compound Yield Upgrades"
                        value={broadcastTitle}
                        onChange={(e) => setBroadcastTitle(e.target.value)}
                        className="w-full bg-halo-cream border border-halo-border focus:border-halo-gold/50 rounded-xl px-4 py-3 text-xs text-halo-dark placeholder-halo-text-muted focus:outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-halo-text-tertiary uppercase font-bold">Broadcast Message Body</label>
                      <textarea
                        rows={4}
                        placeholder="Type the message detail that will be populated instantly into the user notifications inbox and generate simulated compliance emails..."
                        value={broadcastMessage}
                        onChange={(e) => setBroadcastMessage(e.target.value)}
                        className="w-full bg-halo-cream border border-halo-border focus:border-halo-gold/50 rounded-xl px-4 py-3 text-xs text-halo-dark placeholder-halo-text-muted focus:outline-none transition-all resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isBroadcasting}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-halo-gold to-teal-600 hover:from-halo-gold hover:to-teal-500 text-halo-dark font-extrabold text-xs transition-all shadow-lg"
                    >
                      {isBroadcasting ? 'Dispatching Broadcast to all accounts...' : '📢 DISPATCH GLOBAL BROADCAST'}
                    </button>
                  </form>
                </div>
              )}

              {/* SUB-TAB: Audit Logs */}
              {activeSubTab === 'audit' && (
                <div className="bg-halo-card p-6 sm:p-8 rounded-3xl border border-halo-border shadow-xl space-y-4">
                  <div>
                    <h3 className="font-bold text-halo-dark text-lg">System Security Audit Logs</h3>
                    <p className="text-xs text-halo-text-tertiary">Immutable audit trail of authentication checks, compliance clearances, and RLS rule locks</p>
                  </div>

                  <div className="space-y-2 max-h-[500px] overflow-y-auto font-mono text-xs pr-1">
                    {auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                          log.severity === 'security'
                            ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                            : log.severity === 'warning'
                            ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                            : 'bg-halo-cream/80 border-halo-border text-halo-text-secondary'
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold uppercase tracking-wider">{log.action}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-halo-secondary text-halo-text-tertiary border border-halo-border-hover">
                              {log.actor}
                            </span>
                          </div>
                          <p className="text-[11px] text-halo-text-tertiary leading-relaxed break-words">{log.details}</p>
                        </div>
                        <span className="text-[10px] text-halo-text-muted shrink-0 self-end sm:self-center whitespace-nowrap">
                          {formatDateTime(log.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUB-TAB: Settings */}
              {activeSubTab === 'settings' && (
                <div className="space-y-8">
                  {/* Platform Parameters Form */}
                  <div className="bg-halo-card p-6 sm:p-8 rounded-3xl border border-halo-border shadow-xl space-y-6">
                    <div className="border-b border-halo-border pb-4">
                      <h3 className="font-bold text-halo-dark text-lg">Platform System Parameters</h3>
                      <p className="text-xs text-halo-text-tertiary">Adjust standard fee ratios, deposit limitations, and platform operational thresholds</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 font-mono">
                      <div className="space-y-1.5">
                        <label className="text-xs text-halo-text-secondary block font-semibold uppercase">Platform Default Currency</label>
                        <select 
                          value={platformCurrency} 
                          onChange={(e)=>setPlatformCurrency(e.target.value)}
                          className="w-full bg-halo-cream border border-halo-border rounded-xl px-4 py-3 text-xs text-halo-dark"
                        >
                          <option value="GHS">GHS (Ghana Cedi)</option>
                          <option value="USD">USD (US Dollar)</option>
                          <option value="NGN">NGN (Nigerian Naira)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs text-halo-text-secondary block font-semibold uppercase">Admin Base Fee Rate (%)</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          value={feeRate} 
                          onChange={(e)=>setFeeRate(parseFloat(e.target.value)||0)}
                          className="w-full bg-halo-cream border border-halo-border rounded-xl px-4 py-3 text-xs text-halo-dark" 
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs text-halo-text-secondary block font-semibold uppercase">Early Lock Breach Penalty (%)</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          value={earlyPenalty} 
                          onChange={(e)=>setEarlyPenalty(parseFloat(e.target.value)||0)}
                          className="w-full bg-halo-cream border border-halo-border rounded-xl px-4 py-3 text-xs text-rose-300 font-bold" 
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs text-halo-text-secondary block font-semibold uppercase">Min Vault Deposit limit</label>
                        <input 
                          type="number" 
                          value={minDeposit} 
                          onChange={(e)=>setMinDeposit(parseInt(e.target.value)||0)}
                          className="w-full bg-halo-cream border border-halo-border rounded-xl px-4 py-3 text-xs text-halo-dark" 
                        />
                      </div>
                    </div>

                    <button 
                      onClick={() => showToast({ title: 'System Parameters Saved ⚙️', description: 'Config changed successfully. Admin nodes propagated.', type: 'success' })}
                      className="px-6 py-3 rounded-2xl bg-gradient-to-r from-halo-gold to-teal-600 hover:from-halo-gold hover:to-teal-500 text-halo-dark font-extrabold text-xs shadow-xl transition-all"
                    >
                      Propagate System Rules
                    </button>
                  </div>

                  {/* Security change password */}
                  <div className="bg-halo-card p-6 sm:p-8 rounded-3xl border border-halo-border shadow-xl space-y-6">
                    <div className="border-b border-halo-border pb-4">
                      <h3 className="font-bold text-halo-dark text-lg">Change Administrative Password</h3>
                      <p className="text-xs text-halo-text-tertiary">Regular rotation of security credentials ensures safety of high-clearance access</p>
                    </div>

                    <form onSubmit={(e) => {
                      e.preventDefault();
                      setIsChangingPass(true);
                      setTimeout(() => {
                        setIsChangingPass(false);
                        setNewPassword('');
                        showToast({ title: 'Password Rotated 🔑', description: 'Your administrator passphrase was rotated successfully.', type: 'success' });
                      }, 1000);
                    }} className="space-y-4 max-w-md font-mono">
                      <div className="space-y-1.5">
                        <label className="text-xs text-halo-text-secondary block font-semibold uppercase">New Passphrase</label>
                        <input 
                          type="password" 
                          placeholder="••••••••••••"
                          value={newPassword}
                          onChange={(e)=>setNewPassword(e.target.value)}
                          className="w-full bg-halo-cream border border-halo-border focus:border-rose-500/50 rounded-xl px-4 py-3 text-xs text-halo-dark placeholder-halo-text-muted focus:outline-none transition-all"
                          required
                        />
                      </div>
                      <button 
                        type="submit" 
                        disabled={isChangingPass}
                        className="px-6 py-3 rounded-2xl bg-gradient-to-r from-halo-gold to-teal-600 hover:from-halo-gold hover:to-teal-500 text-halo-dark font-extrabold text-xs transition-all"
                      >
                        {isChangingPass ? 'Rotating Credentials...' : 'Rotate Administrator Passphrase'}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* SUB-TAB: Analytics */}
              {activeSubTab === 'analytics' && (
                <div className="space-y-8">
                  
                  {/* Chart 1: AUM Growth */}
                  <div className="bg-halo-card p-6 sm:p-8 rounded-3xl border border-halo-border shadow-xl space-y-4">
                    <div>
                      <h3 className="font-bold text-halo-dark text-lg">Assets Under Management Trend</h3>
                      <p className="text-xs text-halo-text-tertiary">Locked communal reserves growth timeline over the current calendar cycle (GHS)</p>
                    </div>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={mockAUMTrend}>
                          <defs>
                            <linearGradient id="colorAum" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                          <YAxis stroke="#64748b" style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontFamily: 'monospace' }} />
                          <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorAum)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Two Column sub charts */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* Chart 2: Ledger allocations */}
                    <div className="bg-halo-card p-6 rounded-3xl border border-halo-border shadow-xl space-y-4">
                      <div>
                        <h4 className="font-bold text-halo-dark text-base">Platform volume allocation</h4>
                        <p className="text-xs text-halo-text-tertiary">Comparison of aggregate deposit volumes vs payouts</p>
                      </div>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={mockTxByDay}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                            <YAxis stroke="#64748b" style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontFamily: 'monospace' }} />
                            <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]}>
                              {mockTxByDay.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Chart 3: KYC demographics */}
                    <div className="bg-halo-card p-6 rounded-3xl border border-halo-border shadow-xl space-y-4">
                      <div>
                        <h4 className="font-bold text-halo-dark text-base">User demographic dispersion</h4>
                        <p className="text-xs text-halo-text-tertiary">Audited users registration count divided by country</p>
                      </div>
                      <div className="h-64 w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={mockCountryData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                              outerRadius={70}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {mockCountryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontFamily: 'monospace' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* SUB-TAB: Security */}
              {activeSubTab === 'security' && (
                <SecurityTab />
              )}

              {/* SUB-TAB: Background Jobs */}
              {activeSubTab === 'jobs' && (
                <JobsTab />
              )}

            </motion.div>
          </AnimatePresence>
        </div>

      </div>

    </div>
  );
};
