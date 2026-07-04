
import { db } from '../../db/index.ts';
import { users, vaults, tranches, transactions, auditLogs, withdrawalRequests, notifications, userAchievements, passkeys } from '../../db/schema.ts';
import { eq, and, desc } from 'drizzle-orm';

export class UserRepository {
  async findByEmail(email: string) { return await db.select().from(users).where(eq(users.email, (email || '').toLowerCase().trim())); }
  async findById(id: string) { return await db.select().from(users).where(eq(users.id, id)); }
  async findReferredBy(code: string) { return await db.select().from(users).where(eq(users.referredBy, code)); }
  async findByReferralCode(code: string) { return await db.select().from(users).where(eq(users.referralCode, code)); }
  async findAll() { return await db.select().from(users); }
  async create(data: any) { return await db.insert(users).values(data).returning(); }
  async update(id: string, data: any) { return await db.update(users).set(data).where(eq(users.id, id)).returning(); }
}

export class VaultRepository {
  async findByUserId(userId: string) { return await db.select().from(vaults).where(eq(vaults.userId, userId)); }
  async findById(id: string) { return await db.select().from(vaults).where(eq(vaults.id, id)); }
  async create(data: any) { return await db.insert(vaults).values(data).returning(); }
  async updateBalance(id: string, balance: string) { return await db.update(vaults).set({ balance }).where(eq(vaults.id, id)); }
  async update(id: string, data: any) { return await db.update(vaults).set(data).where(eq(vaults.id, id)).returning(); }
}

export class TrancheRepository {
  async findByUserId(userId: string) { return await db.select().from(tranches).where(eq(tranches.userId, userId)); }
  async findById(id: string) { return await db.select().from(tranches).where(eq(tranches.id, id)); }
  async create(data: any) { return await db.insert(tranches).values(data).returning(); }
  async updateStatus(id: string, status: string) { return await db.update(tranches).set({ status }).where(eq(tranches.id, id)); }
  async update(id: string, data: any) { return await db.update(tranches).set(data).where(eq(tranches.id, id)).returning(); }
}

export class TransactionRepository {
  async findByUserId(userId: string) { return await db.select().from(transactions).where(eq(transactions.userId, userId)); }
  async create(data: any) { return await db.insert(transactions).values(data).returning(); }
  async findPendingWithdrawal(vaultId: string) { return await db.select().from(transactions).where(and(eq(transactions.type, 'withdrawal'), eq(transactions.vaultId, vaultId), eq(transactions.status, 'pending'))).limit(1); }
  async updateStatusAndAmount(id: string, status: string, amount?: string) { return await db.update(transactions).set(amount ? { status, amount } : { status }).where(eq(transactions.id, id)); }
  async findByReference(reference: string) { return await db.select().from(transactions).where(eq(transactions.reference, reference)); }
}

export class AuditRepository {
  async findByUserId(userId: string) { return await db.select().from(auditLogs).where(eq(auditLogs.userId, userId)); }
  async create(data: any) { return await db.insert(auditLogs).values(data); }
}

export class WithdrawalRequestRepository {
  async findAll() {
    return await db.select({
      id: withdrawalRequests.id, userId: withdrawalRequests.userId, userFullName: users.fullName,
      userEmail: users.email, trancheId: withdrawalRequests.trancheId, vaultId: withdrawalRequests.vaultId,
      vaultName: vaults.name, amount: withdrawalRequests.amount, currency: withdrawalRequests.currency,
      destinationAccount: withdrawalRequests.destinationAccount, requestedAt: withdrawalRequests.createdAt,
      status: withdrawalRequests.status, isEarly: withdrawalRequests.isEarly
    }).from(withdrawalRequests).leftJoin(users, eq(withdrawalRequests.userId, users.id)).leftJoin(vaults, eq(withdrawalRequests.vaultId, vaults.id));
  }
  async findByUserId(userId: string) {
    return await db.select().from(withdrawalRequests).where(eq(withdrawalRequests.userId, userId));
  }
  async findById(id: string) { return await db.select().from(withdrawalRequests).where(eq(withdrawalRequests.id, id)); }
  async create(data: any) { return await db.insert(withdrawalRequests).values(data).returning(); }
  async updateStatus(id: string, status: string) { return await db.update(withdrawalRequests).set({ status }).where(eq(withdrawalRequests.id, id)); }
}

export class NotificationRepository {
  async findByUserId(userId: string) {
    return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }
  async findById(id: string) {
    return await db.select().from(notifications).where(eq(notifications.id, id));
  }
  async create(data: any) {
    return await db.insert(notifications).values(data).returning();
  }
  async markAsRead(id: string) {
    return await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id)).returning();
  }
  async markAllAsRead(userId: string) {
    return await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId)).returning();
  }
  async delete(id: string) {
    return await db.delete(notifications).where(eq(notifications.id, id)).returning();
  }
}

export class UserAchievementRepository {
  async findByUserId(userId: string) {
    return await db.select().from(userAchievements).where(eq(userAchievements.userId, userId)).orderBy(desc(userAchievements.unlockedAt));
  }
  async findByUserIdAndCode(userId: string, code: string) {
    return await db.select().from(userAchievements).where(and(eq(userAchievements.userId, userId), eq(userAchievements.badgeCode, code)));
  }
  async create(data: any) {
    return await db.insert(userAchievements).values(data).returning();
  }
}

export class PasskeyRepository {
  async findById(id: string) {
    return await db.select().from(passkeys).where(eq(passkeys.id, id));
  }
  async findByUserId(userId: string) {
    return await db.select().from(passkeys).where(eq(passkeys.userId, userId));
  }
  async create(data: any) {
    return await db.insert(passkeys).values(data).returning();
  }
  async updateCounter(id: string, counter: number) {
    return await db.update(passkeys).set({ counter }).where(eq(passkeys.id, id)).returning();
  }
  async delete(id: string) {
    return await db.delete(passkeys).where(eq(passkeys.id, id)).returning();
  }
}


