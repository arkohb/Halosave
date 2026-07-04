/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { Navbar } from './components/layout/Navbar.tsx';
import { OverviewTab } from './components/dashboard/OverviewTab.tsx';
import { VaultsTab } from './components/vaults/VaultsTab.tsx';
import { TransactionsTab } from './components/transactions/TransactionsTab.tsx';
import { CoachTab } from './components/coach/CoachTab.tsx';
import { AdminTab } from './components/admin/AdminTab.tsx';
import { ProfileTab } from './components/profile/ProfileTab.tsx';
import { NotificationsTab } from './components/notifications/NotificationsTab.tsx';
import { ReferralsTab } from './components/referrals/ReferralsTab.tsx';
import { WealthEngineTab } from './components/wealth/WealthEngineTab.tsx';
import { DepositModal } from './components/modals/DepositModal.tsx';
import { WithdrawModal } from './components/modals/WithdrawModal.tsx';
import { CreateVaultModal } from './components/modals/CreateVaultModal.tsx';
import { ToastContainer } from './components/common/Toast.tsx';
import { AuthPage } from './components/auth/AuthPage.tsx';
import { PWAProvider } from './context/PWAContext.tsx';
import { OfflineBanner } from './components/pwa/OfflineBanner.tsx';

const AppContent: React.FC = () => {
  const { activeTab, setActiveTab, user, isLoading } = useApp();
  const [currentPath, setCurrentPath] = React.useState(window.location.pathname + window.location.hash);

  React.useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname + window.location.hash);
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-halo-cream text-halo-dark flex flex-col justify-center items-center font-sans">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-halo-gold/10 border-t-halo-gold animate-spin" />
            <div className="absolute inset-0 flex justify-center items-center">
              <span className="w-2 h-2 rounded-full bg-halo-gold animate-ping" />
            </div>
          </div>
          <p className="text-xs font-mono text-halo-text-tertiary uppercase tracking-widest animate-pulse">Initializing HaloSave Security Handshake...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthPage />
        <ToastContainer />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-halo-cream text-halo-dark flex flex-col font-sans selection:bg-halo-gold selection:text-halo-dark">
      <OfflineBanner />
      
      {/* Top Navbar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        {activeTab !== 'dashboard' && (
          <div className="mb-4">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2 text-halo-text-secondary hover:text-halo-gold transition-colors font-medium text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Return to Dashboard
            </button>
          </div>
        )}
        {activeTab === 'dashboard' && <OverviewTab />}
        {activeTab === 'vaults' && <VaultsTab />}
        {activeTab === 'wealth' && <WealthEngineTab />}
        {activeTab === 'transactions' && <TransactionsTab />}
        {activeTab === 'coach' && <CoachTab />}
        {activeTab === 'admin' && user?.role === 'super_admin' && <AdminTab />}
        {activeTab === 'profile' && <ProfileTab />}
        {activeTab === 'notifications' && <NotificationsTab />}
        {activeTab === 'referrals' && <ReferralsTab />}
      </main>

      {/* Footer */}
      <footer className="border-t border-halo-border bg-halo-cream/80 py-6 px-4 text-center font-mono text-xs text-halo-text-muted pb-24 md:pb-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-halo-gold animate-pulse" />
            <span>HaloSave Protocol v2.5 • Databank MFund Integrated</span>
          </div>
          <div className="flex gap-4">
            <span className="hover:text-halo-text-tertiary cursor-pointer">SEC Tier-1 Regulated</span>
            <span>•</span>
            <span className="hover:text-halo-text-tertiary cursor-pointer">Paystack SSL Secure</span>
            <span>•</span>
            <span className="hover:text-halo-text-tertiary cursor-pointer">WebAuthn PWA</span>
          </div>
        </div>
      </footer>

      {/* Global Overlays & Modals */}
      <DepositModal />
      <WithdrawModal />
      <CreateVaultModal />
      <ToastContainer />

    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <PWAProvider>
        <AppContent />
      </PWAProvider>
    </AppProvider>
  );
}

