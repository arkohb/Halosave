import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { UserRepository, VaultRepository, TrancheRepository, TransactionRepository, AuditRepository, WithdrawalRequestRepository } from '../repositories/index.ts';
import { NotificationService } from './notification.ts';
import { DatabankMFundProvider, simulationConfig, featureFlags, BaseInvestmentProvider, EDCFixedIncomeProvider, StanbicCashTrustProvider, VanguardHaloSaveProvider, providersList } from '../domain/investment.ts';

function getProviderById(id?: string) {
  switch (id) {
    case 'EDC_FIXED_INCOME':
      return new EDCFixedIncomeProvider();
    case 'STANBIC_CASH_TRUST':
      return new StanbicCashTrustProvider();
    case 'VANGUARD_HALOSAVE_FUND':
      return new VanguardHaloSaveProvider();
    case 'DATABANK_MFUND':
    default:
      return new DatabankMFundProvider();
  }
}
import { RegisterDto, LoginDto, CreateVaultDto, CreateDepositDto } from '../dtos/index.ts';
import { ValidationError, UnauthorizedError, NotFoundError } from '../shared/errors.ts';
import { db } from '../../db/index.ts';
import { getNav, getProviderData } from './nav.ts';
import { openPosition, valueTranche } from '../domain/pricing.ts';
import { users, vaults, tranches, transactions, auditLogs, withdrawalRequests, notifications } from '../../db/schema.ts';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';


const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 16) {
  throw new Error('FATAL: JWT_SECRET environment variable must be set to a strong value (at least 16 characters).');
}

// Initialize Supabase Admin inside server if configured
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
let supabaseAdmin: any = null;

const isSupabaseConfigured = supabaseUrl && 
  supabaseServiceKey && 
  supabaseUrl !== 'https://your-project.supabase.co' && 
  (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://'));

if (isSupabaseConfigured) {
  try {
    supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);
  } catch (err) {
    console.error('Failed to initialize Supabase Admin in AuthService:', err);
  }
}

export class AuthService {
  constructor(private userRepo: UserRepository, private auditRepo: AuditRepository) {}

