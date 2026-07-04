import { UserRepository, VaultRepository, TrancheRepository, TransactionRepository, AuditRepository, WithdrawalRequestRepository, NotificationRepository, UserAchievementRepository, PasskeyRepository } from '../repositories/index.ts';
import { AuthService, VaultService, StateService, AdminService, SettingsService, CoachService, PaymentService, WealthService } from '../services/index.ts';
import { NotificationService } from '../services/notification.ts';
import { DatabankMFundProvider } from '../domain/investment.ts';

export const userRepo = new UserRepository();
export const vaultRepo = new VaultRepository();
export const trancheRepo = new TrancheRepository();
export const txRepo = new TransactionRepository();
export const auditRepo = new AuditRepository();
export const withdrawalRepo = new WithdrawalRequestRepository();
export const notificationRepo = new NotificationRepository();
export const achievementRepo = new UserAchievementRepository();
export const passkeyRepo = new PasskeyRepository();
export const investmentProvider = new DatabankMFundProvider();

export const notificationService = new NotificationService(notificationRepo, achievementRepo, userRepo);

export const authService = new AuthService(userRepo, auditRepo);
export const vaultService = new VaultService(vaultRepo, trancheRepo, txRepo, auditRepo, userRepo, investmentProvider, withdrawalRepo, notificationService);
export const stateService = new StateService(userRepo, vaultRepo, trancheRepo, txRepo, auditRepo, investmentProvider, notificationService);
export const adminService = new AdminService(userRepo, trancheRepo, vaultRepo, txRepo, auditRepo, withdrawalRepo, notificationService);
export const settingsService = new SettingsService(userRepo, auditRepo);
export const coachService = new CoachService(userRepo, trancheRepo, vaultRepo);
export const paymentService = new PaymentService(txRepo, vaultRepo, trancheRepo, userRepo, auditRepo, investmentProvider, notificationService);
export const wealthService = new WealthService(userRepo, trancheRepo, vaultRepo);

