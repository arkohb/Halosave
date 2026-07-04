export type CurrencyCode = 'GHS' | 'NGN' | 'KES' | 'USD' | 'GBP';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  currency: CurrencyCode;
  monthlyTarget: number;
  defaultLockDays: number;
  preferredNotification: 'email' | 'sms' | 'push';
  avatarUrl?: string;
  createdAt: string;
  savingsStreakDays: number;
  is2FAEnabled: boolean;
  role?: 'user' | 'super_admin';
  isConfirmed?: boolean;
}

export interface Vault {
  id: string;
  name: string;
  color: string; // e.g. 'emerald', 'indigo', 'amber', 'rose', 'cyan', 'purple'
  icon: string; // lucide icon name
  targetAmount: number;
  currentAmount: number; // calculated sum of active tranches
  targetDate: string;
  description: string;
  defaultLockPeriod: number; // days
  investmentStrategy: 'conservative' | 'aggressive' | 'none';
  createdAt: string;
}

export interface DepositTranche {
  id: string;
  userId: string;
  vaultId: string; // 'general' or specific vault id
  vaultName: string;
  amount: number;
  currency: CurrencyCode;
  depositedAt: string; // ISO string
  unlockDate: string; // ISO string
  status: 'locked' | 'matured' | 'withdrawn' | 'pending_approval';
  // Investment Engine tracking
  investmentUnits: number;
  purchaseNAV: number;
  currentValuation: number;
  profitEarned: number;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'investment_purchase' | 'interest_accrual' | 'redemption';
  amount: number;
  currency: CurrencyCode;
  vaultId: string;
  vaultName: string;
  reference: string; // Paystack / System ref
  status: 'successful' | 'pending' | 'failed';
  timestamp: string;
  paymentMethod: 'paystack_card' | 'mobile_money' | 'bank_transfer' | 'system_payout';
}

export interface InvestmentSimulationConfig {
  providerName: string; // e.g. "Databank MFund"
  currentNAV: number;
  annualReturnPercentage: number; // e.g. 18.5
  dailyGrowthRate: number; // calculated
  managementFeePercentage: number; // e.g. 1.0
  compoundingFrequency: 'daily' | 'monthly' | 'annually';
  redemptionDelayHours: number;
  lastValuationDate: string;
}

export interface FeatureFlags {
  investmentEngine: boolean;
  loans: boolean;
  insurance: boolean;
  groupSavings: boolean;
  corporateSavings: boolean;
  aiCoach: boolean;
  referrals: boolean;
  treasuryBills: boolean;
}

export interface AuditLog {
  id: string;
  action: string;
  actor: string;
  details: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'security';
}

export interface ReferralStats {
  code: string;
  referralsCount: number;
  totalEarnings: number;
  milestoneLevel: number; // 1 to 5
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'deposit' | 'withdrawal' | 'unlock' | 'goal' | 'summary' | 'system';
  isRead: boolean;
  metadata?: any;
  createdAt: string;
}

export interface UserAchievement {
  id: string;
  userId: string;
  code: string;
  title: string;
  description: string;
  badgeIcon: string; // lucide icon identifier
  difficulty: 'bronze' | 'silver' | 'gold' | 'platinum';
  progress: number;
  maxProgress: number;
  unlockedAt?: string;
  createdAt: string;
}

export interface SimulatedEmail {
  id: string;
  userId: string;
  recipientEmail: string;
  subject: string;
  bodyHtml: string;
  type: string;
  sentAt: string;
}