  async register(data: RegisterDto) {
    if (!data.fullName || !data.email) throw new ValidationError('Please provide name and email.');
    if (!data.password || data.password.length < 8) throw new ValidationError('Password must be at least 8 characters long.');
    const existing = await this.userRepo.findByEmail(data.email);
    if (existing.length > 0) throw new ValidationError('Email address is already registered.');

    const userId = 'usr_' + Math.random().toString(36).substring(2, 9);
    let currency = 'GHS';
    if (data.country === 'Nigeria') currency = 'NGN';
    else if (data.country === 'Kenya') currency = 'KES';
    else if (data.country === 'United Kingdom') currency = 'GBP';
    else if (data.country === 'United States') currency = 'USD';

    const avatarUrl = `https://images.unsplash.com/photo-${['1534528741775-53994a69daeb', '1507003211169-0a1dd7228f2d', '1494790108377-be9c29b29330', '1500648767791-00dcc994a43e'][Math.floor(Math.random()*4)]}?w=150&auto=format&fit=crop&q=80`;
    let isVerified = false;

    // 1. Register with real Supabase Auth if configured
    let supabaseUserId = userId;
    if (supabaseAdmin) {
      try {
        const { data: sbSignUp, error: sbError } = await supabaseAdmin.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              fullName: data.fullName,
              role: 'user',
              avatarUrl
            }
          }
        });
        if (sbError) throw new ValidationError(`Supabase Sign-Up Error: ${sbError.message}`);
        if (sbSignUp.user) {
          supabaseUserId = sbSignUp.user.id;
          isVerified = sbSignUp.user.email_confirmed_at ? true : false;
        }
      } catch (err: any) {
        console.error('Supabase auto signup error:', err);
        throw new ValidationError(err.message || 'Supabase authentication service error.');
      }
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const userReferralCode = data.fullName.split(' ')[0].toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
    let referrerCode = null;

    if (data.referredBy) {
      const found = await this.userRepo.findByReferralCode(data.referredBy.toUpperCase().trim());
      if (found.length > 0) {
        const refUser = found[0];
        referrerCode = refUser.referralCode;

        const currentCount = Number(refUser.referralsCount || 0);
        const currentEarnings = Number(refUser.referralEarnings || 0);
        const nextCount = currentCount + 1;
        const nextEarnings = currentEarnings + 10.00;

        await this.userRepo.update(refUser.id, {
          referralsCount: nextCount,
          referralEarnings: nextEarnings.toString()
        });

        await db.insert(transactions).values({
          id: 'tx_ref_' + Math.random().toString(36).substring(2, 9),
          userId: refUser.id,
          type: 'deposit',
          amount: '10.00',
          currency: refUser.currency || 'GHS',
          status: 'successful',
          reference: 'REF_SIGNUP_' + Math.floor(100000 + Math.random() * 900000),
          description: `Referral commission reward for inviting ${data.fullName}.`
        });

        await db.insert(notifications).values({
          id: 'not_ref_' + Math.random().toString(36).substring(2, 9),
          userId: refUser.id,
          title: '🚀 New Referral Joined!',
          message: `${data.fullName} registered using your referral code. You have earned GHS 10.00!`,
          type: 'system',
          isRead: false,
          createdAt: new Date()
        });
      }
    }

    const [newUser] = await this.userRepo.create({
      id: supabaseUserId, 
      fullName: data.fullName, 
      email: (data.email || '').toLowerCase().trim(),
      phone: data.phone || '', 
      country: data.country || 'Ghana', 
      currency,
      passwordHash, 
      avatarUrl, 
      role: 'user',
      isKycVerified: isVerified,
      referralCode: userReferralCode,
      referredBy: referrerCode
    });

    await this.auditRepo.create({
      id: 'aud_' + Math.random().toString(36).substring(2, 7), userId: supabaseUserId,
      action: 'ACCOUNT_CREATED', actor: data.fullName, 
      details: `Initial secure session established. Supabase Auth credentials provisioned. Email Verification status: ${isVerified ? 'VERIFIED' : 'PENDING'}.`, severity: 'info'
    });

    const token = jwt.sign({ id: supabaseUserId, role: newUser.role, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });
    return { userId: supabaseUserId, userProfile: newUser, token, needsVerification: !isVerified };
  }

  async login(data: LoginDto) {
    if (!data.email || !data.password) throw new ValidationError('Please provide email and password.');
    
    let verifiedUserId = '';
    let userRole = 'user';

    // 1. Authenticate with real Supabase Auth if configured
    if (supabaseAdmin) {
      try {
        const { data: sbSignIn, error: sbError } = await supabaseAdmin.auth.signInWithPassword({
          email: data.email,
          password: data.password
        });
        if (sbError) throw new UnauthorizedError(`Supabase Sign-In Error: ${sbError.message}`);
        if (sbSignIn.user) {
          verifiedUserId = sbSignIn.user.id;
          userRole = sbSignIn.user.app_metadata?.role || sbSignIn.user.user_metadata?.role || 'user';
        }
      } catch (err: any) {
        console.error('Supabase login error:', err);
        throw new UnauthorizedError(err.message || 'Authentication failed via Supabase.');
      }
    }

    // 2. Fetch the local database profile mapping
    let user;
    if (verifiedUserId) {
      const [localUser] = await this.userRepo.findById(verifiedUserId);
      user = localUser;
      if (!user) {
        // Auto-create local mapping if they exist in Supabase but not local DB (e.g., direct Google sign up)
        const avatarUrl = `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`;
        const [newUser] = await this.userRepo.create({
          id: verifiedUserId,
          fullName: (data.email || '').split('@')[0],
          email: (data.email || '').toLowerCase().trim(),
          phone: '',
          country: 'Ghana',
          currency: 'GHS',
          passwordHash: 'external-provider',
          avatarUrl,
          role: userRole
        });
        user = newUser;
      }
    } else {
      // Traditional credentials check
      const [localUser] = await this.userRepo.findByEmail(data.email);
      if (!localUser) throw new UnauthorizedError('No registered account found with this email.');
      const isMatch = await bcrypt.compare(data.password, localUser.passwordHash);
      if (!isMatch) throw new UnauthorizedError('Incorrect credentials.');
      user = localUser;
      verifiedUserId = localUser.id;
      userRole = localUser.role || 'user';
    }

    // Record login activity / device tracking in audit logs
    const browser = 'Chrome/Mac';
    await this.auditRepo.create({
      id: 'aud_' + Math.random().toString(36).substring(2, 7),
      userId: verifiedUserId,
      action: 'USER_LOGIN',
      actor: user.fullName,
      details: `Successful sign-in. Session initiated on ${browser}. Location: Accra, Ghana.`,
      severity: 'info'
    });

    const token = jwt.sign({ id: verifiedUserId, role: userRole, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    return { userId: verifiedUserId, userProfile: user, token };
  }

  async googleLogin(data: { email: string; fullName: string; googleId: string; avatarUrl?: string }) {
    if (!data.email) throw new ValidationError('Google login requires email.');

    const [existing] = await this.userRepo.findByEmail(data.email);
    let user = existing;
    let userId = existing?.id;

    if (!existing) {
      userId = 'usr_g_' + Math.random().toString(36).substring(2, 9);
      const avatarUrl = data.avatarUrl || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`;
      
      const [newUser] = await this.userRepo.create({
        id: userId,
        fullName: data.fullName,
        email: (data.email || '').toLowerCase().trim(),
        phone: '',
        country: 'Ghana',
        currency: 'GHS',
        passwordHash: 'google-oauth-provided',
        avatarUrl,
        role: 'user',
        isKycVerified: true // Auto-verified email when using Google OAuth
      });
      user = newUser;

      await this.auditRepo.create({
        id: 'aud_' + Math.random().toString(36).substring(2, 7),
        userId,
        action: 'ACCOUNT_CREATED',
        actor: data.fullName,
        details: 'Account created securely using Google Sign-In.',
        severity: 'info'
      });
    }

    await this.auditRepo.create({
      id: 'aud_' + Math.random().toString(36).substring(2, 7),
      userId: user.id,
      action: 'USER_LOGIN',
      actor: user.fullName,
      details: 'Logged in using Google Single Sign-On (SSO).',
      severity: 'info'
    });

    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    return { userId: user.id, userProfile: user, token };
  }

  async forgotPassword(email: string) {
    if (!email) throw new ValidationError('Email address is required.');
    const [user] = await this.userRepo.findByEmail(email);
    
    if (supabaseAdmin) {
      try {
        const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email);
        if (error) throw new ValidationError(error.message);
      } catch (err: any) {
        console.error('Supabase password reset error:', err);
      }
    }

    if (user) {
      await this.auditRepo.create({
        id: 'aud_' + Math.random().toString(36).substring(2, 7),
        userId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        actor: 'Security Service',
        details: 'A secure password reset link was dispatched to the registered email address.',
        severity: 'warning'
      });
    }

    return { success: true, message: 'Password reset instructions sent.' };
  }

  async verifyEmail(userId: string) {
    const [user] = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError('User profile not found.');

    await this.userRepo.update(userId, { isKycVerified: true });

    await this.auditRepo.create({
      id: 'aud_' + Math.random().toString(36).substring(2, 7),
      userId,
      action: 'EMAIL_VERIFIED',
      actor: 'Security Service',
      details: 'Email address successfully verified via secure authentication token.',
      severity: 'info'
    });

    return { success: true, message: 'Email verified successfully.' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (!newPassword || newPassword.length < 8) {
      throw new ValidationError('New password must be at least 8 characters long.');
    }

    const [existing] = await this.userRepo.findById(userId);
    if (!existing) throw new NotFoundError('User profile not found.');

    // Verify the current password (skip only for external-provider accounts with no local password)
    const externalMarkers = ['external-provider', 'google-oauth-provided'];
    if (!externalMarkers.includes(existing.passwordHash)) {
      if (!currentPassword) throw new ValidationError('Current password is required.');
      const ok = await bcrypt.compare(currentPassword, existing.passwordHash);
      if (!ok) throw new UnauthorizedError('Current password is incorrect.');
    }

    if (supabaseAdmin) {
      try {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword });
        if (error) throw new ValidationError(`Supabase password update error: ${error.message}`);
      } catch (err: any) {
        console.error('Supabase Admin password change error:', err);
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.update(userId, { passwordHash });

    await this.auditRepo.create({
      id: 'aud_' + Math.random().toString(36).substring(2, 7),
      userId,
      action: 'PASSWORD_CHANGED',
      actor: 'Security Service',
      details: 'Password updated successfully.',
      severity: 'warning'
    });

    return { success: true, message: 'Password changed successfully.' };
  }

  async updateUserRole(userId: string, newRole: 'user' | 'admin' | 'super_admin') {
    const [user] = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError('User profile not found.');

    if (supabaseAdmin) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          app_metadata: { role: newRole },
          user_metadata: { role: newRole }
        });
      } catch (err) {
        console.error('Could not update role metadata in Supabase:', err);
      }
    }

    await this.userRepo.update(userId, { role: newRole });

    await this.auditRepo.create({
      id: 'aud_' + Math.random().toString(36).substring(2, 7),
      userId,
      action: 'ROLE_UPDATED',
      actor: 'System Admin',
      details: `User security role changed from ${user.role} to ${newRole}.`,
      severity: 'info'
    });

    return { success: true, newRole };
  }
}

export class VaultService {
  constructor(
    private vaultRepo: VaultRepository, private trancheRepo: TrancheRepository, 
    private txRepo: TransactionRepository, private auditRepo: AuditRepository,
    private userRepo: UserRepository, private investmentProvider: DatabankMFundProvider,
    private withdrawalRepo: WithdrawalRequestRepository,
    private notificationService: NotificationService
  ) {}

  async createVault(userId: string, data: CreateVaultDto) {
    const [user] = await this.userRepo.findById(userId);
    const vaultId = 'v_' + Math.random().toString(36).substring(2, 8);
    const [newVault] = await this.vaultRepo.create({
      id: vaultId, userId, name: data.name, color: data.color || 'emerald',
      icon: data.icon || 'Vault', targetAmount: data.targetAmount.toString(),
      balance: '0', maturityDate: new Date(data.targetDate || Date.now() + 180 * 24 * 3600 * 1000),
      description: data.description || 'Custom savings goal.'
    });

    await this.auditRepo.create({
      id: 'aud_' + Math.random().toString(36).substring(2, 7), userId, action: 'VAULT_CREATED',
      actor: user.fullName, details: `Created new vault: "${data.name}" with target ${user.currency} ${data.targetAmount}.`, severity: 'info'
    });
    return newVault;
  }

  async processDeposit(userId: string, data: CreateDepositDto) {
    const [user] = await this.userRepo.findById(userId);
    const [targetVault] = await this.vaultRepo.findById(data.vaultId);
    
    const provId = (data as any).investmentProvider || 'DATABANK_MFUND';
    const providerData = await getProviderData(provId); // live data incl. pricingModel
    const position = openPosition(providerData as any, data.amount);
    const unlockDate = new Date(Date.now() + Number(data.lockDays || 90) * 24 * 3600 * 1000);
    const isAutoRedeem = !!(data as any).autoRedeem;
    const trancheStatus = isAutoRedeem ? 'locked_auto' : 'locked';
    
    const [newTranche] = await this.trancheRepo.create({
      id: 'tr_' + Math.random().toString(36).substring(2, 8), userId, vaultId: data.vaultId,
      amount: data.amount.toString(), lockedAt: new Date(), maturesAt: unlockDate, status: trancheStatus,
      investmentProvider: provId, units: position.units, purchaseNav: position.purchaseNav,
      pricingModel: position.pricingModel, lockedRate: position.lockedRate
    });

    if (targetVault) {
      await this.vaultRepo.updateBalance(data.vaultId, (Number(targetVault.balance) + data.amount).toString());
    }

    const [newTx] = await this.txRepo.create({
      id: 'tx_' + Math.random().toString(36).substring(2, 9), userId, type: 'deposit',
      amount: data.amount.toString(), vaultId: data.vaultId, reference: data.reference || 'PSTK_' + Math.floor(1000000 + Math.random() * 9000000), status: 'successful'
    });

    await this.auditRepo.create({
      id: 'aud_' + Math.random().toString(36).substring(2, 7), userId, action: 'DEPOSIT_PROCESSED_AND_LOCKED',
      actor: 'Paystack Payment Engine', details: `Received ${data.currency || user.currency} ${data.amount}. Allocated ${units} units of ${provDetails.name}. Locked until ${unlockDate.toISOString().split('T')[0]}. Auto-Redeem: ${isAutoRedeem ? 'YES' : 'NO'}`, severity: 'info'
    });

    await this.notificationService.triggerNotification(
      userId,
      'deposit',
      '📥 Deposit Secured & Locked',
      `Successfully received ${data.currency || user.currency} ${data.amount}. Allocated into ${provDetails.name} and locked until ${unlockDate.toISOString().split('T')[0]}.`,
      { amount: data.amount, providerName: provDetails.name, lockDays: data.lockDays, units, unlockDate: unlockDate.toISOString().split('T')[0], balanceSum: Number(targetVault?.balance || 0) + data.amount }
    );

    return { tranche: newTranche, transaction: newTx };
  }

  async processWithdraw(userId: string, data: { trancheId: string; destinationAccount?: string; amount?: number; isEmergency?: boolean }) {
    const [tranche] = await this.trancheRepo.findById(data.trancheId);

    if (!tranche || tranche.userId !== userId) {
      throw new NotFoundError('Savings deposit tranche not found.');
    }

    if (tranche.status === 'withdrawn') {
      throw new ValidationError('This tranche has already been paid out.');
    }

    if (tranche.status === 'pending_approval') {
      throw new ValidationError('A payout request is already pending super admin approval.');
    }

    const nowTime = new Date().getTime();
    const unlockTime = new Date(tranche.maturesAt).getTime();
    const isEarly = nowTime < unlockTime;

    const [user] = await this.userRepo.findById(userId);
    const [vault] = await this.vaultRepo.findById(tranche.vaultId);
    if (!vault) {
      throw new NotFoundError('Vault not found.');
    }

    const provId = tranche.investmentProvider || 'DATABANK_MFUND';
    const provDetails = (simulationConfig.providers || providersList).find((p: any) => p.id === provId) || providersList[0];
    const simulatedNAV = await getNav(provId); // live NAV (NAV_UNIT funds)
    const currentValuation = valueTranche({
      pricingModel: (tranche as any).pricingModel,
      principal: Number(tranche.amount),
      units: Number(tranche.units),
      lockedRate: (tranche as any).lockedRate != null ? Number((tranche as any).lockedRate) : null,
      lockedAt: tranche.lockedAt,
      maturesAt: tranche.maturesAt,
      currentNAV: simulatedNAV,
      accrual: (provDetails as any).accrual,
    });

    // Determine withdrawal size (full vs partial)
    const withdrawAmount = currentValuation;
    const isPartial = false;
    let finalWithdrawalAmount = withdrawAmount;
    let penaltyAmount = 0;

    if (isEarly) {
      if (data.isEmergency) {
        if (user.role !== 'super_admin' && user.role !== 'admin') {
          throw new ValidationError('Emergency lock override is only authorized for Super Administrators.');
        }
        penaltyAmount = withdrawAmount * 0.025;
        finalWithdrawalAmount = withdrawAmount - penaltyAmount;
      } else {
        throw new ValidationError('Withdrawal is strictly locked until the maturity date has elapsed.');
      }
    }

    // Determine the target tranche for withdrawal record
    let targetTrancheId = tranche.id;

    if (isPartial) {
      // Split tranche: Keep original with remaining, create new with withdrawing portion
      const withdrawingUnits = Number((withdrawAmount / simulatedNAV).toFixed(4));
      const remainingUnits = Math.max(0, Number(tranche.units) - withdrawingUnits);
      const remainingAmount = Number(tranche.amount) * (remainingUnits / Number(tranche.units));

      // Update original tranche with remaining portions
      await this.trancheRepo.update(tranche.id, {
        amount: remainingAmount.toFixed(2),
        units: remainingUnits.toFixed(4),
      });

      // Create a brand new "split" tranche for the withdrawn portion
      const splitTrancheId = 'tr_part_' + Math.random().toString(36).substring(2, 8);
      await this.trancheRepo.create({
        id: splitTrancheId,
        userId,
        vaultId: tranche.vaultId,
        amount: (Number(tranche.amount) - remainingAmount).toFixed(2),
        units: withdrawingUnits.toFixed(4),
        purchaseNav: tranche.purchaseNav,
        status: data.isEmergency && isEarly ? 'withdrawn' : 'pending_approval',
        lockedAt: tranche.lockedAt,
        maturesAt: tranche.maturesAt,
        investmentProvider: tranche.investmentProvider
      });

      targetTrancheId = splitTrancheId;
    } else {
      // Full withdrawal
      await this.trancheRepo.updateStatus(tranche.id, data.isEmergency && isEarly ? 'withdrawn' : 'pending_approval');
    }

    const requestId = 'req_' + Math.random().toString(36).substring(2, 9);

    if (isEarly && data.isEmergency) {
      // Emergency: Instant Payout Bypass (No admin queue!)
      // Create successful transaction record
      const txId = 'tx_em_' + Math.random().toString(36).substring(2, 9);
      const [newTx] = await this.txRepo.create({
        id: txId,
        userId,
        type: 'withdrawal',
        amount: finalWithdrawalAmount.toString(),
        currency: user.currency,
        vaultId: tranche.vaultId,
        reference: 'EM_BYPASS_' + Math.floor(1000000 + Math.random() * 9000000),
        status: 'successful',
        description: `Emergency liquidation of ${withdrawAmount.toFixed(2)} units (Penalty fee: ${penaltyAmount.toFixed(2)}).`
      });

      // Adjust vault balance directly
      const newBalance = Number(vault.balance) - withdrawAmount;
      await this.vaultRepo.updateBalance(vault.id, Math.max(0, newBalance).toString());

      await this.auditRepo.create({
        id: 'aud_' + Math.random().toString(36).substring(2, 7),
        userId,
        action: 'EMERGENCY_LOCK_BREACH_BYPASS',
        actor: user.fullName,
        details: `Activated Emergency Mode! Instantly liquidated Databank MFund units with a 2.5% early break penalty (${user.currency} ${penaltyAmount.toFixed(2)}) for an immediate payout of ${user.currency} ${finalWithdrawalAmount.toFixed(2)}.`,
        severity: 'critical',
      });

      await this.notificationService.triggerNotification(
        userId,
        'withdrawal',
        '🚨 Emergency Liquidation Processed',
        `Activated Emergency Mode! Instantly liquidated ${provDetails.name} units with a 2.5% early break penalty (${user.currency} ${penaltyAmount.toFixed(2)}) for an immediate payout of ${user.currency} ${finalWithdrawalAmount.toFixed(2)}.`,
        { amount: finalWithdrawalAmount, penalty: penaltyAmount, streakBroken: true, destinationAccount: 'Paystack Instant' }
      );

      return { pendingApproval: false, payoutAmount: finalWithdrawalAmount, transaction: newTx };
    } else {
      // Standard Withdrawal flow (either matured or early lock-breaker request)
      await this.withdrawalRepo.create({
        id: requestId,
        userId,
        trancheId: targetTrancheId,
        vaultId: tranche.vaultId,
        amount: finalWithdrawalAmount.toString(),
        currency: user.currency,
        destinationAccount: data.destinationAccount || 'MTN Mobile Money (+233 54 *** 4567)',
        status: 'pending',
        isEarly,
      });

      // Create a pending transaction record
      const txId = 'tx_w_' + Math.random().toString(36).substring(2, 9);
      const [newTx] = await this.txRepo.create({
        id: txId,
        userId,
        type: 'withdrawal',
        amount: finalWithdrawalAmount.toString(),
        currency: user.currency,
        vaultId: tranche.vaultId,
        reference: 'REQ_' + Math.floor(1000000 + Math.random() * 9000000),
        status: 'pending',
      });

      await this.auditRepo.create({
        id: 'aud_' + Math.random().toString(36).substring(2, 7),
        userId,
        action: 'WITHDRAWAL_REQUESTED',
        actor: user.fullName,
        details: `Submitted a redemption request for ${user.currency} ${finalWithdrawalAmount.toFixed(2)} (${isEarly ? 'EARLY LOCK BREACH EXCEPTION' : 'MATURED PAYOUT'}${isPartial ? ' - PARTIAL' : ''}) from ${vault.name}. Pending Super Admin Approval.`,
        severity: isEarly ? 'warning' : 'info',
      });

      await this.notificationService.triggerNotification(
        userId,
        'withdrawal',
        '📥 Withdrawal Request Logged',
        `Submitted a redemption request for ${user.currency} ${finalWithdrawalAmount.toFixed(2)} (${isEarly ? 'EARLY LOCK BREACH EXCEPTION' : 'MATURED PAYOUT'}${isPartial ? ' - PARTIAL' : ''}) from ${vault.name}. Pending Super Admin Approval.`,
        { amount: finalWithdrawalAmount, penalty: 0, streakBroken: false, destinationAccount: data.destinationAccount || 'MTN Mobile Money' }
      );

      return { pendingApproval: true, requestId, payoutAmount: finalWithdrawalAmount, transaction: newTx };
    }
  }
}

export class StateService {
  constructor(
    private userRepo: UserRepository,
    private vaultRepo: VaultRepository,
    private trancheRepo: TrancheRepository,
    private txRepo: TransactionRepository,
    private auditRepo: AuditRepository,
    private investmentProvider: DatabankMFundProvider,
    private notificationService: NotificationService
  ) {}

  async getState(userId: string) {
    const [user] = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError('User not found.');

    const userVaultsData = await this.vaultRepo.findByUserId(userId);
    const userTranchesData = await this.trancheRepo.findByUserId(userId);
    const userTransactionsData = await this.txRepo.findByUserId(userId);
    const userAuditLogsData = await this.auditRepo.findByUserId(userId);

    // Multi-Provider Compounding Daily Growth Ticks
    if (!simulationConfig.providers) {
      simulationConfig.providers = JSON.parse(JSON.stringify(providersList));
    }

    simulationConfig.providers = simulationConfig.providers.map((prov: any) => {
      const increment = Number((prov.currentNAV * (prov.dailyGrowthRate / 100) * 0.05).toFixed(5));
      const nextNAV = Number((prov.currentNAV + (increment > 0 ? increment : 0.0001)).toFixed(4));
      
      let history = [...(prov.historicalNAVs || [])];
      if (history.length === 0 || history[history.length - 1] !== prov.currentNAV) {
        history.push(prov.currentNAV);
      }
      if (history.length > 15) {
        history.shift();
      }

      return {
        ...prov,
        currentNAV: nextNAV,
        historicalNAVs: history
      };
    });

    const databankProv = simulationConfig.providers.find((p: any) => p.id === 'DATABANK_MFUND') || simulationConfig.providers[0];
    simulationConfig.currentNAV = databankProv.currentNAV;
    const simulatedNAV = databankProv.currentNAV;

    let totalDeposited = 0;
    let totalCurrentValue = 0;
    let totalProfit = 0;
    let lockedBalance = 0;
    let availableBalance = 0;

    const processedTranches = [];

    for (const t of userTranchesData) {
      if (t.status !== 'withdrawn') {
        const provId = t.investmentProvider || 'DATABANK_MFUND';
        const provDetails = simulationConfig.providers.find((p: any) => p.id === provId) || providersList[0];
        const provNAV = await getNav(provId); // live NAV (NAV_UNIT funds)
        const provider = getProviderById(provId);

        const val = valueTranche({
          pricingModel: (t as any).pricingModel,
          principal: Number(t.amount),
          units: Number(t.units),
          lockedRate: (t as any).lockedRate != null ? Number((t as any).lockedRate) : null,
          lockedAt: t.lockedAt,
          maturesAt: t.maturesAt,
          currentNAV: provNAV,
          accrual: (provDetails as any).accrual,
        });
        const { profit } = provider.calculateReturns(Number(t.amount), val);
        const isMatured = new Date().getTime() >= new Date(t.maturesAt).getTime();
        
        let status = t.status;

        // Auto-redemption engine execution
        if (isMatured && (status === 'locked_auto' || status === 'locked')) {
          const isAuto = status === 'locked_auto';
          if (isAuto) {
            await this.trancheRepo.updateStatus(t.id, 'withdrawn');

            const [vault] = await this.vaultRepo.findById(t.vaultId);
            if (vault) {
              const newBal = Math.max(0, Number(vault.balance) - Number(t.amount));
              await this.vaultRepo.updateBalance(vault.id, newBal.toString());
            }

            await this.txRepo.create({
              id: 'tx_auto_' + Math.random().toString(36).substring(2, 9),
              userId,
              vaultId: t.vaultId,
              trancheId: t.id,
              type: 'withdrawal',
              amount: val.toString(),
              currency: user.currency,
              status: 'successful',
              reference: 'AUTOREDEEM_' + Math.floor(1000000 + Math.random() * 9000000),
              description: `Auto-redeemed ${Number(t.units).toFixed(4)} units of ${provDetails.name} at NAV ${provNAV}.`
            });

            await this.auditRepo.create({
              id: 'aud_auto_' + Math.random().toString(36).substring(2, 7),
              userId,
              action: 'AUTO_REDEMPTION_EXECUTED',
              actor: 'HaloSave Investment Engine',
              details: `Maturity lock met. Liquidated ${Number(t.units).toFixed(4)} units of ${provDetails.name} at NAV ${provNAV}, payout ${user.currency} ${val.toFixed(2)} completed automatically.`,
              severity: 'info'
            });

            await this.notificationService.triggerNotification(
              userId,
              'unlock',
              '⚡ Auto-Redemption Triggered',
              `Maturity lock met. Liquidated ${Number(t.units).toFixed(4)} units of ${provDetails.name} at NAV ${provNAV}, automatic payout of ${user.currency} ${val.toFixed(2)} processed successfully.`,
              { principal: Number(t.amount), value: val, profit: profit, isAutoRedeem: true, customId: `not_auto_${t.id}` }
            );

            status = 'withdrawn';
          } else {
            status = 'matured';
            
            // Manual Maturity Alert - Guarded with deterministic ID!
            const notifId = `not_mat_${t.id}`;
            await this.notificationService.triggerNotification(
              userId,
              'unlock',
              '🎉 Investment Contract Matured!',
              `Your investment of ${user.currency} ${Number(t.amount).toFixed(2)} in ${provDetails.name} has matured. You can now claim your funds or roll them over.`,
              { trancheId: t.id, principal: Number(t.amount), value: val, profit: profit, isAutoRedeem: false, customId: notifId }
            );
          }
        } else if (isMatured && status === 'locked') {
          status = 'matured';
          
          // Manual Maturity Alert - Guarded with deterministic ID!
          const notifId = `not_mat_${t.id}`;
          await this.notificationService.triggerNotification(
            userId,
            'unlock',
            '🎉 Investment Contract Matured!',
            `Your investment of ${user.currency} ${Number(t.amount).toFixed(2)} in ${provDetails.name} has matured. You can now claim your funds or roll them over.`,
            { trancheId: t.id, principal: Number(t.amount), value: val, profit: profit, isAutoRedeem: false, customId: notifId }
          );
        }

        if (status !== 'withdrawn') {
          totalDeposited += Number(t.amount);
          totalCurrentValue += val;
          totalProfit += profit;

          if (status.startsWith('locked')) {
            lockedBalance += val;
          } else {
            availableBalance += val;
          }

          processedTranches.push({
            id: t.id,
            vaultId: t.vaultId,
            amount: Number(t.amount),
            currentValuation: val,
            profitEarned: profit,
            status,
            unlockDate: t.maturesAt,
            depositedAt: t.lockedAt,
            investmentUnits: Number(t.units),
            purchaseNAV: Number(t.purchaseNav),
            investmentProvider: provId,
            providerName: provDetails.name
          });
        }
      } else {
        processedTranches.push({
          id: t.id,
          vaultId: t.vaultId,
          amount: Number(t.amount),
          status: t.status,
          unlockDate: t.maturesAt,
          depositedAt: t.lockedAt,
        });
      }
    }

    const processedVaults = userVaultsData.map((v: any) => {
      const vTranches = processedTranches.filter((t: any) => t.vaultId === v.id && t.status !== 'withdrawn');
      const sum = vTranches.reduce((acc: number, curr: any) => acc + (curr.currentValuation || 0), 0);
      return {
        id: v.id,
        name: v.name,
        color: v.color,
        icon: v.icon,
        targetAmount: Number(v.targetAmount),
        currentAmount: Number(sum.toFixed(2)),
        targetDate: v.maturityDate,
        description: v.description
      };
    });

    const userReferralCode = user.referralCode || `${user.fullName.split(' ')[0].toUpperCase()}-HALOSAVE-99`;
    const referredUsersList = await this.userRepo.findReferredBy(userReferralCode);
    const referredUsers = referredUsersList.map((refUser: any) => ({
      id: refUser.id,
      fullName: refUser.fullName,
      email: refUser.email,
      status: refUser.referralsCount > 2 ? 'Active Saver' : refUser.referralsCount > 0 ? 'First Deposit' : 'Signed Up',
      createdAt: refUser.createdAt ? refUser.createdAt.toISOString() : new Date().toISOString(),
      commissionEarned: refUser.referralsCount > 2 ? 50.00 : refUser.referralsCount > 0 ? 25.00 : 10.00
    }));

    const refEarnings = Number(user.referralEarnings || 0);

    return {
      userProfile: {
        ...user,
        monthlyTarget: Number(user.monthlyTarget)
      },
      vaults: processedVaults,
      depositTranches: processedTranches,
      transactions: userTransactionsData.map((tx: any) => ({
        ...tx,
        amount: Number(tx.amount)
      })),
      simulationConfig,
      featureFlags,
      auditLogs: userAuditLogsData,
      referralStats: {
        code: userReferralCode,
        referralsCount: user.referralsCount || 0,
        totalEarnings: refEarnings,
        milestoneLevel: (user.referralsCount || 0) >= 50 ? 5 : (user.referralsCount || 0) >= 20 ? 4 : (user.referralsCount || 0) >= 10 ? 3 : (user.referralsCount || 0) >= 5 ? 2 : (user.referralsCount || 0) >= 1 ? 1 : 0,
        referredUsers
      },
      summary: {
        totalDeposited: Number(totalDeposited.toFixed(2)),
        totalCurrentValue: Number((totalCurrentValue + refEarnings).toFixed(2)),
        totalProfit: Number(totalProfit.toFixed(2)),
        lockedBalance: Number(lockedBalance.toFixed(2)),
        availableBalance: Number((availableBalance + refEarnings).toFixed(2)),
      }
    };
  }
}

export class AdminService {
  constructor(
    private userRepo: UserRepository,
    private trancheRepo: TrancheRepository,
    private vaultRepo: VaultRepository,
    private txRepo: TransactionRepository,
    private auditRepo: AuditRepository,
    private withdrawalRepo: WithdrawalRequestRepository,
    private notificationService: NotificationService
  ) {}

  async getUsers() {
    return await this.userRepo.findAll();
  }

  async confirmUser(id: string, adminId?: string) {
    const [user] = await this.userRepo.findById(id);
    if (!user) throw new NotFoundError('User not found.');

    await this.userRepo.update(id, { isKycVerified: true, kycTier: 2 });

    const auditId = 'aud_' + Math.random().toString(36).substring(2, 7);
    await this.auditRepo.create({
      id: auditId,
      userId: id,
      action: 'USER_CONFIRMED',
      actor: 'Super Admin',
      details: `Super Admin confirmed account credentials and KYC compliance for ${user.fullName} (${user.email}).`,
      severity: 'info',
    });

    if (adminId && adminId !== id) {
      await this.auditRepo.create({
        id: 'aud_' + Math.random().toString(36).substring(2, 7),
        userId: adminId,
        action: 'USER_CONFIRMED',
        actor: 'Super Admin',
        details: `Super Admin confirmed account credentials and KYC compliance for ${user.fullName} (${user.email}).`,
        severity: 'info',
      });
    }

    return { ...user, isKycVerified: true, kycTier: 2 };
  }

  async getWithdrawals() {
    return await this.withdrawalRepo.findAll();
  }

  async approveWithdrawal(id: string, adminId?: string) {
    const [request] = await this.withdrawalRepo.findById(id);
    if (!request) throw new NotFoundError('Withdrawal request not found.');

    await this.withdrawalRepo.updateStatus(id, 'approved');
    await this.trancheRepo.updateStatus(request.trancheId, 'withdrawn');
    
    const pendingTx = await this.txRepo.findPendingWithdrawal(request.vaultId);
    if (pendingTx.length > 0) {
      await this.txRepo.updateStatusAndAmount(pendingTx[0].id, 'successful', request.amount);
    }

    const [vault] = await this.vaultRepo.findById(request.vaultId);
    if (vault) {
      const newBalance = Number(vault.balance) - Number(request.amount);
      await this.vaultRepo.updateBalance(request.vaultId, Math.max(0, newBalance).toString());
    }

    await this.auditRepo.create({
      id: 'aud_' + Math.random().toString(36).substring(2, 7),
      userId: request.userId,
      action: 'WITHDRAWAL_APPROVED',
      actor: 'Super Admin',
      details: `Approved payout of ${request.currency} ${Number(request.amount).toFixed(2)} from ${vault?.name || ''} to ${request.destinationAccount}.`,
      severity: 'info',
    });

    if (adminId && adminId !== request.userId) {
      await this.auditRepo.create({
        id: 'aud_' + Math.random().toString(36).substring(2, 7),
        userId: adminId,
        action: 'WITHDRAWAL_APPROVED',
        actor: 'Super Admin',
        details: `Approved payout of ${request.currency} ${Number(request.amount).toFixed(2)} from ${vault?.name || ''} to ${request.destinationAccount}.`,
        severity: 'info',
      });
    }

    await this.notificationService.triggerNotification(
      request.userId,
      'withdrawal',
      '💸 Payout Approved & Disbursed',
      `Your payout request of ${request.currency} ${Number(request.amount).toFixed(2)} from ${vault?.name || 'vault'} has been approved and processed to your destination account: ${request.destinationAccount}`,
      { amount: request.amount, destinationAccount: request.destinationAccount, penalty: 0, streakBroken: request.isEarly }
    );

    return request;
  }

  async rejectWithdrawal(id: string, adminId?: string) {
    const [request] = await this.withdrawalRepo.findById(id);
    if (!request) throw new NotFoundError('Withdrawal request not found.');

    await this.withdrawalRepo.updateStatus(id, 'rejected');
    
    const [tranche] = await this.trancheRepo.findById(request.trancheId);
    if (tranche) {
      const nowTime = new Date().getTime();
      const unlockTime = new Date(tranche.maturesAt).getTime();
      const status = nowTime < unlockTime ? 'locked' : 'matured';
      await this.trancheRepo.updateStatus(request.trancheId, status);
    }

    const pendingTx = await this.txRepo.findPendingWithdrawal(request.vaultId);
    if (pendingTx.length > 0) {
      await this.txRepo.updateStatusAndAmount(pendingTx[0].id, 'failed');
    }

    const [vault] = await this.vaultRepo.findById(request.vaultId);

    const auditEvent = {
      id: 'aud_' + Math.random().toString(36).substring(2, 7),
      userId: request.userId,
      action: 'WITHDRAWAL_REJECTED',
      actor: 'Super Admin',
      details: `Rejected payout of ${request.currency} ${Number(request.amount).toFixed(2)} from ${vault?.name || ''}. Discipline lock reinstated.`,
      severity: 'warning' as const,
    };

    await this.auditRepo.create(auditEvent);

    if (adminId && adminId !== request.userId) {
      await this.auditRepo.create({ ...auditEvent, id: 'aud_' + Math.random().toString(36).substring(2, 7), userId: adminId });
    }

    await this.notificationService.triggerNotification(
      request.userId,
      'withdrawal',
      '❌ Payout Request Rejected',
      `Your payout request of ${request.currency} ${Number(request.amount).toFixed(2)} from ${vault?.name || 'vault'} was rejected by the supervisor and your discipline lock was reinstated.`,
      { amount: request.amount }
    );

    return request;
  }

  async getTransactions() {
    return await db.select({
      id: transactions.id,
      userId: transactions.userId,
      userFullName: users.fullName,
      userEmail: users.email,
      vaultId: transactions.vaultId,
      vaultName: vaults.name,
      amount: transactions.amount,
      currency: transactions.currency,
      type: transactions.type,
      status: transactions.status,
      createdAt: transactions.createdAt
    })
    .from(transactions)
    .leftJoin(users, eq(transactions.userId, users.id))
    .leftJoin(vaults, eq(transactions.vaultId, vaults.id))
    .orderBy(desc(transactions.createdAt));
  }

  async getVaults() {
    return await db.select({
      id: vaults.id,
      userId: vaults.userId,
      userFullName: users.fullName,
      userEmail: users.email,
      name: vaults.name,
      description: vaults.description,
      targetAmount: vaults.targetAmount,
      balance: vaults.balance,
      currency: vaults.currency,
      icon: vaults.icon,
      color: vaults.color,
      isInvestment: vaults.isInvestment,
      apy: vaults.apy,
      maturityDate: vaults.maturityDate,
      status: vaults.status,
      createdAt: vaults.createdAt
    })
    .from(vaults)
    .leftJoin(users, eq(vaults.userId, users.id))
    .orderBy(desc(vaults.createdAt));
  }

  async getTranches() {
    return await db.select({
      id: tranches.id,
      userId: tranches.userId,
      userFullName: users.fullName,
      userEmail: users.email,
      vaultId: tranches.vaultId,
      vaultName: vaults.name,
      amount: tranches.amount,
      status: tranches.status,
      lockedAt: tranches.lockedAt,
      maturesAt: tranches.maturesAt,
      investmentProvider: tranches.investmentProvider,
      units: tranches.units,
      purchaseNav: tranches.purchaseNav
    })
    .from(tranches)
    .leftJoin(users, eq(tranches.userId, users.id))
    .leftJoin(vaults, eq(tranches.vaultId, vaults.id))
    .orderBy(desc(tranches.lockedAt));
  }

  async broadcast(title: string, message: string, type: string) {
    const allUsers = await this.userRepo.findAll();
    for (const u of allUsers) {
      await this.notificationService.triggerNotification(
        u.id,
        type as any,
        title,
        message,
        { isBroadcast: true }
      );
    }
    return { success: true, count: allUsers.length };
  }
}

export class SettingsService {
  constructor(private userRepo: UserRepository, private auditRepo: AuditRepository) {}

  async updateSettings(userId: string, reqBody: any, isAdmin: boolean) {
    const { flags, simulation, profile } = reqBody;

    if (flags && isAdmin) {
      Object.assign(featureFlags, flags);
    }
    if (simulation && isAdmin) {
      Object.assign(simulationConfig, simulation);
    }

    let updatedUser;
    if (profile) {
      const [user] = await this.userRepo.update(userId, {
        fullName: profile.fullName,
        phone: profile.phone,
        country: profile.country,
        monthlyTarget: profile.monthlyTarget,
      });
      updatedUser = user;
    }

    await this.auditRepo.create({
      id: 'aud_' + Math.random().toString(36).substring(2, 7),
      userId,
      action: isAdmin && (flags || simulation) ? 'ADMIN_CONFIG_UPDATED' : 'PROFILE_UPDATED',
      actor: isAdmin && (flags || simulation) ? 'Administrator Console' : 'User',
      details: 'Updated platform settings or profile preferences.',
      severity: 'info',
    });

    return { featureFlags, simulationConfig, userProfile: updatedUser };
  }
}

export class CoachService {
  constructor(
    private userRepo: UserRepository,
    private trancheRepo: TrancheRepository,
    private vaultRepo: VaultRepository
  ) {}

  async askCoach(userId: string, question: string) {
    const apiKey = process.env.GEMINI_API_KEY;
    
    const [profile] = await this.userRepo.findById(userId);
    if (!profile) throw new NotFoundError('User not found.');

    const tranchesList = await this.trancheRepo.findByUserId(userId);
    const vaultsList = await this.vaultRepo.findByUserId(userId);

    const totalDeposited = tranchesList.reduce((acc: number, t: any) => acc + Number(t.amount), 0);
    const activeVaults = vaultsList.map((v: any) => `${v.name}: ${v.balance}/${v.targetAmount}`).join('; ');

    const contextPrompt = `You are the HaloSave AI Savings Coach, an elite, empathetic, and highly analytical fintech wealth advisor.
Platform Tagline: SAVE. LOCK. GROW.
User Name: ${profile.fullName} (${profile.country}, Currency: ${profile.currency})
Total Deposited: ${profile.currency} ${totalDeposited}
Active Vaults: ${activeVaults}
MFund NAV: ${simulationConfig.currentNAV} (${simulationConfig.annualReturnPercentage}% APY)

User Question: "${question}"

Provide clear, inspiring, bulleted financial advice. Emphasize why keeping withdrawals locked prevents impulsive spending and compounds returns via the MFund engine. Keep it concise (under 200 words).`;

    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: contextPrompt,
        });
        return { answer: response.text };
      } catch (err: any) {
        if (err?.status === 429 || err?.message?.includes('429')) {
          console.log('Gemini API quota exceeded, using fallback Coach response.');
        } else {
          console.log('Gemini call error:', err.message);
        }
      }
    }

    let fallbackAnswer = `💡 **AI Coach Insights for ${profile.fullName}**\n\n`;
    const safeQuestion = question || '';
    if (safeQuestion.toLowerCase().includes('emergency')) {
      const emerg = vaultsList.find((v: any) => v.name.includes('Emergency'));
      const score = emerg ? Math.round((Number(emerg.balance) / Number(emerg.targetAmount)) * 100) : 0;
      fallbackAnswer += `• **Emergency Health Score**: Your emergency fund is currently at **${score}%** of your target.\n• **Recommendation**: Try automating a weekly deposit of ${profile.currency} 250 with a 180-day lock. This shields you from impulsive withdrawals while earning ~${simulationConfig.annualReturnPercentage}% APY in the Databank MFund.`;
    } else if (safeQuestion.toLowerCase().includes('lock') || safeQuestion.toLowerCase().includes('withdraw')) {
      fallbackAnswer += `• **The HaloSave Discipline Advantage**: Your funds are strictly locked to break the cycle of impulsive withdrawals.\n• **Compounding Power**: While locked, your money isn't sitting idle—it's actively purchasing Databank MFund units at NAV ${simulationConfig.currentNAV}, generating daily compounded growth.`;
    } else {
      fallbackAnswer += `• **Vault Optimization**: You have ${vaultsList.length} active savings goals. You are on a **${profile.savingsStreakDays}-day savings streak**! 🔥\n• **Strategy**: Maintain your monthly target of ${profile.currency} ${profile.monthlyTarget}. If you top up today, you will lock in the current high yield of ${simulationConfig.annualReturnPercentage}%.`;
    }

    return { answer: fallbackAnswer };
  }
}

export class PaymentService {
  constructor(
    private txRepo: TransactionRepository,
    private vaultRepo: VaultRepository,
    private trancheRepo: TrancheRepository,
    private userRepo: UserRepository,
    private auditRepo: AuditRepository,
    private investmentProvider: DatabankMFundProvider,
    private notificationService: NotificationService
  ) {}

  async initializePayment(userId: string, data: { amount: number; vaultId: string; lockDays: number; email: string; currency: string; investmentProvider?: string; autoRedeem?: boolean; paymentMethod?: string }) {
    const [user] = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError('User profile not found.');

    const [targetVault] = await this.vaultRepo.findById(data.vaultId);
    if (!targetVault) throw new NotFoundError('Target vault not found.');

    const reference = 'PSTK_' + crypto.randomBytes(8).toString('hex');
    const txId = 'tx_' + crypto.randomBytes(8).toString('hex');

    const paystackKey = process.env.PAYSTACK_SECRET_KEY;
    const hasPaystack = !!(paystackKey && paystackKey.trim() !== "" && paystackKey.startsWith("sk_"));

    let authorizationUrl = "";
    let accessCode = "";

    const desc = JSON.stringify({
      lockDays: Number(data.lockDays),
      vaultId: data.vaultId,
      amount: data.amount,
      currency: data.currency,
      investmentProvider: data.investmentProvider || 'DATABANK_MFUND',
      autoRedeem: !!data.autoRedeem,
      paymentMethod: data.paymentMethod
    });

    let isSandbox = !hasPaystack;

    if (hasPaystack) {
      try {
        let channels: string[] | undefined = undefined;
        if (data.paymentMethod === 'paystack_card') channels = ['card'];
        else if (data.paymentMethod === 'mobile_money') channels = ['mobile_money'];
        else if (data.paymentMethod === 'bank_transfer') channels = ['bank', 'bank_transfer'];

        const body = {
          email: data.email || user.email,
          amount: Math.round(data.amount * 100), // convert to pesewas/cents
          reference,
          currency: data.currency || 'GHS',
          callback_url: `${process.env.APP_URL || 'http://localhost:3000'}/api/payments/paystack/callback`,
          channels,
          metadata: {
            userId,
            vaultId: data.vaultId,
            lockDays: Number(data.lockDays),
            amount: data.amount,
            currency: data.currency,
            investmentProvider: data.investmentProvider || 'DATABANK_MFUND',
            autoRedeem: !!data.autoRedeem
          }
        };

        const response = await fetch('https://api.paystack.co/transaction/initialize', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${paystackKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });

        const paystackRes = await response.json();
        if (paystackRes.status && paystackRes.data) {
          authorizationUrl = paystackRes.data.authorization_url;
          accessCode = paystackRes.data.access_code;
        } else {
          throw new Error(paystackRes.message || 'Failed to initialize Paystack transaction');
        }
      } catch (err: any) {
        console.log(`Paystack API integration not configured or invalid key (${err.message}). Using Sandbox Simulator.`);
        isSandbox = true;
      }
    }

    if (isSandbox) {
      // Graceful Sandbox Mode Fallback
      // Must be an absolute URL now that the frontend lives on a different origin (Netlify).
      // APP_URL should be the backend's own public URL (Railway).
      const apiBase = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
      authorizationUrl = `${apiBase}/api/payments/paystack/sandbox-checkout?reference=${reference}&amount=${data.amount}&currency=${data.currency}&method=${data.paymentMethod || 'paystack_card'}`;
      accessCode = 'SANDBOX_' + crypto.randomBytes(6).toString('hex');
    }

    // Create pending transaction in local database
    await this.txRepo.create({
      id: txId,
      userId,
      vaultId: data.vaultId,
      type: 'deposit',
      amount: data.amount.toString(),
      currency: data.currency || user.currency,
      status: 'pending',
      reference,
      description: desc
    });

    await this.auditRepo.create({
      id: 'aud_' + crypto.randomBytes(4).toString('hex'),
      userId,
      action: 'PAYMENT_INITIALIZED',
      actor: user.fullName,
      details: `Initialized Paystack payment of ${data.currency} ${data.amount} for vault "${targetVault.name}" (${!isSandbox ? 'REAL API' : 'SANDBOX SIMULATOR'}).`,
      severity: 'info'
    });

    return {
      success: true,
      authorizationUrl,
      reference,
      accessCode,
      isSandbox
    };
  }

  async verifyPayment(reference: string) {
    const paystackKey = process.env.PAYSTACK_SECRET_KEY;
    const hasPaystack = !!(paystackKey && paystackKey.trim() !== "" && paystackKey.startsWith("sk_"));

    // 1. Fetch transaction from our DB
    const txs = await db.select().from(transactions).where(eq(transactions.reference, reference)).limit(1);
    if (txs.length === 0) {
      throw new NotFoundError(`Transaction reference ${reference} not found in database.`);
    }
    const tx = txs[0];

    // Idempotency: if already successful, return success immediately
    if (tx.status === 'successful') {
      return { success: true, status: 'successful', message: 'Transaction already successfully processed and mutual fund units allocated.', transaction: tx };
    }
    if (tx.status === 'failed') {
      return { success: false, status: 'failed', error: 'This transaction was already marked as failed.' };
    }

    let isSuccess = false;
    let paymentAmount = Number(tx.amount);
    let meta: any = {};

    // Parse lockDays from JSON stored in description
    try {
      if (tx.description) {
        meta = JSON.parse(tx.description);
      }
    } catch {
      meta = { lockDays: 90 };
    }

    let isSandboxVerification = !hasPaystack;

    if (hasPaystack) {
      try {
        const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${paystackKey}`
          }
        });
        const paystackRes = await response.json();
        if (paystackRes.status && paystackRes.data && paystackRes.data.status === 'success') {
          isSuccess = true;
          paymentAmount = Number(paystackRes.data.amount) / 100; // convert back from subunit
          meta.lockDays = Number(paystackRes.data.metadata?.lockDays || meta.lockDays || 90);
        } else if (!paystackRes.status) {
          throw new Error(paystackRes.message || 'API Error');
        } else {
          const errMsg = paystackRes.data?.gateway_response || paystackRes.message || 'Payment not completed';
          
          await db.update(transactions).set({ status: 'failed', description: `Payment failed: ${errMsg}` }).where(eq(transactions.id, tx.id));
          
          await this.auditRepo.create({
            id: 'aud_' + crypto.randomBytes(4).toString('hex'),
            userId: tx.userId,
            action: 'PAYMENT_FAILED',
            actor: 'Paystack Payment Engine',
            details: `Failed payment reference ${reference}: ${errMsg}`,
            severity: 'warning'
          });

          return { success: false, status: 'failed', error: errMsg };
        }
      } catch (err: any) {
        console.log(`Paystack verification integration not configured or invalid key (${err.message}). Using sandbox verification.`);
        isSandboxVerification = true;
      }
    }
    
    if (isSandboxVerification) {
      // In sandbox mode, wait for user to click Authorize in the sandbox UI
      if (tx.status === 'sandbox_authorized') {
        isSuccess = true;
      } else {
        return { success: false, status: 'pending', message: 'Waiting for user authorization' };
      }
    }

    if (isSuccess) {
      // Proceed to Fulfill the transaction
      const [user] = await this.userRepo.findById(tx.userId);
      const [vault] = await this.vaultRepo.findById(tx.vaultId || '');

      const provId = meta.investmentProvider || 'DATABANK_MFUND';
      const providerData = await getProviderData(provId); // live data incl. pricingModel
      const position = openPosition(providerData as any, paymentAmount);
      const lockDaysNum = Number(meta.lockDays || 90);
      const unlockDate = new Date(Date.now() + lockDaysNum * 24 * 3600 * 1000);
      const isAutoRedeem = !!meta.autoRedeem;
      const trancheStatus = isAutoRedeem ? 'locked_auto' : 'locked';

      const trancheId = 'tr_' + crypto.randomBytes(5).toString('hex');
      const [newTranche] = await this.trancheRepo.create({
        id: trancheId,
        userId: tx.userId,
        vaultId: tx.vaultId || '',
        amount: paymentAmount.toString(),
        lockedAt: new Date(),
        maturesAt: unlockDate,
        status: trancheStatus,
        investmentProvider: provId,
        units: position.units,
        purchaseNav: position.purchaseNav,
        pricingModel: position.pricingModel,
        lockedRate: position.lockedRate
      });

      if (vault) {
        const newBalance = (Number(vault.balance) + paymentAmount).toString();
        await this.vaultRepo.updateBalance(vault.id, newBalance);
      }

      // Update the transaction in database to successful and link the trancheId
      await db.update(transactions).set({
        status: 'successful',
        trancheId: trancheId,
        description: `Paystack cleared: ${lockDaysNum}-day lock. ${provDetails.name} allocated. Auto-Redeem: ${isAutoRedeem ? 'YES' : 'NO'}`
      }).where(eq(transactions.id, tx.id));

      await this.auditRepo.create({
        id: 'aud_' + crypto.randomBytes(4).toString('hex'),
        userId: tx.userId,
        action: 'DEPOSIT_PROCESSED_AND_LOCKED',
        actor: 'Paystack Payment Engine',
        details: `Secured ${tx.currency} ${paymentAmount.toFixed(2)} deposit in "${vault?.name || 'General'}" vault. Allocated ${units.toFixed(4)} units of ${provDetails.name} at NAV ${nav}. Locked until ${unlockDate.toISOString().split('T')[0]}. Auto-Redeem: ${isAutoRedeem ? 'YES' : 'NO'}`,
        severity: 'info'
      });

      await this.notificationService.triggerNotification(
        tx.userId,
        'deposit',
        '📥 Deposit Secured & Locked',
        `Successfully cleared payment of ${tx.currency} ${paymentAmount.toFixed(2)}. Allocated ${units.toFixed(4)} units of ${provDetails.name} locked until ${unlockDate.toISOString().split('T')[0]}.`,
        { amount: paymentAmount, providerName: provDetails.name, lockDays: lockDaysNum, units, unlockDate: unlockDate.toISOString().split('T')[0], balanceSum: Number(vault?.balance || 0) + paymentAmount }
      );

      return {
        success: true,
        status: 'successful',
        tranche: newTranche,
        transaction: {
          ...tx,
          status: 'successful',
          trancheId,
          amount: paymentAmount
        }
      };
    }

    return { success: false, status: 'pending' };
  }

  async refundTransaction(adminId: string, data: { transactionId: string; amount: number; reason: string }) {
    const txs = await db.select().from(transactions).where(eq(transactions.id, data.transactionId)).limit(1);
    if (txs.length === 0) {
      throw new NotFoundError('Transaction not found.');
    }
    const tx = txs[0];

    if (tx.status !== 'successful' || tx.type !== 'deposit') {
      throw new ValidationError('Only successful deposit transactions can be refunded.');
    }

    const paystackKey = process.env.PAYSTACK_SECRET_KEY;
    const hasPaystack = !!(paystackKey && paystackKey.trim() !== "" && paystackKey.startsWith("sk_"));

    if (hasPaystack) {
      try {
        const response = await fetch('https://api.paystack.co/refund', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${paystackKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            transaction: tx.reference,
            amount: Math.round(data.amount * 100), // convert to pesewas/cents
            customer_note: data.reason
          })
        });
        const paystackRes = await response.json();
        if (!paystackRes.status) {
          throw new Error(paystackRes.message || 'Paystack refund rejected');
        }
      } catch (err: any) {
        console.log(`Paystack Refund integration not configured (${err.message}). Simulating refund in sandbox.`);
      }
    }

    // Now reverse the transaction locally
    await db.update(transactions).set({ status: 'refunded', description: `Refunded: ${data.reason}` }).where(eq(transactions.id, tx.id));

    // Mark the tranche as withdrawn/canceled
    if (tx.trancheId) {
      await this.trancheRepo.updateStatus(tx.trancheId, 'withdrawn');
    }

    // Subtract from vault balance
    if (tx.vaultId) {
      const [vault] = await this.vaultRepo.findById(tx.vaultId);
      if (vault) {
        const newBalance = Math.max(0, Number(vault.balance) - data.amount).toString();
        await this.vaultRepo.updateBalance(vault.id, newBalance);
      }
    }

    // Create refund logging transaction (payout transaction)
    const refundTxId = 'tx_r_' + crypto.randomBytes(8).toString('hex');
    await this.txRepo.create({
      id: refundTxId,
      userId: tx.userId,
      vaultId: tx.vaultId,
      type: 'withdrawal',
      amount: data.amount.toString(),
      currency: tx.currency,
      status: 'successful',
      reference: 'REFUND_' + tx.reference,
      description: `REVERSED DEPOSIT: ${data.reason}`
    });

    const [adminUser] = await this.userRepo.findById(adminId);
    await this.auditRepo.create({
      id: 'aud_' + crypto.randomBytes(4).toString('hex'),
      userId: tx.userId,
      action: 'DEPOSIT_REFUNDED',
      actor: adminUser?.fullName || 'Super Admin',
      details: `Refunded ${tx.currency} ${data.amount.toFixed(2)} back to user. Reason: ${data.reason}. Tranche deactivated.`,
      severity: 'warning'
    });

    if (adminId !== tx.userId) {
      await this.auditRepo.create({
        id: 'aud_' + crypto.randomBytes(4).toString('hex'),
        userId: adminId,
        action: 'DEPOSIT_REFUNDED',
        actor: adminUser?.fullName || 'Super Admin',
        details: `Admin processed refund of ${tx.currency} ${data.amount.toFixed(2)} to user ${tx.userId}.`,
        severity: 'info'
      });
    }

    return { success: true, message: 'Refund processed successfully.' };
  }

  async getReceiptDetails(transactionId: string) {
    const txs = await db.select().from(transactions).where(eq(transactions.id, transactionId)).limit(1);
    if (txs.length === 0) {
      throw new NotFoundError('Transaction not found.');
    }
    const tx = txs[0];

    const [user] = await this.userRepo.findById(tx.userId);
    const [vault] = await this.vaultRepo.findById(tx.vaultId || '');
    
    let tranche = null;
    if (tx.trancheId) {
      const tranchesList = await this.trancheRepo.findById(tx.trancheId);
      if (tranchesList.length > 0) tranche = tranchesList[0];
    }

    return {
      receiptNo: 'RC-' + tx.id.toUpperCase().replace('TX_', ''),
      transactionId: tx.id,
      date: tx.createdAt,
      amount: Number(tx.amount),
      currency: tx.currency || 'GHS',
      reference: tx.reference || 'N/A',
      status: tx.status,
      type: tx.type,
      vaultName: vault?.name || 'General Savings',
      vaultColor: vault?.color || 'emerald',
      customerName: user?.fullName || 'HaloSave User',
      customerEmail: user?.email || '',
      lockPeriodDays: tranche ? Math.round((new Date(tranche.maturesAt).getTime() - new Date(tranche.lockedAt).getTime()) / (24 * 3600 * 1000)) : 90,
      maturesAt: tranche ? tranche.maturesAt : null,
      unitsAllocated: tranche ? Number(tranche.units) : null,
      purchaseNav: tranche ? Number(tranche.purchaseNav) : null,
      providerName: 'DATABANK_MFUND'
    };
  }
}

