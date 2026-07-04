import { pgTable, text, timestamp, integer, boolean, numeric, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: text('id').primaryKey(), // We'll use a generated ID
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name').notNull(),
  phone: text('phone'),
  currency: text('currency').default('GHS'),
  country: text('country').default('Ghana'),
  role: text('role').default('user'), // 'user', 'admin', 'super_admin'
  avatarUrl: text('avatar_url'),
  isKycVerified: boolean('is_kyc_verified').default(false),
  kycTier: integer('kyc_tier').default(1),
  savingsStreakDays: integer('savings_streak_days').default(0),
  monthlyTarget: numeric('monthly_target').default('5000'),
  referralCode: text('referral_code'),
  referredBy: text('referred_by'),
  referralEarnings: numeric('referral_earnings').default('0'),
  referralsCount: integer('referrals_count').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const vaults = pgTable('vaults', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  description: text('description'),
  targetAmount: numeric('target_amount'),
  balance: numeric('balance').default('0').notNull(),
  currency: text('currency').default('GHS'),
  icon: text('icon').default('PiggyBank'),
  color: text('color').default('#10b981'), // halo-gold
  isInvestment: boolean('is_investment').default(false),
  apy: numeric('apy'),
  maturityDate: timestamp('maturity_date'),
  withdrawalLock: boolean('withdrawal_lock').default(false),
  status: text('status').default('active'), // 'active', 'completed', 'frozen'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const tranches = pgTable('tranches', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  vaultId: text('vault_id').notNull().references(() => vaults.id),
  amount: numeric('amount').notNull(),
  status: text('status').default('locked'), // 'locked', 'mature', 'withdrawn'
  lockedAt: timestamp('locked_at').defaultNow().notNull(),
  maturesAt: timestamp('matures_at').notNull(),
  investmentProvider: text('investment_provider'), // e.g. 'DATABANK_MFUND'
  units: numeric('units'),
  purchaseNav: numeric('purchase_nav'),
  pricingModel: text('pricing_model').default('NAV_UNIT'), // 'NAV_UNIT' | 'FIXED_INCOME'
  lockedRate: numeric('locked_rate'), // annual % locked at purchase (fixed-income only)
});

export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  vaultId: text('vault_id').references(() => vaults.id),
  trancheId: text('tranche_id').references(() => tranches.id),
  type: text('type').notNull(), // 'deposit', 'withdrawal', 'interest', 'fee'
  amount: numeric('amount').notNull(),
  currency: text('currency').default('GHS'),
  status: text('status').default('pending'), // 'pending', 'completed', 'failed'
  reference: text('reference'), // Payment gateway reference
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id), // Can be null for system actions
  action: text('action').notNull(),
  actor: text('actor').notNull(),
  details: text('details'),
  severity: text('severity').default('info'), // 'info', 'warning', 'critical'
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

export const withdrawalRequests = pgTable('withdrawal_requests', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  trancheId: text('tranche_id').notNull().references(() => tranches.id),
  vaultId: text('vault_id').notNull().references(() => vaults.id),
  amount: numeric('amount').notNull(),
  currency: text('currency').default('GHS'),
  destinationAccount: text('destination_account').notNull(),
  status: text('status').default('pending'), // 'pending', 'approved', 'rejected'
  isEarly: boolean('is_early').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const userRelations = relations(users, ({ many }) => ({
  vaults: many(vaults),
  tranches: many(tranches),
  transactions: many(transactions),
}));

export const vaultRelations = relations(vaults, ({ one, many }) => ({
  user: one(users, {
    fields: [vaults.userId],
    references: [users.id],
  }),
  tranches: many(tranches),
  transactions: many(transactions),
}));

export const trancheRelations = relations(tranches, ({ one, many }) => ({
  user: one(users, {
    fields: [tranches.userId],
    references: [users.id],
  }),
  vault: one(vaults, {
    fields: [tranches.vaultId],
    references: [vaults.id],
  }),
  transactions: many(transactions),
}));

export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').default('general').notNull(), // 'deposit', 'withdrawal', 'unlock', 'investment', 'goal', 'weekly_summary', 'monthly_summary', 'achievement', 'general'
  isRead: boolean('is_read').default(false).notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const userAchievements = pgTable('user_achievements', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  badgeCode: text('badge_code').notNull(), // e.g. 'FIRST_DEPOSIT'
  title: text('title').notNull(),
  description: text('description').notNull(),
  icon: text('icon').notNull(),
  unlockedAt: timestamp('unlocked_at').defaultNow().notNull(),
});

export const notificationRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const userAchievementRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, {
    fields: [userAchievements.userId],
    references: [users.id],
  }),
}));

export const passkeys = pgTable('passkeys', {
  id: text('id').primaryKey(), // credentialID (base64url encoded or raw string)
  userId: text('user_id').notNull().references(() => users.id),
  publicKey: text('public_key').notNull(), // Base64url encoded public key bytes or raw structure
  counter: integer('counter').default(0).notNull(),
  transports: text('transports'), // comma-separated or JSON list of transports
  name: text('name').default('Passkey').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const passkeyRelations = relations(passkeys, ({ one }) => ({
  user: one(users, {
    fields: [passkeys.userId],
    references: [users.id],
  }),
}));

// Live fund NAV data. Authoritative source for unit-purchase and payout math.
// Populated by an admin entering the published NAV (or an automated ingestion job).
// When a provider has no row here, the system falls back to the placeholder
// constants in domain/investment.ts.
export const fundProviders = pgTable('fund_providers', {
  id: text('id').primaryKey(), // e.g. 'DATABANK_MFUND'
  name: text('name').notNull(),
  currentNav: numeric('current_nav').notNull(),
  apy: numeric('apy'), // annual return percentage, e.g. 19.2
  managementFee: numeric('management_fee'),
  pricingModel: text('pricing_model').default('NAV_UNIT'), // 'NAV_UNIT' | 'FIXED_INCOME'
  accrual: text('accrual').default('simple'), // fixed-income only: 'simple' | 'compound'
  source: text('source').default('manual'), // 'manual' | 'api' | 'placeholder'
  navDate: timestamp('nav_date'), // the date the published NAV applies to
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
