import React from 'react';
import { usePWA } from '../../context/PWAContext.tsx';
import { WifiOff, Database, ArrowRight } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const { isOnline, offlineQueue } = usePWA();

  if (isOnline) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-halo-dark py-2.5 px-4 sticky top-0 z-50 shadow-md flex items-center justify-between transition-all duration-300 font-sans">
      <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 text-halo-dark">
          <div className="p-1 bg-halo-cream/20 rounded-lg animate-pulse">
            <WifiOff className="w-4 h-4 text-halo-dark" />
          </div>
          <div className="text-xs font-semibold leading-none">
            <span>HaloSave Offline Mode Active • operating in secure database sandbox.</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {offlineQueue.length > 0 && (
            <div className="flex items-center gap-1 bg-halo-cream text-amber-400 text-[10px] font-mono px-2 py-0.5 rounded-full border border-amber-500/20">
              <Database className="w-3 h-3 animate-pulse" />
              <span>{offlineQueue.length} Queue Locks</span>
            </div>
          )}
          <span className="text-[10px] font-mono uppercase bg-halo-cream/20 text-halo-dark px-2 py-0.5 rounded font-bold flex items-center gap-1">
            <span>Sync Ready</span>
            <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </div>
  );
};
