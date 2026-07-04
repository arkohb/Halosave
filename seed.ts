import { db } from './src/db/index.ts';
import { users, vaults, tranches, transactions, auditLogs, fundProviders } from './src/db/schema.ts';
import { providersList } from './src/server/domain/investment.ts';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

async function seed() {
  // ---- Super admin (no hardcoded password) ----------------------------------
  // Credentials come from env. If no password is provided, a strong random one
  // is generated and printed ONCE so you can log in and change it immediately.
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@halosave.local').toLowerCase().trim();
  const adminName = process.env.SEED_ADMIN_NAME || 'HaloSave Administrator';
  const generated = !process.env.SEED_ADMIN_PASSWORD;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || crypto.randomBytes(12).toString('base64url');

  console.log('Seeding super admin and reference data...');
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const userId = 'usr_master_001';
  await db.insert(users).values({
    id: userId,
    email: adminEmail,
    passwordHash,
    fullName: adminName,
    phone: process.env.SEED_ADMIN_PHONE || '',
    country: 'Ghana',
    currency: 'GHS',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    role: 'super_admin',
    isKycVerified: true,
    kycTier: 3,
    savingsStreakDays: 0,
    monthlyTarget: '5000'
  }).onConflictDoNothing();

  // ---- Fund providers (starting NAVs; mark as placeholder until real ones entered) ----
  for (const p of providersList) {
    await db.insert(fundProviders).values({
      id: p.id,
      name: p.name,
      currentNav: p.currentNAV.toString(),
      apy: p.annualReturnPercentage.toString(),
      managementFee: p.managementFeePercentage.toString(),
      pricingModel: (p as any).pricingModel || 'NAV_UNIT',
      accrual: (p as any).accrual || 'simple',
      source: 'placeholder',
      navDate: new Date(),
      updatedAt: new Date(),
    }).onConflictDoNothing();
  }

  // ---- Optional demo data (set SEED_DEMO_DATA=false to skip in production) ----
  if (process.env.SEED_DEMO_DATA !== 'false') {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 45 * 24 * 3600 * 1000);
    const lockedFuture1 = new Date(now.getTime() + 45 * 24 * 3600 * 1000);
    const lockedFuture2 = new Date(now.getTime() + 120 * 24 * 3600 * 1000);
    const maturedPast = new Date(now.getTime() - 2 * 24 * 3600 * 1000);

    await db.insert(vaults).values([
      { id: 'v_emerg_01', userId, name: 'Emergency Fund', color: 'emerald', icon: 'ShieldAlert',
        targetAmount: '15000', balance: '6850', maturityDate: new Date('2026-12-31T23:59:59Z'),
        description: '3-6 months living expenses locked safely for unexpected life events.' },
      { id: 'v_vacay_02', userId, name: 'Zanzibar Vacation', color: 'cyan', icon: 'PlaneTakeoff',
        targetAmount: '8500', balance: '4200', maturityDate: new Date('2026-09-15T00:00:00Z'),
        description: 'Holiday get-away flight ticket and resort booking savings.' },
      { id: 'v_rent_03', userId, name: 'Annual Rent Advance', color: 'indigo', icon: 'Home',
        targetAmount: '12000', balance: '9600', maturityDate: new Date('2026-08-01T00:00:00Z'),
        description: 'Strictly locked apartment lease renewal deposit.' }
    ]).onConflictDoNothing();

    await db.insert(tranches).values([
      { id: 'tr_101', userId, vaultId: 'v_emerg_01', amount: '5000', lockedAt: pastDate, maturesAt: lockedFuture2,
        status: 'locked', investmentProvider: 'DATABANK_MFUND', units: '2014.91', purchaseNav: '2.4815' },
      { id: 'tr_102', userId, vaultId: 'v_emerg_01', amount: '1850', lockedAt: pastDate, maturesAt: lockedFuture1,
        status: 'locked', investmentProvider: 'DATABANK_MFUND', units: '745.51', purchaseNav: '2.4815' },
      { id: 'tr_103', userId, vaultId: 'v_vacay_02', amount: '4200', lockedAt: pastDate, maturesAt: lockedFuture1,
        status: 'locked', investmentProvider: 'DATABANK_MFUND', units: '1692.52', purchaseNav: '2.4815' },
      { id: 'tr_104', userId, vaultId: 'v_rent_03', amount: '8000', lockedAt: pastDate, maturesAt: lockedFuture2,
        status: 'pending_approval', investmentProvider: 'DATABANK_MFUND', units: '3223.85', purchaseNav: '2.4815' },
      { id: 'tr_105_mat', userId, vaultId: 'v_rent_03', amount: '1600', lockedAt: pastDate, maturesAt: maturedPast,
        status: 'pending_approval', investmentProvider: 'DATABANK_MFUND', units: '644.77', purchaseNav: '2.4815' }
    ]).onConflictDoNothing();

    await db.insert(transactions).values([
      { id: 'tx_pay_001', userId, type: 'deposit', amount: '5000', vaultId: 'v_emerg_01', reference: 'PSTK_9812481', status: 'successful', createdAt: pastDate },
      { id: 'tx_pay_002', userId, type: 'deposit', amount: '8000', vaultId: 'v_rent_03', reference: 'PSTK_7821941', status: 'successful', createdAt: pastDate },
    ]).onConflictDoNothing();

    await db.insert(auditLogs).values([
      { id: 'aud_01', userId, action: 'VAULT_LOCK_ENFORCED', actor: 'System', details: 'Verified withdrawal restriction. Request blocked.', severity: 'security' }
    ]).onConflictDoNothing();
  }

  console.log('Seeding complete!');
  console.log('--------------------------------------------------');
  console.log(`Super admin email:    ${adminEmail}`);
  if (generated) {
    console.log(`Super admin password: ${adminPassword}`);
    console.log('^ Generated password shown once. Log in and change it now.');
  } else {
    console.log('Super admin password: (from SEED_ADMIN_PASSWORD env)');
  }
  console.log('--------------------------------------------------');
}

seed().catch(console.error).finally(() => process.exit(0));
