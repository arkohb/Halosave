import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  Mail, 
  Trophy, 
  ArrowRight, 
  Calendar, 
  Compass, 
  Zap, 
  TrendingUp, 
  Flame, 
  ShieldCheck, 
  Target, 
  Sparkles,
  Inbox,
  Eye,
  RefreshCw,
  X,
  Info
} from 'lucide-react';
import { formatMoney } from '../../lib/utils.ts';

export const NotificationsTab: React.FC = () => {
  const { 
    notifications, 
    achievements, 
    simulatedEmails, 
    unreadCount, 
    markNotificationAsRead, 
    markAllNotificationsAsRead, 
    deleteNotification, 
    simulateWeekly, 
    simulateMonthly, 
    user,
    summary
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'inbox' | 'emails' | 'achievements'>('inbox');
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Map icon names from database to lucide-react icons
  const getBadgeIcon = (iconName: string) => {
    switch (iconName) {
      case 'trophy': return Trophy;
      case 'zap': return Zap;
      case 'trending-up': return TrendingUp;
      case 'flame': return Flame;
      case 'shield-check': return ShieldCheck;
      case 'target': return Target;
      default: return Compass;
    }
  };

  const getDifficultyStyles = (difficulty: string) => {
    switch (difficulty) {
      case 'platinum':
        return {
          bg: 'bg-indigo-950/40',
          border: 'border-indigo-500/30',
          text: 'text-indigo-400',
          glow: 'shadow-[0_0_15px_rgba(99,102,241,0.15)]',
          badge: 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
        };
      case 'gold':
        return {
          bg: 'bg-amber-950/40',
          border: 'border-amber-500/30',
          text: 'text-amber-400',
          glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]',
          badge: 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
        };
      case 'silver':
        return {
          bg: 'bg-halo-card/60',
          border: 'border-halo-border-hover/50',
          text: 'text-halo-text-secondary',
          glow: '',
          badge: 'bg-slate-500/10 text-halo-text-secondary border border-halo-border-hover'
        };
      case 'bronze':
      default:
        return {
          bg: 'bg-orange-950/30',
          border: 'border-orange-900/40',
          text: 'text-orange-400',
          glow: '',
          badge: 'bg-orange-500/10 text-orange-400 border border-orange-500/15'
        };
    }
  };

  const handleSimulate = async (type: 'weekly' | 'monthly') => {
    setIsSimulating(true);
    try {
      if (type === 'weekly') {
        await simulateWeekly();
      } else {
        await simulateMonthly();
      }
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-halo-card/40 p-6 rounded-2xl border border-halo-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-halo-dark flex items-center gap-2">
            <Bell className="w-6 h-6 text-halo-gold" />
            Notifications & Achievements Center
          </h1>
          <p className="text-sm text-halo-text-tertiary mt-1">
            Track your in-app activity, review fully-styled simulated emails, and check your unlocked saving achievements.
          </p>
        </div>
        
        {/* Quick Simulator Controls */}
        <div className="flex items-center gap-2">
          <button
            disabled={isSimulating}
            onClick={() => handleSimulate('weekly')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-halo-card hover:bg-halo-secondary text-halo-text-secondary text-xs font-mono border border-halo-border disabled:opacity-50 transition-all"
            title="Simulate dispatching a weekly portfolio performance digest email."
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
            Weekly Digest
          </button>
          <button
            disabled={isSimulating}
            onClick={() => handleSimulate('monthly')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-halo-card hover:bg-halo-secondary text-halo-text-secondary text-xs font-mono border border-halo-border disabled:opacity-50 transition-all"
            title="Simulate dispatching a monthly financial lock-payout summary email."
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
            Monthly Report
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-halo-border">
        <button
          onClick={() => setActiveSubTab('inbox')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-all ${
            activeSubTab === 'inbox'
              ? 'border-halo-gold text-halo-gold font-semibold'
              : 'border-transparent text-halo-text-tertiary hover:text-halo-dark'
          }`}
        >
          <Inbox className="w-4 h-4" />
          In-App Inbox
          {unreadCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-halo-gold text-halo-dark text-[10px] font-bold rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveSubTab('emails')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-all ${
            activeSubTab === 'emails'
              ? 'border-halo-gold text-halo-gold font-semibold'
              : 'border-transparent text-halo-text-tertiary hover:text-halo-dark'
          }`}
        >
          <Mail className="w-4 h-4" />
          Simulated Emails
          {simulatedEmails.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-halo-secondary text-halo-text-secondary text-[10px] font-bold rounded-full">
              {simulatedEmails.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveSubTab('achievements')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-all ${
            activeSubTab === 'achievements'
              ? 'border-halo-gold text-halo-gold font-semibold'
              : 'border-transparent text-halo-text-tertiary hover:text-halo-dark'
          }`}
        >
          <Trophy className="w-4 h-4" />
          Achievements & Badges
          {achievements.filter(a => a.unlockedAt).length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-bold rounded-full border border-amber-500/20">
              {achievements.filter(a => a.unlockedAt).length}
            </span>
          )}
        </button>
      </div>

      {/* Main Tab Panels */}
      <div>
        
        {/* TAB 1: IN-APP NOTIFICATIONS INBOX */}
        {activeSubTab === 'inbox' && (
          <div className="bg-halo-cream rounded-2xl border border-halo-border overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-halo-border bg-halo-card/20">
              <span className="text-xs font-mono uppercase tracking-widest text-halo-text-tertiary">
                Live Notification Logs
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllNotificationsAsRead}
                  className="flex items-center gap-1 text-xs text-halo-gold hover:text-emerald-300 font-semibold"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all as read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="p-12 text-center text-halo-text-muted flex flex-col items-center">
                <Bell className="w-8 h-8 text-halo-text-tertiary mb-3 animate-pulse" />
                <p className="text-sm">Inbox completely clear.</p>
                <p className="text-xs text-halo-text-tertiary mt-1">We will notify you here when you secure a new savings deposit or reach maturity!</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-900">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (!notif.isRead) {
                        markNotificationAsRead(notif.id);
                      }
                    }}
                    className={`flex items-start gap-4 p-5 hover:bg-halo-card/40 transition-colors cursor-pointer group ${
                      !notif.isRead ? 'bg-halo-gold/[0.02]' : ''
                    }`}
                  >
                    {/* Unread dot indicator */}
                    <div className="mt-1 flex-shrink-0">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        !notif.isRead 
                          ? 'bg-halo-gold animate-pulse ring-4 ring-halo-gold/20' 
                          : 'bg-halo-secondary'
                      }`} />
                    </div>

                    {/* Notification body */}
                    <div className="flex-1">
                      <div className="flex justify-between items-start gap-4">
                        <h4 className={`text-sm font-semibold text-halo-dark group-hover:text-emerald-300 transition-colors ${
                          !notif.isRead ? 'text-halo-dark font-bold' : ''
                        }`}>
                          {notif.title}
                        </h4>
                        <span className="text-[10px] font-mono text-halo-text-muted flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-halo-text-tertiary mt-1 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>

                    {/* Delete action button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notif.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-halo-secondary text-halo-text-muted hover:text-rose-400 transition-all self-center"
                      title="Delete alert"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SIMULATED HTML EMAILS */}
        {activeSubTab === 'emails' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left sidebar: list of emails */}
            <div className="lg:col-span-4 space-y-3">
              <div className="bg-halo-cream p-4 rounded-xl border border-halo-border">
                <span className="text-[10px] font-mono uppercase tracking-wider text-halo-text-muted block mb-2">Simulated Outbox</span>
                <p className="text-xs text-halo-text-tertiary">HaloSave sends real-time transactional HTML emails to user accounts. Click any dispatch to view its visual HTML rendering.</p>
              </div>

              <div className="bg-halo-cream rounded-xl border border-halo-border overflow-hidden divide-y divide-slate-900">
                {simulatedEmails.length === 0 ? (
                  <div className="p-8 text-center text-halo-text-tertiary text-xs">
                    No emails dispatched yet. Trigger simulation or perform transactions to generate email alerts.
                  </div>
                ) : (
                  simulatedEmails.map((email) => {
                    const isSelected = selectedEmail && selectedEmail.id === email.id;
                    return (
                      <div
                        key={email.id}
                        onClick={() => setSelectedEmail(email)}
                        className={`p-4 hover:bg-halo-card/60 transition-all cursor-pointer ${
                          isSelected ? 'bg-halo-card border-l-2 border-halo-gold' : ''
                        }`}
                      >
                        <div className="flex justify-between text-[10px] font-mono text-halo-text-muted mb-1">
                          <span>{email.type.toUpperCase()}</span>
                          <span>{new Date(email.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <h4 className={`text-xs font-semibold text-halo-dark truncate ${
                          isSelected ? 'text-emerald-300' : ''
                        }`}>
                          {email.subject}
                        </h4>
                        <p className="text-[11px] text-halo-text-muted truncate mt-0.5">
                          To: {email.recipientEmail}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right side: HTML email preview */}
            <div className="lg:col-span-8">
              {!selectedEmail ? (
                <div className="bg-halo-cream rounded-2xl border border-halo-border p-12 text-center text-halo-text-tertiary flex flex-col items-center justify-center min-h-[400px]">
                  <Mail className="w-10 h-10 text-halo-dark mb-3 animate-bounce" />
                  <p className="text-sm font-semibold">Select an Email from the outbox</p>
                  <p className="text-xs text-halo-text-muted mt-1">Review the beautifully formatted transactional HTML emails sent to your registered address.</p>
                </div>
              ) : (
                <div className="bg-halo-cream rounded-2xl border border-halo-border overflow-hidden flex flex-col min-h-[400px] shadow-2xl">
                  {/* Header metadata */}
                  <div className="p-4 bg-halo-card border-b border-halo-border flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-halo-text-tertiary">Subject:</span>
                        <h3 className="text-xs font-bold text-halo-dark font-mono">{selectedEmail.subject}</h3>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono text-halo-text-muted">To:</span>
                        <span className="text-[10px] text-halo-text-tertiary font-mono">{selectedEmail.recipientEmail}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedEmail(null)}
                      className="p-1 rounded bg-halo-secondary hover:bg-halo-tertiary text-halo-text-tertiary hover:text-halo-dark"
                      title="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Sandboxed Iframe Preview */}
                  <div className="flex-1 bg-halo-card p-4">
                    <iframe
                      srcDoc={selectedEmail.bodyHtml}
                      title="HTML Email Preview"
                      className="w-full min-h-[450px] border-none bg-halo-card rounded-lg"
                      sandbox="allow-same-origin"
                    />
                  </div>

                  {/* Email footer actions */}
                  <div className="p-3 bg-halo-card/60 border-t border-halo-border/80 px-4 text-center">
                    <span className="text-[10px] text-halo-text-muted font-mono">
                      ✉️ Simulated SMTP Clear • Delivery Type: HTML-v2 RFC-822 Compliance
                    </span>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 3: ACHIEVEMENTS & BADGES */}
        {activeSubTab === 'achievements' && (
          <div className="space-y-6">
            
            {/* Quick Summary stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-halo-card/40 p-5 rounded-xl border border-halo-border/80">
                <span className="text-xs font-mono text-halo-text-tertiary block uppercase">Achievements Claimed</span>
                <p className="text-2xl font-bold text-halo-dark mt-1">
                  {achievements.filter(a => a.unlockedAt).length} <span className="text-halo-text-muted text-sm">/ {achievements.length}</span>
                </p>
                <div className="w-full bg-halo-secondary h-1.5 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="bg-halo-gold h-full rounded-full transition-all duration-500" 
                    style={{ width: `${(achievements.filter(a => a.unlockedAt).length / Math.max(1, achievements.length)) * 100}%` }}
                  />
                </div>
              </div>

              <div className="bg-halo-card/40 p-5 rounded-xl border border-halo-border/80">
                <span className="text-xs font-mono text-halo-text-tertiary block uppercase">Active Savings Streak</span>
                <p className="text-2xl font-bold text-amber-400 mt-1 flex items-center gap-1">
                  <Flame className="w-5 h-5 text-amber-500 fill-amber-500/20" />
                  {user?.savingsStreakDays || 0} <span className="text-halo-text-muted text-xs font-mono lowercase">days</span>
                </p>
                <p className="text-[10px] text-halo-text-muted mt-2">Streak increments with daily deposits and contract locks.</p>
              </div>

              <div className="bg-halo-card/40 p-5 rounded-xl border border-halo-border/80">
                <span className="text-xs font-mono text-halo-text-tertiary block uppercase">Discipline Level</span>
                <p className="text-2xl font-bold text-indigo-400 mt-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  Level {Math.floor((user?.savingsStreakDays || 0) / 7) + 1}
                </p>
                <p className="text-[10px] text-halo-text-muted mt-2">Unlock Gold/Platinum badges by compounding over 30 days.</p>
              </div>
            </div>

            {/* Achievements Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {achievements.map((ach) => {
                const IconComponent = getBadgeIcon(ach.badgeIcon);
                const styles = getDifficultyStyles(ach.difficulty);
                const isUnlocked = !!ach.unlockedAt;

                return (
                  <div
                    key={ach.id}
                    className={`relative p-6 rounded-2xl border transition-all duration-300 overflow-hidden ${
                      isUnlocked 
                        ? `${styles.bg} ${styles.border} ${styles.glow}` 
                        : 'bg-halo-cream border-halo-border opacity-60'
                    }`}
                  >
                    {/* Glowing Accent for Unlocked Platinum/Gold */}
                    {isUnlocked && (ach.difficulty === 'platinum' || ach.difficulty === 'gold') && (
                      <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-gradient-to-br from-halo-gold/5 to-indigo-500/10 blur-xl pointer-events-none" />
                    )}

                    <div className="flex items-start gap-4">
                      {/* Badge Icon Shield */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isUnlocked 
                          ? 'bg-halo-cream border border-halo-border shadow-md' 
                          : 'bg-halo-card/50 border border-halo-border/40'
                      }`}>
                        <IconComponent className={`w-6 h-6 ${
                          isUnlocked ? styles.text : 'text-halo-text-secondary'
                        }`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-center gap-2">
                          <h3 className={`text-sm font-bold ${
                            isUnlocked ? 'text-halo-dark' : 'text-halo-text-tertiary'
                          }`}>
                            {ach.title}
                          </h3>
                          <span className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded font-bold ${styles.badge}`}>
                            {ach.difficulty}
                          </span>
                        </div>
                        <p className="text-xs text-halo-text-tertiary leading-relaxed">
                          {ach.description}
                        </p>
                      </div>
                    </div>

                    {/* Progress tracking */}
                    <div className="mt-4 pt-4 border-t border-halo-border">
                      <div className="flex justify-between text-[10px] font-mono text-halo-text-muted mb-1.5">
                        <span>Progress</span>
                        <span>{ach.progress} / {ach.maxProgress}</span>
                      </div>
                      <div className="w-full bg-halo-card h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            isUnlocked ? 'bg-gradient-to-r from-halo-gold to-indigo-500' : 'bg-halo-secondary'
                          }`}
                          style={{ width: `${(ach.progress / ach.maxProgress) * 100}%` }}
                        />
                      </div>

                      {/* Lock/Unlock label */}
                      <div className="flex justify-between items-center mt-3 pt-1">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-halo-text-muted">Status</span>
                        {isUnlocked ? (
                          <span className="text-[10px] text-halo-gold font-semibold flex items-center gap-1 bg-halo-gold/10 px-2 py-0.5 rounded-full border border-halo-gold/20">
                            <Sparkles className="w-3 h-3 text-halo-gold" />
                            Unlocked 🎉
                          </span>
                        ) : (
                          <span className="text-[10px] text-halo-text-tertiary font-semibold flex items-center gap-1 bg-halo-card px-2 py-0.5 rounded-full border border-halo-border">
                            Locked 🔒
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

      </div>

    </div>
  );
};
