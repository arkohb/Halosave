import { Router } from 'express';
import { 
  AuthController, 
  StateController, 
  VaultController, 
  AdminController, 
  SettingsController, 
  CoachController,
  PaymentController,
  NotificationController,
  ReferralController,
  WealthController,
  UserController,
  InvestmentController
} from '../controllers/index.ts';
import { requireAuth, requireAdmin } from '../shared/middleware/auth.ts';
import { trancheRepo, withdrawalRepo } from '../di/index.ts';

export const router = Router();

const authController = new AuthController();
const stateController = new StateController();
const vaultController = new VaultController();
const adminController = new AdminController();
const settingsController = new SettingsController();
const coachController = new CoachController();
const paymentController = new PaymentController();
const notificationController = new NotificationController();
const referralController = new ReferralController();
const wealthController = new WealthController();
const userController = new UserController();
const investmentController = new InvestmentController();


// --- GROUP 1: /api/auth ---
router.post('/auth/register', authController.register.bind(authController));
router.post('/auth/login', authController.login.bind(authController));
router.post('/auth/google', authController.googleLogin.bind(authController));
router.post('/auth/forgot-password', authController.forgotPassword.bind(authController));
router.post('/auth/verify-email', requireAuth as any, authController.verifyEmail.bind(authController));
router.post('/auth/change-password', requireAuth as any, authController.changePassword.bind(authController));
router.post('/auth/role', requireAdmin as any, authController.updateUserRole.bind(authController));
router.get('/auth/sessions', requireAuth as any, authController.getSessions.bind(authController));
router.delete('/auth/sessions/:id', requireAuth as any, authController.revokeSession.bind(authController));

// WebAuthn Passkey Routes
router.post('/auth/webauthn/register-options', requireAuth as any, authController.getRegistrationOptions.bind(authController));
router.post('/auth/webauthn/register-verify', requireAuth as any, authController.verifyRegistration.bind(authController));
router.post('/auth/webauthn/login-options', authController.getAuthenticationOptions.bind(authController));
router.post('/auth/webauthn/login-verify', authController.verifyAuthentication.bind(authController));
router.get('/auth/webauthn/passkeys', requireAuth as any, authController.getUserPasskeys.bind(authController));
router.delete('/auth/webauthn/passkeys/:id', requireAuth as any, authController.deletePasskey.bind(authController));


// --- GROUP 2: /api/users ---
router.get('/users/me', requireAuth as any, userController.getMe.bind(userController));
router.get('/users', requireAdmin as any, userController.getAllUsers.bind(userController));
router.get('/users/:id', requireAdmin as any, userController.getUserById.bind(userController));
router.put('/users/profile', requireAuth as any, userController.updateProfile.bind(userController));
router.get('/users/me/vaults', requireAuth as any, userController.getMyVaults.bind(userController));
router.get('/users/me/tranches', requireAuth as any, userController.getMyTranches.bind(userController));
router.get('/users/me/transactions', requireAuth as any, userController.getMyTransactions.bind(userController));
router.get('/users/me/audit-logs', requireAuth as any, userController.getMyAuditLogs.bind(userController));


// --- GROUP 3: /api/deposits ---
router.post('/deposits', requireAuth as any, vaultController.processDeposit.bind(vaultController));
router.get('/deposits', requireAuth as any, userController.getMyTranches.bind(userController));
router.get('/deposits/:id', requireAuth as any, async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    const [tranche] = await trancheRepo.findById(id);
    if (!tranche || tranche.userId !== req.user?.id) {
      return res.status(404).json({ success: false, error: 'Deposit not found.' });
    }
    res.json({ success: true, deposit: tranche });
  } catch (error) { next(error); }
});


// --- GROUP 4: /api/withdrawals ---
router.post('/withdrawals', requireAuth as any, vaultController.processWithdraw.bind(vaultController));
router.get('/withdrawals', requireAuth as any, async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.id;
    const withdrawalsList = await withdrawalRepo.findByUserId(userId);
    res.json({ success: true, withdrawals: withdrawalsList });
  } catch (error) { next(error); }
});
router.get('/withdrawals/:id', requireAuth as any, async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    const [withdrawal] = await withdrawalRepo.findById(id);
    if (!withdrawal || withdrawal.userId !== req.user?.id) {
      return res.status(404).json({ success: false, error: 'Withdrawal request not found.' });
    }
    res.json({ success: true, withdrawal });
  } catch (error) { next(error); }
});


