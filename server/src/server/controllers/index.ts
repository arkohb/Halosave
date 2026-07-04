import { Request, Response, NextFunction } from 'express';
import { authService, vaultService, stateService, adminService, settingsService, coachService, paymentService, notificationService, wealthService, userRepo, vaultRepo, trancheRepo, txRepo, auditRepo, withdrawalRepo, passkeyRepo } from '../di/index.ts';
import { providersList } from '../domain/investment.ts';
import { UnauthorizedError } from '../shared/errors.ts';
import { getAllProviderData, getProviderData, updateNav } from '../services/nav.ts';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';


const getActiveUser = (req: any) => {
  // Identity must come ONLY from the verified auth token (set by requireAuth).
  // Never trust a client-supplied header such as x-user-id.
  if (!req.user?.id) {
    throw new UnauthorizedError('Authentication required.');
  }
  return req.user.id as string;
};

// In-memory tracker for active device sessions to implement Device Tracking & Session Management
const userSessionsMap = new Map<string, any[]>();

const getSessionsForUser = (userId: string) => {
  if (!userSessionsMap.has(userId)) {
    userSessionsMap.set(userId, [
      {
        id: 'sess_current',
        deviceType: 'desktop',
        browser: 'Chrome 125.0.0',
        os: 'macOS Sonoma',
        ipAddress: '102.176.32.14',
        location: 'Accra, Greater Accra (Ghana)',
        isActiveNow: true,
        lastActive: new Date().toISOString(),
      },
      {
        id: 'sess_old_1',
        deviceType: 'mobile',
        browser: 'Safari Mobile 17.5',
        os: 'iOS 17.5.1',
        ipAddress: '102.176.32.89',
        location: 'Kumasi, Ashanti (Ghana)',
        isActiveNow: false,
        lastActive: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      },
      {
        id: 'sess_old_2',
        deviceType: 'tablet',
        browser: 'Chrome Mobile 125.0',
        os: 'Android 14 (Pixel Tablet)',
        ipAddress: '197.251.184.2',
        location: 'London, England (UK)',
        isActiveNow: false,
        lastActive: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
      }
    ]);
  }
  return userSessionsMap.get(userId) || [];
};

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body);
      res.cookie('token', result.token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body);
      res.cookie('token', result.token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async googleLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.googleLogin(req.body);
      res.cookie('token', result.token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.forgotPassword(req.body.email);
      res.json(result);
    } catch (error) { next(error); }
  }

  async verifyEmail(req: any, res: Response, next: NextFunction) {
    try {
      const userId = getActiveUser(req);
      const result = await authService.verifyEmail(userId);
      res.json(result);
    } catch (error) { next(error); }
  }

  async changePassword(req: any, res: Response, next: NextFunction) {
    try {
      const userId = getActiveUser(req);
      const result = await authService.changePassword(userId, req.body.currentPassword, req.body.newPassword);
      res.json(result);
    } catch (error) { next(error); }
  }

  async updateUserRole(req: any, res: Response, next: NextFunction) {
    try {
      const { userId, newRole } = req.body;
      const result = await authService.updateUserRole(userId, newRole);
      res.json(result);
    } catch (error) { next(error); }
  }

  async getSessions(req: any, res: Response, next: NextFunction) {
    try {
      const userId = getActiveUser(req);
      const sessions = getSessionsForUser(userId);
      res.json({ success: true, sessions });
    } catch (error) { next(error); }
  }

  async revokeSession(req: any, res: Response, next: NextFunction) {
    try {
      const userId = getActiveUser(req);
      const { id: sessionId } = req.params;
      
      const sessions = getSessionsForUser(userId);
      const updated = sessions.filter(s => s.id !== sessionId);
      userSessionsMap.set(userId, updated);

      res.json({ success: true, sessions: updated });
    } catch (error) { next(error); }
  }

  // WebAuthn Registration Option generation
  async getRegistrationOptions(req: any, res: Response, next: NextFunction) {
    try {
      const userId = getActiveUser(req);
      const [user] = await userRepo.findById(userId);
      if (!user) throw new Error('User not found');

      const userPasskeys = await passkeyRepo.findByUserId(userId);

      const rpName = 'SusuVault';
      const rpID = req.hostname;

      const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userID: Buffer.from(user.id),
        userName: user.email,
        userDisplayName: user.fullName,
        attestationType: 'none',
        excludeCredentials: userPasskeys.map(pk => ({
          id: pk.id,
          type: 'public-key',
          transports: pk.transports ? JSON.parse(pk.transports) : undefined,
        })),
        authenticatorSelection: {
          userVerification: 'preferred',
          residentKey: 'preferred',
        },
      });

      // Save challenge in secure cookie
      res.cookie('webauthn_reg_challenge', options.challenge, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 5 * 60 * 1000, // 5 minutes
      });

      res.json({ success: true, options });
    } catch (error) {
      next(error);
    }
  }

  // WebAuthn Registration Verification
  async verifyRegistration(req: any, res: Response, next: NextFunction) {
    try {
      const userId = getActiveUser(req);
      const [user] = await userRepo.findById(userId);
      if (!user) throw new Error('User not found');

      const expectedChallenge = req.cookies?.webauthn_reg_challenge;
      if (!expectedChallenge) {
        throw new Error('Registration challenge expired or missing');
      }

      const rpID = req.hostname;
      const expectedOrigin = req.headers.origin || `${req.protocol}://${req.headers.host}`;

      const verification = await verifyRegistrationResponse({
        response: req.body.credential,
        expectedChallenge,
        expectedOrigin,
        expectedRPID: rpID,
      });

      if (verification.verified && verification.registrationInfo) {
        const { credential } = verification.registrationInfo;
        const { id, publicKey, counter } = credential;

        const base64PublicKey = Buffer.from(publicKey).toString('base64url');

        await passkeyRepo.create({
          id,
          userId: user.id,
          publicKey: base64PublicKey,
          counter: counter,
          transports: req.body.credential.response.transports ? JSON.stringify(req.body.credential.response.transports) : null,
          name: req.body.name || 'Passkey',
        });

        // Clear challenge cookie
        res.clearCookie('webauthn_reg_challenge');

        // Audit log
        await auditRepo.create({
          id: 'aud_' + Math.random().toString(36).substring(2, 7),
          userId: user.id,
          action: 'PASSKEY_REGISTERED',
          actor: user.fullName,
          details: `Secured account with a new passkey: ${req.body.name || 'Passkey'}.`,
          severity: 'info',
        });

        res.json({ success: true, verified: true });
      } else {
        res.json({ success: false, error: 'Verification failed' });
      }
    } catch (error) {
      next(error);
    }
  }

  // WebAuthn Authentication Option generation
  async getAuthenticationOptions(req: any, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      if (!email) throw new Error('Email is required');

      const [user] = await userRepo.findByEmail(email);
      if (!user) throw new Error('Account not found with this email');

      const userPasskeys = await passkeyRepo.findByUserId(user.id);
      if (userPasskeys.length === 0) {
        throw new Error('No passkey registered for this account');
      }

      const rpID = req.hostname;

      const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials: userPasskeys.map(pk => ({
          id: pk.id,
          type: 'public-key',
          transports: pk.transports ? JSON.parse(pk.transports) : undefined,
        })),
        userVerification: 'preferred',
      });

      // Save challenge and user ID in cookies
      res.cookie('webauthn_auth_challenge', options.challenge, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 5 * 60 * 1000,
      });
      res.cookie('webauthn_auth_user_id', user.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 5 * 60 * 1000,
      });

      res.json({ success: true, options });
    } catch (error) {
      next(error);
    }
  }

  // WebAuthn Authentication Verification
  async verifyAuthentication(req: any, res: Response, next: NextFunction) {
    try {
      const expectedChallenge = req.cookies?.webauthn_auth_challenge;
      const expectedUserId = req.cookies?.webauthn_auth_user_id;

      if (!expectedChallenge || !expectedUserId) {
        throw new Error('Authentication challenge expired or missing');
      }

      const [user] = await userRepo.findById(expectedUserId);
      if (!user) throw new Error('User not found');

      const credentialId = req.body.credential.id;
      const [storedPasskey] = await passkeyRepo.findById(credentialId);
      if (!storedPasskey) {
        throw new Error('Passkey credential not recognized');
      }

      const rpID = req.hostname;
      const expectedOrigin = req.headers.origin || `${req.protocol}://${req.headers.host}`;

      const verification = await verifyAuthenticationResponse({
        response: req.body.credential,
        expectedChallenge,
        expectedOrigin,
        expectedRPID: rpID,
        credential: {
          id: storedPasskey.id,
          publicKey: Buffer.from(storedPasskey.publicKey, 'base64url'),
          counter: storedPasskey.counter,
          transports: storedPasskey.transports ? JSON.parse(storedPasskey.transports) : undefined,
        },
      });

      if (verification.verified && verification.authenticationInfo) {
        // Update counter
        await passkeyRepo.updateCounter(storedPasskey.id, verification.authenticationInfo.newCounter);

        // Sign JWT
        const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-fallback';
        const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        // Clear cookies
        res.clearCookie('webauthn_auth_challenge');
        res.clearCookie('webauthn_auth_user_id');

        // Set token cookie
        res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

        // Audit log
        await auditRepo.create({
          id: 'aud_' + Math.random().toString(36).substring(2, 7),
          userId: user.id,
          action: 'PASSKEY_LOGIN',
          actor: user.fullName,
          details: 'Successfully authenticated using passkey credentials.',
          severity: 'info',
        });

        res.json({
          success: true,
          verified: true,
          token,
          userProfile: user,
        });
      } else {
        res.json({ success: false, error: 'Verification failed' });
      }
    } catch (error) {
      next(error);
    }
  }

  // List user passkeys
  async getUserPasskeys(req: any, res: Response, next: NextFunction) {
    try {
      const userId = getActiveUser(req);
      const passkeys = await passkeyRepo.findByUserId(userId);
      res.json({
        success: true,
        passkeys: passkeys.map(pk => ({
          id: pk.id,
          name: pk.name,
          createdAt: pk.createdAt,
          counter: pk.counter,
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete a passkey
  async deletePasskey(req: any, res: Response, next: NextFunction) {
    try {
      const userId = getActiveUser(req);
      const { id: passkeyId } = req.params;

      const [passkey] = await passkeyRepo.findById(passkeyId);
      if (!passkey || passkey.userId !== userId) {
        throw new Error('Passkey not found or unauthorized');
      }

      await passkeyRepo.delete(passkeyId);

      // Audit log
      const [user] = await userRepo.findById(userId);
      await auditRepo.create({
        id: 'aud_' + Math.random().toString(36).substring(2, 7),
        userId,
        action: 'PASSKEY_DELETED',
        actor: user?.fullName || 'User',
        details: `Deleted passkey: ${passkey.name}.`,
        severity: 'warning',
      });

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}

export class StateController {
  async getState(req: any, res: Response, next: NextFunction) {
    try {
      const userId = getActiveUser(req);
      const result = await stateService.getState(userId);
      res.json(result);
    } catch (error) { next(error); }
  }
}

export class VaultController {
  async createVault(req: any, res: Response, next: NextFunction) {
    try {
      const userId = getActiveUser(req);
      const result = await vaultService.createVault(userId, req.body);
      res.json({ success: true, vault: result });
    } catch (error) { next(error); }
  }

  async processDeposit(req: any, res: Response, next: NextFunction) {
    try {
      const userId = getActiveUser(req);
      const result = await vaultService.processDeposit(userId, req.body);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async processWithdraw(req: any, res: Response, next: NextFunction) {
    try {
      const userId = getActiveUser(req);
      const result = await vaultService.processWithdraw(userId, req.body);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }
}

export class AdminController {
  async getUsers(req: any, res: Response, next: NextFunction) {
    try {
      const result = await adminService.getUsers();
      res.json({ success: true, users: result });
    } catch (error) { next(error); }
  }

  async confirmUser(req: any, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const adminId = getActiveUser(req);
      const result = await adminService.confirmUser(id, adminId);
      res.json({ success: true, userProfile: result });
    } catch (error) { next(error); }
  }

  async getWithdrawals(req: any, res: Response, next: NextFunction) {
    try {
      const result = await adminService.getWithdrawals();
      res.json({ success: true, requests: result });
    } catch (error) { next(error); }
  }

  async approveWithdrawal(req: any, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const adminId = getActiveUser(req);
      const result = await adminService.approveWithdrawal(id, adminId);
      res.json({ success: true, request: result });
    } catch (error) { next(error); }
  }

  async rejectWithdrawal(req: any, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const adminId = getActiveUser(req);
      const result = await adminService.rejectWithdrawal(id, adminId);
      res.json({ success: true, request: result });
    } catch (error) { next(error); }
  }

  async getTransactions(req: any, res: Response, next: NextFunction) {
    try {
      const result = await adminService.getTransactions();
      res.json({ success: true, transactions: result });
    } catch (error) { next(error); }
  }

  async getVaults(req: any, res: Response, next: NextFunction) {
    try {
      const result = await adminService.getVaults();
      res.json({ success: true, vaults: result });
    } catch (error) { next(error); }
  }

  async getTranches(req: any, res: Response, next: NextFunction) {
    try {
      const result = await adminService.getTranches();
      res.json({ success: true, tranches: result });
    } catch (error) { next(error); }
  }

  async broadcast(req: any, res: Response, next: NextFunction) {
    try {
      const { title, message, type } = req.body;
      const result = await adminService.broadcast(title, message, type);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  // --- Fund NAV management (live investment data) ---
  async getFundProviders(req: any, res: Response, next: NextFunction) {
    try {
      const providers = await getAllProviderData();
      res.json({ success: true, providers });
    } catch (error) { next(error); }
  }

  async updateFundNav(req: any, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const pricingModel = req.body.pricingModel; // optional override
      const accrual = req.body.accrual;           // optional ('simple'|'compound')
      const apy = req.body.apy != null ? Number(req.body.apy) : undefined;
      const navDate = req.body.navDate ? new Date(req.body.navDate) : undefined;

      // For fixed-income products NAV is not meaningful; the rate (apy) is what matters.
      const isFixedIncome = pricingModel === 'FIXED_INCOME';
      const nav = req.body.nav != null ? Number(req.body.nav) : (isFixedIncome ? 1 : NaN);

      if (!(nav > 0)) {
        return res.status(400).json({ success: false, error: 'A positive NAV value is required for NAV-priced funds.' });
      }
      if (isFixedIncome && !(apy != null && apy >= 0)) {
        return res.status(400).json({ success: false, error: 'Fixed-income funds require an annual rate (apy).' });
      }

      const provider = await updateNav(id, nav, { apy, navDate, pricingModel, accrual, source: 'manual' });
      await auditRepo.create({
        id: 'aud_' + crypto.randomBytes(4).toString('hex'),
        userId: getActiveUser(req),
        action: 'FUND_NAV_UPDATED',
        actor: req.user?.email || 'Admin',
        details: isFixedIncome
          ? `Fixed-income rate for ${id} set to ${apy}%.`
          : `NAV for ${id} set to ${nav}${apy != null ? ` (APY ${apy}%)` : ''}.`,
        severity: 'warning',
      });
      res.json({ success: true, provider });
    } catch (error) { next(error); }
  }
}

export class SettingsController {
  async updateSettings(req: any, res: Response, next: NextFunction) {
    try {
      const userId = getActiveUser(req);
      const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
      const result = await settingsService.updateSettings(userId, req.body, isAdmin);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }
}

export class CoachController {
  async askCoach(req: any, res: Response, next: NextFunction) {
    try {
      const userId = getActiveUser(req);
      const result = await coachService.askCoach(userId, req.body.question);
      res.json(result);
    } catch (error) { next(error); }
  }
}

export class PaymentController {
  async initializePayment(req: any, res: Response, next: NextFunction) {
    try {
      const userId = getActiveUser(req);
      const result = await paymentService.initializePayment(userId, req.body);
      res.json(result);
    } catch (error) { next(error); }
  }

  async verifyPayment(req: any, res: Response, next: NextFunction) {
    try {
      const { reference } = req.params;
      if (!reference) {
        return res.status(400).json({ success: false, error: 'Reference parameter is required.' });
      }
      const result = await paymentService.verifyPayment(reference);
      res.json(result);
    } catch (error) { next(error); }
  }

  async webhook(req: any, res: Response, next: NextFunction) {
    try {
      const paystackKey = process.env.PAYSTACK_SECRET_KEY;
      const signature = req.headers['x-paystack-signature'];

      // Signature verification is MANDATORY. Reject anything we cannot verify.
      if (!paystackKey) {
        console.error('Webhook rejected: PAYSTACK_SECRET_KEY not configured.');
        return res.status(500).json({ success: false, message: 'Payment webhook not configured.' });
      }
      if (!signature) {
        return res.status(401).json({ success: false, message: 'Missing Paystack signature.' });
      }

      // Verify against the RAW request body (captured in server.ts), not a re-stringified object.
      const payload = req.rawBody ? req.rawBody : Buffer.from(JSON.stringify(req.body));
      const hash = crypto
        .createHmac('sha512', paystackKey)
        .update(payload)
        .digest('hex');

      if (hash !== signature) {
        console.warn('⚠️ Webhook Signature Verification Failed');
        return res.status(401).json({ success: false, message: 'Invalid paystack signature' });
      }

      const event = req.body.event;
      if (event === 'charge.success') {
        const reference = req.body.data.reference;
        console.log(`🔌 Webhook received charge.success for ref: ${reference}`);
        const result = await paymentService.verifyPayment(reference);
        return res.json({ success: true, verified: true, ...result });
      }

      console.log(`🔌 Webhook received unhandled event: ${event}`);
      res.json({ success: true, message: 'Webhook received but unhandled.' });
    } catch (error) { next(error); }
  }

  async getReceipt(req: any, res: Response, next: NextFunction) {
    try {
      const { transactionId } = req.params;
      const details = await paymentService.getReceiptDetails(transactionId);
      res.json({ success: true, details });
    } catch (error) { next(error); }
  }

  async printReceipt(req: any, res: Response, next: NextFunction) {
    try {
      console.log('printReceipt params:', req.params, 'query:', req.query);
      const { transactionId } = req.params;
      const details = await paymentService.getReceiptDetails(transactionId);
      const formattedDate = new Date(details.date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      const maturityFormatted = details.maturesAt
        ? new Date(details.maturesAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        : 'N/A';

      const colorHex = details.vaultColor === 'indigo' ? '#6366f1' : details.vaultColor === 'amber' ? '#f59e0b' : details.vaultColor === 'rose' ? '#f43f5e' : '#10b981';

      // Serve a beautifully formatted HTML printable receipt page
      const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>HaloSave Receipt - ${details.receiptNo}</title>
        <meta charset="utf-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
          
          body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            color: #1e293b;
            background: #f8fafc;
            margin: 0;
            padding: 40px;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .receipt-wrapper {
            width: 100%;
            max-width: 500px;
          }
          .receipt-container {
            background: #ffffff;
            border-radius: 20px;
            padding: 48px;
            box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.05), 0 8px 10px -6px rgb(0 0 0 / 0.05);
            position: relative;
            overflow: hidden;
            border: 1px solid #e2e8f0;
          }
          .kente-border {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            pointer-events: none;
            border-radius: 20px;
            padding: 8px;
            background: repeating-linear-gradient(
              135deg,
              #16a34a, #16a34a 20px,
              #eab308 20px, #eab308 40px,
              #dc2626 40px, #dc2626 60px,
              #0f172a 60px, #0f172a 80px
            );
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            z-index: 10;
          }
          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-90deg);
            font-size: 140px;
            font-weight: 900;
            color: rgba(15, 23, 42, 0.03);
            z-index: 0;
            pointer-events: none;
            white-space: nowrap;
            letter-spacing: -0.02em;
          }
          .receipt-content {
            position: relative;
            z-index: 1;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 40px;
          }
          .logo-area {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .logo {
            font-size: 26px;
            font-weight: 800;
            letter-spacing: -0.05em;
            color: #0f172a;
            line-height: 1;
          }
          .logo span {
            color: #d4af37; /* halo-gold */
          }
          .receipt-type {
            font-size: 11px;
            text-transform: uppercase;
            font-weight: 700;
            letter-spacing: 0.1em;
            color: #64748b;
          }
          .receipt-status {
            font-size: 11px;
            text-transform: uppercase;
            font-weight: 700;
            letter-spacing: 0.1em;
            background: #d1fae5;
            color: #065f46;
            padding: 6px 12px;
            border-radius: 9999px;
            border: 1px solid #a7f3d0;
          }
          .receipt-status.failed {
            background: #fee2e2;
            color: #991b1b;
            border-color: #fca5a5;
          }
          .receipt-status.pending {
            background: #fef3c7;
            color: #92400e;
            border-color: #fde68a;
          }
          
          .amount-section {
            text-align: center;
            padding: 32px 0;
            margin-bottom: 32px;
            border-top: 1px dashed #e2e8f0;
            border-bottom: 1px dashed #e2e8f0;
          }
          .label {
            font-size: 11px;
            text-transform: uppercase;
            font-weight: 600;
            color: #64748b;
            margin-bottom: 6px;
          }
          .amount-value {
            font-size: 42px;
            font-weight: 800;
            color: #0f172a;
            font-family: 'JetBrains Mono', monospace;
            letter-spacing: -0.02em;
          }
          
          .details-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin-bottom: 32px;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .detail-label {
            font-size: 13px;
            color: #64748b;
            font-weight: 500;
          }
          .detail-value {
            font-size: 14px;
            font-weight: 600;
            color: #0f172a;
            text-align: right;
          }
          .detail-value.mono {
            font-family: 'JetBrains Mono', monospace;
            font-size: 13px;
          }
          
          .investment-card {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 32px;
          }
          .investment-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 16px;
          }
          .investment-icon {
            background: #dcfce7;
            color: #166534;
            width: 28px;
            height: 28px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
          }
          .investment-title {
            font-size: 13px;
            font-weight: 700;
            color: #166534;
          }
          .investment-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }
          
          .barcode-area {
            text-align: center;
            margin-bottom: 32px;
            padding-top: 32px;
            border-top: 1px dashed #e2e8f0;
          }
          .barcode {
            font-family: 'Libre Barcode 39', 'Courier New', Courier, monospace;
            font-size: 48px;
            line-height: 1;
            color: #cbd5e1;
            margin-bottom: 8px;
          }
          
          .footer {
            text-align: center;
            font-size: 12px;
            color: #94a3b8;
            line-height: 1.6;
          }
          .footer-brand {
            font-weight: 700;
            color: #64748b;
            letter-spacing: 0.1em;
            margin-top: 12px;
          }
          
          .btn-print {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            width: 100%;
            background: #0f172a;
            color: #ffffff;
            border: none;
            padding: 16px;
            border-radius: 12px;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            text-align: center;
            margin-top: 24px;
            transition: background 0.2s;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
          }
          .btn-print:hover {
            background: #1e293b;
          }
          .btn-print svg {
            width: 18px;
            height: 18px;
          }
          
          @media print {
            body {
              background: #ffffff;
              padding: 0;
            }
            .receipt-wrapper {
              max-width: 100%;
            }
            .receipt-container {
              box-shadow: none;
              border: 1px solid #e2e8f0;
              padding: 40px;
            }
            .btn-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt-wrapper">
          <div class="receipt-container">
            <div class="kente-border"></div>
            <div class="watermark">HALOSAVE</div>
            <div class="receipt-content">
              <div class="header">
                <div class="logo-area">
                  <div class="logo">Halo<span>Save</span></div>
                  <div class="receipt-type">Official Receipt</div>
                </div>
                <div class="receipt-status ${details.status}">${details.status}</div>
              </div>

            <div class="amount-section">
              <div class="label">Amount Cleared</div>
              <div class="amount-value">${details.currency === 'GHS' ? 'GH₵' : details.currency === 'NGN' ? '₦' : details.currency === 'KES' ? 'KSh' : details.currency} ${details.amount.toFixed(2)}</div>
            </div>

            <div class="details-list">
              <div class="detail-row">
                <div class="detail-label">Receipt Number</div>
                <div class="detail-value mono">${details.receiptNo}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Transaction Date</div>
                <div class="detail-value">${formattedDate}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Customer</div>
                <div class="detail-value">${details.customerName}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Email</div>
                <div class="detail-value">${details.customerEmail}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Destination Vault</div>
                <div class="detail-value" style="color: ${colorHex}">${details.vaultName}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Gateway Ref</div>
                <div class="detail-value mono" style="color: #64748b">${details.reference}</div>
              </div>
            </div>

            ${details.unitsAllocated ? `
            <div class="investment-card">
              <div class="investment-header">
                <div class="investment-icon">📈</div>
                <div class="investment-title">Databank Mutual Fund</div>
              </div>
              <div class="investment-grid">
                <div>
                  <div class="label" style="color: #166534; font-size: 10px;">Units Allocated</div>
                  <div class="detail-value mono" style="color: #14532d">${details.unitsAllocated.toFixed(4)}</div>
                </div>
                <div>
                  <div class="label" style="color: #166534; font-size: 10px;">Purchase NAV</div>
                  <div class="detail-value mono" style="color: #14532d">GH₵ ${details.purchaseNav?.toFixed(4)}</div>
                </div>
                <div>
                  <div class="label" style="color: #166534; font-size: 10px;">Lock Period</div>
                  <div class="detail-value" style="color: #14532d">${details.lockPeriodDays} Days</div>
                </div>
                <div>
                  <div class="label" style="color: #166534; font-size: 10px;">Maturity Date</div>
                  <div class="detail-value" style="color: #b45309">${maturityFormatted}</div>
                </div>
              </div>
            </div>
            ` : ''}

            <div class="barcode-area">
              <div class="barcode">||| ||||| |||| || | ||||</div>
              <div class="detail-value mono" style="font-size: 10px; color: #94a3b8">${details.transactionId}</div>
            </div>

            <div class="footer">
              <p>Thank you for saving with HaloSave!</p>
              <p style="color: #0f172a; font-weight: 600; margin: 12px 0;">"Small drops of water make a mighty ocean. Keep up the great work and stay disciplined!"</p>
              <div class="footer-brand">SAVE. LOCK. GROW.</div>
            </div>
            </div> <!-- End receipt-content -->
          </div>

          <button class="btn-print" onclick="window.print()">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            Print Receipt
          </button>
        </div>
      </body>
      </html>
      `;
      res.send(html);
    } catch (error) { next(error); }
  }

  async refund(req: any, res: Response, next: NextFunction) {
    try {
      const adminId = getActiveUser(req);
      const result = await paymentService.refundTransaction(adminId, req.body);
      res.json(result);
    } catch (error) { next(error); }
  }

  async sandboxCheckout(req: any, res: Response, next: NextFunction) {
    try {
      const { reference, amount, currency, method } = req.query;
      const parsedAmount = Number(amount || 0).toFixed(2);
      const displayCurrency = currency || 'GHS';
      const currencySymbol = displayCurrency === 'GHS' ? 'GH₵' : displayCurrency === 'NGN' ? '₦' : displayCurrency === 'KES' ? 'KSh' : displayCurrency;

      let paymentDetailsHtml = '';
      if (method === 'mobile_money') {
        paymentDetailsHtml = `
          <div class="form-group">
            <label>Provider</label>
            <select disabled style="width: 100%; box-sizing: border-box; padding: 12px 14px; background: #0f172a; color: #fff; border: 1px solid #334155; border-radius: 10px; font-size: 14px; margin-bottom: 8px; outline: none; appearance: none;">
              <option>MTN Mobile Money</option>
              <option>Telecel Cash</option>
              <option>AirtelTigo Money</option>
            </select>
          </div>
          <div class="form-group">
            <label>Mobile Number</label>
            <input type="text" value="024 123 4567" disabled>
          </div>
        `;
      } else if (method === 'bank_transfer') {
        paymentDetailsHtml = `
          <div class="form-group">
            <label>Bank Name</label>
            <input type="text" value="Ecobank Ghana" disabled>
          </div>
          <div class="form-group">
            <label>Account Number</label>
            <input type="text" value="1441001234567" disabled>
          </div>
        `;
      } else {
        paymentDetailsHtml = `
          <div class="form-group">
            <label>Card Number</label>
            <input type="text" value="4000 1234 5678 9010" disabled>
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label>Expiry Date</label>
              <input type="text" value="12/29" disabled>
            </div>
            <div class="form-group">
              <label>CVV</label>
              <input type="text" value="123" disabled>
            </div>
          </div>
        `;
      }

      const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Paystack Sandbox Secure Payment</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #0f172a;
            color: #f8fafc;
            margin: 0;
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
          }
          .checkout-card {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 20px;
            width: 100%;
            max-width: 440px;
            padding: 30px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-b: 1px solid #334155;
            padding-bottom: 20px;
            margin-bottom: 24px;
          }
          .logo {
            font-size: 20px;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: -0.05em;
          }
          .logo span {
            color: #3b82f6;
          }
          .badge {
            background: rgba(59, 130, 246, 0.15);
            color: #60a5fa;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            padding: 4px 10px;
            border-radius: 9999px;
            border: 1px solid rgba(59, 130, 246, 0.3);
          }
          .summary {
            background: #0f172a;
            padding: 16px 20px;
            border-radius: 12px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .summary-label {
            font-size: 12px;
            color: #94a3b8;
          }
          .summary-value {
            font-size: 22px;
            font-weight: 800;
            color: #38bdf8;
            font-family: monospace;
          }
          .form-group {
            margin-bottom: 16px;
          }
          label {
            display: block;
            font-size: 11px;
            text-transform: uppercase;
            font-weight: 600;
            color: #94a3b8;
            margin-bottom: 6px;
            letter-spacing: 0.05em;
          }
          input {
            width: 100%;
            box-sizing: border-box;
            background: #0f172a;
            border: 1px solid #334155;
            border-radius: 10px;
            padding: 12px 14px;
            color: #ffffff;
            font-size: 14px;
            font-weight: 500;
            outline: none;
          }
          input:focus {
            border-color: #3b82f6;
          }
          .grid-2 {
            display: grid;
            grid-template-cols: 1fr 1fr;
            gap: 16px;
          }
          .btn-primary {
            background: #10b981;
            color: #042f1a;
            width: 100%;
            border: none;
            padding: 14px;
            border-radius: 12px;
            font-weight: 700;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
            margin-top: 10px;
            box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3);
          }
          .btn-primary:hover {
            background: #34d399;
          }
          .btn-danger {
            background: rgba(239, 68, 68, 0.1);
            color: #f87171;
            border: 1px solid rgba(239, 68, 68, 0.2);
            width: 100%;
            padding: 12px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 13px;
            cursor: pointer;
            margin-top: 12px;
          }
          .btn-danger:hover {
            background: rgba(239, 68, 68, 0.2);
          }
          .info-note {
            font-size: 10px;
            color: #94a3b8;
            text-align: center;
            margin-top: 20px;
            line-height: 1.5;
          }
          .spinner {
            display: none;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255,255,255,0.2);
            border-top: 3px solid #ffffff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="checkout-card">
          <div class="header">
            <div class="logo">paystack<span>.sandbox</span></div>
            <div class="badge">TEST PAYMENT</div>
          </div>

          <div class="summary">
            <div class="summary-label">Amount Payable</div>
            <div class="summary-value">${currencySymbol} ${parsedAmount}</div>
          </div>

          ${paymentDetailsHtml}

          <div class="form-group" style="margin-top:8px;">
            <label>Transaction Reference</label>
            <input type="text" style="font-family:monospace; font-size:12px; background:#1e293b; border:none; padding:0;" value="${reference}" disabled>
          </div>

          <button id="btn-pay" class="btn-primary" onclick="processPayment()">
            <span id="btn-text">Authorize Sandbox Payment</span>
            <div id="btn-spinner" class="spinner"></div>
          </button>

          <button id="btn-cancel" class="btn-danger" onclick="cancelPayment()">
            Cancel & Decline
          </button>

          <div class="info-note">
            🛡️ This is a secure HaloSave simulated sandbox payment gateway. No real money will be charged.
          </div>
        </div>

        <script>
          async function processPayment() {
            const btnPay = document.getElementById('btn-pay');
            const btnText = document.getElementById('btn-text');
            const btnSpinner = document.getElementById('btn-spinner');
            const btnCancel = document.getElementById('btn-cancel');

            btnPay.disabled = true;
            btnCancel.disabled = true;
            btnText.style.display = 'none';
            btnSpinner.style.display = 'block';

            try {
              // Simulate payment delay
              await new Promise(resolve => setTimeout(resolve, 1500));

              // Call sandbox confirm API
              const token = localStorage.getItem('halosave_token');
              const res = await fetch('/api/payments/paystack/sandbox-confirm/${reference}', {
                method: 'POST',
                headers: {
                  'Authorization': token ? 'Bearer ' + token : ''
                }
              });
              const data = await res.json();

              if (data.success) {
                // Success redirect or state update
                alert('Payment authorized successfully inside Sandbox! Returning to HaloSave.');
                window.close();
                // Send postMessage to notify app in case it was opened in popup
                if (window.opener) {
                  window.opener.postMessage({ type: 'PAYSTACK_SUCCESS', reference: '${reference}' }, '*');
                }
              } else {
                alert('Verification failed: ' + (data.error || 'Unknown error'));
                window.close();
              }
            } catch (err) {
              alert('Network error verifying payment: ' + err.message);
              window.close();
            }
          }

          function cancelPayment() {
            alert('Payment cancelled by user.');
            window.close();
            if (window.opener) {
              window.opener.postMessage({ type: 'PAYSTACK_CANCELLED', reference: '${reference}' }, '*');
            }
          }
        </script>
      </body>
      </html>
      `;
      res.send(html);
    } catch (error) { next(error); }
  }

  async sandboxConfirm(req: any, res: Response, next: NextFunction) {
    try {
      const { reference } = req.params;
      const { eq } = await import('drizzle-orm');
      const { db } = await import('../../db');
      const { transactions } = await import('../../db/schema');
      
      const [tx] = await txRepo.findByReference(reference);
      
      if (tx && tx.status === 'pending') {
        await db.update(transactions).set({ status: 'sandbox_authorized' }).where(eq(transactions.id, tx.id));
      }
      res.json({ success: true });
    } catch (error) { next(error); }
  }
}

export class NotificationController {
  async getNotifications(req: any, res: Response, next: NextFunction) {
    try {
      const userId = getActiveUser(req);
      const list = await notificationService.getNotifications(userId);
      res.json({ success: true, notifications: list });
    } catch (error) { next(error); }
  }

  async markAsRead(req: any, res: Response, next: NextFunction) {
    try {
      const userId = getActiveUser(req);
      const { id } = req.params;
      const result = await notificationService.markAsRead(userId, id);
      res.json({ success: true, notification: result });
    } catch (error) { next(error); }
  }

  async markAllAsRead(req: any, res: Response, next: NextFunction) {
    try {
      const userId = getActiveUser(req);
      await notificationService.markAllAsRead(userId);
      res.json({ success: true, message: 'All notifications marked as read.' });
    } catch (error) { next(error); }
  }

  async deleteNotification(req: any, res: Response, next: NextFunction) {
    try {
      const userId = getActiveUser(req);
      const { id } = req.params;
      await notificationService.deleteNotification(userId, id);
      res.json({ success: true, message: 'Notification deleted.' });
    } catch (error) { next(error); }
  }

  async getAchievements(req: any, res: Response, next: NextFunction) {
    try {
      const userId = getActiveUser(req);
      const list = await notificationService.getAchievements(userId);
      res.json({ success: true, achievements: list });
    } catch (error) { next(error); }
  }

  async getSimulatedEmails(req: any, res: Response, next: NextFunction) {
    try {
      const userId = getActiveUser(req);
      const list = await notificationService.getSimulatedEmails(userId);
      res.json({ success: true, emails: list });
    } catch (error) { next(error); }
  }

  async simulateWeekly(req: any, res: Response, next: NextFunction) {
    try {
      const userId = getActiveUser(req);
      await notificationService.simulateWeeklySummary(userId);
      res.json({ success: true, message: 'Weekly summary simulated successfully.' });
    } catch (error) { next(error); }
  }

  async simulateMonthly(req: any, res: Response, next: NextFunction) {
    try {
      const userId = getActiveUser(req);
      await notificationService.simulateMonthlySummary(userId);
      res.json({ success: true, message: 'Monthly performance digest simulated successfully.' });
    } catch (error) { next(error); }
  }
}

import { db } from '../../db/index.ts';
import { transactions, notifications } from '../../db/schema.ts';
import bcrypt from 'bcryptjs';
import { and, eq, like } from 'drizzle-orm';

export class ReferralController {
  async updateCode(req: any, res: Response, next: NextFunction) {
    try {
      const userId = getActiveUser(req);
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ success: false, error: 'Referral code is required.' });
      }
      const sanitizedCode = code.toUpperCase().trim().replace(/[^A-Z0-9-]/g, '');
      if (sanitizedCode.length < 3 || sanitizedCode.length > 20) {
        return res.status(400).json({ success: false, error: 'Referral code must be between 3 and 20 alphanumeric characters.' });
      }

      // Check uniqueness
      const existing = await userRepo.findByReferralCode(sanitizedCode);
      if (existing.length > 0 && existing[0].id !== userId) {
        return res.status(400).json({ success: false, error: 'This referral code is already taken.' });
      }

      await userRepo.update(userId, { referralCode: sanitizedCode });

      await auditRepo.create({
        id: 'aud_rc_' + Math.random().toString(36).substring(2, 7),
        userId,
        action: 'REFERRAL_CODE_CUSTOMIZED',
        actor: 'User',
        details: `Custom referral code updated to: ${sanitizedCode}`,
        severity: 'info'
      });

      res.json({ success: true, code: sanitizedCode, message: 'Custom referral code updated successfully!' });
    } catch (error) { next(error); }
  }

  async simulateSignup(req: any, res: Response, next: NextFunction) {
    try {
      const userId = getActiveUser(req);
      const { email, fullName } = req.body;
      if (!email || !fullName) {
        return res.status(400).json({ success: false, error: 'Full Name and Email are required.' });
      }

      const [user] = await userRepo.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found.' });
      }

      const userReferralCode = user.referralCode || `${user.fullName.split(' ')[0].toUpperCase()}-HALOSAVE-99`;

      // Create a simulated user that is referred by this user
      const simId = 'usr_sim_' + Math.random().toString(36).substring(2, 9);
      const passwordHash = await bcrypt.hash('simulatedPassword123', 10);
      const avatarUrl = `https://images.unsplash.com/photo-${['1534528741775-53994a69daeb', '1507003211169-0a1dd7228f2d', '1494790108377-be9c29b29330', '1500648767791-00dcc994a43e'][Math.floor(Math.random()*4)]}?w=150&auto=format&fit=crop&q=80`;

      // Create referred user
      await userRepo.create({
        id: simId,
        fullName,
        email: (email || '').toLowerCase().trim(),
        phone: '+233 24 ' + Math.floor(1000000 + Math.random() * 9000000),
        country: user.country,
        currency: user.currency,
        passwordHash,
        avatarUrl,
        role: 'user',
        isKycVerified: true,
        referredBy: userReferralCode,
        referralsCount: Math.floor(Math.random() * 4) // give them random stats to look realistic!
      });

      // Update current user's counters
      const currentCount = Number(user.referralsCount || 0);
      const currentEarnings = Number(user.referralEarnings || 0);
      const nextCount = currentCount + 1;
      const nextEarnings = currentEarnings + 25.00; // Simulating registration + first deposit reward! (GHS 25)

      await userRepo.update(userId, {
        referralsCount: nextCount,
        referralEarnings: nextEarnings.toString()
      });

      // Log reward transaction
      await db.insert(transactions).values({
        id: 'tx_sim_ref_' + Math.random().toString(36).substring(2, 9),
        userId,
        type: 'deposit',
        amount: '25.00',
        currency: user.currency,
        status: 'successful',
        reference: 'REF_SIM_' + Math.floor(100000 + Math.random() * 900000),
        description: `Viral Referral engine: Commission and reward for referred user ${fullName} joining.`
      });

      // Trigger notification
      await db.insert(notifications).values({
        id: 'not_sim_ref_' + Math.random().toString(36).substring(2, 9),
        userId,
        title: '🎉 Referral Milestone Unlocked!',
        message: `${fullName} has successfully completed their first savings deposit of GHS 150.00! You have been credited a commission of GHS 25.00!`,
        type: 'system',
        isRead: false,
        createdAt: new Date()
      });

      res.json({ success: true, message: `Successfully simulated referred sign-up for ${fullName}!` });
    } catch (error) { next(error); }
  }

  async claimMilestone(req: any, res: Response, next: NextFunction) {
    try {
      const userId = getActiveUser(req);
      const { level } = req.body;
      if (level === undefined) {
        return res.status(400).json({ success: false, error: 'Milestone level is required.' });
      }

      const [user] = await userRepo.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found.' });
      }

      const bonuses = [0, 10, 50, 150, 500, 1500]; // levels 1, 2, 3, 4, 5
      const bonusAmount = bonuses[level] || 0;

      if (bonusAmount === 0) {
        return res.status(400).json({ success: false, error: 'Invalid milestone level.' });
      }

      // Check if user has already claimed this milestone
      const prefix = `MILE_CLAIM_${level}_%`;
      const existingClaims = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            like(transactions.reference, prefix)
          )
        )
        .limit(1);

      if (existingClaims.length > 0) {
        return res.status(400).json({ success: false, error: `You have already claimed your Level ${level} Ambassador Milestone bonus!` });
      }

      // Check if user has enough referrals
      const reqReferrals = [0, 1, 5, 10, 20, 50];
      const count = Number(user.referralsCount || 0);
      if (count < reqReferrals[level]) {
        return res.status(400).json({ success: false, error: `You need at least ${reqReferrals[level]} referrals to claim Level ${level} milestone!` });
      }

      // Log transaction
      const currentEarnings = Number(user.referralEarnings || 0);
      const nextEarnings = currentEarnings + bonusAmount;

      await userRepo.update(userId, {
        referralEarnings: nextEarnings.toString()
      });

      await db.insert(transactions).values({
        id: 'tx_mile_' + Math.random().toString(36).substring(2, 9),
        userId,
        type: 'deposit',
        amount: bonusAmount.toFixed(2),
        currency: user.currency,
        status: 'successful',
        reference: 'MILE_CLAIM_' + level + '_' + Math.floor(100000 + Math.random() * 900000),
        description: `Ambassador Milestone Level ${level} cash reward claimed!`
      });

      await db.insert(notifications).values({
        id: 'not_mile_' + Math.random().toString(36).substring(2, 9),
        userId,
        title: '🏆 Milestone Cash Claimed!',
        message: `Congratulations! You claimed your Level ${level} Ambassador Milestone bonus of ${user.currency} ${bonusAmount.toFixed(2)} successfully!`,
        type: 'goal',
        isRead: false,
        createdAt: new Date()
      });

      await auditRepo.create({
        id: 'aud_ml_' + Math.random().toString(36).substring(2, 7),
        userId,
        action: 'MILESTONE_CLAIMED',
        actor: 'User',
        details: `Claimed Level ${level} Ambassador Reward of ${bonusAmount}`,
        severity: 'info'
      });

      res.json({ success: true, message: `Successfully claimed Level ${level} Milestone reward of ${user.currency} ${bonusAmount}!` });
    } catch (error) { next(error); }
  }
}

export class WealthController {
  async getWealthInsight(req: any, res: Response, next: NextFunction) {
    try {
      const userId = getActiveUser(req);
      const result = await wealthService.getWealthInsight(userId, req.body);
      res.json(result);
    } catch (error) { next(error); }
  }
}

export class UserController {
  async getMe(req: any, res: Response, next: NextFunction) {
    try {
      const userId = getActiveUser(req);
      const [user] = await userRepo.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found.' });
      }
      res.json({ success: true, user });
    } catch (error) { next(error); }
  }

  async getAllUsers(req: any, res: Response, next: NextFunction) {
    try {
      const usersList = await userRepo.findAll();
      const sanitized = usersList.map(({ passwordHash, ...u }) => u);
      res.json({ success: true, users: sanitized });
    } catch (error) { next(error); }
  }

  async getUserById(req: any, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const [user] = await userRepo.findById(id);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found.' });
      }
      const { passwordHash, ...sanitized } = user;
      res.json({ success: true, user: sanitized });
    } catch (error) { next(error); }
  }

  async updateProfile(req: any, res: Response, next: NextFunction) {
    try {
      const userId = getActiveUser(req);
      const [updatedUser] = await userRepo.update(userId, req.body);
      if (!updatedUser) {
        return res.status(404).json({ success: false, error: 'User not found.' });
      }
      const { passwordHash, ...sanitized } = updatedUser;
      res.json({ success: true, user: sanitized });
    } catch (error) { next(error); }
  }

  async getMyVaults(req: any, res: Response, next: NextFunction) {
    try {
      const userId = getActiveUser(req);
      const userVaults = await vaultRepo.findByUserId(userId);
      res.json({ success: true, vaults: userVaults });
    } catch (error) { next(error); }
  }

  async getMyTranches(req: any, res: Response, next: NextFunction) {
    try {
      const userId = getActiveUser(req);
      const userTranches = await trancheRepo.findByUserId(userId);
      res.json({ success: true, tranches: userTranches });
    } catch (error) { next(error); }
  }

  async getMyTransactions(req: any, res: Response, next: NextFunction) {
    try {
      const userId = getActiveUser(req);
      const userTransactions = await txRepo.findByUserId(userId);
      res.json({ success: true, transactions: userTransactions });
    } catch (error) { next(error); }
  }

  async getMyAuditLogs(req: any, res: Response, next: NextFunction) {
    try {
      const userId = getActiveUser(req);
      const userAuditLogs = await auditRepo.findByUserId(userId);
      res.json({ success: true, auditLogs: userAuditLogs });
    } catch (error) { next(error); }
  }
}

