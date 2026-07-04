import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, Vault, DepositTranche, Transaction, InvestmentSimulationConfig, FeatureFlags, AuditLog, ReferralStats, CurrencyCode, Notification, UserAchievement, SimulatedEmail } from '../types/index.ts';
import { ApiClient } from '../api/client.ts';
import { ActiveSession, getSimulatedSessions } from '../lib/supabase.ts';

interface ToastMessage {
  id: string;
  title: string;
  description: string;
  type: 'success' | 'error' | 'info' | 'lock';
}

interface AppContextType {
  activeTab: 'dashboard' | 'vaults' | 'transactions' | 'coach' | 'admin' | 'profile' | 'notifications' | 'referrals' | 'wealth';
  setActiveTab: (tab: 'dashboard' | 'vaults' | 'transactions' | 'coach' | 'admin' | 'profile' | 'notifications' | 'referrals' | 'wealth') => void;
  user: UserProfile | null;
  vaults: Vault[];
  tranches: DepositTranche[];
  transactions: Transaction[];
  simulation: InvestmentSimulationConfig | null;
  featureFlags: FeatureFlags | null;
  auditLogs: AuditLog[];
  referrals: ReferralStats | null;
  notifications: Notification[];
  achievements: UserAchievement[];
  simulatedEmails: SimulatedEmail[];
  unreadCount: number;
  summary: {
    totalDeposited: number;
    totalCurrentValue: number;
    totalProfit: number;
    lockedBalance: number;
    availableBalance: number;
  };
  isLoading: boolean;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  // Modals state
  isDepositModalOpen: boolean;
  setIsDepositModalOpen: (open: boolean, preselectedVaultId?: string) => void;
  preselectedVaultId?: string;
  isWithdrawModalOpen: boolean;
  setIsWithdrawModalOpen: (open: boolean) => void;
  isCreateVaultModalOpen: boolean;
  setIsCreateVaultModalOpen: (open: boolean) => void;
  // Actions
  refreshState: () => Promise<void>;
  createVault: (vaultData: { name: string; color: string; icon: string; targetAmount: number; targetDate: string; defaultLockPeriod: number }) => Promise<void>;
  processDeposit: (data: { vaultId: string; amount: number; currency: CurrencyCode; lockDays: number; paymentMethod: string }) => Promise<{ success: boolean; transaction: Transaction }>;
  processWithdraw: (trancheId: string, destinationAccount: string, amount?: number, isEmergency?: boolean) => Promise<{ success?: boolean; error?: string; message?: string; payoutAmount?: number; pendingApproval?: boolean }>;
  updateAdminSettings: (data: { flags?: Partial<FeatureFlags>; simulation?: Partial<InvestmentSimulationConfig>; profile?: Partial<UserProfile> }) => Promise<void>;
  askAICoach: (question: string) => Promise<string>;
  // Notifications & Achievements Actions
  refreshNotifications: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  simulateWeekly: () => Promise<void>;
  simulateMonthly: () => Promise<void>;
  // Toasts
  toasts: ToastMessage[];
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  login: (email: string, password: string) => Promise<boolean>;
  passkeyLogin: (email: string) => Promise<boolean>;
  register: (data: { fullName: string; email: string; phone: string; country: string; password?: string; referredBy?: string }) => Promise<boolean>;
  googleLogin: (email: string, fullName: string, googleId: string, avatarUrl?: string) => Promise<boolean>;
  forgotPassword: (email: string) => Promise<boolean>;
  verifyEmail: () => Promise<boolean>;
  sessions: ActiveSession[];
  fetchSessions: () => Promise<void>;
  revokeSession: (id: string) => Promise<void>;
  updateUserRole: (targetUserId: string, newRole: 'user' | 'admin' | 'super_admin') => Promise<boolean>;
  logout: () => void;
  // Super Admin Extensions
  adminUsers: UserProfile[];
  adminWithdrawals: any[];
  adminTransactions: Transaction[];
  adminVaults: any[];
  adminTranches: any[];
  fetchAdminData: () => Promise<void>;
  confirmUser: (id: string) => Promise<boolean>;
  approveWithdrawal: (id: string) => Promise<boolean>;
  rejectWithdrawal: (id: string) => Promise<boolean>;
  broadcastNotification: (title: string, message: string, type: string) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  updateProfile: (data: Partial<UserProfile>) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'vaults' | 'transactions' | 'coach' | 'admin' | 'profile' | 'notifications' | 'referrals' | 'wealth'>('dashboard');
  const [userId, setUserIdState] = useState<string | null>(localStorage.getItem('halosave_user_id'));
  const [token, setTokenState] = useState<string | null>(localStorage.getItem('halosave_token'));
  const [user, setUser] = useState<UserProfile | null>(null);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [simulatedEmails, setSimulatedEmails] = useState<SimulatedEmail[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const setUserId = useCallback((id: string | null, newToken?: string) => {
    if (id) {
      localStorage.setItem('halosave_user_id', id);
      if (newToken) {
        localStorage.setItem('halosave_token', newToken);
        setTokenState(newToken);
      }
    } else {
      localStorage.removeItem('halosave_user_id');
      localStorage.removeItem('halosave_token');
      setTokenState(null);
    }
    setUserIdState(id);
  }, []);

  const getHeaders = useCallback(() => {
    return {
      'Content-Type': 'application/json',
      'x-user-id': userId || '',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }, [userId, token]);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [tranches, setTranches] = useState<DepositTranche[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [simulation, setSimulation] = useState<InvestmentSimulationConfig | null>(null);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [referrals, setReferrals] = useState<ReferralStats | null>(null);
  const [summary, setSummary] = useState({
    totalDeposited: 0,
    totalCurrentValue: 0,
    totalProfit: 0,
    lockedBalance: 0,
    availableBalance: 0,
  });
  const [adminUsers, setAdminUsers] = useState<UserProfile[]>([]);
  const [adminWithdrawals, setAdminWithdrawals] = useState<any[]>([]);
  const [adminTransactions, setAdminTransactions] = useState<Transaction[]>([]);
  const [adminVaults, setAdminVaults] = useState<any[]>([]);
  const [adminTranches, setAdminTranches] = useState<any[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('halo_theme');
    if (saved !== null) {
      return saved === 'dark';
    }
    return true; // Default to dark mode
  });

  // Modals
  const [isDepositModalOpen, setDepositModalOpen] = useState(false);
  const [preselectedVaultId, setPreselectedVaultId] = useState<string | undefined>(undefined);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isCreateVaultModalOpen, setIsCreateVaultModalOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const setIsDepositModalOpen = useCallback((open: boolean, vId?: string) => {
    setPreselectedVaultId(vId);
    setDepositModalOpen(open);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('halo_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('halo_theme', 'light');
    }
  }, [isDarkMode]);

  const refreshNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const [notifsRes, achsRes, emailsRes] = await Promise.all([
        ApiClient.getNotifications(),
        ApiClient.getAchievements(),
        ApiClient.getSimulatedEmails()
      ]);
      setNotifications(notifsRes.notifications || []);
      setAchievements(achsRes.achievements || []);
      setSimulatedEmails(emailsRes.emails || []);
      
      const unread = (notifsRes.notifications || []).filter((n: any) => !n.isRead).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error('Failed to fetch notifications/achievements:', err);
    }
  }, [userId]);

  const markNotificationAsRead = async (id: string) => {
    try {
      await ApiClient.markNotificationAsRead(id);
      await refreshNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await ApiClient.markAllNotificationsAsRead();
      await refreshNotifications();
      showToast({ title: 'Inbox Cleared 🧹', description: 'All notifications marked as read.', type: 'info' });
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await ApiClient.deleteNotification(id);
      await refreshNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const simulateWeekly = async () => {
    try {
      await ApiClient.simulateWeekly();
      await refreshNotifications();
      showToast({ title: 'Weekly Digest Simulated 📧', description: 'A beautiful performance overview was delivered to your notifications.', type: 'success' });
    } catch (err) {
      console.error(err);
    }
  };

  const simulateMonthly = async () => {
    try {
      await ApiClient.simulateMonthly();
      await refreshNotifications();
      showToast({ title: 'Monthly Report Simulated 📈', description: 'A detailed financial summary was processed and dispatched.', type: 'success' });
    } catch (err) {
      console.error(err);
    }
  };

  const refreshState = useCallback(async () => {
    if (!userId) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const data = await ApiClient.getState();
      setUser(data.userProfile);
      setVaults(data.vaults);
      setTranches(data.depositTranches);
      setTransactions(data.transactions);
      setSimulation(data.simulationConfig);
      setFeatureFlags(data.featureFlags);
      setAuditLogs(data.auditLogs);
      setReferrals(data.referralStats);
      setSummary(data.summary);
      await refreshNotifications();
    } catch (err: any) {
      if (err.status === 401) {
        setUserId(null);
        setUser(null);
      }
      console.error('Failed to fetch HaloSave API state:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, setUserId, refreshNotifications]);

  useEffect(() => {
    refreshState();
    // Refresh ticker every 15 seconds to show live NAV compounding
    const interval = setInterval(() => {
      refreshState();
    }, 15000);
    return () => clearInterval(interval);
  }, [refreshState]);

  const createVault = async (vaultData: any) => {
    try {
      if (!navigator.onLine) {
        const newVaultId = `vault_${Date.now()}`;
        const simulatedVault: Vault = {
          id: newVaultId,
          name: vaultData.name,
          color: 'emerald',
          icon: 'Vault',
          targetAmount: Number(vaultData.targetAmount) || 1000,
          currentAmount: 0,
          targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          description: vaultData.description,
          defaultLockPeriod: 30,
          investmentStrategy: 'conservative',
          createdAt: new Date().toISOString()
        };
        
        // Optimistically add to state
        setVaults(prev => [...prev, simulatedVault]);

        // Add to offline queue
        const newRequest = {
          id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'create_vault',
          data: vaultData,
          timestamp: Date.now()
        };
        const savedQueue = localStorage.getItem('halosave_offline_queue');
        const queue = savedQueue ? JSON.parse(savedQueue) : [];
        queue.push(newRequest);
        localStorage.setItem('halosave_offline_queue', JSON.stringify(queue));

        showToast({ 
          title: 'Vault Created Offline 🛡️', 
          description: `"${vaultData.name}" vault created in secure local database sandbox. Will sync when online.`, 
          type: 'success' 
        });
        return;
      }
      await ApiClient.createVault(vaultData);
      await refreshState();
      showToast({ title: 'Vault Created 🛡️', description: `Successfully created "${vaultData.name}" vault.`, type: 'success' });
    } catch (err) {
      showToast({ title: 'Error', description: 'Failed to create vault.', type: 'error' });
    }
  };

  const processDeposit = async (data: any) => {
    try {
      if (!navigator.onLine) {
        const amt = Number(data.amount);
        const newTrancheId = `tranche_${Date.now()}`;
        const targetVault = vaults.find(v => v.id === data.vaultId);
        const vName = targetVault ? targetVault.name : 'Savings Vault';
        
        // Optimistic Tranche Update
        const simulatedTranche: DepositTranche = {
          id: newTrancheId,
          userId: userId || 'user_1',
          vaultId: data.vaultId,
          vaultName: vName,
          amount: amt,
          currency: data.currency || 'GHS',
          depositedAt: new Date().toISOString(),
          unlockDate: new Date(Date.now() + (Number(data.lockDays || 30) * 24 * 60 * 60 * 1000)).toISOString(),
          status: 'locked',
          investmentUnits: amt,
          purchaseNAV: 1.0,
          currentValuation: amt,
          profitEarned: 0
        };
        setTranches(prev => [...prev, simulatedTranche]);

        // Optimistic Transaction Update
        const simulatedTransaction: Transaction = {
          id: `tx_${Date.now()}`,
          userId: userId || 'user_1',
          vaultId: data.vaultId,
          vaultName: vName,
          type: 'deposit',
          amount: amt,
          currency: data.currency || 'GHS',
          status: 'successful',
          reference: `offline-paystack-${Date.now()}`,
          paymentMethod: 'mobile_money',
          timestamp: new Date().toISOString()
        };
        setTransactions(prev => [simulatedTransaction, ...prev]);

        // Optimistic Summary Update
        setSummary(prev => ({
          ...prev,
          totalDeposited: prev.totalDeposited + amt,
          totalCurrentValue: prev.totalCurrentValue + amt,
          lockedBalance: prev.lockedBalance + amt
        }));

        // Add to offline queue
        const newRequest = {
          id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'deposit',
          data: data,
          timestamp: Date.now()
        };
        const savedQueue = localStorage.getItem('halosave_offline_queue');
        const queue = savedQueue ? JSON.parse(savedQueue) : [];
        queue.push(newRequest);
        localStorage.setItem('halosave_offline_queue', JSON.stringify(queue));

        showToast({
          title: 'Offline Deposit Queued 🔒📥',
          description: `GH₵${data.amount} queued in secure local storage. Will lock & invest when online.`,
          type: 'success',
        });
        return { success: true, transaction: simulatedTransaction } as any;
      }

      const result = await ApiClient.processDeposit(data);
      await refreshState();
      showToast({
        title: 'Deposit Locked & Invested 🔒🚀',
        description: `GH₵${data.amount} deposited via Paystack. Allocated Databank MFund units.`,
        type: 'success',
      });
      return result;
    } catch (err) {
      showToast({ title: 'Payment Error', description: 'Deposit verification failed.', type: 'error' });
      return null;
    }
  };

  const processWithdraw = async (trancheId: string, destinationAccount: string, amount?: number, isEmergency?: boolean) => {
    try {
      const result = await ApiClient.processWithdraw({ trancheId, destinationAccount, amount, isEmergency });
      await refreshState();
      if (isEmergency) {
        showToast({
          title: '🚨 Emergency Liquidated',
          description: `Bypassed early lock with a 2.5% penalty. Paid out GH₵${result.payoutAmount}.`,
          type: 'warning',
        });
      } else if (result.pendingApproval) {
        showToast({
          title: '🔒 Exception Request Queued',
          description: `Early lock exception queued for regulatory Super Admin approval.`,
          type: 'warning',
        });
      } else {
        showToast({
          title: 'Matured Payout Successful 💰',
          description: `Paid out GH₵${result.payoutAmount} to ${destinationAccount}.`,
          type: 'success',
        });
      }
      return result;
    } catch (err: any) {
      showToast({
        title: '🔒 Withdrawal Strictly Locked',
        description: err.message || 'Early withdrawal is blocked by HaloSave discipline rules.',
        type: 'lock',
      });
      return { success: false, message: err.message || 'Early withdrawal is blocked' };
    }
  };

  const updateAdminSettings = async (data: any) => {
    try {
      await ApiClient.updateSettings(data);
      await refreshState();
      showToast({ title: 'Admin Updated', description: 'Platform configuration saved.', type: 'info' });
    } catch (err) {
      showToast({ title: 'Error', description: 'Failed to update settings.', type: 'error' });
    }
  };

  const askAICoach = async (question: string) => {
    try {
      const data = await ApiClient.askCoach(question);
      return data.answer || data;
    } catch (err) {
      return 'Sorry, I am currently offline.';
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const data = await ApiClient.login({ email, password });
      setUserId(data.userId, data.token);
      setUser(data.userProfile);
      showToast({ title: 'Welcome Back! 👋', description: `Successfully logged in as ${data.userProfile.fullName}.`, type: 'success' });
      await fetchSessions();
      return true;
    } catch (err: any) {
      showToast({ title: 'Login Failed', description: err.message || 'Invalid email or password.', type: 'error' });
      return false;
    }
  };

  const passkeyLogin = async (email: string): Promise<boolean> => {
    try {
      // 1. Get WebAuthn options
      const { options } = await ApiClient.getWebAuthnLoginOptions(email);

      // 2. Start authentication via browser's credentials API
      const { startAuthentication } = await import('@simplewebauthn/browser');
      const assertionResponse = await startAuthentication({ optionsJSON: options });

      // 3. Verify assertion with server
      const data = await ApiClient.verifyWebAuthnLogin(assertionResponse);

      if (data.success && data.verified) {
        setUserId(data.userProfile.id, data.token);
        setUser(data.userProfile);
        showToast({ title: 'Welcome Back! 👋', description: `Successfully authenticated using passkey as ${data.userProfile.fullName}.`, type: 'success' });
        await fetchSessions();
        return true;
      } else {
        showToast({ title: 'Authentication Failed', description: data.error || 'Passkey verification failed.', type: 'error' });
        return false;
      }
    } catch (err: any) {
      console.error('Passkey login error:', err);
      showToast({ title: 'Passkey Auth Cancelled', description: err.message || 'Passkey login cancelled or failed.', type: 'error' });
      return false;
    }
  };

  const googleLogin = async (email: string, fullName: string, googleId: string, avatarUrl?: string): Promise<boolean> => {
    try {
      const data = await ApiClient.googleLogin({ email, fullName, googleId, avatarUrl });
      setUserId(data.userId, data.token);
      setUser(data.userProfile);
      showToast({ title: 'Google Login Success 🌐', description: `Signed in as ${data.userProfile.fullName}.`, type: 'success' });
      await fetchSessions();
      return true;
    } catch (err: any) {
      showToast({ title: 'Google Login Failed', description: err.message || 'OAuth interaction failed.', type: 'error' });
      return false;
    }
  };

  const forgotPassword = async (email: string): Promise<boolean> => {
    try {
      const res = await ApiClient.forgotPassword(email);
      showToast({ title: 'Reset Link Dispatched 📧', description: res.message || 'Check your inbox for password reset instructions.', type: 'success' });
      return true;
    } catch (err: any) {
      showToast({ title: 'Failed to Dispatch Reset', description: err.message || 'Account not found.', type: 'error' });
      return false;
    }
  };

  const verifyEmail = async (): Promise<boolean> => {
    try {
      await ApiClient.verifyEmail();
      showToast({ title: 'Email Verified! ✅', description: 'Your email has been authenticated.', type: 'success' });
      await refreshState();
      return true;
    } catch (err: any) {
      showToast({ title: 'Verification Failed', description: err.message || 'Invalid or expired token.', type: 'error' });
      return false;
    }
  };

  const fetchSessions = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await ApiClient.getSessions();
      setSessions(res.sessions || []);
    } catch (err) {
      setSessions(getSimulatedSessions());
    }
  }, [userId]);

  const revokeSession = async (id: string) => {
    try {
      const res = await ApiClient.revokeSession(id);
      setSessions(res.sessions || []);
      showToast({ title: 'Session Terminated 🔒', description: 'Target browser/device session has been successfully revoked.', type: 'info' });
      if (id === 'sess_current') {
        logout();
      }
    } catch (err) {
      showToast({ title: 'Revocation Failed', description: 'Could not terminate the selected session.', type: 'error' });
    }
  };

  const updateUserRole = async (targetUserId: string, newRole: 'user' | 'admin' | 'super_admin'): Promise<boolean> => {
    try {
      await ApiClient.updateUserRole(targetUserId, newRole);
      showToast({ title: 'Role Updated 🛡️', description: `Target user security level updated to ${newRole}.`, type: 'success' });
      if (targetUserId === userId && user) {
        setUser({ ...user, role: newRole });
      }
      await fetchAdminData();
      return true;
    } catch (err: any) {
      showToast({ title: 'Role Update Failed', description: err.message || 'Forbidden.', type: 'error' });
      return false;
    }
  };

  const register = async (regData: { fullName: string; email: string; phone: string; country: string; password?: string; referredBy?: string }): Promise<boolean> => {
    try {
      const data = await ApiClient.register(regData);
      setUserId(data.userId, data.token);
      setUser(data.userProfile);
      showToast({ title: 'Account Created! 🎉', description: `Welcome to HaloSave, ${regData.fullName}!`, type: 'success' });
      await fetchSessions();
      return true;
    } catch (err: any) {
      showToast({ title: 'Registration Failed', description: err.message || 'Could not complete signup.', type: 'error' });
      return false;
    }
  };

  const logout = () => {
    setUserId(null);
    setUser(null);
    setSessions([]);
    showToast({ title: 'Logged Out', description: 'Session cleared securely.', type: 'info' });
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    try {
      await ApiClient.changePassword(currentPassword, newPassword);
      showToast({ title: 'Success 🔑', description: 'Your password has been updated securely.', type: 'success' });
      return true;
    } catch (err: any) {
      showToast({ title: 'Change Failed', description: err.message || 'Could not update password.', type: 'error' });
      return false;
    }
  };

  const updateProfile = async (data: Partial<UserProfile>): Promise<boolean> => {
    try {
      const res = await ApiClient.updateProfile(data);
      if (res.success && res.user) {
        setUser(res.user);
        showToast({ title: 'Profile Updated ✅', description: 'Your profile has been saved successfully.', type: 'success' });
        return true;
      }
      throw new Error(res.error || 'Unknown error');
    } catch (err: any) {
      showToast({ title: 'Update Failed', description: err.message || 'Could not update profile.', type: 'error' });
      return false;
    }
  };

  const fetchAdminData = useCallback(async () => {
    try {
      const [usersData, withdrawalsData, txData, vaultsData, tranchesData] = await Promise.all([
        ApiClient.getAdminUsers(),
        ApiClient.getAdminWithdrawals(),
        ApiClient.getAdminTransactions(),
        ApiClient.getAdminVaults(),
        ApiClient.getAdminTranches()
      ]);
      setAdminUsers(usersData.users || []);
      setAdminWithdrawals(withdrawalsData.requests || []);
      setAdminTransactions(txData.transactions || []);
      setAdminVaults(vaultsData.vaults || []);
      setAdminTranches(tranchesData.tranches || []);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    }
  }, [userId]);

  const confirmUser = async (id: string): Promise<boolean> => {
    try {
      await ApiClient.confirmUser(id);
      showToast({ title: 'User Confirmed 🛡️', description: 'User KYC credentials verified successfully.', type: 'success' });
      await fetchAdminData();
      await refreshState();
      return true;
    } catch (err) {
      showToast({ title: 'Error', description: 'Failed to confirm user.', type: 'error' });
      return false;
    }
  };

  const approveWithdrawal = async (id: string): Promise<boolean> => {
    try {
      await ApiClient.approveWithdrawal(id);
      showToast({ title: 'Withdrawal Approved ✅', description: 'Payout approved & processed.', type: 'success' });
      await fetchAdminData();
      await refreshState();
      return true;
    } catch (err) {
      showToast({ title: 'Error', description: 'Failed to approve withdrawal.', type: 'error' });
      return false;
    }
  };

  const rejectWithdrawal = async (id: string): Promise<boolean> => {
    try {
      await ApiClient.rejectWithdrawal(id);
      showToast({ title: 'Withdrawal Rejected ❌', description: 'Payout request declined. Lock active.', type: 'info' });
      await fetchAdminData();
      await refreshState();
      return true;
    } catch (err) {
      showToast({ title: 'Error', description: 'Failed to reject withdrawal.', type: 'error' });
      return false;
    }
  };

  const broadcastNotification = async (title: string, message: string, type: string): Promise<boolean> => {
    try {
      await ApiClient.broadcastNotification({ title, message, type });
      showToast({ title: 'Broadcast Dispatched 📢', description: `Notification sent to all registered platform users.`, type: 'success' });
      return true;
    } catch (err) {
      showToast({ title: 'Broadcast Failed', description: 'Could not distribute broadcast alert.', type: 'error' });
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        user,
        vaults,
        tranches,
        transactions,
        simulation,
        featureFlags,
        auditLogs,
        referrals,
        notifications,
        achievements,
        simulatedEmails,
        unreadCount,
        summary,
        isLoading,
        isDarkMode,
        toggleDarkMode,
        isDepositModalOpen,
        setIsDepositModalOpen,
        preselectedVaultId,
        isWithdrawModalOpen,
        setIsWithdrawModalOpen,
        isCreateVaultModalOpen,
        setIsCreateVaultModalOpen,
        refreshState,
        createVault,
        processDeposit,
        processWithdraw,
        updateAdminSettings,
        askAICoach,
        refreshNotifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteNotification,
        simulateWeekly,
        simulateMonthly,
        toasts,
        showToast,
        removeToast,
        login,
        passkeyLogin,
        register,
        logout,
        googleLogin,
        forgotPassword,
        verifyEmail,
        sessions,
        fetchSessions,
        revokeSession,
        updateUserRole,
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
        changePassword,
        updateProfile,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
