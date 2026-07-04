
import { UserProfile, Vault, DepositTranche, Transaction, InvestmentSimulationConfig, FeatureFlags, AuditLog, ReferralStats, CurrencyCode } from '../types/index.ts';

export class ApiClient {
  private static getHeaders() {
    const token = localStorage.getItem('halosave_token');
    const userId = localStorage.getItem('halosave_user_id');
    return {
      'Content-Type': 'application/json',
      'x-user-id': userId || '',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  static async request(endpoint: string, options: RequestInit = {}) {
    const res = await fetch(`/api${endpoint}`, {
      ...options,
      headers: { ...this.getHeaders(), ...options.headers }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw { status: res.status, ...data };
    return data;
  }

  static async getState() { return this.request('/state'); }
  static async login(data: any) { return this.request('/auth/login', { method: 'POST', body: JSON.stringify(data) }); }
  static async register(data: any) { return this.request('/auth/register', { method: 'POST', body: JSON.stringify(data) }); }
  static async googleLogin(data: any) { return this.request('/auth/google', { method: 'POST', body: JSON.stringify(data) }); }
  static async forgotPassword(email: string) { return this.request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }); }
  static async verifyEmail() { return this.request('/auth/verify-email', { method: 'POST' }); }
  static async changePassword(currentPassword: string, newPassword: string) { return this.request('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }); }
  static async getSessions() { return this.request('/auth/sessions'); }
  static async revokeSession(id: string) { return this.request(`/auth/sessions/${id}`, { method: 'DELETE' }); }
  static async updateUserRole(userId: string, newRole: string) { return this.request('/auth/role', { method: 'POST', body: JSON.stringify({ userId, newRole }) }); }
  
  static async createVault(data: any) { return this.request('/vaults', { method: 'POST', body: JSON.stringify(data) }); }
  static async processDeposit(data: any) { return this.request('/deposits', { method: 'POST', body: JSON.stringify(data) }); }
  static async processWithdraw(data: any) { return this.request('/withdrawals', { method: 'POST', body: JSON.stringify(data) }); }
  
  static async initializePayment(data: any) { return this.request('/payments/paystack/initialize', { method: 'POST', body: JSON.stringify(data) }); }
  static async verifyPayment(reference: string) { return this.request(`/payments/paystack/verify/${reference}`); }
  static async getReceipt(transactionId: string) { return this.request(`/payments/receipt/${transactionId}`); }
  static async refundPayment(data: any) { return this.request('/payments/refund', { method: 'POST', body: JSON.stringify(data) }); }
  
  static async updateSettings(data: any) { return this.request('/settings', { method: 'POST', body: JSON.stringify(data) }); }
  static async askCoach(question: string) { return this.request('/coach', { method: 'POST', body: JSON.stringify({ question }) }); }
  static async updateProfile(data: any) { return this.request('/users/profile', { method: 'PUT', body: JSON.stringify(data) }); }
  
  static async getAdminUsers() { return this.request('/admin/users'); }
  static async getAdminWithdrawals() { return this.request('/admin/withdrawals'); }
  static async confirmUser(id: string) { return this.request(`/admin/users/${id}/confirm`, { method: 'POST' }); }
  static async approveWithdrawal(id: string) { return this.request(`/admin/withdrawals/${id}/approve`, { method: 'POST' }); }
  static async rejectWithdrawal(id: string) { return this.request(`/admin/withdrawals/${id}/reject`, { method: 'POST' }); }
  static async getAdminTransactions() { return this.request('/admin/transactions'); }
  static async getAdminVaults() { return this.request('/admin/vaults'); }
  static async getAdminTranches() { return this.request('/admin/tranches'); }
  static async broadcastNotification(data: { title: string; message: string; type: string }) { return this.request('/admin/broadcast', { method: 'POST', body: JSON.stringify(data) }); }

  // Notifications & Achievements
  static async getNotifications() { return this.request('/notifications'); }
  static async markNotificationAsRead(id: string) { return this.request(`/notifications/${id}/read`, { method: 'POST' }); }
  static async markAllNotificationsAsRead() { return this.request('/notifications/read-all', { method: 'POST' }); }
  static async deleteNotification(id: string) { return this.request(`/notifications/${id}`, { method: 'DELETE' }); }
  static async getAchievements() { return this.request('/achievements'); }
  static async getSimulatedEmails() { return this.request('/notifications/simulated-emails'); }
  static async simulateWeekly() { return this.request('/notifications/simulate-weekly', { method: 'POST' }); }
  static async simulateMonthly() { return this.request('/notifications/simulate-monthly', { method: 'POST' }); }

  // Referrals Engine
  static async updateReferralCode(code: string) { return this.request('/referrals/code', { method: 'POST', body: JSON.stringify({ code }) }); }
  static async simulateReferralSignup(data: { fullName: string; email: string }) { return this.request('/referrals/simulate-signup', { method: 'POST', body: JSON.stringify(data) }); }
  static async claimReferralMilestone(level: number) { return this.request('/referrals/claim-milestone', { method: 'POST', body: JSON.stringify({ level }) }); }

  // Wealth & Financial Life Engine
  static async getWealthInsight(data: any) { return this.request('/wealth/insight', { method: 'POST', body: JSON.stringify(data) }); }

  // WebAuthn Passkeys
  static async getWebAuthnRegisterOptions() { return this.request('/auth/webauthn/register-options', { method: 'POST' }); }
  static async verifyWebAuthnRegister(credential: any, name: string) { return this.request('/auth/webauthn/register-verify', { method: 'POST', body: JSON.stringify({ credential, name }) }); }
  static async getWebAuthnLoginOptions(email: string) { return this.request('/auth/webauthn/login-options', { method: 'POST', body: JSON.stringify({ email }) }); }
  static async verifyWebAuthnLogin(credential: any) { return this.request('/auth/webauthn/login-verify', { method: 'POST', body: JSON.stringify({ credential }) }); }
  static async getPasskeys() { return this.request('/auth/webauthn/passkeys'); }
  static async deletePasskey(id: string) { return this.request(`/auth/webauthn/passkeys/${id}`, { method: 'DELETE' }); }
}

