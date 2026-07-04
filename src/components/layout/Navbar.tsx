import React from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { LayoutDashboard, Vault, ArrowLeftRight, Bot, ShieldCheck, UserCheck, Moon, Sun, Shield, Bell, Gift, Sparkles } from 'lucide-react';
import { formatMoney } from '../../lib/utils.ts';

export const Navbar: React.FC = () => {
  const { activeTab, setActiveTab, user, summary, isDarkMode, toggleDarkMode, setIsDepositModalOpen, unreadCount } = useApp();

  const navItems: Array<{ id: any; label: string; icon: any; badge?: string; highlight?: boolean }> = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'vaults', label: 'Savings Vaults', icon: Vault, badge: summary.lockedBalance > 0 ? 'Locked' : undefined },
    { id: 'wealth', label: 'Life Engine', icon: Sparkles },
    { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
    { id: 'coach', label: 'AI Coach', icon: Bot, highlight: true },
    { id: 'referrals', label: 'Referrals', icon: Gift },
    { id: 'profile', label: 'Profile', icon: UserCheck },
  ];

  if (user?.role === 'super_admin') {
    navItems.push({ id: 'admin', label: 'Admin', icon: ShieldCheck, highlight: true });
  }

  return (
    <header 
      className="sticky top-0 z-40 bg-halo-cream border-b border-halo-border text-halo-dark shadow-sm"
      style={{ willChange: 'transform', transform: 'translateZ(0)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-2 sm:gap-3 cursor-pointer shrink-0" onClick={() => setActiveTab('dashboard')}>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-halo-card border border-halo-gold sm:border-2 shadow-sm flex items-center justify-center">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-halo-gold" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-heading font-bold text-sm sm:text-xl tracking-tight text-halo-dark">
                  HALOSAVE
                </span>
                <span className="badge-premium text-[8px] sm:text-[9px]">
                  v2.0
                </span>
              </div>
              <p className="text-[8px] sm:text-[10px] font-sans tracking-widest uppercase text-halo-text-tertiary hidden min-[380px]:block">
                SAVE. LOCK. GROW.
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-halo-card p-1.5 rounded-xl border border-halo-border">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-halo-tertiary text-halo-gold font-semibold'
                      : 'text-halo-text-secondary hover:text-halo-gold hover:bg-halo-secondary'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-halo-gold' : 'text-halo-text-tertiary'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="badge-premium ml-1">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Actions & Profile Preview */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <button
              onClick={() => setIsDepositModalOpen(true)}
              className="hidden sm:flex items-center gap-2 btn-primary !py-2 !px-4 !text-sm"
            >
              <span>+ Quick Deposit</span>
            </button>

            {/* Explicit Theme Mode Selectors */}
            <div className="flex items-center gap-0.5 sm:gap-1 bg-halo-secondary/50 p-0.5 sm:p-1 rounded-lg sm:rounded-xl border border-halo-border shrink-0">
              <button
                onClick={() => isDarkMode && toggleDarkMode()}
                className={`flex items-center gap-1 px-1.5 py-1 sm:px-2.5 sm:py-1.5 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                  !isDarkMode
                    ? 'bg-halo-gold text-halo-dark shadow-sm'
                    : 'text-halo-text-secondary hover:text-halo-dark hover:bg-halo-secondary'
                }`}
                title="Use Original Halo Theme (Light Cream)"
              >
                <Sun className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500" />
                <span className="hidden lg:inline">Halo Theme</span>
              </button>
              <button
                onClick={() => !isDarkMode && toggleDarkMode()}
                className={`flex items-center gap-1 px-1.5 py-1 sm:px-2.5 sm:py-1.5 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                  isDarkMode
                    ? 'bg-halo-gold text-halo-dark shadow-sm'
                    : 'text-halo-text-secondary hover:text-halo-dark hover:bg-halo-secondary'
                }`}
                title="Use Dark Theme"
              >
                <Moon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
                <span className="hidden lg:inline">Dark Theme</span>
              </button>
            </div>

            <button
              onClick={() => setActiveTab('notifications')}
              className={`relative p-2 sm:p-2.5 rounded-lg border transition-all duration-200 shrink-0 ${
                activeTab === 'notifications'
                  ? 'bg-halo-tertiary text-halo-gold border-halo-gold'
                  : 'bg-halo-card hover:bg-halo-tertiary hover:border-halo-gold text-halo-text-secondary border-halo-border'
              }`}
              title="View notifications & achievements"
            >
              <Bell className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeTab === 'notifications' ? 'text-halo-gold' : ''}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded-full bg-halo-red text-[8px] sm:text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {user && (
              <div
                onClick={() => setActiveTab('profile')}
                className="flex items-center gap-2 p-1 sm:p-1.5 sm:pl-3 rounded-lg bg-halo-card border border-halo-border hover:border-halo-gold cursor-pointer transition-all shrink-0"
              >
                <div className="hidden lg:block text-right">
                  <p className="text-xs font-semibold text-halo-dark leading-none">{user.fullName}</p>
                  <p className="text-[10px] font-sans font-medium text-halo-text-secondary mt-1">
                    {formatMoney(summary.availableBalance + summary.lockedBalance, user.currency)}
                  </p>
                </div>
                <img
                  src={user.avatarUrl}
                  alt={user.fullName}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-halo-border"
                />
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Mobile Bottom Bar Navigation */}
      <div 
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-halo-cream border-t border-halo-border px-3 py-1.5 flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden justify-start snap-x shadow-md"
        style={{ willChange: 'transform', transform: 'translateZ(0)' }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all min-w-[72px] shrink-0 snap-center ${
                isActive ? 'text-halo-gold font-bold bg-halo-gold/10' : 'text-halo-text-tertiary hover:text-halo-text-secondary'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-1 leading-none whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
