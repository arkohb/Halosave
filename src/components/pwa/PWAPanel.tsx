import React, { useState } from 'react';
import { usePWA } from '../../context/PWAContext.tsx';
import { 
  Wifi, WifiOff, Download, CheckCircle, Bell, BellOff, Send, Database, 
  RefreshCw, Trash2, ShieldCheck, Activity, Layers, ServerCrash
} from 'lucide-react';
import { formatMoney } from '../../lib/utils.ts';
import { useApp } from '../../context/AppContext.tsx';

export const PWAPanel: React.FC = () => {
  const { 
    isOnline, isInstallable, isInstalled, offlineQueue, pushPermission,
    triggerInstall, requestPushPermission, simulatePushNotification, 
    syncOfflineQueue, clearOfflineQueue 
  } = usePWA();
  const { user } = useApp();

  const [isSyncing, setIsSyncing] = useState(false);
  const [testTitle, setTestTitle] = useState('HaloSave Alert');
  const [testBody, setTestBody] = useState('Your savings tranche is locked and earning compound interest! 💰');

  const handleSync = async () => {
    setIsSyncing(true);
    await syncOfflineQueue();
    setIsSyncing(false);
  };

  const handleTestPush = () => {
    simulatePushNotification(testTitle, testBody, 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* PWA Core Capabilities Card */}
      <div className="bg-halo-card p-6 sm:p-7 rounded-3xl border border-halo-border shadow-xl space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-halo-dark text-base flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-halo-gold" />
            <span>PWA Offline Engine & Settings</span>
          </h3>
          
          <div className="flex items-center gap-2">
            {isOnline ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase font-bold text-halo-gold bg-halo-gold/10 px-2.5 py-1 rounded-full border border-halo-gold/20">
                <span className="w-1.5 h-1.5 rounded-full bg-halo-gold animate-pulse" />
                Online Sync Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 animate-pulse">
                <WifiOff className="w-3 h-3" />
                Offline Mode Active
              </span>
            )}
          </div>
        </div>

        {/* Status Indicators & Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Network Connection Status Card */}
          <div className="bg-halo-cream p-4 rounded-2xl border border-halo-border flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-halo-text-tertiary block uppercase">Network Status</span>
              <span className="text-sm font-bold text-halo-dark flex items-center gap-1.5">
                {isOnline ? <Wifi className="w-4 h-4 text-halo-gold" /> : <WifiOff className="w-4 h-4 text-amber-400" />}
                {isOnline ? 'Broadband Connected' : 'Offline Secure Sandbox'}
              </span>
            </div>
            <div className={`p-2.5 rounded-xl border ${isOnline ? 'bg-halo-gold/10 border-halo-gold/20 text-halo-gold' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
              {isOnline ? <CheckCircle className="w-5 h-5" /> : <ServerCrash className="w-5 h-5" />}
            </div>
          </div>

          {/* Installation Status Card */}
          <div className="bg-halo-cream p-4 rounded-2xl border border-halo-border flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-halo-text-tertiary block uppercase">Installation Status</span>
              <span className="text-sm font-bold text-halo-dark">
                {isInstalled ? 'Standalone Desktop App' : isInstallable ? 'Ready to Download' : 'Web Browser Access'}
              </span>
            </div>
            {isInstallable && !isInstalled ? (
              <button 
                onClick={triggerInstall}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-halo-gold to-teal-500 text-halo-dark text-xs font-bold hover:scale-105 active:scale-95 transition-all flex items-center gap-1 shadow-lg shadow-halo-gold/10 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install</span>
              </button>
            ) : (
              <div className="p-2.5 rounded-xl bg-halo-card border border-halo-border text-halo-text-tertiary">
                <CheckCircle className="w-5 h-5 text-halo-gold" />
              </div>
            )}
          </div>
        </div>

        {/* Push Notifications Settings */}
        <div className="p-4 rounded-2xl bg-halo-cream border border-halo-border space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-halo-dark flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-amber-400" />
                <span>Web Push & Service Worker Notifications</span>
              </h4>
              <p className="text-[11px] text-halo-text-tertiary mt-0.5">
                Enable local push messages and scheduled background sync alert protocols.
              </p>
            </div>

            {pushPermission === 'granted' ? (
              <span className="text-[10px] font-mono uppercase bg-halo-gold/20 text-emerald-300 px-2.5 py-1 rounded border border-halo-gold/30 font-bold self-start sm:self-auto">
                ACTIVE
              </span>
            ) : (
              <button
                onClick={requestPushPermission}
                className="px-3.5 py-1.5 rounded-xl bg-halo-card hover:bg-halo-secondary text-halo-text-secondary border border-halo-border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Enable Alerts</span>
              </button>
            )}
          </div>

          {/* Test Simulation Form */}
          <div className="pt-3 border-t border-halo-border grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="space-y-3">
              <span className="text-[10px] font-mono text-halo-text-tertiary block uppercase font-bold">Simulator Controls</span>
              <div className="space-y-2">
                <input
                  type="text"
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  placeholder="Notification Title"
                  className="w-full bg-halo-card border border-halo-border focus:border-halo-gold/40 rounded-xl px-3.5 py-2 text-xs text-halo-dark placeholder-halo-text-muted focus:outline-none transition-all font-sans"
                />
                <textarea
                  value={testBody}
                  onChange={(e) => setTestBody(e.target.value)}
                  placeholder="Notification Message Content"
                  className="w-full h-16 bg-halo-card border border-halo-border focus:border-halo-gold/40 rounded-xl px-3.5 py-2 text-xs text-halo-dark placeholder-halo-text-muted focus:outline-none transition-all font-sans resize-none"
                />
              </div>
            </div>

            <div className="flex flex-col justify-end">
              <div className="bg-halo-card/60 p-3 rounded-xl border border-halo-border/80 mb-3 text-[10px] font-mono text-halo-text-tertiary leading-relaxed">
                🚨 **How to Test**: Enable notifications above, click "Trigger Test Alert" below, then quickly minimize your browser or switch tabs. The system will deliver a native PWA OS alert in 3 seconds!
              </div>
              <button
                onClick={handleTestPush}
                className="w-full py-2.5 rounded-xl bg-halo-card hover:bg-halo-secondary border border-halo-border hover:border-halo-border-hover text-halo-gold text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Trigger Test Alert</span>
              </button>
            </div>
          </div>
        </div>

        {/* Background Sync Queue Management */}
        <div className="p-4 rounded-2xl bg-halo-cream border border-halo-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-halo-dark flex items-center gap-1.5">
                <Database className="w-4 h-4 text-cyan-400" />
                <span>Background Sync & Offline Transaction Queue</span>
              </h4>
              <p className="text-[11px] text-halo-text-tertiary">
                Any transactions queued while offline are stored securely here and synced.
              </p>
            </div>

            {offlineQueue.length > 0 && (
              <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">
                {offlineQueue.length} PENDING
              </span>
            )}
          </div>

          {offlineQueue.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-halo-border rounded-xl bg-halo-card/20 flex flex-col items-center justify-center gap-1.5">
              <ShieldCheck className="w-8 h-8 text-halo-text-secondary" />
              <p className="text-xs font-mono text-halo-text-muted">Offline Queue is empty. No pending database commits.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="max-h-36 overflow-y-auto space-y-2 border border-halo-border p-2.5 rounded-xl bg-halo-card/40">
                {offlineQueue.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-halo-cream border border-halo-border/60 text-xs font-mono text-halo-text-secondary">
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                      <span>{item.type.toUpperCase().replace('_', ' ')}</span>
                      <span className="text-halo-text-muted">({formatMoney(item.data.amount || 0, user?.currency || 'GHS')})</span>
                    </div>
                    <span className="text-[10px] text-halo-text-muted">{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={clearOfflineQueue}
                  className="flex-1 py-2.5 rounded-xl bg-halo-card hover:bg-halo-secondary text-halo-text-tertiary text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Clear Queue</span>
                </button>
                <button
                  onClick={handleSync}
                  disabled={!isOnline || isSyncing}
                  className={`flex-1 py-2.5 rounded-xl text-halo-dark text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isOnline && !isSyncing 
                      ? 'bg-halo-gold hover:bg-halo-gold' 
                      : 'bg-halo-secondary text-halo-text-muted cursor-not-allowed'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
