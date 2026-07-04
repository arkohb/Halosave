import { NotificationRepository, UserAchievementRepository, UserRepository } from '../repositories/index.ts';
import { db } from '../../db/index.ts';
import { notifications, userAchievements } from '../../db/schema.ts';
import { eq } from 'drizzle-orm';

export interface SimulatedEmail {
  id: string;
  userId: string;
  recipientEmail: string;
  subject: string;
  bodyHtml: string;
  type: string; // 'deposit' | 'withdrawal' | 'unlock' | 'investment' | 'goal' | 'weekly_summary' | 'monthly_summary' | 'achievement'
  sentAt: Date;
}

// Global in-memory log for simulated emails
export const simulatedEmailsLog: SimulatedEmail[] = [];

// Available Achievements metadata definition
export const ACHIEVEMENTS_METADATA = [
  {
    badgeCode: 'FIRST_DEPOSIT',
    title: 'First Step on the Path',
    description: 'Completed your first HaloSave lock contract. The compounding journey begins!',
    icon: 'Sparkles',
  },
  {
    badgeCode: 'STREAK_3',
    title: 'Consistent Discipline',
    description: 'Saved on 3 separate occasions without any premature liquidations.',
    icon: 'Flame',
  },
  {
    badgeCode: 'WEALTH_BUILDER_5K',
    title: 'Wealth Builder (5K)',
    description: 'Reached a total vault valuation of over GH₵ 5,000.',
    icon: 'Award',
  },
  {
    badgeCode: 'AUTO_REDEEM_HERO',
    title: 'Automation Commander',
    description: 'Configured and triggered your first automatic maturity payout.',
    icon: 'Zap',
  },
  {
    badgeCode: 'STREAK_7',
    title: 'Weekly Warrior',
    description: 'Maintained an active savings streak of 7 days.',
    icon: 'ShieldCheck',
  },
  {
    badgeCode: 'GOLDEN_FORTRESS',
    title: 'Golden Citadel',
    description: 'Established savings target goals exceeding GH₵ 10,000.',
    icon: 'Target',
  },
];

export class NotificationService {
  constructor(
    private notifRepo: NotificationRepository,
    private achRepo: UserAchievementRepository,
    private userRepo: UserRepository
  ) {}

  async getNotifications(userId: string) {
    return await this.notifRepo.findByUserId(userId);
  }

  async markAsRead(userId: string, notifId: string) {
    const [notif] = await this.notifRepo.findById(notifId);
    if (!notif || notif.userId !== userId) {
      throw new Error('Notification not found');
    }
    return await this.notifRepo.markAsRead(notifId);
  }

  async markAllAsRead(userId: string) {
    return await this.notifRepo.markAllAsRead(userId);
  }

  async deleteNotification(userId: string, notifId: string) {
    const [notif] = await this.notifRepo.findById(notifId);
    if (!notif || notif.userId !== userId) {
      throw new Error('Notification not found');
    }
    return await this.notifRepo.delete(notifId);
  }

  async getAchievements(userId: string) {
    const unlocked = await this.achRepo.findByUserId(userId);
    const unlockedCodes = new Set(unlocked.map(a => a.badgeCode));

    return ACHIEVEMENTS_METADATA.map(meta => {
      const dbRecord = unlocked.find(u => u.badgeCode === meta.badgeCode);
      return {
        ...meta,
        isUnlocked: unlockedCodes.has(meta.badgeCode),
        unlockedAt: dbRecord ? dbRecord.unlockedAt : null,
      };
    });
  }

  async getSimulatedEmails(userId: string) {
    return simulatedEmailsLog.filter(e => e.userId === userId).sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
  }

  // CORE TRIGGER ENGINE
  async triggerNotification(userId: string, type: string, title: string, message: string, metadata: any = {}) {
    const notifId = metadata.customId || 'not_' + Math.random().toString(36).substring(2, 9);
    
    // Guard against duplicates for deterministic custom IDs
    if (metadata.customId) {
      const existing = await this.notifRepo.findById(metadata.customId);
      if (existing.length > 0) {
        return existing[0];
      }
    }

    // 1. Create In-App Notification
    const [notif] = await this.notifRepo.create({
      id: notifId,
      userId,
      title,
      message,
      type,
      isRead: false,
      metadata: metadata || {}
    });

    // 2. Fetch User Profile for Email Triggering
    const [user] = await this.userRepo.findById(userId);
    if (user) {
      // Create beautifully styled HTML email
      const emailBody = this.generateHtmlEmail(user.fullName, title, message, type, metadata, user.currency || 'GHS');
      const emailRecord: SimulatedEmail = {
        id: 'em_' + Math.random().toString(36).substring(2, 9),
        userId,
        recipientEmail: user.email,
        subject: `[HaloSave] ${title}`,
        bodyHtml: emailBody,
        type,
        sentAt: new Date()
      };
      simulatedEmailsLog.push(emailRecord);

      // Trim global logs if too large
      if (simulatedEmailsLog.length > 500) {
        simulatedEmailsLog.shift();
      }
    }

    // 3. Dynamic Achievement Checker
    await this.checkForAchievements(userId, type, metadata);

    return notif;
  }