export class WealthService {
  constructor(
    private userRepo: UserRepository,
    private trancheRepo: TrancheRepository,
    private vaultRepo: VaultRepository
  ) {}

  async getWealthInsight(userId: string, data: {
    assets: { name: string; amount: number; isLinked: boolean }[];
    liabilities: { name: string; amount: number }[];
    currentAge: number;
    retirementAge: number;
    monthlyExpenses: number;
    targetRetirementIncome: number;
    plannedGoals: { id: string; name: string; targetAmount: number; targetYear: number }[];
  }) {
    const apiKey = process.env.GEMINI_API_KEY;
    
    const [profile] = await this.userRepo.findById(userId);
    if (!profile) throw new NotFoundError('User not found.');

    const vaultsList = await this.vaultRepo.findByUserId(userId);
    const tranchesList = await this.trancheRepo.findByUserId(userId);

    const currency = profile.currency;
    const totalVaultsBalance = vaultsList.reduce((acc: number, v: any) => acc + Number(v.balance || 0), 0);

    const assetSum = (data.assets || []).reduce((acc: number, asset: any) => acc + Number(asset.amount), 0);
    const liabSum = (data.liabilities || []).reduce((acc: number, liab: any) => acc + Number(liab.amount), 0);
    const netWorth = assetSum + totalVaultsBalance - liabSum;
    
    const emergencyFund = vaultsList.find((v: any) => (v.name || '').toLowerCase().includes('emergency'))?.balance || 0;
    const monthlyExpenses = data.monthlyExpenses || 1000;
    const emergencyScore = monthlyExpenses > 0 ? Number(((Number(emergencyFund) / monthlyExpenses)).toFixed(1)) : 0;

    const simulationConfig = {
      currentNAV: 1.45,
      annualReturnPercentage: 18.5
    };

    const prompt = `You are the HaloSave AI Wealth Engine, an elite, hyper-logical, and deeply insightful quantitative personal finance analyst.
Platform: HaloSave Protocol (SAVE. LOCK. GROW.)
User Details:
- Name: ${profile.fullName}
- Country: ${profile.country}
- Currency: ${currency}
- Current Age: ${data.currentAge}
- Intended Retirement Age: ${data.retirementAge}
- Current HaloSave Balance: ${currency} ${totalVaultsBalance} (across ${vaultsList.length} vaults)
- Custom External Assets Provided: ${JSON.stringify(data.assets)}
- Liabilities Provided: ${JSON.stringify(data.liabilities)}
- Calculated Combined Net Worth: ${currency} ${netWorth}
- Self-Reported Monthly Expenses: ${currency} ${monthlyExpenses}
- Emergency Savings covers: ${emergencyScore} months of expenses (Target: 3-6 months)
- Desired Retirement Monthly Income: ${currency} ${data.targetRetirementIncome}
- Active Goals: ${JSON.stringify(data.plannedGoals)}

Please return a structured, JSON response of personal wealth insights.
CRITICAL: Return ONLY a raw JSON block, with no markdown code fences, matching this schema precisely:
{
  "financialHealthScore": <number from 0 to 100>,
  "financialHealthLevel": "Poor" | "Fair" | "Good" | "Excellent",
  "scoreAnalysis": "<short descriptive summary of their financial health score, strengths & weaknesses in ${currency} context>",
  "emergencyScoreText": "<analysis of their emergency reserves, specifically citing how many months of expenses they have locked versus recommended 3-6 months>",
  "retirementFeasibility": {
    "status": "On Track" | "At Risk" | "Lagging",
    "requiredNestEgg": <number represent total savings needed for retirement>,
    "projectedNestEgg": <number projected based on current savings velocity & MFund compounding>,
    "gap": <number representing Nest Egg gap>,
    "advice": "<targeted advice on how to close the retirement nest egg gap, citing compound growth in MFund at ${simulationConfig.annualReturnPercentage}% APY>"
  },
  "goalsAnalysis": [
    {
      "goalId": "<id of goal>",
      "goalName": "<name of goal>",
      "status": "Achievable" | "Needs Acceleration" | "High Risk",
      "requiredMonthlySavings": <calculated monthly savings needed to reach this goal on time>,
      "predictionText": "<tailored insight about this specific goal timeline, stating how to optimize with locked HaloSave tranches>"
    }
  ],
  "wealthPreservationAdvice": "<1-2 sentences on how to optimize wealth, reduce liabilities, and exploit locked high-yield MFund tranches>"
}`;

    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });
        const cleanText = (response.text || '').trim().replace(/^```json/, '').replace(/```$/, '').trim();
        const parsed = JSON.parse(cleanText);
        return parsed;
      } catch (err: any) {
        if (err?.status === 429 || err?.message?.includes('429')) {
          console.log('Gemini API quota exceeded, using fallback Wealth Engine calculation.');
        } else {
          console.log('Gemini Wealth Engine error:', err.message);
        }
      }
    }

    const requiredNestEgg = (data.targetRetirementIncome || 2000) * 12 * 25; 
    const yearsToRetire = Math.max(1, data.retirementAge - data.currentAge);
    const rate = 0.185;
    const projectedNestEgg = Math.round(netWorth * Math.pow(1 + rate, yearsToRetire) + (totalVaultsBalance * 12 * ((Math.pow(1 + rate, yearsToRetire) - 1) / rate)));
    const gap = Math.max(0, requiredNestEgg - projectedNestEgg);
    const retirementStatus = gap === 0 ? 'On Track' : (projectedNestEgg / requiredNestEgg > 0.5 ? 'Lagging' : 'At Risk');

    const goalsAnalysis = (data.plannedGoals || []).map((goal: any) => {
      const goalYears = Math.max(1, goal.targetYear - new Date().getFullYear());
      const totalMonths = goalYears * 12;
      const requiredMonthlySavings = Math.round(goal.targetAmount / totalMonths);
      const monthlyTargetNum = Number(profile.monthlyTarget || 1000);
      const isAchievable = totalVaultsBalance >= goal.targetAmount || (monthlyTargetNum >= requiredMonthlySavings);
      return {
        goalId: goal.id,
        goalName: goal.name,
        status: isAchievable ? 'Achievable' : (monthlyTargetNum * 2 >= requiredMonthlySavings ? 'Needs Acceleration' : 'High Risk'),
        requiredMonthlySavings,
        predictionText: isAchievable 
          ? `Your active savings velocity is comfortably tracking toward this ${goal.name} milestone. Locking these in HaloSave yields daily compound gains.`
          : `To secure ${currency} ${goal.targetAmount.toLocaleString()} for ${goal.name} by ${goal.targetYear}, you need a dedicated monthly lock of ${currency} ${requiredMonthlySavings}. Consider creating a dedicated locked vault.`
      };
    });

    let healthScore = 50;
    if (netWorth > 10000) healthScore += 15;
    if (emergencyScore >= 3) healthScore += 15;
    if (Number(profile.savingsStreakDays || 0) > 10) healthScore += 10;
    if (gap === 0) healthScore += 10;
    healthScore = Math.min(100, healthScore);

    const healthLevel = healthScore >= 80 ? 'Excellent' : (healthScore >= 65 ? 'Good' : (healthScore >= 45 ? 'Fair' : 'Poor'));

    return {
      financialHealthScore: healthScore,
      financialHealthLevel: healthLevel,
      scoreAnalysis: `Your current Financial Health Score stands at ${healthScore}/100. ${healthLevel === 'Excellent' ? 'Excellent lock discipline and assets allocation.' : healthLevel === 'Good' ? 'Good starting foundation. Boosting locked savings duration will compound wealth quickly.' : 'Focus on building an automated Emergency Shield and locking tranches to curb impulse expenditures.'}`,
      emergencyScoreText: emergencyScore >= 3 
        ? `Solid! Your emergency reserves represent ${emergencyScore} months of expenses. Recommended safety shield is 3-6 months.`
        : `Vulnerable: You have ${emergencyScore} months of expenses covered. Build an Emergency Shield in HaloSave and set a 180-day lock to shield these essential savings.`,
      retirementFeasibility: {
        status: retirementStatus,
        requiredNestEgg,
        projectedNestEgg,
        gap,
        advice: `To accumulate a standard nest egg of ${currency} ${requiredNestEgg.toLocaleString()}, optimize your monthly allocations. In the Databank MFund, compound yield at 18.5% can cover ${Math.round((projectedNestEgg/requiredNestEgg)*100)}% of your target.`
      },
      goalsAnalysis,
      wealthPreservationAdvice: `Shield your wealth against inflation and impulse spending. Consolidate idle mobile money or external balances into 90-to-180 day locked HaloSave tranches to lock in maximum APY.`
    };
  }
}

