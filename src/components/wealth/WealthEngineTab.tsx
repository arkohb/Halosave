import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { ApiClient } from '../../api/client.ts';
import { 
  Sparkles, 
  TrendingUp, 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Plus, 
  Trash2, 
  Sliders, 
  Calendar, 
  ChevronRight, 
  ArrowRightLeft, 
  CreditCard, 
  Landmark, 
  Smartphone, 
  Key, 
  Lock, 
  Loader2, 
  ArrowUpRight, 
  ArrowDownRight, 
  RefreshCw, 
  DollarSign,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell } from 'recharts';
import { formatMoney } from '../../lib/utils.ts';

// Defined local interfaces for component
interface Asset {
  id: string;
  name: string;
  amount: number;
  isLinked: boolean;
  institution?: string;
}

interface Liability {
  id: string;
  name: string;
  amount: number;
}

interface PlannedGoal {
  id: string;
  name: string;
  targetAmount: number;
  targetYear: number;
}

interface AIInsightResponse {
  financialHealthScore: number;
  financialHealthLevel: string;
  scoreAnalysis: string;
  emergencyScoreText: string;
  retirementFeasibility: {
    status: 'On Track' | 'At Risk' | 'Lagging';
    requiredNestEgg: number;
    projectedNestEgg: number;
    gap: number;
    advice: string;
  };
  goalsAnalysis: {
    goalId: string;
    goalName: string;
    status: 'Achievable' | 'Needs Acceleration' | 'High Risk';
    requiredMonthlySavings: number;
    predictionText: string;
  }[];
  wealthPreservationAdvice: string;
}

