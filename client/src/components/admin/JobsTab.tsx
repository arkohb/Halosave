import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { 
  Cpu, 
  Play, 
  Zap, 
  Clock, 
  Activity, 
  Terminal, 
  Settings, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  PlayCircle, 
  PauseCircle, 
  Layers, 
  FileText, 
  Send, 
  Database, 
  Sliders, 
  ArrowUpRight, 
  Lock, 
  Unlock, 
  TrendingUp, 
  Server, 
  Code, 
  Flame, 
  Calendar, 
  History,
  FileCheck,
  Check,
  X,
  Plus,
  Compass,
  Wifi,
  ChevronRight,
  AlertCircle,
  HelpCircle,
  Loader2
} from 'lucide-react';
import { formatDateTime, formatMoney } from '../../lib/utils.ts';
import { motion, AnimatePresence } from 'motion/react';

// Interfaces
interface JobDefinition {
  id: string;
  name: string;
  description: string;
  cronExpression: string;
  status: 'active' | 'paused' | 'running' | 'failed';
  lastRun: string | null;
  nextRun: string;
  successRate: number;
  durationMs: number;
}

interface RetryItem {
  id: string;
  jobId: string;
  jobName: string;
  failedAt: string;
  errorMessage: string;
  retryAttempts: number;
  payload: string;
  status: 'pending' | 'retrying' | 'failed' | 'resolved';
}

interface ConsoleLog {
  id: string;
  timestamp: string;
  jobId: string;
  message: string;
  type: 'info' | 'success' | 'warn' | 'error' | 'cmd';
}