// --- GROUP 5: /api/investments ---
router.get('/investments/providers', requireAuth as any, investmentController.getProviders.bind(investmentController));
router.get('/investments/performance', requireAuth as any, investmentController.getPerformance.bind(investmentController));
router.post('/investments/simulate', requireAuth as any, investmentController.simulateGrowth.bind(investmentController));


// --- GROUP 6: /api/admin ---
router.get('/admin/users', requireAdmin as any, adminController.getUsers.bind(adminController));
router.post('/admin/users/:id/confirm', requireAdmin as any, adminController.confirmUser.bind(adminController));
router.get('/admin/withdrawals', requireAdmin as any, adminController.getWithdrawals.bind(adminController));
router.post('/admin/withdrawals/:id/approve', requireAdmin as any, adminController.approveWithdrawal.bind(adminController));
router.post('/admin/withdrawals/:id/reject', requireAdmin as any, adminController.rejectWithdrawal.bind(adminController));
router.get('/admin/transactions', requireAdmin as any, adminController.getTransactions.bind(adminController));
router.get('/admin/vaults', requireAdmin as any, adminController.getVaults.bind(adminController));
router.get('/admin/tranches', requireAdmin as any, adminController.getTranches.bind(adminController));
router.post('/admin/broadcast', requireAdmin as any, adminController.broadcast.bind(adminController));

// Fund NAV management (live investment data)
router.get('/admin/fund-providers', requireAdmin as any, adminController.getFundProviders.bind(adminController));
router.put('/admin/fund-providers/:id/nav', requireAdmin as any, adminController.updateFundNav.bind(adminController));


// --- GROUP 7: /api/notifications ---
router.get('/notifications', requireAuth as any, notificationController.getNotifications.bind(notificationController));
router.post('/notifications/:id/read', requireAuth as any, notificationController.markAsRead.bind(notificationController));
router.post('/notifications/read-all', requireAuth as any, notificationController.markAllAsRead.bind(notificationController));
router.delete('/notifications/:id', requireAuth as any, notificationController.deleteNotification.bind(notificationController));
router.get('/notifications/simulated-emails', requireAuth as any, notificationController.getSimulatedEmails.bind(notificationController));
router.post('/notifications/simulate-weekly', requireAuth as any, notificationController.simulateWeekly.bind(notificationController));
router.post('/notifications/simulate-monthly', requireAuth as any, notificationController.simulateMonthly.bind(notificationController));
router.get('/achievements', requireAuth as any, notificationController.getAchievements.bind(notificationController));


// --- GROUP 8: /api/settings ---
router.post('/settings', requireAuth as any, settingsController.updateSettings.bind(settingsController));


// --- GROUP 9: /api/coach ---
router.post('/coach', requireAuth as any, coachController.askCoach.bind(coachController));


// --- BACKWARD COMPATIBLE & UTILITY ENDPOINTS ---
router.get('/state', requireAuth as any, stateController.getState.bind(stateController));
router.post('/vaults', requireAuth as any, vaultController.createVault.bind(vaultController));
router.post('/wealth/insight', requireAuth as any, wealthController.getWealthInsight.bind(wealthController));

// Paystack Payment integration endpoints
router.post('/payments/paystack/initialize', requireAuth as any, paymentController.initializePayment.bind(paymentController));
router.get('/payments/paystack/verify/:reference', requireAuth as any, paymentController.verifyPayment.bind(paymentController));
router.post('/payments/paystack-webhook', paymentController.webhook.bind(paymentController));
router.get('/payments/receipt/:transactionId', requireAuth as any, paymentController.getReceipt.bind(paymentController));
router.get('/payments/receipt/:transactionId/print', requireAuth as any, paymentController.printReceipt.bind(paymentController));
router.post('/payments/refund', requireAdmin as any, paymentController.refund.bind(paymentController));
router.get('/payments/paystack/sandbox-checkout', paymentController.sandboxCheckout.bind(paymentController));
router.post('/payments/paystack/sandbox-confirm/:reference', paymentController.sandboxConfirm.bind(paymentController));

// Referral routes
router.post('/referrals/code', requireAuth as any, referralController.updateCode.bind(referralController));
router.post('/referrals/simulate-signup', requireAuth as any, referralController.simulateSignup.bind(referralController));
router.post('/referrals/claim-milestone', requireAuth as any, referralController.claimMilestone.bind(referralController));