const SUPPORTED_BANKS = [
  { id: 'mtn', name: 'MTN Mobile Money', logo: Smartphone, color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  { id: 'gcb', name: 'Ghana Commercial Bank', logo: Landmark, color: 'bg-halo-gold/10 text-halo-gold border-halo-gold/20' },
  { id: 'scb', name: 'Standard Chartered', logo: Landmark, color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { id: 'telecel', name: 'Telecel Cash', logo: Smartphone, color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' }
];

export const WealthEngineTab: React.FC = () => {
  const { user, vaults, summary, showToast } = useApp();
  const currency = user?.currency || 'GHS';

  // --- 1. State Management ---
  const [currentAge, setCurrentAge] = useState<number>(28);
  const [retirementAge, setRetirementAge] = useState<number>(60);
  const [monthlyExpenses, setMonthlyExpenses] = useState<number>(1200);
  const [targetRetirementIncome, setTargetRetirementIncome] = useState<number>(2500);

  // Assets & Liabilities
  const [assets, setAssets] = useState<Asset[]>([
    { id: 'ast_cash', name: 'Cash on Hand', amount: 350, isLinked: false },
    { id: 'ast_momo', name: 'MTN Wallet', amount: 800, isLinked: false }
  ]);
  const [liabilities, setLiabilities] = useState<Liability[]>([
    { id: 'liab_cc', name: 'M-Kopa Credit Balance', amount: 450 }
  ]);

  // Goals Timeline
  const [plannedGoals, setPlannedGoals] = useState<PlannedGoal[]>([
    { id: 'goal_emerg', name: 'Emergency Fund Guard', targetAmount: 6000, targetYear: 2027 },
    { id: 'goal_house', name: 'Land Acquisition / Home Deposit', targetAmount: 45000, targetYear: 2032 },
    { id: 'goal_edu', name: 'Graduate School / Certification', targetAmount: 15000, targetYear: 2029 }
  ]);

  // Form states for adding items
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetAmount, setNewAssetAmount] = useState('');
  const [newLiabName, setNewLiabName] = useState('');
  const [newLiabAmount, setNewLiabAmount] = useState('');
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalAmount, setNewGoalAmount] = useState('');
  const [newGoalYear, setNewGoalYear] = useState('2030');

  // Open Banking Simulator states
  const [isLinkingModalOpen, setIsLinkingModalOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<typeof SUPPORTED_BANKS[0] | null>(null);
  const [linkAccountNumber, setLinkAccountNumber] = useState('');
  const [linkConsentDays, setLinkConsentDays] = useState('180');
  const [linkStep, setLinkStep] = useState<'details' | 'otp' | 'syncing' | 'done'>('details');
  const [otpCode, setOtpCode] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [simulatedLinkedBalance, setSimulatedLinkedBalance] = useState<number>(0);

  // AI & Analytics states
  const [insights, setInsights] = useState<AIInsightResponse | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  // Calculated totals
  const totalVaultsBalance = vaults.reduce((acc, v) => acc + Number(v.balance || 0), 0);
  const totalAssetsValue = assets.reduce((acc, ast) => acc + ast.amount, 0) + totalVaultsBalance;
  const totalLiabilitiesValue = liabilities.reduce((acc, liab) => acc + liab.amount, 0);
  const netWorth = totalAssetsValue - totalLiabilitiesValue;

  // Emergency Fund Details
  const emergencyVault = vaults.find((v) => (v.name || '').toLowerCase().includes('emergency'));
  const emergencyReserve = emergencyVault ? Number(emergencyVault.balance || 0) : 0;
  const emergencyScore = monthlyExpenses > 0 ? Number((emergencyReserve / monthlyExpenses).toFixed(1)) : 0;

  // --- 2. Data Fetchers / AI Integrations ---
  const fetchWealthInsights = async () => {
    setIsLoadingInsights(true);
    try {
      const data = await ApiClient.getWealthInsight({
        assets,
        liabilities,
        currentAge,
        retirementAge,
        monthlyExpenses,
        targetRetirementIncome,
        plannedGoals
      });
      setInsights(data);
    } catch (err) {
      console.error(err);
      showToast({ title: 'Insight Refresh Failed', description: 'Computing fallback personal finance metrics.', type: 'error' });
    } finally {
      setIsLoadingInsights(false);
    }
  };

  // Run initial calculations on load & state updates
  useEffect(() => {
    fetchWealthInsights();
  }, [currentAge, retirementAge, monthlyExpenses, targetRetirementIncome, assets, liabilities, plannedGoals, vaults]);

  // --- 3. Dynamic Interactive Actions ---
  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(newAssetAmount);
    if (!newAssetName || isNaN(amountNum) || amountNum <= 0) return;

    setAssets([
      ...assets,
      { id: 'ast_' + Math.random().toString(36).substring(2, 9), name: newAssetName, amount: amountNum, isLinked: false }
    ]);
    setNewAssetName('');
    setNewAssetAmount('');
    showToast({ title: 'Asset Added', description: `${newAssetName} loaded into ledger.`, type: 'success' });
  };

  const handleAddLiability = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(newLiabAmount);
    if (!newLiabName || isNaN(amountNum) || amountNum <= 0) return;

    setLiabilities([
      ...liabilities,
      { id: 'liab_' + Math.random().toString(36).substring(2, 9), name: newLiabName, amount: amountNum }
    ]);
    setNewLiabName('');
    setNewLiabAmount('');
    showToast({ title: 'Liability Added', description: `${newLiabName} added to ledger.`, type: 'info' });
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(newGoalAmount);
    const yearNum = parseInt(newGoalYear);
    if (!newGoalName || isNaN(amountNum) || amountNum <= 0 || isNaN(yearNum)) return;

    setPlannedGoals([
      ...plannedGoals,
      { id: 'goal_' + Math.random().toString(36).substring(2, 9), name: newGoalName, targetAmount: amountNum, targetYear: yearNum }
    ].sort((a, b) => a.targetYear - b.targetYear));

    setNewGoalName('');
    setNewGoalAmount('');
    showToast({ title: 'Life Goal Created', description: `Planned milestone ${newGoalName} for ${yearNum}.`, type: 'success' });
  };

  const handleDeleteAsset = (id: string) => {
    setAssets(assets.filter((a) => a.id !== id));
  };

  const handleDeleteLiability = (id: string) => {
    setLiabilities(liabilities.filter((l) => l.id !== id));
  };

  const handleDeleteGoal = (id: string) => {
    setPlannedGoals(plannedGoals.filter((g) => g.id !== id));
  };

  // Open Banking Link Simulation Flow
  const startLinking = (bank: typeof SUPPORTED_BANKS[0]) => {
    setSelectedBank(bank);
    const mockBalance = Math.floor(2000 + Math.random() * 8000);
    setSimulatedLinkedBalance(mockBalance);
    setLinkStep('details');
    setLinkAccountNumber('');
    setIsLinkingModalOpen(true);
  };

  const handleLinkRequest = () => {
    if (!linkAccountNumber) {
      showToast({ title: 'Validation Error', description: 'Please enter a phone number or account number.', type: 'error' });
      return;
    }
    // Generate a random 6-digit pin
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setOtpCode(code);
    setLinkStep('otp');
    // Simulate SMS dispatching
    showToast({ title: '🔑 OTP Dispatch', description: `Your secure simulated verification code is ${code}`, type: 'info' });
  };

  const handleVerifyOtp = () => {
    if (enteredOtp !== otpCode) {
      showToast({ title: 'Authentication Error', description: 'Invalid verification pin. Try again.', type: 'error' });
      return;
    }
    setLinkStep('syncing');
    setTimeout(() => {
      setAssets([
        ...assets,
        { 
          id: 'ast_linked_' + Math.random().toString(36).substring(2, 9), 
          name: `${selectedBank?.name} Account`, 
          amount: simulatedLinkedBalance, 
          isLinked: true,
          institution: selectedBank?.name
        }
      ]);
      setLinkStep('done');
      showToast({ 
        title: '🔒 Open Banking Link Secured', 
        description: `Successfully synchronized ${selectedBank?.name} securely! Fetched Balance: ${currency} ${simulatedLinkedBalance}`, 
        type: 'success' 
      });
    }, 2000);
  };

  // --- 4. Math Projections for Retirement Graph ---
  const generateRetirementChartData = () => {
    const yearsToRetire = Math.max(1, retirementAge - currentAge);
    const dataPoints = [];
    const annualReturnRate = 0.185; // Databank MFund APY
    const traditionalRate = 0.050; // Bank APY

    let mfundValue = netWorth;
    let bankValue = netWorth;

    // Monthly compound additions based on current monthly contribution targets
    const annualAddition = (user?.monthlyTarget || 1000) * 12;

    for (let i = 0; i <= yearsToRetire; i += Math.max(1, Math.round(yearsToRetire / 10))) {
      const yearLabel = new Date().getFullYear() + i;
      const ageLabel = currentAge + i;

      dataPoints.push({
        year: yearLabel,
        age: `Age ${ageLabel}`,
        "Databank MFund Path (18.5% APY)": Math.round(mfundValue),
        "Standard Bank Path (5% APY)": Math.round(bankValue)
      });

      // Compound for next step period
      const stepYears = Math.max(1, Math.round(yearsToRetire / 10));
      for (let j = 0; j < stepYears; j++) {
        mfundValue = mfundValue * (1 + annualReturnRate) + annualAddition;
        bankValue = bankValue * (1 + traditionalRate) + annualAddition;
      }
    }

    return dataPoints;
  };

  const chartData = generateRetirementChartData();

  // Pie Chart Allocation Data
  const pieData = [
    { name: 'HaloSave Locked', value: vaults.reduce((acc, v) => acc + Number(v.balance || 0), 0), color: '#10b981' },
    ...assets.map((ast, idx) => ({
      name: ast.name,
      value: ast.amount,
      color: ast.isLinked ? '#0284c7' : ['#6366f1', '#a855f7', '#ec4899'][idx % 3]
    }))
  ].filter(p => p.value > 0);

  return (
    <div className="space-y-8 pb-10" id="financial-life-engine">
      
      {/* --- FLAGSHIP HEADER --- */}
      <div className="relative overflow-hidden rounded-3xl bg-halo-card border border-halo-border p-6 md:p-8">
        <div className="absolute top-0 right-0 p-8 opacity-5 md:opacity-10 select-none">
          <Sparkles className="w-56 h-56 text-halo-gold" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-halo-gold/10 text-halo-gold border border-halo-gold/20 text-xs font-mono">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>Flagship Algorithmic System</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              FINANCIAL LIFE ENGINE
            </h1>
            <p className="text-sm text-halo-text-tertiary max-w-2xl leading-relaxed">
              Consolidate locked HaloSave tranches with simulated Open Banking integrations. Chart your 18.5% APY wealth trajectory, inspect emergency ratios, and let AI build your retirement nest egg.
            </p>
          </div>

          <div className="flex gap-3 bg-halo-cream/60 p-4 rounded-2xl border border-halo-border self-stretch md:self-auto justify-around">
            <div className="text-center px-4">
              <span className="block text-[10px] font-mono text-halo-text-tertiary uppercase tracking-widest">Calculated Net Worth</span>
              <span className="text-xl font-extrabold text-halo-gold mt-1 block">
                {formatMoney(netWorth, currency)}
              </span>
            </div>
            <div className="w-[1px] bg-halo-secondary" />
            <div className="text-center px-4">
              <span className="block text-[10px] font-mono text-halo-text-tertiary uppercase tracking-widest">Active Life Milestones</span>
              <span className="text-xl font-extrabold text-indigo-400 mt-1 block">
                {plannedGoals.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* --- GRID LAYOUT --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- LEFT HAND BENTO: COMPOSITE FINANCIAL HEALTH & EMERGENCY SCORES --- */}
        <div className="space-y-8 lg:col-span-1">
          
          {/* FINANCIAL HEALTH SCORE GAUGE */}
          <div className="bg-halo-card border border-halo-border rounded-3xl p-6 relative overflow-hidden" id="health-score-gauge">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-mono uppercase tracking-wider text-halo-text-tertiary flex items-center gap-2">
                <Shield className="w-4 h-4 text-halo-gold" />
                Financial Health Score
              </h2>
              {isLoadingInsights && <Loader2 className="w-4 h-4 text-halo-gold animate-spin" />}
            </div>

            <div className="flex flex-col items-center justify-center py-6">
              <div className="relative flex items-center justify-center">
                {/* Score Dial Vector Ring */}
                <svg className="w-36 h-36 transform -rotate-90">
                  <circle
                    cx="72"
                    cy="72"
                    r="64"
                    stroke="#1e293b"
                    strokeWidth="12"
                    fill="transparent"
                  />
                  <motion.circle
                    cx="72"
                    cy="72"
                    r="64"
                    stroke={insights?.financialHealthScore && insights.financialHealthScore >= 75 ? '#10b981' : (insights?.financialHealthScore && insights.financialHealthScore >= 55 ? '#f59e0b' : '#f43f5e')}
                    strokeWidth="12"
                    strokeDasharray={2 * Math.PI * 64}
                    initial={{ strokeDashoffset: 2 * Math.PI * 64 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 64 * (1 - (insights?.financialHealthScore || 50) / 100) }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    fill="transparent"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-4xl font-black text-halo-dark">{insights?.financialHealthScore || '--'}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5 font-mono border ${
                    insights?.financialHealthLevel === 'Excellent' 
                      ? 'bg-halo-gold/10 text-halo-gold border-halo-gold/20' 
                      : (insights?.financialHealthLevel === 'Good' 
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20')
                  }`}>
                    {insights?.financialHealthLevel || 'COMPUTING...'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-halo-cream/60 p-4 rounded-2xl border border-halo-border/80 space-y-2 mt-4">
              <span className="text-[10px] font-mono text-halo-gold uppercase tracking-widest block">AI Wealth Engine Analysis</span>
              <p className="text-xs text-halo-text-secondary leading-relaxed">
                {insights?.scoreAnalysis || 'Synthesizing aggregate scores from locked tranches, assets, and liability indices...'}
              </p>
            </div>
          </div>

          {/* EMERGENCY SCORE MULTIPLIER */}
          <div className="bg-halo-card border border-halo-border rounded-3xl p-6 space-y-6" id="emergency-shield">
            <div>
              <h2 className="text-sm font-mono uppercase tracking-wider text-halo-text-tertiary flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                Emergency Reserve Score
              </h2>
              <p className="text-xs text-halo-text-muted mt-1 leading-relaxed">
                Personalized buffer quotient based on active locked Emergency savings vs. self-reported monthly expenses.
              </p>
            </div>

            <div className="flex items-center justify-between bg-halo-cream p-4 rounded-2xl border border-halo-border">
              <div>
                <span className="text-[10px] font-mono text-halo-text-tertiary block uppercase">Emergency Reserves</span>
                <span className="text-lg font-bold text-halo-dark mt-1 block">
                  {formatMoney(emergencyReserve, currency)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-halo-text-tertiary block uppercase">Coverage Multiplier</span>
                <span className={`text-xl font-extrabold mt-1 block ${emergencyScore >= 3.0 ? 'text-halo-gold' : (emergencyScore >= 1.0 ? 'text-amber-400' : 'text-rose-500')}`}>
                  {emergencyScore} Months
                </span>
              </div>
            </div>

            {/* Slider to adjust expenses & watch calculation update */}
            <div className="space-y-3 bg-halo-cream/40 p-4 rounded-2xl border border-halo-border">
              <div className="flex items-center justify-between text-xs">
                <span className="text-halo-text-tertiary font-medium">Estimated Monthly Expense</span>
                <span className="font-mono text-halo-dark font-bold">{formatMoney(monthlyExpenses, currency)}</span>
              </div>
              <input 
                type="range" 
                min="300" 
                max="10000" 
                step="100"
                value={monthlyExpenses} 
                onChange={(e) => setMonthlyExpenses(Number(e.target.value))}
                className="w-full accent-halo-gold bg-halo-secondary rounded-lg appearance-none h-1.5 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-halo-text-muted">
                <span>{formatMoney(300, currency)}</span>
                <span>{formatMoney(10000, currency)}</span>
              </div>
            </div>

            <p className="text-xs text-halo-text-secondary bg-halo-cream/40 border border-halo-border p-3 rounded-xl leading-relaxed">
              {insights?.emergencyScoreText || 'Calculating emergency coverage shield based on slider metrics...'}
            </p>
          </div>

        </div>

        {/* --- RIGHT HAND TWO-COLUMN BENTO GRID: RETIREMENT PATH, TIMELINE, NET WORTH, OPEN BANKING --- */}
        <div className="space-y-8 lg:col-span-2">
          
          {/* RETIREMENT ENGINE & COMPOUND GRAPH */}
          <div className="bg-halo-card border border-halo-border rounded-3xl p-6 space-y-6" id="retirement-engine">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-mono uppercase tracking-wider text-halo-text-tertiary flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-halo-gold" />
                  Retirement Compound Path (MFund APY)
                </h2>
                <p className="text-xs text-halo-text-muted mt-1">
                  Simulated accumulation path of your current net worth compounding at Databank MFund&apos;s 18.5% APY.
                </p>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-halo-gold/10 text-halo-gold border border-halo-gold/20 text-xs font-mono font-semibold self-stretch sm:self-auto justify-center">
                <span>Feasibility: {insights?.retirementFeasibility?.status || 'Calculating...'}</span>
              </div>
            </div>

            {/* Compound Path Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-halo-cream/60 p-4 rounded-2xl border border-halo-border">
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-halo-text-tertiary block uppercase">Current Age ({currentAge} yrs)</label>
                <input 
                  type="range" 
                  min="18" 
                  max="60" 
                  value={currentAge} 
                  onChange={(e) => setCurrentAge(Number(e.target.value))}
                  className="w-full accent-halo-gold bg-halo-secondary rounded-lg appearance-none h-1 cursor-pointer"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-halo-text-tertiary block uppercase">Retirement Age ({retirementAge} yrs)</label>
                <input 
                  type="range" 
                  min="50" 
                  max="75" 
                  value={retirementAge} 
                  onChange={(e) => setRetirementAge(Number(e.target.value))}
                  className="w-full accent-halo-gold bg-halo-secondary rounded-lg appearance-none h-1 cursor-pointer"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-halo-text-tertiary block uppercase">Target Monthly Income</label>
                <input 
                  type="number" 
                  value={targetRetirementIncome} 
                  onChange={(e) => setTargetRetirementIncome(Number(e.target.value))}
                  className="w-full bg-halo-card border border-halo-border rounded-lg text-xs p-1.5 text-halo-dark focus:outline-none focus:border-halo-gold"
                />
              </div>
            </div>

            {/* Line Chart */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMfund" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorBank" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#64748b" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#64748b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="age" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    labelStyle={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '10px' }}
                    itemStyle={{ fontSize: '12px', padding: '2px 0' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="Databank MFund Path (18.5% APY)" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorMfund)" />
                  <Area type="monotone" dataKey="Standard Bank Path (5% APY)" stroke="#64748b" strokeWidth={1.5} fillOpacity={1} fill="url(#colorBank)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Gap Analysis and Feedback card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-halo-cream p-4 rounded-2xl border border-halo-border space-y-1.5">
                <span className="text-[10px] font-mono text-halo-text-tertiary block uppercase">Projected Nest Egg Gap</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-halo-dark">
                    {formatMoney(insights?.retirementFeasibility?.gap || 0, currency)}
                  </span>
                  <span className="text-xs text-rose-400 font-medium font-mono">
                    Needed: {formatMoney(insights?.retirementFeasibility?.requiredNestEgg || 0, currency)}
                  </span>
                </div>
                <p className="text-[10px] text-halo-text-muted leading-relaxed font-mono">
                  Calculated based on standard 4% retirement safe withdrawal rate.
                </p>
              </div>

              <div className="bg-halo-cream p-4 rounded-2xl border border-halo-border flex flex-col justify-center">
                <span className="text-[10px] font-mono text-halo-gold block uppercase mb-1">Algorithmic Insight</span>
                <p className="text-xs text-halo-text-secondary leading-relaxed">
                  {insights?.retirementFeasibility?.advice || 'Calculating gap coverage and recommended monthly deposit targets...'}
                </p>
              </div>
            </div>
          </div>

          {/* MILLET TIMELINE LIFE PLANNER */}
          <div className="bg-halo-card border border-halo-border rounded-3xl p-6 space-y-6" id="life-planner">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-mono uppercase tracking-wider text-halo-text-tertiary flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  Life Planner Timeline
                </h2>
                <p className="text-xs text-halo-text-muted mt-1">
                  Configure long-term goals. See feasibility status dynamically updating.
                </p>
              </div>
            </div>

            {/* Timeline Milestones Cards */}
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {plannedGoals.map((goal, index) => {
                  const goalAnalysis = insights?.goalsAnalysis?.find((g) => g.goalId === goal.id);
                  return (
                    <motion.div 
                      key={goal.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="relative pl-6 border-l border-halo-border pb-2"
                    >
                      {/* Milestone Bullet Marker */}
                      <div className="absolute top-1.5 left-[-6px] w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-slate-950" />
                      
                      <div className="bg-halo-cream p-4 rounded-2xl border border-halo-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-halo-border transition-colors">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-halo-dark">{goal.name}</h3>
                            <span className="text-[10px] font-mono bg-halo-card px-2 py-0.5 rounded text-indigo-400 border border-halo-border">
                              Target: {goal.targetYear}
                            </span>
                          </div>
                          <p className="text-xs text-halo-text-tertiary leading-relaxed max-w-xl">
                            {goalAnalysis?.predictionText || 'Analyzing goal timelines and recommended savings routes...'}
                          </p>
                        </div>

                        <div className="flex sm:flex-col items-end justify-between sm:justify-start w-full sm:w-auto gap-2 border-t border-halo-border sm:border-0 pt-2 sm:pt-0">
                          <div className="text-left sm:text-right">
                            <span className="text-[10px] font-mono text-halo-text-tertiary block uppercase">Target Goal</span>
                            <span className="text-sm font-black text-halo-dark block">
                              {formatMoney(goal.targetAmount, currency)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono border ${
                              goalAnalysis?.status === 'Achievable'
                                ? 'bg-halo-gold/10 text-halo-gold border-halo-gold/20'
                                : (goalAnalysis?.status === 'Needs Acceleration'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : 'bg-rose-500/10 text-rose-500 border-rose-500/20')
                            }`}>
                              {goalAnalysis?.status || 'Analyzing...'}
                            </span>
                            
                            <button 
                              onClick={() => handleDeleteGoal(goal.id)}
                              className="text-halo-text-muted hover:text-rose-400 transition-colors"
                              title="Delete goal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Create Goal Form */}
            <form onSubmit={handleAddGoal} className="bg-halo-cream p-4 rounded-2xl border border-halo-border grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-5 space-y-1.5">
                <label className="text-[10px] font-mono text-halo-text-tertiary block uppercase">Goal Milestone Name</label>
                <input 
                  type="text" 
                  placeholder="e.g., Higher Education / Buy Car"
                  value={newGoalName} 
                  onChange={(e) => setNewGoalName(e.target.value)}
                  className="w-full bg-halo-card border border-halo-border rounded-xl text-xs p-2.5 text-halo-dark placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="sm:col-span-3 space-y-1.5">
                <label className="text-[10px] font-mono text-halo-text-tertiary block uppercase">Target Amount ({currency})</label>
                <input 
                  type="number" 
                  placeholder="e.g., 8500"
                  value={newGoalAmount} 
                  onChange={(e) => setNewGoalAmount(e.target.value)}
                  className="w-full bg-halo-card border border-halo-border rounded-xl text-xs p-2.5 text-halo-dark placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-[10px] font-mono text-halo-text-tertiary block uppercase">Target Year</label>
                <select 
                  value={newGoalYear} 
                  onChange={(e) => setNewGoalYear(e.target.value)}
                  className="w-full bg-halo-card border border-halo-border rounded-xl text-xs p-2.5 text-halo-dark focus:outline-none focus:border-indigo-500"
                >
                  {Array.from({ length: 15 }, (_, i) => new Date().getFullYear() + i).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-halo-dark font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1 shadow-lg shadow-indigo-500/10 active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Goal</span>
                </button>
              </div>
            </form>
          </div>

          {/* NET WORTH LEDGER & BANK ALLOCATION */}
          <div className="bg-halo-card border border-halo-border rounded-3xl p-6 space-y-6" id="networth-ledger">
            <div>
              <h2 className="text-sm font-mono uppercase tracking-wider text-halo-text-tertiary flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-halo-gold" />
                Asset & Liability Balance Ledger
              </h2>
              <p className="text-xs text-halo-text-muted mt-1 leading-relaxed">
                Add cash holdings, investments, or debts. Tap Open Banking to link external accounts directly for immediate balancing.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Assets list */}
              <div className="space-y-4">
                <span className="text-[10px] font-mono text-halo-gold block uppercase tracking-widest border-b border-halo-gold/10 pb-2">
                  🏦 CURRENT ASSETS
                </span>
                
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {/* General locked vaults summary */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-halo-gold/5 border border-halo-gold/10 text-xs">
                    <div>
                      <span className="font-bold text-halo-dark">HaloSave Locked Goals</span>
                      <span className="block text-[9px] font-mono text-halo-text-muted">Includes all saving vaults</span>
                    </div>
                    <span className="font-mono font-bold text-halo-gold">{formatMoney(totalVaultsBalance, currency)}</span>
                  </div>

                  {assets.map((asset) => (
                    <div key={asset.id} className="flex items-center justify-between p-3 rounded-xl bg-halo-cream/80 border border-halo-border hover:border-halo-border transition-all text-xs">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-halo-dark">{asset.name}</span>
                          {asset.isLinked && (
                            <span className="text-[8px] font-mono bg-blue-500/10 text-blue-400 px-1 py-0.2 rounded border border-blue-500/20 uppercase font-bold">
                              Linked
                            </span>
                          )}
                        </div>
                        {asset.institution && (
                          <span className="block text-[9px] font-mono text-halo-text-muted">{asset.institution}</span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-halo-text-secondary">{formatMoney(asset.amount, currency)}</span>
                        {!asset.isLinked && (
                          <button 
                            onClick={() => handleDeleteAsset(asset.id)}
                            className="text-halo-text-tertiary hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add asset form */}
                <form onSubmit={handleAddAsset} className="grid grid-cols-5 gap-2">
                  <input 
                    type="text" 
                    placeholder="New asset name" 
                    value={newAssetName}
                    onChange={(e) => setNewAssetName(e.target.value)}
                    className="col-span-3 bg-halo-cream border border-halo-border rounded-lg text-xs p-2 text-halo-dark placeholder-halo-text-muted focus:outline-none focus:border-halo-gold"
                  />
                  <input 
                    type="number" 
                    placeholder="Amount" 
                    value={newAssetAmount}
                    onChange={(e) => setNewAssetAmount(e.target.value)}
                    className="col-span-1 bg-halo-cream border border-halo-border rounded-lg text-xs p-2 text-halo-dark placeholder-halo-text-muted focus:outline-none focus:border-halo-gold"
                  />
                  <button 
                    type="submit"
                    className="col-span-1 bg-halo-secondary hover:bg-halo-tertiary text-halo-dark rounded-lg flex items-center justify-center font-bold text-xs"
                    title="Add Asset"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </form>
              </div>

              {/* Liabilities list */}
              <div className="space-y-4">
                <span className="text-[10px] font-mono text-rose-400 block uppercase tracking-widest border-b border-rose-500/10 pb-2">
                  💳 LIABILITIES & DEBTS
                </span>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {liabilities.length === 0 ? (
                    <div className="text-center py-6 text-halo-text-muted text-xs font-mono">
                      No debts or liabilities logged! 🎉
                    </div>
                  ) : (
                    liabilities.map((liab) => (
                      <div key={liab.id} className="flex items-center justify-between p-3 rounded-xl bg-halo-cream/80 border border-halo-border hover:border-halo-border transition-all text-xs">
                        <div>
                          <span className="font-medium text-halo-dark">{liab.name}</span>
                          <span className="block text-[9px] font-mono text-halo-text-muted">Unpaid ledger balance</span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-halo-text-secondary">{formatMoney(liab.amount, currency)}</span>
                          <button 
                            onClick={() => handleDeleteLiability(liab.id)}
                            className="text-halo-text-tertiary hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add liability form */}
                <form onSubmit={handleAddLiability} className="grid grid-cols-5 gap-2">
                  <input 
                    type="text" 
                    placeholder="Liability/loan name" 
                    value={newLiabName}
                    onChange={(e) => setNewLiabName(e.target.value)}
                    className="col-span-3 bg-halo-cream border border-halo-border rounded-lg text-xs p-2 text-halo-dark placeholder-halo-text-muted focus:outline-none focus:border-rose-500"
                  />
                  <input 
                    type="number" 
                    placeholder="Amount" 
                    value={newLiabAmount}
                    onChange={(e) => setNewLiabAmount(e.target.value)}
                    className="col-span-1 bg-halo-cream border border-halo-border rounded-lg text-xs p-2 text-halo-dark placeholder-halo-text-muted focus:outline-none focus:border-rose-500"
                  />
                  <button 
                    type="submit"
                    className="col-span-1 bg-halo-secondary hover:bg-halo-tertiary text-halo-dark rounded-lg flex items-center justify-center font-bold text-xs"
                    title="Add Liability"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </form>
              </div>

            </div>

            <p className="text-xs text-halo-text-tertiary bg-halo-cream/50 p-4 rounded-2xl border border-halo-border leading-relaxed font-mono">
              💡 <span className="text-halo-gold uppercase font-bold">Consolidation Tip:</span> {insights?.wealthPreservationAdvice || 'Keep balances locked inside HaloSave to avoid impulse transfers...'}
            </p>
          </div>

          {/* --- FLAGSHIP OPEN BANKING LINKING BAR --- */}
          <div className="bg-halo-card border border-halo-border rounded-3xl p-6 space-y-6" id="open-banking">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-mono uppercase tracking-wider text-halo-text-tertiary flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block animate-ping mr-1.5" />
                  Open Banking Gateway (Simulator)
                </h2>
                <p className="text-xs text-halo-text-muted mt-1">
                  Instantly link virtual banks or Mobile Money API credentials. Synthesize aggregate liquid cash directly.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {SUPPORTED_BANKS.map((bank) => {
                const isLinked = assets.some((a) => a.isLinked && a.institution === bank.name);
                const ProviderIcon = bank.logo;
                return (
                  <button
                    key={bank.id}
                    onClick={() => !isLinked && startLinking(bank)}
                    className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all relative overflow-hidden group ${
                      isLinked
                        ? 'bg-blue-500/5 border-blue-500/20 text-blue-400'
                        : 'bg-halo-cream/80 border-halo-border hover:border-halo-border-hover hover:bg-halo-card text-halo-text-secondary'
                    }`}
                    disabled={isLinked}
                  >
                    <div className={`p-2.5 rounded-xl border ${bank.color}`}>
                      <ProviderIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block font-bold text-xs text-halo-dark group-hover:text-halo-dark transition-colors">{bank.name}</span>
                      <span className="text-[10px] font-mono block mt-1">
                        {isLinked ? '🔒 SECURELY SYNCED' : '🔗 TAP TO CONNECT'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* --- OPEN BANKING SIMULATOR INTUITIVE MODAL --- */}
      {isLinkingModalOpen && selectedBank && (
        <div className="fixed inset-0 bg-halo-cream/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-halo-card border border-halo-border rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 bg-halo-cream border-b border-halo-border flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <selectedBank.logo className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-halo-dark text-base">Open Banking Sync Gateway</h3>
                <p className="text-xs text-halo-text-tertiary">Linking {selectedBank.name}</p>
              </div>
            </div>

            {/* Steps router */}
            <div className="p-6 space-y-6">
              
              {linkStep === 'details' && (
                <div className="space-y-4">
                  <div className="bg-halo-cream p-4 rounded-2xl border border-halo-border text-xs text-halo-text-tertiary leading-relaxed space-y-2">
                    <span className="font-mono text-blue-400 block uppercase font-bold text-[10px]">Secure Consent Terms</span>
                    <p>HaloSave requests secure read-only permission to sync your current balances and active ledger transactions. Your actual banking credentials are never saved.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-halo-text-tertiary block uppercase">Enter Wallet Phone / Account Number</label>
                    <input 
                      type="text" 
                      placeholder={selectedBank.id.includes('momo') || selectedBank.id.includes('telecel') ? 'e.g., +233 24 123 4567' : 'e.g., 1421034981'}
                      value={linkAccountNumber}
                      onChange={(e) => setLinkAccountNumber(e.target.value)}
                      className="w-full bg-halo-cream border border-halo-border rounded-xl text-xs p-3 text-halo-dark placeholder-halo-text-muted focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-halo-text-tertiary block uppercase">Consent Authorization Duration</label>
                    <select 
                      value={linkConsentDays} 
                      onChange={(e) => setLinkConsentDays(e.target.value)}
                      className="w-full bg-halo-cream border border-halo-border rounded-xl text-xs p-3 text-halo-dark focus:outline-none focus:border-blue-500"
                    >
                      <option value="90">90 Days Authorization</option>
                      <option value="180">180 Days Authorization</option>
                      <option value="365">1 Year Authorization</option>
                    </select>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={() => setIsLinkingModalOpen(false)}
                      className="flex-1 bg-halo-secondary hover:bg-halo-tertiary text-halo-dark font-bold text-xs py-3 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleLinkRequest}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-halo-dark font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>Submit Request</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {linkStep === 'otp' && (
                <div className="space-y-4">
                  <div className="bg-halo-cream p-4 rounded-2xl border border-halo-border text-center">
                    <span className="text-[10px] font-mono text-halo-text-muted block uppercase mb-1">Simulated 2FA OTP Code sent to</span>
                    <span className="text-sm font-mono font-black text-halo-dark block">{linkAccountNumber}</span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-halo-text-tertiary block uppercase text-center">Enter 6-Digit SMS Verification Pin</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 123456"
                      maxLength={6}
                      value={enteredOtp}
                      onChange={(e) => setEnteredOtp(e.target.value)}
                      className="w-full bg-halo-cream border border-halo-border rounded-xl text-center text-lg p-3 tracking-[0.4em] font-mono text-halo-dark focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <button 
                    onClick={handleVerifyOtp}
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-halo-dark font-bold text-xs py-3 rounded-xl transition-all"
                  >
                    Verify & Authenticate
                  </button>
                </div>
              )}

              {linkStep === 'syncing' && (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
                  <div className="text-center">
                    <p className="text-sm font-bold text-halo-dark uppercase tracking-widest font-mono">Syncing Banking Ledger...</p>
                    <p className="text-xs text-halo-text-muted mt-1">Decrypting read-only balance indices securely...</p>
                  </div>
                </div>
              )}

              {linkStep === 'done' && (
                <div className="text-center space-y-4 py-4">
                  <div className="w-12 h-12 rounded-full bg-halo-gold/10 text-halo-gold border border-halo-gold/20 flex items-center justify-center mx-auto text-xl font-bold">
                    ✓
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-halo-dark text-base">API Sync Accomplished!</h4>
                    <p className="text-xs text-halo-text-tertiary leading-relaxed">
                      Your {selectedBank.name} is connected. Your Net Worth ledger, Financial Health Score, and Emergency reserve limits have automatically updated.
                    </p>
                  </div>
                  <button 
                    onClick={() => setIsLinkingModalOpen(false)}
                    className="w-full bg-halo-secondary hover:bg-halo-tertiary text-halo-dark font-bold text-xs py-3 rounded-xl transition-colors"
                  >
                    Back to Life Engine
                  </button>
                </div>
              )}

            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
};