export const JobsTab: React.FC = () => {
  const { user, showToast } = useApp();

  // Selected sub-tab under Jobs panel
  const [activeJobsSubTab, setActiveJobsSubTab] = useState<'scheduler' | 'retry_queue' | 'console'>('scheduler');

  // Interactive scheduler states
  const [jobs, setJobs] = useState<JobDefinition[]>([
    {
      id: 'job-build',
      name: 'System Production Build',
      description: 'Trigger production webpack/vite compilation check, AST validation, and asset bundling pipeline.',
      cronExpression: 'Manual Only',
      status: 'active',
      lastRun: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
      nextRun: 'On Demand',
      successRate: 100,
      durationMs: 8421
    },
    {
      id: 'job-nav',
      name: 'Daily NAV compounding compiler',
      description: 'Compiles and updates mutual fund Net Asset Value (NAV) compounding indices daily.',
      cronExpression: '0 0 * * *',
      status: 'active',
      lastRun: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
      nextRun: new Date(Date.now() + 3600 * 1000 * 19).toISOString(),
      successRate: 98.4,
      durationMs: 1420
    },
    {
      id: 'job-unlock',
      name: 'HaloSave maturity unlock & payout process',
      description: 'Checks matured savings vaults/tranches and runs secure auto-redemptions or dispatches maturity alerts.',
      cronExpression: '*/15 * * * *',
      status: 'active',
      lastRun: new Date(Date.now() - 600 * 1000).toISOString(),
      nextRun: new Date(Date.now() + 300 * 1000).toISOString(),
      successRate: 100,
      durationMs: 2150
    },
    {
      id: 'job-interest',
      name: 'Interest yields compounding scheduler',
      description: 'Accrues APY compounding daily yields for all institutional savings portfolios.',
      cronExpression: '0 1 * * *',
      status: 'active',
      lastRun: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
      nextRun: new Date(Date.now() + 3600 * 1000 * 20).toISOString(),
      successRate: 100,
      durationMs: 1840
    },
    {
      id: 'job-notifications',
      name: 'Notifications queue dispatcher',
      description: 'Flushes outbound notification logs, emails, SMS webhooks, and device push alerts.',
      cronExpression: '*/5 * * * *',
      status: 'active',
      lastRun: new Date(Date.now() - 120 * 1000).toISOString(),
      nextRun: new Date(Date.now() + 180 * 1000).toISOString(),
      successRate: 94.2,
      durationMs: 580
    },
    {
      id: 'job-reports',
      name: 'HaloSave compliance reports builder',
      description: 'Aggregates GHS financial transaction logs and compiles compliance ledger audits.',
      cronExpression: '0 6 * * 1',
      status: 'active',
      lastRun: new Date(Date.now() - 3600 * 1000 * 24 * 3).toISOString(),
      nextRun: new Date(Date.now() + 3600 * 1000 * 24 * 4).toISOString(),
      successRate: 100,
      durationMs: 4210
    },
    {
      id: 'job-cleanup',
      name: 'Database sanitation vacuum & cache flush',
      description: 'Prunes revoked browser sessions, clears expired security handshakes, and defragments storage buffers.',
      cronExpression: '0 3 * * 0',
      status: 'active',
      lastRun: new Date(Date.now() - 3600 * 1000 * 24 * 5).toISOString(),
      nextRun: new Date(Date.now() + 3600 * 1000 * 24 * 2).toISOString(),
      successRate: 100,
      durationMs: 950
    }
  ]);

  // Console Logs
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([
    {
      id: 'log-1',
      timestamp: new Date(Date.now() - 60000).toISOString(),
      jobId: 'system',
      message: 'HaloSave Chronos scheduler engine initialized successfully.',
      type: 'info'
    },
    {
      id: 'log-2',
      timestamp: new Date(Date.now() - 55000).toISOString(),
      jobId: 'system',
      message: 'Ready state established on Node cluster node-01. Port 3000 ingress open.',
      type: 'info'
    },
    {
      id: 'log-3',
      timestamp: new Date(Date.now() - 40000).toISOString(),
      jobId: 'job-notifications',
      message: 'Job started: Notifications queue dispatcher [CRON: */5 * * * *]',
      type: 'info'
    },
    {
      id: 'log-4',
      timestamp: new Date(Date.now() - 39000).toISOString(),
      jobId: 'job-notifications',
      message: 'Dispatched 4 pending SMS gateway webhooks and compiled 2 email digests.',
      type: 'success'
    },
    {
      id: 'log-5',
      timestamp: new Date(Date.now() - 38000).toISOString(),
      jobId: 'job-notifications',
      message: 'Job finished in 580ms. Exit status code: 0 (OK)',
      type: 'success'
    }
  ]);

  // Retry Queue states
  const [retryQueue, setRetryQueue] = useState<RetryItem[]>([
    {
      id: 'ret-1',
      jobId: 'job-notifications',
      jobName: 'SMS Gateway Handshake',
      failedAt: new Date(Date.now() - 15 * 60000).toISOString(),
      errorMessage: 'Gateway connection timed out: HTTP 504 Gateway Timeout from Hubtel API.',
      retryAttempts: 2,
      payload: '{"phone":"+233240011222","message":"HaloSave: Deposit of GH₵ 500 confirmed."}',
      status: 'failed'
    },
    {
      id: 'ret-2',
      jobId: 'job-unlock',
      jobName: 'Early Redemption Penalty Webhook',
      failedAt: new Date(Date.now() - 45 * 60000).toISOString(),
      errorMessage: 'Signature Verification failure: Partner webhook server rejected HMAC sha256.',
      retryAttempts: 1,
      payload: '{"trancheId":"tr_821ab","penaltyAmount":25.00,"payout":475.00}',
      status: 'pending'
    },
    {
      id: 'ret-3',
      jobId: 'job-interest',
      jobName: 'APY Compilation Sync',
      failedAt: new Date(Date.now() - 120 * 60000).toISOString(),
      errorMessage: 'Lock wait timeout exceeded: Try restarting PostgreSQL transaction to bypass block.',
      retryAttempts: 3,
      payload: '{"target_table":"mutual_fund_daily_accruals","total_users_impacted":142}',
      status: 'resolved'
    }
  ]);

  // Simulation running status tracker
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  const [buildStep, setBuildStep] = useState<string>('');
  const [buildPercent, setBuildPercent] = useState<number>(0);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll console
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLogs]);

  const addLog = (jobId: string, message: string, type: 'info' | 'success' | 'warn' | 'error' | 'cmd' = 'info') => {
    const newLog: ConsoleLog = {
      id: 'log-' + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      jobId,
      message,
      type
    };
    setConsoleLogs(prev => [...prev.slice(-100), newLog]); // Keep max 100 logs
  };

  // Toggle active status of a cron job
  const handleToggleCron = (id: string) => {
    setJobs(prev => prev.map(job => {
      if (job.id === id) {
        const isPaused = job.status === 'paused';
        const nextStatus = isPaused ? 'active' : 'paused';
        addLog('system', `Chronos Scheduler updated '${job.name}' status to ${nextStatus.toUpperCase()}`, 'warn');
        showToast({
          title: isPaused ? 'Cron Schedule Enabled ⏰' : 'Cron Schedule Paused ⏸️',
          description: `'${job.name}' will ${isPaused ? 'now trigger on schedule' : 'no longer trigger automatically'}.`,
          type: 'info'
        });
        return {
          ...job,
          status: nextStatus
        };
      }
      return job;
    }));
  };

  // Run a background job on demand
  const handleTriggerJob = async (jobId: string) => {
    if (runningJobId) {
      showToast({ title: 'Scheduler Occupied ⚠️', description: 'Another job is currently compiling or running.', type: 'lock' });
      return;
    }

    setRunningJobId(jobId);
    
    // Set status to running
    setJobs(prev => prev.map(job => job.id === jobId ? { ...job, status: 'running' } : job));

    const selectedJob = jobs.find(j => j.id === jobId);
    addLog(jobId, `[COMMAND] npx run-job --id=${jobId} --user-clearance=SUPER_ADMIN`, 'cmd');
    addLog(jobId, `Executing scheduled task: ${selectedJob?.name}...`, 'info');

    if (jobId === 'job-build') {
      // Production Build simulation
      setBuildPercent(5);
      setBuildStep('Initiating TSC compiler build checks...');
      addLog(jobId, 'Running: tsc --noEmit && vite build', 'info');
      
      await new Promise(r => setTimeout(r, 600));
      setBuildPercent(25);
      setBuildStep('Parsing TypeScript abstract syntax trees (AST)...');
      addLog(jobId, '✔ Type safety verification complete. No compilation errors found.', 'success');

      await new Promise(r => setTimeout(r, 800));
      setBuildPercent(50);
      setBuildStep('Running linter checks and security audits...');
      addLog(jobId, '✔ EsLint validation completed successfully. 0 errors, 0 warnings.', 'success');

      await new Promise(r => setTimeout(r, 700));
      setBuildPercent(70);
      setBuildStep('Minifying chunk bundles & asset tree shaking...');
      addLog(jobId, 'Asset Compression: index.html (2.4KB), assets/index-389afc8e.js (215.4KB), assets/index-09dcf18a.css (42.1KB)', 'info');

      await new Promise(r => setTimeout(r, 900));
      setBuildPercent(90);
      setBuildStep('Generating service workers & manifest cache manifest...');
      addLog(jobId, 'Platform caching policies loaded. Service worker generation completed.', 'info');

      await new Promise(r => setTimeout(r, 500));
      setBuildPercent(100);
      setBuildStep('Deploying bundle to Cloud Run container cluster...');
      addLog(jobId, '✔ Production container cluster refreshed successfully. Active route swappable.', 'success');
      addLog(jobId, 'Job System Production Build executed successfully in 3500ms.', 'success');

      setJobs(prev => prev.map(job => job.id === jobId ? { 
        ...job, 
        status: 'active', 
        lastRun: new Date().toISOString() 
      } : job));
      setRunningJobId(null);
      setBuildStep('');
      setBuildPercent(0);
      showToast({ title: 'Production Build Finished ✅', description: 'Vite static assets compiled and service worker layers loaded.', type: 'success' });

    } else if (jobId === 'job-nav') {
      // Daily NAV compounding update
      await new Promise(r => setTimeout(r, 1200));
      addLog(jobId, 'Accessing partner endpoints: Databank Ghana Mutual Funds (MFund)...', 'info');
      addLog(jobId, 'Fetched latest asset rate: 1 MFund unit = GH₵ 2.4815 (+0.12% daily gain).', 'info');
      addLog(jobId, 'Fetched EDC Fixed Income fund index: 1 Unit = GH₵ 1.5200.', 'info');
      addLog(jobId, 'Syncing local cache and DB schemas...', 'info');
      addLog(jobId, '✔ Saved 4 updated NAV matrices to DB. Recalculating portfolio holding gains.', 'success');
      addLog(jobId, 'Daily NAV compilation job finished successfully.', 'success');

      setJobs(prev => prev.map(job => job.id === jobId ? { 
        ...job, 
        status: 'active', 
        lastRun: new Date().toISOString(),
        nextRun: new Date(Date.now() + 3600 * 1000 * 24).toISOString() 
      } : job));
      setRunningJobId(null);
      showToast({ title: 'NAV Rates Updated 📈', description: 'Fetched latest mutual fund asset rates and recalculated gains.', type: 'success' });

    } else if (jobId === 'job-unlock') {
      // HaloSave maturity unlock job
      await new Promise(r => setTimeout(r, 1500));
      addLog(jobId, 'Scrutinizing client tranches for maturity dates...', 'info');
      addLog(jobId, 'Identified 3 matured locked vaults matching today\'s unlock timestamp.', 'info');
      addLog(jobId, 'Running Auto-Redemption pipeline on tranche [tr_928af]...', 'info');
      addLog(jobId, '✔ Redeemed 120.45 units at NAV 2.4815 GHS. Dispatched GH₵ 298.90 to user general wallet.', 'success');
      addLog(jobId, 'Running Auto-Redemption pipeline on tranche [tr_01dc2]...', 'info');
      addLog(jobId, '✔ Redeemed 80.20 units. Dispatched GH₵ 199.01 to user secondary holding.', 'success');
      addLog(jobId, 'Flagged 1 matured manual lock [tr_14a8b]. Dispatching in-app maturity warning alert.', 'info');
      addLog(jobId, '✔ Delivered manual lock maturity notifications to client queues.', 'success');
      addLog(jobId, 'Maturity unlock execution finished. 2 automated redemptions executed, 1 alert generated.', 'success');

      setJobs(prev => prev.map(job => job.id === jobId ? { 
        ...job, 
        status: 'active', 
        lastRun: new Date().toISOString(),
        nextRun: new Date(Date.now() + 900 * 1000).toISOString() 
      } : job));
      setRunningJobId(null);
      showToast({ title: 'Maturity Locks Unlocked 🔑', description: 'Automated 2 redemptions and sent 1 lock maturity warning.', type: 'success' });

    } else if (jobId === 'job-interest') {
      // Interest yields daily growth APY
      await new Promise(r => setTimeout(r, 1300));
      addLog(jobId, 'Loading system compounding settings...', 'info');
      addLog(jobId, 'Calculating APY growth coefficients for 14 active mutual portfolios.', 'info');
      addLog(jobId, 'Accruing 1/365th of APY interest yield across 48 compounding savings tranches.', 'info');
      addLog(jobId, '✔ Added GH₵ 821.40 cumulative daily compounded yields to vaults DB.', 'success');
      addLog(jobId, 'Interest accrual script compiled and sync complete.', 'success');

      setJobs(prev => prev.map(job => job.id === jobId ? { 
        ...job, 
        status: 'active', 
        lastRun: new Date().toISOString(),
        nextRun: new Date(Date.now() + 3600 * 1000 * 24).toISOString() 
      } : job));
      setRunningJobId(null);
      showToast({ title: 'Compounding Yields Dispatched 💰', description: 'Computed and distributed daily interest accruals to vaults.', type: 'success' });

    } else if (jobId === 'job-notifications') {
      // Notifications queue flush
      await new Promise(r => setTimeout(r, 800));
      addLog(jobId, 'Reading pending outbound queues...', 'info');
      addLog(jobId, 'Dispatched 5 pending transactional SMS receipts via Hubtel.', 'success');
      addLog(jobId, 'Emailed weekly HaloSave discipline digests to 12 subscribers.', 'success');
      addLog(jobId, 'Outbound pipeline flush finished successfully.', 'success');

      setJobs(prev => prev.map(job => job.id === jobId ? { 
        ...job, 
        status: 'active', 
        lastRun: new Date().toISOString(),
        nextRun: new Date(Date.now() + 300 * 1000).toISOString() 
      } : job));
      setRunningJobId(null);
      showToast({ title: 'Notification Queue Flushed ✉️', description: 'All pending transactional SMS/Email payloads delivered.', type: 'success' });

    } else if (jobId === 'job-reports') {
      // Reports generation
      await new Promise(r => setTimeout(r, 1600));
      addLog(jobId, 'Aggregating general ledgers for weekly performance reports...', 'info');
      addLog(jobId, 'Compiling tax statements, asset balance registers, and early withdrawal metrics.', 'info');
      addLog(jobId, 'Generating regulatory compliance reports for secure export.', 'info');
      addLog(jobId, '✔ Created PDF report: HaloSave_Regulatory_Weekly_Audit_v2.pdf [Checksum: a8d93e]', 'success');
      addLog(jobId, 'Reports compiler complete. File saved to storage/reports/ audit vault.', 'success');

      setJobs(prev => prev.map(job => job.id === jobId ? { 
        ...job, 
        status: 'active', 
        lastRun: new Date().toISOString(),
        nextRun: new Date(Date.now() + 3600 * 1000 * 24 * 7).toISOString() 
      } : job));
      setRunningJobId(null);
      showToast({ title: 'Weekly Report Compiled 📊', description: 'Aggregated financial ledgers and prepared auditing PDF.', type: 'success' });

    } else {
      // Cleanup vacuum
      await new Promise(r => setTimeout(r, 1000));
      addLog(jobId, 'Running database garbage collector...', 'info');
      addLog(jobId, 'Purging 14 expired device sessions and 12 empty local storage tokens.', 'info');
      addLog(jobId, 'Vacuuming table indices: users (4 rows reclaimed), tranches (12 rows optimized).', 'info');
      addLog(jobId, '✔ Memory vacuum complete. Reclaimed 1.4MB database buffer storage.', 'success');
      addLog(jobId, 'Database sanitation vacuum executed successfully.', 'success');

      setJobs(prev => prev.map(job => job.id === jobId ? { 
        ...job, 
        status: 'active', 
        lastRun: new Date().toISOString(),
        nextRun: new Date(Date.now() + 3600 * 1000 * 24 * 7).toISOString() 
      } : job));
      setRunningJobId(null);
      showToast({ title: 'Database Vacuum Complete 🧹', description: 'Pruned obsolete sessions and reclaimed indexed cache memory.', type: 'success' });
    }
  };

  // Run all jobs in sequence (Demonstration feature!)
  const handleTriggerAllJobs = async () => {
    if (runningJobId) {
      showToast({ title: 'Scheduler Occupied ⚠️', description: 'A job is already running.', type: 'lock' });
      return;
    }

    showToast({ title: 'HaloSave Chronos Sequential Trigger 🚀', description: 'Running all background jobs sequentially.', type: 'info' });
    
    // Execute jobs sequentially
    const sequentialJobs = jobs.filter(j => j.id !== 'job-build'); // skip build as it takes longer
    for (const job of sequentialJobs) {
      await handleTriggerJob(job.id);
      await new Promise(resolve => setTimeout(resolve, 800)); // gap between jobs
    }
  };

  // Retry failed webhook or SMS operation
  const handleRetryItem = async (itemId: string) => {
    setRetryQueue(prev => prev.map(item => item.id === itemId ? { ...item, status: 'retrying' } : item));
    addLog('system', `Re-attempting outbound payload for transaction ${itemId}...`, 'info');

    await new Promise(resolve => setTimeout(resolve, 1400));

    // 80% success rate on retry
    const isSuccess = Math.random() > 0.15;

    if (isSuccess) {
      setRetryQueue(prev => prev.map(item => item.id === itemId ? { 
        ...item, 
        status: 'resolved', 
        retryAttempts: item.retryAttempts + 1 
      } : item));
      addLog('system', `✔ Outbound payload for queue item ${itemId} successfully dispatched. Server acknowledged HTTP 200 OK.`, 'success');
      showToast({ title: 'Queue Item Dispatched 🟢', description: 'Failed webhook/API event successfully resolved.', type: 'success' });
    } else {
      setRetryQueue(prev => prev.map(item => item.id === itemId ? { 
        ...item, 
        status: 'failed', 
        retryAttempts: item.retryAttempts + 1 
      } : item));
      addLog('system', `❌ Retry attempt failed for queue item ${itemId}. Endpoint still unresponsive.`, 'error');
      showToast({ title: 'Retry Failed 🔴', description: 'API endpoint remained offline. Item returned to queue.', type: 'error' });
    }
  };

  // Add a manual test item to the retry queue
  const handleAddTestRetryItem = () => {
    const randomId = 'ret-' + Math.random().toString(36).substring(2, 5);
    const newRetry: RetryItem = {
      id: randomId,
      jobId: 'job-nav',
      jobName: 'Databank API NAV Sync',
      failedAt: new Date().toISOString(),
      errorMessage: 'Network Error: socket hang up. SSL Handshake failed with databank-gh.com.',
      retryAttempts: 0,
      payload: '{"fetch_symbol":"DATABANK_MFUND","target_region":"ACCRA_MAIN"}',
      status: 'pending'
    };

    setRetryQueue(prev => [newRetry, ...prev]);
    addLog('system', `Failed task logged: '${newRetry.jobName}' added to background retry queue.`, 'warn');
    showToast({ title: 'Simulated Fail Event Logged', description: 'Added network socket timeout failure to retry queue.', type: 'info' });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Title block */}
      <div className="bg-halo-card border border-halo-border p-6 sm:p-8 rounded-[32px] shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/5 rounded-full filter blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-halo-gold/5 rounded-full filter blur-3xl pointer-events-none" />
        
        <div className="space-y-1.5 relative z-10">
          <span className="text-halo-gold font-mono text-[10px] tracking-widest uppercase font-bold flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 animate-spin" /> BACKGROUND DAEMON SYSTEMS
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-halo-dark tracking-tight">
            Chronos Job Orchestrator
          </h2>
          <p className="text-xs text-halo-text-tertiary max-w-2xl leading-relaxed">
            Monitor, override, and schedule the heartbeat operations of HaloSave: daily Net Asset Value compounding updates, automated maturity locks unlocking, notifications flusher pipelines, and database vacuum routines.
          </p>
        </div>

        {/* Global trigger */}
        <button
          onClick={handleTriggerAllJobs}
          disabled={!!runningJobId}
          className="bg-halo-cream hover:bg-halo-secondary disabled:bg-halo-cream disabled:text-halo-text-tertiary hover:border-halo-border-hover p-3 rounded-2xl border border-halo-border text-halo-gold hover:text-emerald-300 text-xs font-bold font-mono transition-all flex items-center gap-2 relative z-10 shrink-0 self-start md:self-auto"
        >
          <Zap className="w-4 h-4 animate-bounce" />
          <span>RUN SEQUENTIAL CYCLE</span>
        </button>
      </div>

      {/* Scheduler Dashboard Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-halo-card border border-halo-border/80 rounded-2xl p-4.5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-halo-gold/10 border border-halo-gold/20 flex items-center justify-center text-halo-gold shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-halo-text-muted uppercase font-bold block">Active Daemon Jobs</span>
            <span className="text-lg font-black text-halo-dark">{jobs.filter(j => j.status !== 'paused').length} / {jobs.length} Online</span>
          </div>
        </div>

        <div className="bg-halo-card border border-halo-border/80 rounded-2xl p-4.5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-halo-text-muted uppercase font-bold block">Scheduler Frequency</span>
            <span className="text-lg font-black text-halo-dark">Cron Heartbeat</span>
          </div>
        </div>

        <div className="bg-halo-card border border-halo-border/80 rounded-2xl p-4.5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-halo-text-muted uppercase font-bold block">Retry Queue Buffer</span>
            <span className="text-lg font-black text-halo-dark">{retryQueue.filter(r => r.status === 'pending' || r.status === 'failed').length} Pending Failures</span>
          </div>
        </div>

        <div className="bg-halo-card border border-halo-border/80 rounded-2xl p-4.5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-halo-text-muted uppercase font-bold block">System Build Tag</span>
            <span className="text-lg font-black text-halo-dark">v2.1.8-stable</span>
          </div>
        </div>

      </div>

      {/* Secondary Sub-Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-1.5 scrollbar-none border-b border-halo-border">
        <button
          onClick={() => setActiveJobsSubTab('scheduler')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold font-mono shrink-0 transition-all border ${
            activeJobsSubTab === 'scheduler' 
              ? 'bg-halo-card text-halo-gold border-halo-border' 
              : 'text-halo-text-muted hover:text-halo-text-secondary border-transparent'
          }`}
        >
          Cron Scheduler Overview
        </button>
        <button
          onClick={() => setActiveJobsSubTab('retry_queue')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold font-mono shrink-0 transition-all border flex items-center gap-1.5 ${
            activeJobsSubTab === 'retry_queue' 
              ? 'bg-halo-card text-halo-gold border-halo-border' 
              : 'text-halo-text-muted hover:text-halo-text-secondary border-transparent'
          }`}
        >
          <span>Outbound Retry Queue</span>
          {retryQueue.filter(r => r.status === 'pending' || r.status === 'failed').length > 0 && (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          )}
        </button>
        <button
          onClick={() => setActiveJobsSubTab('console')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold font-mono shrink-0 transition-all border ${
            activeJobsSubTab === 'console' 
              ? 'bg-halo-card text-halo-gold border-halo-border' 
              : 'text-halo-text-muted hover:text-halo-text-secondary border-transparent'
          }`}
        >
          Scheduler Logs Terminal
        </button>
      </div>

      {/* JOBS CONTENT: Scheduler Overview */}
      {activeJobsSubTab === 'scheduler' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Active Job compilation display if any */}
          {runningJobId && buildPercent > 0 && (
            <div className="bg-halo-card border border-halo-gold/10 p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-halo-gold font-extrabold flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{buildStep}</span>
                </span>
                <span className="text-halo-text-tertiary font-bold">{buildPercent}%</span>
              </div>
              <div className="w-full h-1.5 bg-halo-cream rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-halo-gold" 
                  initial={{ width: '0%' }}
                  animate={{ width: `${buildPercent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          {/* Table / Cards containing all 7 Job categories */}
          <div className="grid grid-cols-1 gap-4">
            {jobs.map((job) => {
              const isRunning = job.status === 'running';
              const isPaused = job.status === 'paused';
              const hasRun = job.lastRun !== null;

              return (
                <div 
                  key={job.id} 
                  className={`bg-halo-card border p-5 rounded-2xl transition-all flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 ${
                    isRunning 
                      ? 'border-halo-gold/40 shadow-emerald-950/20 shadow-xl bg-halo-card/90' 
                      : 'border-halo-border/80 hover:border-halo-border-hover/80'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-halo-dark font-extrabold text-sm">{job.name}</span>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase ${
                        isRunning 
                          ? 'bg-halo-gold/10 text-halo-gold border-halo-gold/20 animate-pulse'
                          : isPaused 
                          ? 'bg-halo-cream text-halo-text-muted border-halo-border'
                          : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                      }`}>
                        {isRunning ? 'RUNNING' : isPaused ? 'PAUSED' : 'SCHEDULED'}
                      </span>
                      <span className="text-[10px] font-mono text-halo-text-muted flex items-center gap-1 bg-halo-cream px-2 py-0.5 rounded border border-halo-border">
                        <Clock className="w-3 h-3 text-halo-text-tertiary" />
                        <span>Cron: {job.cronExpression}</span>
                      </span>
                    </div>
                    <p className="text-xs text-halo-text-tertiary leading-relaxed max-w-3xl">{job.description}</p>
                    
                    <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[10px] font-mono text-halo-text-muted">
                      <span>Last execution: {hasRun ? formatDateTime(job.lastRun!) : 'Never'}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>Next trigger: {isPaused ? 'Paused' : job.nextRun === 'On Demand' ? 'On Demand' : formatDateTime(job.nextRun)}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>Execution time: {job.durationMs}ms</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="text-halo-gold font-bold">Success Rate: {job.successRate}%</span>
                    </div>
                  </div>

                  {/* Operational Override Buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-end lg:self-auto">
                    {/* Pause/Resume Cron */}
                    {job.cronExpression !== 'Manual Only' && (
                      <button
                        onClick={() => handleToggleCron(job.id)}
                        disabled={isRunning}
                        title={isPaused ? 'Enable recurring schedule' : 'Pause recurring schedule'}
                        className={`p-2.5 rounded-xl border transition-all text-xs font-bold font-mono flex items-center justify-center ${
                          isPaused
                            ? 'bg-halo-gold/10 hover:bg-halo-gold/20 border-halo-gold/20 text-halo-gold'
                            : 'bg-halo-cream hover:bg-halo-secondary border-halo-border text-halo-text-tertiary hover:text-halo-dark'
                        }`}
                      >
                        {isPaused ? <PlayCircle className="w-4.5 h-4.5" /> : <PauseCircle className="w-4.5 h-4.5" />}
                      </button>
                    )}

                    {/* Run now override */}
                    <button
                      onClick={() => handleTriggerJob(job.id)}
                      disabled={isRunning || isPaused || !!runningJobId}
                      className="px-4 py-2 bg-halo-cream hover:bg-halo-gold/10 border border-halo-border hover:border-halo-gold/30 text-halo-dark hover:text-halo-gold disabled:opacity-40 disabled:hover:bg-halo-cream disabled:hover:text-halo-dark rounded-xl text-xs font-black font-mono transition-all flex items-center gap-2"
                    >
                      {isRunning ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>RUNNING</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 text-halo-gold" />
                          <span>TRIGGER OVERRIDE</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* JOBS CONTENT: Retry Queue */}
      {activeJobsSubTab === 'retry_queue' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          <div className="flex items-center justify-between border-b border-halo-border pb-3">
            <div>
              <span className="text-[10px] font-mono text-halo-gold uppercase tracking-widest font-bold">FAILEDOUT LOG REGISTER</span>
              <h3 className="text-lg font-black text-halo-dark mt-0.5">Asynchronous Backoff Retry Buffer</h3>
              <p className="text-xs text-halo-text-tertiary">Failed external API webhooks, SMS handshakes, or DB locks await scheduled automatic retry or manual intervention.</p>
            </div>
            <button
              onClick={handleAddTestRetryItem}
              className="px-3.5 py-2 bg-halo-card hover:bg-halo-secondary border border-halo-border rounded-xl text-xs font-bold font-mono text-halo-text-secondary transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-halo-gold" />
              <span>LOG FAIL EVENT</span>
            </button>
          </div>

          <div className="space-y-4">
            {retryQueue.length === 0 ? (
              <div className="text-center py-12 bg-halo-card border border-halo-border rounded-2xl text-xs text-halo-text-muted font-mono">
                No failed records in the active retry buffer. Outstanding system ledger verified!
              </div>
            ) : (
              retryQueue.map((item) => {
                const isPending = item.status === 'pending';
                const isFailed = item.status === 'failed';
                const isRetrying = item.status === 'retrying';
                const isResolved = item.status === 'resolved';

                return (
                  <div 
                    key={item.id} 
                    className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row justify-between items-start gap-4 ${
                      isResolved 
                        ? 'bg-halo-cream/40 border-halo-border opacity-60' 
                        : isRetrying 
                        ? 'bg-halo-card border-halo-gold/30' 
                        : 'bg-halo-card border-halo-border'
                    }`}
                  >
                    <div className="space-y-2 flex-1 font-mono text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-rose-400 font-extrabold">{item.id}</span>
                        <span className="text-halo-dark font-bold">{item.jobName}</span>
                        <span className="text-[10px] text-halo-text-muted">• Failed: {formatDateTime(item.failedAt)}</span>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border uppercase ${
                          isResolved 
                            ? 'bg-halo-gold/10 text-halo-gold border-halo-gold/20' 
                            : isRetrying 
                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 animate-pulse' 
                            : isFailed 
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {item.status}
                        </span>
                      </div>

                      <div className="p-3 bg-halo-cream rounded-xl border border-halo-border text-halo-text-tertiary leading-normal border-l-2 border-l-rose-500 select-all">
                        {item.errorMessage}
                      </div>

                      <div className="text-[10px] text-halo-text-muted flex flex-wrap gap-4 pt-1">
                        <span>Retries logged: <span className="text-halo-dark font-bold">{item.retryAttempts} / 5 attempts</span></span>
                        <span>Payload: <code className="text-halo-gold font-bold select-all">{item.payload}</code></span>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                      {isResolved ? (
                        <div className="text-halo-gold flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-halo-gold/10 border border-halo-gold/20 px-2 py-1 rounded">
                          <Check className="w-3.5 h-3.5" />
                          <span>RESOLVED</span>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setRetryQueue(prev => prev.filter(r => r.id !== item.id));
                              addLog('system', `Discarded retry log item ${item.id} from active buffer.`, 'warn');
                              showToast({ title: 'Record Discarded 🗑️', description: 'Removed job failure record from cache memory.', type: 'info' });
                            }}
                            className="p-2 bg-halo-cream hover:bg-rose-950/40 border border-halo-border text-halo-text-muted hover:text-rose-400 rounded-xl transition-all"
                            title="Discard record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => handleRetryItem(item.id)}
                            disabled={isRetrying}
                            className="px-3.5 py-2 bg-halo-cream hover:bg-halo-gold/10 border border-halo-border hover:border-halo-gold/30 text-halo-dark hover:text-halo-gold disabled:opacity-40 rounded-xl font-bold transition-all flex items-center gap-1.5"
                          >
                            {isRetrying ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3.5 h-3.5 text-halo-gold" />
                            )}
                            <span>RETRY</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      )}

      {/* JOBS CONTENT: Console Logs */}
      {activeJobsSubTab === 'console' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          <div className="bg-halo-cream rounded-3xl border border-halo-border/80 p-5 font-mono shadow-2xl relative">
            <div className="absolute top-4 right-5 flex items-center gap-2">
              <button
                onClick={() => setConsoleLogs([])}
                className="px-2.5 py-1 bg-halo-card hover:bg-rose-950/40 text-halo-text-tertiary hover:text-rose-400 border border-halo-border rounded text-[9px] font-bold transition-all"
              >
                Clear Screen
              </button>
            </div>

            <div className="flex items-center gap-2 text-halo-text-muted text-[10px] uppercase tracking-widest border-b border-halo-border pb-3 mb-4">
              <Terminal className="w-4 h-4 text-halo-gold" />
              <span>HaloSave Job Console stdout/stderr logs</span>
            </div>

            {/* Simulated Live Logs Terminal screen */}
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800 text-xs">
              {consoleLogs.length === 0 ? (
                <div className="text-halo-text-tertiary text-center py-16">
                  --- TERMINAL BUFFER CLEARED. WAITING FOR OUTPUT ---
                </div>
              ) : (
                consoleLogs.map((log) => {
                  const isSuccess = log.type === 'success';
                  const isWarn = log.type === 'warn';
                  const isError = log.type === 'error';
                  const isCmd = log.type === 'cmd';
                  
                  let textClass = 'text-halo-text-tertiary';
                  if (isSuccess) textClass = 'text-halo-gold';
                  else if (isWarn) textClass = 'text-amber-400';
                  else if (isError) textClass = 'text-rose-400';
                  else if (isCmd) textClass = 'text-blue-400 font-extrabold';

                  return (
                    <div key={log.id} className="flex gap-2 leading-relaxed">
                      <span className="text-halo-text-tertiary select-none">[{formatDateTime(log.timestamp).split(' ')[1]}]</span>
                      <span className="text-halo-text-muted select-none">[{log.jobId}]</span>
                      <span className={textClass}>{log.message}</span>
                    </div>
                  );
                })
              )}
              <div ref={consoleEndRef} />
            </div>

            <div className="mt-4 pt-3 border-t border-halo-border text-[9px] text-halo-text-tertiary flex justify-between">
              <span>Chronos Daemon Module v2.1 • CPU clock synchronized</span>
              <span>Buffer allocation: 100% stable</span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