  async simulateWeeklySummary(userId: string) {
    const title = '📊 Weekly HaloSave Portfolio Summary';
    const message = 'Your weekly portfolio report is ready. Total locked assets grew by interest accruals. Maintain your savings streak to maximize rewards!';
    const metadata = {
      weeklyDeposits: 500,
      lockedAssets: 4500,
      streak: 7,
      customId: `not_weekly_${userId}_${Date.now()}`
    };
    return await this.triggerNotification(userId, 'weekly_summary', title, message, metadata);
  }

  async simulateMonthlySummary(userId: string) {
    const title = '📈 Monthly HaloSave Financial performance Digest';
    const message = 'Your monthly performance report is ready. All interest accrued from Databank MFund has been compounded successfully.';
    const metadata = {
      weeklyDeposits: 2200,
      lockedAssets: 12500,
      streak: 30,
      customId: `not_monthly_${userId}_${Date.now()}`
    };
    return await this.triggerNotification(userId, 'monthly_summary', title, message, metadata);
  }

  private async checkForAchievements(userId: string, type: string, metadata: any) {
    try {
      const unlock = async (code: string) => {
        const existing = await this.achRepo.findByUserIdAndCode(userId, code);
        if (existing.length === 0) {
          const meta = ACHIEVEMENTS_METADATA.find(a => a.badgeCode === code);
          if (meta) {
            await this.achRepo.create({
              id: 'ach_' + Math.random().toString(36).substring(2, 9),
              userId,
              badgeCode: code,
              title: meta.title,
              description: meta.description,
              icon: meta.icon
            });

            // Trigger notification about achievement unlock
            await this.triggerNotification(
              userId,
              'achievement',
              '🏆 Achievement Unlocked: ' + meta.title,
              `Congratulations! You have earned the "${meta.title}" badge: ${meta.description}`,
              { badgeCode: code }
            );
          }
        }
      };

      if (type === 'deposit') {
        await unlock('FIRST_DEPOSIT');

        // Check streak achievements
        const [user] = await this.userRepo.findById(userId);
        if (user && (user.savingsStreakDays || 0) >= 3) {
          await unlock('STREAK_3');
        }
        if (user && (user.savingsStreakDays || 0) >= 7) {
          await unlock('STREAK_7');
        }

        // Check balance total for 5K
        const balanceVal = Number(metadata.balanceSum || 0);
        if (balanceVal >= 5000) {
          await unlock('WEALTH_BUILDER_5K');
        }
      }

      if (type === 'unlock' && metadata.isAutoRedeem) {
        await unlock('AUTO_REDEEM_HERO');
      }

      if (type === 'goal' && metadata.targetAmount >= 10000) {
        await unlock('GOLDEN_FORTRESS');
      }
    } catch (err) {
      console.error('Error during achievement checking:', err);
    }
  }