export class InvestmentController {
  async getProviders(req: any, res: Response, next: NextFunction) {
    try {
      const providers = await getAllProviderData();
      res.json({ success: true, providers });
    } catch (error) { next(error); }
  }

  async getPerformance(req: any, res: Response, next: NextFunction) {
    try {
      const live = await getAllProviderData();
      const performance = live.map((p: any) => ({
        id: p.id,
        name: p.name,
        annualReturnPercentage: p.annualReturnPercentage,
        currentNAV: p.currentNAV,
        isLive: p.isLive,
        source: p.source,
        navDate: p.navDate,
        historicalNAVs: p.historicalNAVs,
      }));
      res.json({ success: true, performance });
    } catch (error) { next(error); }
  }

  async simulateGrowth(req: any, res: Response, next: NextFunction) {
    try {
      const { initialAmount, monthlyContribution, durationYears, providerId } = req.body;
      const initial = Number(initialAmount) || 0;
      const monthly = Number(monthlyContribution) || 0;
      const years = Number(durationYears) || 5;
      const selected = providersList.find(p => p.id === providerId) || providersList[0];
      
      const r = selected.annualReturnPercentage / 100;
      const n = 12; // compound monthly
      const months = years * n;
      
      let balance = initial;
      const projectionData = [];
      
      for (let i = 1; i <= months; i++) {
        balance = balance * (1 + r / n);
        balance += monthly;
        
        if (i % 12 === 0 || i === months) {
          projectionData.push({
            year: i / 12,
            balance: Number(balance.toFixed(2)),
            totalInvested: Number((initial + monthly * i).toFixed(2)),
            profit: Number(Math.max(0, balance - (initial + monthly * i)).toFixed(2))
          });
        }
      }
      
      res.json({
        success: true,
        provider: selected,
        projection: projectionData,
        finalBalance: Number(balance.toFixed(2)),
        totalInvested: Number((initial + monthly * months).toFixed(2)),
        profit: Number(Math.max(0, balance - (initial + monthly * months)).toFixed(2))
      });
    } catch (error) { next(error); }
  }
}