  private generateHtmlEmail(name: string, title: string, message: string, type: string, metadata: any, currency: string): string {
    const year = new Date().getFullYear();

    let receiptSection = '';
    if (type === 'deposit') {
      receiptSection = `
        <div style="background-color: #0b1329; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; margin-top: 20px; font-family: monospace;">
          <h4 style="color: #10b981; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">TRANSACTION RECEIPT</h4>
          <table style="width: 100%; font-size: 13px; color: #94a3b8; border-collapse: collapse;">
            <tr><td style="padding: 6px 0; color: #cbd5e1;">Amount Locked:</td><td style="padding: 6px 0; text-align: right; color: #fff; font-weight: bold;">${currency} ${Number(metadata.amount || 0).toFixed(2)}</td></tr>
            <tr><td style="padding: 6px 0; color: #cbd5e1;">Fund Allocator:</td><td style="padding: 6px 0; text-align: right; color: #fff;">${metadata.providerName || 'Databank MFund'}</td></tr>
            <tr><td style="padding: 6px 0; color: #cbd5e1;">Maturity Term:</td><td style="padding: 6px 0; text-align: right; color: #fff;">${metadata.lockDays || 90} Days</td></tr>
            <tr><td style="padding: 6px 0; color: #cbd5e1;">Est. Units Allocated:</td><td style="padding: 6px 0; text-align: right; color: #10b981; font-weight: bold;">${Number(metadata.units || 0).toFixed(4)} Units</td></tr>
            <tr><td style="padding: 6px 0; color: #cbd5e1;">Unlock Date:</td><td style="padding: 6px 0; text-align: right; color: #f59e0b;">${metadata.unlockDate || ''}</td></tr>
          </table>
        </div>
      `;
    } else if (type === 'withdrawal') {
      receiptSection = `
        <div style="background-color: #0b1329; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; margin-top: 20px; font-family: monospace;">
          <h4 style="color: #f43f5e; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">LIQUIDATION SUMMARY</h4>
          <table style="width: 100%; font-size: 13px; color: #94a3b8; border-collapse: collapse;">
            <tr><td style="padding: 6px 0; color: #cbd5e1;">Payout Amount:</td><td style="padding: 6px 0; text-align: right; color: #fff; font-weight: bold;">${currency} ${Number(metadata.amount || 0).toFixed(2)}</td></tr>
            <tr><td style="padding: 6px 0; color: #cbd5e1;">Disbursement Account:</td><td style="padding: 6px 0; text-align: right; color: #fff;">${metadata.destinationAccount || 'Paystack/Mobile Money'}</td></tr>
            <tr><td style="padding: 6px 0; color: #cbd5e1;">Early Break Penalty:</td><td style="padding: 6px 0; text-align: right; color: #f43f5e; font-weight: bold;">${currency} ${Number(metadata.penalty || 0).toFixed(2)}</td></tr>
            <tr><td style="padding: 6px 0; color: #cbd5e1;">Discipline Streak Status:</td><td style="padding: 6px 0; text-align: right; color: #fff;">${metadata.streakBroken ? 'RESET TO 0 ❌' : 'PRESERVED ✅'}</td></tr>
          </table>
        </div>
      `;
    } else if (type === 'unlock') {
      receiptSection = `
        <div style="background-color: #0b1329; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; margin-top: 20px; font-family: monospace;">
          <h4 style="color: #10b981; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">MATURITY RELEASE</h4>
          <table style="width: 100%; font-size: 13px; color: #94a3b8; border-collapse: collapse;">
            <tr><td style="padding: 6px 0; color: #cbd5e1;">Matured Contract Principal:</td><td style="padding: 6px 0; text-align: right; color: #fff; font-weight: bold;">${currency} ${Number(metadata.principal || 0).toFixed(2)}</td></tr>
            <tr><td style="padding: 6px 0; color: #cbd5e1;">Total Valuation Released:</td><td style="padding: 6px 0; text-align: right; color: #10b981; font-weight: bold;">${currency} ${Number(metadata.value || 0).toFixed(2)}</td></tr>
            <tr><td style="padding: 6px 0; color: #cbd5e1;">Interest Profit Generated:</td><td style="padding: 6px 0; text-align: right; color: #10b981;">+${currency} ${Number(metadata.profit || 0).toFixed(2)}</td></tr>
            <tr><td style="padding: 6px 0; color: #cbd5e1;">Redemption Mode:</td><td style="padding: 6px 0; text-align: right; color: #38bdf8; font-weight: bold;">${metadata.isAutoRedeem ? 'AUTO-PAYOUT ⚡' : 'MANUAL CLAIM'}</td></tr>
          </table>
        </div>
      `;
    } else if (type === 'weekly_summary') {
      receiptSection = `
        <div style="background-color: #0b1329; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; margin-top: 20px; font-family: sans-serif;">
          <h4 style="color: #10b981; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #334155; padding-bottom: 8px;">WEEKLY HALOSAVE COMPILING REPORT</h4>
          <table style="width: 100%; font-size: 13px; color: #94a3b8; border-collapse: collapse;">
            <tr><td style="padding: 6px 0; color: #cbd5e1;">Total Locked Assets:</td><td style="padding: 6px 0; text-align: right; color: #fff; font-weight: bold;">${currency} ${Number(metadata.lockedAssets || 0).toFixed(2)}</td></tr>
            <tr><td style="padding: 6px 0; color: #cbd5e1;">Weekly Savings Deposits:</td><td style="padding: 6px 0; text-align: right; color: #10b981; font-weight: bold;">${currency} ${Number(metadata.weeklyDeposits || 0).toFixed(2)}</td></tr>
            <tr><td style="padding: 6px 0; color: #cbd5e1;">Active Savings Streak:</td><td style="padding: 6px 0; text-align: right; color: #f59e0b; font-weight: bold;">🔥 ${metadata.streak || 0} Days</td></tr>
          </table>
          <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin-top: 15px; margin-bottom: 0;">
            Compounding is the 8th wonder of the world. By maintaining your weekly savings schedule and letting your funds lock, you are steadily building a fortress of wealth. Excellent progress!
          </p>
        </div>
      `;
    } else if (type === 'monthly_summary') {
      receiptSection = `
        <div style="background-color: #0b1329; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; margin-top: 20px; font-family: sans-serif;">
          <h4 style="color: #6366f1; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #334155; padding-bottom: 8px;">MONTHLY PERFORMANCE DIGEST</h4>
          <table style="width: 100%; font-size: 13px; color: #94a3b8; border-collapse: collapse; margin-top: 10px;">
            <tr><td style="padding: 6px 0; color: #cbd5e1;">Opening Monthly Balance:</td><td style="padding: 6px 0; text-align: right; color: #fff;">${currency} ${Number(metadata.openingBalance || 0).toFixed(2)}</td></tr>
            <tr><td style="padding: 6px 0; color: #cbd5e1;">Closing Monthly Valuation:</td><td style="padding: 6px 0; text-align: right; color: #fff; font-weight: bold;">${currency} ${Number(metadata.closingBalance || 0).toFixed(2)}</td></tr>
            <tr><td style="padding: 6px 0; color: #cbd5e1;">Net Compound Gain:</td><td style="padding: 6px 0; text-align: right; color: #10b981; font-weight: bold;">+${currency} ${Number(metadata.monthlyGain || 0).toFixed(2)}</td></tr>
            <tr><td style="padding: 6px 0; color: #cbd5e1;">Compliance Status:</td><td style="padding: 6px 0; text-align: right; color: #38bdf8; font-weight: bold;">VERIFIED</td></tr>
          </table>
        </div>
      `;
    } else if (type === 'goal') {
      receiptSection = `
        <div style="background-color: #0b1329; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; margin-top: 20px; font-family: sans-serif;">
          <h4 style="color: #f59e0b; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">GOAL MILESTONE REACHED</h4>
          <table style="width: 100%; font-size: 13px; color: #94a3b8; border-collapse: collapse; margin-top: 10px;">
            <tr><td style="padding: 6px 0; color: #cbd5e1;">Vault Name:</td><td style="padding: 6px 0; text-align: right; color: #fff; font-weight: bold;">${metadata.vaultName}</td></tr>
            <tr><td style="padding: 6px 0; color: #cbd5e1;">Target Amount:</td><td style="padding: 6px 0; text-align: right; color: #fff;">${currency} ${Number(metadata.targetAmount || 0).toFixed(2)}</td></tr>
            <tr><td style="padding: 6px 0; color: #cbd5e1;">Current Valuation:</td><td style="padding: 6px 0; text-align: right; color: #10b981; font-weight: bold;">${currency} ${Number(metadata.balance || 0).toFixed(2)}</td></tr>
            <tr><td style="padding: 6px 0; color: #cbd5e1;">Completion Rate:</td><td style="padding: 6px 0; text-align: right; color: #10b981; font-weight: bold;">${metadata.percent || '100'}%</td></tr>
          </table>
        </div>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
      </head>
      <body style="background-color: #020617; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 40px 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 24px; padding: 40px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3);">
          
          <!-- Brand Header -->
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #1e293b; padding-bottom: 25px; margin-bottom: 30px;">
            <div>
              <span style="font-size: 20px; font-weight: 800; color: #fff; letter-spacing: -0.5px;">HALO<span style="color: #10b981;">SAVE</span></span>
              <span style="font-size: 9px; font-family: monospace; background-color: rgba(16,185,129,0.1); color: #10b981; padding: 2px 6px; border-radius: 4px; margin-left: 6px; border: 1px solid rgba(16,185,129,0.2); font-weight: bold;">v2.0</span>
            </div>
            <span style="font-size: 10px; font-family: monospace; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Save • Lock • Grow</span>
          </div>

          <!-- Body Content -->
          <h2 style="font-size: 20px; font-weight: 700; color: #fff; margin-top: 0; margin-bottom: 10px;">Hello ${name},</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; margin-top: 0; margin-bottom: 20px;">
            ${message}
          </p>

          ${receiptSection}

          <!-- Footer Legal -->
          <div style="margin-top: 40px; border-top: 1px solid #1e293b; padding-top: 25px; text-align: center; font-size: 11px; color: #475569; line-height: 1.6; font-family: monospace;">
            <p style="margin: 0 0 10px 0;">This email is a simulated transaction receipt processed by the HaloSave Investment Engine.</p>
            <p style="margin: 0;">© ${year} HaloSave Inc. Accra, Ghana. SEC-Licensed Tier-1 Custodian Trustee Partnership.</p>
          </div>

        </div>
      </body>
      </html>
    `;
  }
}
